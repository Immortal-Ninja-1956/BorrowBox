# Search at Scale & ML Recommendations Migration Architecture SOP

## 1. Executive Summary & Problem Statement

Currently, BorrowBox utilizes PostgreSQL Fulltext `tsvector` (`to_tsvector('english', title || ' ' || description) @@ plainto_tsquery(...)`) and PostgreSQL GIN composite indexes for marketplace searching.

While relational fulltext searching works well for exact keyword matching on small datasets, it encounters significant performance bottlenecks at scale:
1. **Lack of Native Typo Tolerance:** `tsvector` matching fails on minor typos, misspellings, or campus slang (e.g. `macbok` vs `macbook`, `kettl` vs `kettle`).
2. **CPU & Write Overhead:** GIN index maintenance on text columns during high-frequency insertion/update cycles degrades PostgreSQL write throughput.
3. **ML Recommendations Blocking:** Relational search cannot perform hybrid semantic vector searching (e.g. vector embeddings derived from item descriptions or visual features) required for the ML-driven item recommendations roadmap.

---

## 2. Engine Comparison: Meilisearch vs Typesense

| Feature | Meilisearch | Typesense |
| :--- | :--- | :--- |
| **Primary Focus** | Ultra-fast instant search-as-you-type, typo tolerance, developer experience | High performance, distributed clustering, low memory footprint |
| **Typo Tolerance** | Excellent (Levensthein distance based on word length) | Excellent (configured per field) |
| **Vector Search / ML Support** | Native Hybrid Search & Embeddings integration (v1.3+) | Native Vector Search (`vec-f32` attributes) |
| **Memory Footprint** | Moderate (RAM + disk-backed LMDB) | Low-to-Moderate (in-memory C++ engine) |
| **Self-Hosting Complexity** | Extremely Simple (Single binary / Docker) | Simple (Docker / Clustering) |

**Recommendation:** **Meilisearch** is recommended for BorrowBox due to its native hybrid search (text + vector embeddings) capability and zero-configuration instant search experience.

---

## 3. Meilisearch Index Schemas

### 3.1. `items` Index Schema
```json
{
  "uid": "items",
  "primaryKey": "id",
  "searchableAttributes": [
    "title",
    "description",
    "category",
    "sellerName"
  ],
  "filterableAttributes": [
    "category",
    "condition",
    "status",
    "sellerId",
    "amount",
    "deletedAt"
  ],
  "sortableAttributes": [
    "createdAt",
    "amount",
    "sellerTrustScore"
  ],
  "rankingRules": [
    "words",
    "typo",
    "proximity",
    "attribute",
    "sort",
    "exactness"
  ]
}
```

### 3.2. ML Recommendation Embeddings Attribute
To unblock the ML recommendations roadmap, items documents in Meilisearch include a `_vectors` attribute containing 384-dimensional vector embeddings generated via `sentence-transformers/all-MiniLM-L6-v2`:
```json
{
  "id": 101,
  "title": "MacBook Air M1 8GB RAM 256GB SSD",
  "description": "Space grey in excellent condition with charger",
  "category": "Electronics",
  "amount": 55000.00,
  "sellerTrustScore": "4.90",
  "_vectors": {
    "default": [0.012, -0.045, 0.088, "... (384 floats)"]
  }
}
```

---

## 4. Real-Time Event-Driven Synchronization Architecture

Synchronization between PostgreSQL (source of truth) and Meilisearch occurs via dual-writing helpers in the database access layer (`server/db.ts`):

```
       ┌────────────────────────┐
       │   Marketplace Router   │
       └───────────┬────────────┘
                   │ (items.create / update / delete)
                   ▼
       ┌────────────────────────┐
       │     server/db.ts       │
       └─────┬────────────┬─────┴
             │            │ (async non-blocking sync)
             ▼            ▼
  ┌──────────────┐   ┌───────────────────────┐
  │  PostgreSQL  │   │   Meilisearch Client  │
  └──────────────┘   └───────────────────────┘
```

1. **`items.create`**: Inserts row into PostgreSQL `items` table and enqueues document indexing to Meilisearch index `items.addDocuments([doc])`.
2. **`items.update`**: Updates PostgreSQL row and calls `items.updateDocuments([updatedDoc])`.
3. **`items.delete` (Soft Delete)**: Sets `deletedAt = NOW()` in PostgreSQL and updates Meilisearch document with `deletedAt: timestamp` or removes document via `items.deleteDocument(itemId)`.

---

## 5. Zero-Downtime Migration Strategy

### Step 1: Deploy Dual-Writing & Feature Flag
Introduce `process.env.MEILISEARCH_HOST` and `process.env.ENABLE_MEILISEARCH_SEARCH = "true"`. If unset or false, the system automatically falls back to PostgreSQL `getPagedItems`.

### Step 2: Run Bulk Initial Synchronization Script
Execute background bulk synchronization script `scripts/sync_meilisearch.ts`:
```bash
node --loader ts-node/register scripts/sync_meilisearch.ts
```
The script reads all non-deleted items from PostgreSQL in batches of 500, generates embeddings, and bulk-upserts documents into Meilisearch.

### Step 3: Switch Traffic & Verification
Enable `ENABLE_MEILISEARCH_SEARCH = "true"`. Monitor query latency metrics (< 20ms target response time).
