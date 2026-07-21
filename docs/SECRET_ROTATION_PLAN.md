# BorrowBox Secret Rotation & Emergency Incident Plan

## 1. Executive Summary & Policy

### Core Security Mandate: Secrets in `.env` Only
All sensitive application credentials, API keys, database URLs, and cryptographic secrets MUST be stored exclusively in `.env` files (locally) or managed secret storage platforms (Render Dashboard, Supabase Console, Vercel Environment Variables). 

**Under no circumstances may any secret, API token, or private key be hardcoded in application source files or committed to source control.**

---

## 2. Threat Analysis & Vulnerability Impact

### 2.1. Leaked `SUPABASE_JWT_SECRET` Impact: FULL ACCOUNT TAKEOVER
- **Threat Vector:** If an attacker obtains the Supabase JWT secret (or service key), they can forge valid JSON Web Tokens signed by the project's secret header with arbitrary claims (`sub`, `email`, `role`, `exp`).
- **Consequence:** An attacker can impersonate any user on the platform—including administrators—bypassing authentication, elevating privileges to `role: "admin"`, viewing private deals/PINs, banning real users, or deleting platform data.

### 2.2. Leaked Cloudinary API Secret Impact: STORAGE TAMPERING & FINANCIAL COST
- **Threat Vector:** If an attacker acquires `CLOUDINARY_API_SECRET` and `CLOUDINARY_API_KEY`, they gain unrestricted API access to your Cloudinary storage container.
- **Consequence:** Attackers can delete user images, upload malicious or illicit media under your cloud account, or exhaust account bandwidth leading to service outage or unexpected billing charges.

---

## 3. Supabase JWT Secret Rotation Procedure

Follow these steps immediately if a Supabase JWT secret leak is suspected or during routine quarterly secret rotation:

### Step 1: Invalidate Current Tokens in Supabase Console
1. Log into the [Supabase Dashboard](https://supabase.com/dashboard).
2. Select the BorrowBox project.
3. Navigate to **Project Settings** -> **API**.
4. Scroll down to the **JWT Settings** section.
5. Click **Generate new JWT Secret** (or **Rotate JWT Secret**).
6. Confirm the rotation. This immediately invalidates all existing JWTs signed with the old secret.

### Step 2: Retrieve Updated Anon & Service Keys
1. Copy the newly generated **`anon` (public) key** and **`service_role` key** (if used).
2. Note the updated JWT secret for backup verification.

### Step 3: Update Environment Variables
1. **Local Development:** Update `.env`:
   ```env
   VITE_SUPABASE_URL="https://<your-project>.supabase.co"
   VITE_SUPABASE_ANON_KEY="<new-anon-key>"
   SUPABASE_ANON_KEY="<new-anon-key>"
   ```
2. **Production Host (Render / Vercel):**
   - Go to Environment Settings in your deployment dashboard.
   - Update `VITE_SUPABASE_ANON_KEY` and `SUPABASE_ANON_KEY` values.

### Step 4: Revoke Existing Active Server Sessions
To ensure no cached state or stale sessions persist:
1. Run the local session invalidation command or trigger database token version increments:
   ```sql
   UPDATE users SET "tokenVersion" = "tokenVersion" + 1;
   ```
2. Redeploy the backend application so Express instances pick up the new environment configuration.

### Step 5: Verification & Smoke Test
1. Log into BorrowBox as a standard student user.
2. Confirm session creation succeeds.
3. Test a protected procedure (e.g. creating a listing or fetching user profile).
4. Verify guest users without valid tokens are denied access.

---

## 4. Cloudinary Key & Secret Rotation Procedure

Follow these steps to rotate Cloudinary credentials without application downtime:

### Step 1: Generate New Keypair in Cloudinary Console
1. Log into the [Cloudinary Console](https://cloudinary.com/console).
2. Go to **Settings (Gear icon)** -> **Access Keys**.
3. Under **Access Control**, click **Generate New API Key**.
4. Record the new **API Key** and **API Secret**. Do NOT delete the old key pair yet.

### Step 2: Update Environment Variables
1. **Local Development:** Update `.env`:
   ```env
   CLOUDINARY_URL="cloudinary://<new_api_key>:<new_api_secret>@<cloud_name>"
   CLOUDINARY_CLOUD_NAME="<cloud_name>"
   CLOUDINARY_API_KEY="<new_api_key>"
   CLOUDINARY_API_SECRET="<new_api_secret>"
   ```
2. **Production Deployment:** Update `CLOUDINARY_URL` and `CLOUDINARY_API_KEY`/`CLOUDINARY_API_SECRET` in production environment settings.

### Step 3: Redeploy Application
1. Trigger a zero-downtime deployment of the backend.
2. The `server/storage.ts` module will initialize with the new credentials upon service boot.

### Step 4: Verify Image Upload Functionality
1. Post a test listing with an image upload.
2. Confirm the uploaded media URL renders correctly from `https://res.cloudinary.com/...`.

### Step 5: Revoke Old Cloudinary Keys
1. Return to **Cloudinary Console** -> **Access Keys**.
2. Locate the old API Key.
3. Click **Disable**, test uploads once more, then click **Delete**.

---

## 5. PostgreSQL Database URL & Other Secrets Rotation

### 5.1. Database Password Rotation (`DATABASE_URL`)
1. In Supabase Dashboard -> **Project Settings** -> **Database**, click **Reset Database Password**.
2. Generate a secure 32+ character password.
3. Update `DATABASE_URL` in `.env` and Render dashboard:
   ```env
   DATABASE_URL="postgresql://postgres:<new-password>@<host>:6543/postgres?sslmode=require"
   ```
4. Restart backend servers.

### 5.2. PIN Encryption Key (`PIN_ENCRYPTION_KEY`)
1. Generate a new 32-byte hex key:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. Update `PIN_ENCRYPTION_KEY` in `.env` and production host settings.

---

## 6. Secret Incident Response Checklist

When a secret leak is detected:

- [ ] **Step 1:** Containment — Rotate the leaked credential immediately (within 15 minutes).
- [ ] **Step 2:** Audit — Check `admin_actions` audit log table in database for unusual actions performed during exposure window:
  ```sql
  SELECT * FROM admin_actions WHERE timestamp >= NOW() - INTERVAL '24 hours' ORDER BY timestamp DESC;
  ```
- [ ] **Step 3:** Git Scrubbing — If secrets were committed to git history, use `git filter-repo` or BFG Repo-Cleaner to strip secrets from commit logs, push force to remote, and invalidate the compromised keys upstream.
- [ ] **Step 4:** Force Relogin — Invalidate active user tokens via `tokenVersion` bump.
- [ ] **Step 5:** Post-Mortem — Document root cause and verify `.gitignore` contains `.env*`.

---

## 7. Periodic Secret Rotation Schedule

| Secret | Rotation Frequency | Responsible Party |
| :--- | :--- | :--- |
| `SUPABASE_JWT_SECRET` / Anon Key | Every 90 Days | Security / DevOps Lead |
| `CLOUDINARY_API_SECRET` | Every 90 Days | Backend Engineering Lead |
| `DATABASE_URL` Password | Every 180 Days | Database Administrator |
| `PIN_ENCRYPTION_KEY` | Annual / On Staff Exit | Backend Engineering Lead |
