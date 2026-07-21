<div align="center">

# 🎁 BorrowBox

**A Full-Stack Peer-to-Peer Marketplace for Campus Communities**

*Borrow. Share. Earn.* — The next-generation campus marketplace powering secure transactions through AI-verified listings, Cloudinary image optimization, Supabase authentication, and Google Cloud Vision safety checks.

[![GitHub Release](https://img.shields.io/github/v/release/Immortal-Ninja-1956/BorrowBox?include_prereleases&style=flat-square)](https://github.com/Immortal-Ninja-1956/BorrowBox/releases)
[![GitHub License](https://img.shields.io/github/license/Immortal-Ninja-1956/BorrowBox?style=flat-square)](LICENSE)
[![Repository Stars](https://img.shields.io/github/stars/Immortal-Ninja-1956/BorrowBox?style=flat-square)](https://github.com/Immortal-Ninja-1956/BorrowBox/stargazers)
[![Last Commit](https://img.shields.io/github/last-commit/Immortal-Ninja-1956/BorrowBox?style=flat-square)](https://github.com/Immortal-Ninja-1956/BorrowBox/commits/main)

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white&style=flat-square)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black&style=flat-square)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js&logoColor=white&style=flat-square)](https://nodejs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth-3FCF8E?logo=supabase&logoColor=white&style=flat-square)](https://supabase.com/)
[![Cloudinary](https://img.shields.io/badge/Cloudinary-Media-4285F4?logo=cloudinary&logoColor=white&style=flat-square)](https://cloudinary.com/)

**[🌐 Live Demo](https://borrowbox-last.onrender.com/)** • **[📖 Documentation](#documentation)** • **[🐛 Report Bug](https://github.com/Immortal-Ninja-1956/BorrowBox/issues)** • **[⭐ Request Feature](https://github.com/Immortal-Ninja-1956/BorrowBox/issues)**

---

</div>

## 📋 Table of Contents

- [About](#about)
- [Key Features](#key-features)
- [What's New](#whats-new)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Setup](#environment-setup)
  - [Running Locally](#running-locally)
- [Usage Guide](#usage-guide)
- [API Documentation](#api-documentation)
- [Database Schema](#database-schema)
- [Development](#development)
  - [Available Scripts](#available-scripts)
  - [Code Quality](#code-quality)
  - [Testing](#testing)
- [Deployment](#deployment)
- [Roadmap](#roadmap)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [Security](#security)
- [License](#license)
- [Contact & Support](#contact--support)

---

## 📖 About

**BorrowBox** is a sophisticated peer-to-peer (P2P) campus marketplace redesigned for the modern era. It elegantly solves the problem of expensive textbooks, underutilized equipment, and friction in local transactions by providing a trust-enforced, verification-first platform.

### Problem Statement
College students face unique challenges:
- 💰 **High costs** for textbooks and equipment that are used for only one semester
- 🚚 **Shipping inefficiencies** for local transactions
- 🔐 **Payment trust issues** when dealing with unknown peers
- 📍 **Lack of localized marketplaces** tailored to campus communities
- 🤖 **No automated content moderation** leading to prohibited item listings
- 📸 **Unoptimized image handling** causing slow load times and bandwidth waste

### Solution
BorrowBox provides:
- **AI-Powered Content Moderation** using Google Cloud Vision for image safety verification
- **Cloud-Optimized Media** via Cloudinary for fast image delivery and transformation
- **Enterprise Authentication** powered by Supabase for secure, scalable user management
- **Hyper-local discovery** with campus-scoped search and dynamic filtering
- **Trust-enforced payment** with dynamic UPI QR codes and WhatsApp integration
- **4-State Deal Lifecycle** with transparent state management and PIN-based verification
- **Dispute Resolution** with manual review and transaction reference (UTR) tracking
- **Rate-Limited Actions** to prevent abuse and spam

### Impact
- ✅ **Frictionless local transactions** without shipping delays
- ✅ **Fraud prevention** through AI verification, PIN confirmation, and UTR tracking
- ✅ **Fast image loading** with Cloudinary CDN and transformations
- ✅ **Community-driven** sustainable consumption
- ✅ **Cost reduction** for students through the sharing economy
- ✅ **Verified transactions** with cryptographic PIN handshakes

---

## ⚡ Key Features

### 🌟 Core Differentiators

#### 1. **Google Cloud Vision Image Safety Verification**
```
Seller uploads item photo → GCV analyzes image → Flags restricted items → Listing approved/rejected
```
- **Automatic prohibited item detection**: Detects weapons, drugs, harmful substances
- **Safety classification**: Labels image content (safe/unsafe)
- **Zero manual moderation**: Instant feedback to sellers
- **Compliance ready**: Meets platform safety standards
- Works seamlessly with Cloudinary-hosted images

#### 2. **Cloudinary Media Management**
```
Local image upload → Cloudinary transformation → Fast CDN delivery → Mobile-optimized thumbnails
```
- **Automatic image optimization**: Responsive sizing, format conversion (WebP)
- **Global CDN delivery**: ~50ms load times globally
- **On-the-fly transformations**: Cropping, filters, responsive breakpoints
- **Bandwidth reduction**: 60-80% smaller images with smart compression
- **Fallback support**: Works with local uploads during migration

#### 3. **Supabase Authentication & Authorization**
```
User signup → Verified email → Supabase JWT session → Type-safe row-level security
```
- **Enterprise-grade auth**: Built-in JWT, OAuth, MFA support
- **Session management**: HttpOnly cookies, automatic token refresh
- **Row-level security**: Prevents unauthorized data access
- **No password storage**: Supabase handles all cryptography
- **WhatsApp OTP verification**: Optional 2-factor authentication

#### 4. **PIN-Based Deal Completion Handshake**
```
Deal created → PIN encrypted → Buyer views PIN → Seller enters PIN → Payment confirmed → Deal closed
```
- **Cryptographic verification**: 6-digit PIN with bcrypt hashing
- **Anti-fraud mechanism**: Seller must physically receive PIN from buyer
- **Attempt limiting**: 5 attempts max, then automatic lockdown
- **Dispute recovery**: PIN regeneration on dispute raise
- **Transaction atomicity**: Deal completion is atomic (all-or-nothing)

#### 5. **WhatsApp Deep-Link Integration**
```
Buyer clicks "Contact Seller" → Direct WhatsApp link generated → Normalized wa.me deep links → Real-time negotiation
```
- One-click direct communication
- Prefilled messages with item details
- Zero context switching between platforms
- Mobile-first design philosophy

#### 6. **Dynamic UPI QR Payment Flow**
```
Meetup complete → Buyer confirms delivery → Dynamic UPI QR generated → Buyer scans & pays → Deal marked PAID
```
- **Anti-fraud mechanism**: QR code contains seller's UPI ID + exact amount
- **Multiple payment apps**: Works with Google Pay, PhonePe, Paytm, BHIM
- **Transaction transparency**: Deal state synchronized post-payment
- **UTR tracking**: Buyers submit UPI transaction reference for disputes

### 🛡️ Platform Capabilities

| Feature | Description |
|---------|-------------|
| **GCV Image Safety** | Automatic detection of prohibited items and unsafe content |
| **Cloudinary Media** | Fast image delivery, responsive sizing, bandwidth optimization |
| **Supabase Auth** | Enterprise authentication with email verification & OTP |
| **Campus-Scoped Search** | Client-side autocomplete with category filtering (Books, Electronics, Gear, Furniture) |
| **4-State Deal Lifecycle** | OPEN → Shipped → DELIVERED → PAID with automatic state transitions |
| **PIN Verification** | Encrypted 6-digit PIN with attempt limiting and lockdown mechanism |
| **Dispute System** | Manual intervention, UTR submission, dispute resolution tracking |
| **Item Categorization** | Smart category-based browsing with condition ratings (New → Poor) |
| **User Profiles** | Complete profile with UPI ID, WhatsApp verification, trust score |
| **Trust Score System** | Computed from completed deals and seller ratings |
| **Rate Limiting** | Express rate limit middleware on auth, creation, and messaging endpoints |
| **Content Security** | DOMPurify sanitization + Helmet.js security headers + CSP |
| **Responsive Design** | Mobile-first, works on all devices |
| **WhatsApp OTP** | Optional verification via WhatsApp for enhanced security |
| **UTR Tracking** | UPI transaction reference submission and verification |

---

## 🆕 What's New

This version of BorrowBox represents a major evolution from the original MVP:

### Core Infrastructure
- **Supabase Migration**: Transitioned from custom JWT to enterprise Supabase authentication
- **AI-Powered Moderation**: Integrated Google Cloud Vision for automated image safety checks
- **Cloud Media Storage**: Cloudinary integration for optimized image delivery and transformations
- **Atomic Transactions**: Database-level atomicity for deal completion and payment confirmation

### Features
- **Dispute Resolution System**: Comprehensive dispute handling with automatic PIN regeneration
- **WhatsApp OTP Verification**: Two-factor authentication via WhatsApp for unverified users
- **Item Reporting**: Users can report suspicious listings; admins review and take action
- **Admin Dashboard**: Platform statistics, user management, item report handling, ban system
- **UTR Submission**: Post-payment verification using UPI transaction references
- **Deal Expiration**: Automatic cleanup of stale deals (15-minute background job)
- **Banned Keywords Filter**: Server-side validation prevents prohibited items (drugs, weapons, etc.)

### Developer Experience
- **Rate Limiting**: Granular rate limits on auth, marketplace actions, and messaging
- **pnpm Workspaces**: Monorepo structure with shared code between client/server
- **Drizzle ORM**: Type-safe SQL queries with automatic migrations
- **tRPC with React Query**: End-to-end type safety from database to UI
- **Comprehensive Error Handling**: Custom TRPCError codes and user-friendly messages

---

## 🏗️ Architecture

### High-Level System Design

```
┌────────────────────────────────────────────────────────────────────────────┐
│                         PRESENTATION LAYER                                  │
│  React 19 SPA (Vite) + Tailwind CSS + shadcn/ui Components                  │
│  Pages: Marketplace, Dashboard, Item Details, Profile, Auth                 │
└──────────────────────────┬─────────────────────────────────────────────────┘
                           │ (Type-safe RPC via tRPC Client + React Query)
                           ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                    API & BUSINESS LOGIC LAYER                                │
│  Node.js + Express + tRPC Server                                             │
│  Routers: auth, items, deals, user, reviews, messages, admin                │
│  Middleware: Rate Limiting, CORS, Helmet Security, Authentication            │
└──────────────────────────┬─────────────────────────────────────────────────┘
                           │ (Type-safe ORM queries)
            ┌──────────────┼──────────────────┬────────────┐
            ▼              ▼                  ▼            ▼
    ┌────────────┐  ┌─────────────┐   ┌──────────┐  ┌──────────┐
    │ Supabase   │  │ Cloudinary  │   │  GCV     │  │ Drizzle  │
    │ Auth       │  │ Media CDN   │   │  Safety  │  │  ORM     │
    └────────────┘  └─────────────┘   └──────────┘  └──────────┘
       (JWT, OAuth)   (Images, Video)  (AI Verify) (SQL Queries)
                           │
                           ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                       DATA PERSISTENCE LAYER                                 │
│  MySQL + Drizzle ORM (SQL Schema Versioning)                                 │
│  Tables: users, items, deals, transactions, reviews, messages, reports      │
└────────────────────────────────────────────────────────────────────────────┘
```

### Data Flow Sequence

```
User Action → React Component → tRPC Client Hook → Authentication (Supabase)
   ↓
Input Validation (Zod) → Business Logic (Rate Limiting, GCV Safety Check)
   ↓
Drizzle ORM Query → MySQL Database → Response Serialization
   ↓
React Query Cache → UI Update → Toast Notification (Sonner)
```

---

## 🛠️ Tech Stack

### Frontend Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Framework** | React 19 | Component-based UI |
| **Language** | TypeScript 5.9 | Type safety |
| **Build Tool** | Vite 7 | Fast bundling & HMR |
| **Styling** | Tailwind CSS v4 | Utility-first CSS |
| **Components** | shadcn/ui + Radix UI | Accessible UI components |
| **Icons** | Lucide React | Modern icon library |
| **Forms** | React Hook Form + Zod | Type-safe form handling |
| **RPC** | tRPC Client + React Query | Type-safe API + caching |
| **Router** | wouter | Lightweight client routing |
| **Animations** | Framer Motion | Smooth transitions |
| **QR Codes** | qrcode.react | Dynamic UPI QR generation |
| **Notifications** | Sonner | Toast notifications |
| **State** | React Context + Hooks | Global state management |

### Backend Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Runtime** | Node.js 20+ | JavaScript runtime |
| **Framework** | Express 4.21 | Web server framework |
| **Language** | TypeScript 5.9 | Type safety |
| **RPC** | tRPC Server v11 | Type-safe API endpoints |
| **ORM** | Drizzle ORM 0.44 | Type-safe SQL queries |
| **Auth** | Supabase + JWT | Enterprise authentication |
| **File Upload** | Multer 2.1 | Multipart file handling |
| **Image Processing** | Cloudinary SDK | Media optimization & CDN |
| **Vision API** | @google-cloud/vision | AI-powered image safety |
| **Security** | Helmet 8.2 + CORS | Security headers + cross-origin |
| **Rate Limiting** | express-rate-limit | Request throttling |
| **Email** | Resend 6.12 | Email delivery |
| **Validation** | Zod 4.1 | Schema validation |

### Database Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| **Database** | MySQL | 8.0+ |
| **ORM** | Drizzle ORM | 0.44.5 |
| **Schema Tools** | Drizzle Kit | 0.31.4 |
| **Authentication** | Supabase | 2.46.2 |

### External Services

| Service | Purpose | SDK |
|---------|---------|-----|
| **Supabase** | User auth, JWT, email verification | @supabase/supabase-js |
| **Cloudinary** | Image optimization, CDN, transformations | cloudinary |
| **Google Cloud Vision** | Image safety, content verification | @google-cloud/vision |

### DevOps & Tools

| Tool | Purpose |
|------|---------|
| **pnpm** | Package manager with workspace support |
| **Vite** | Lightning-fast dev server |
| **TypeScript Compiler** | Type checking (`tsc --noEmit`) |
| **Prettier** | Code formatting |
| **Vitest** | Unit testing framework |
| **esbuild** | Production bundling |
| **tsx** | TypeScript execution for Node.js |

---

## 📁 Project Structure

```
BorrowBox/
│
├── 📁 client/                          # React Frontend Application
│   ├── public/
│   │   ├── favicon.ico
│   │   └── robots.txt
│   ├── src/
│   │   ├── 📁 _core/                   # Core Configuration
│   │   │   ├── env.ts                  # Environment validation
│   │   │   ├── constants.ts            # App constants
│   │   │   └── config.ts               # Global config
│   │   │
│   │   ├── 📁 components/              # Reusable Components
│   │   │   ├── ui/                     # shadcn/ui components
│   │   │   ├── layout/                 # Header, Navbar, Footer, Sidebar
│   │   │   ├── cards/                  # Item cards, Deal cards
│   │   │   ├── modals/                 # Dialog modals
│   │   │   ├── forms/                  # Reusable form components
│   │   │   └── common/                 # Buttons, Loaders, etc.
│   │   │
│   │   ├── 📁 contexts/                # React Context Providers
│   │   │   ├── AuthContext.tsx         # Supabase authentication state
│   │   │   └── ThemeContext.tsx        # Dark mode state
│   │   │
│   │   ├── 📁 hooks/                   # Custom Hooks
│   │   │   ├── useAuth.ts              # Supabase auth logic
│   │   │   ├── useDeal.ts              # Deal management
│   │   │   ├── useItems.ts             # Item queries with Cloudinary
│   │   │   └── useDebounce.ts          # Debounce utility
│   │   │
│   │   ├── 📁 lib/                     # Utilities & Helpers
│   │   │   ├── api.ts                  # tRPC client setup
│   │   │   ├── utils.ts                # Helper functions
│   │   │   ├── validators.ts           # Zod schemas
│   │   │   └── cloudinary.ts           # Cloudinary image utilities
│   │   │
│   │   ├── 📁 pages/                   # Page Components (Routes)
│   │   │   ├── Home.tsx                # Landing page
│   │   │   ├── Marketplace.tsx         # Browse items with search
│   │   │   ├── ItemDetails.tsx         # Single item with Cloudinary image
│   │   │   ├── Dashboard.tsx           # User dashboard
│   │   │   ├── Profile.tsx             # User profile & settings
│   │   │   ├── Auth/
│   │   │   │   ├── Login.tsx
│   │   │   │   ├── Register.tsx
│   │   │   │   └── WhatsAppVerify.tsx
│   │   │   ├── NotFound.tsx            # 404 page
│   │   │   └── Error.tsx               # Error boundary
│   │   │
│   │   ├── App.tsx                     # Main App component & routes
│   │   ├── main.tsx                    # Entry point
│   │   └── index.css                   # Global Tailwind styles
│   │
│   └── vite.config.ts
│
├── 📁 server/                          # Express + tRPC Backend
│   ├── 📁 _core/
│   │   ├── index.ts                    # Server entry point
│   │   ├── middleware.ts               # Global middleware setup
│   │   ├── auth.ts                     # Supabase auth helpers
│   │   ├── cookies.ts                  # Session cookie management
│   │   ├── trpc.ts                     # tRPC setup & context
│   │   ├── systemRouter.ts             # System/admin endpoints
│   │   ├── limiter.ts                  # Rate limiting config
│   │   └── utils.ts                    # Server utilities
│   │
│   ├── db.ts                           # Drizzle ORM schema & connection
│   │   ├── Schema definitions (users, items, deals, transactions, reviews, messages, reports)
│   │   └── Database connection & migrations
│   │
│   ├── routers.ts                      # tRPC route definitions
│   │   ├── auth.*                      # Login, Register, Logout (Supabase-managed)
│   │   ├── user.*                      # Profile, WhatsApp OTP, verification
│   │   ├── items.*                     # CRUD, GCV safety check, search
│   │   ├── deals.*                     # Deal lifecycle, PIN verification, UTR
│   │   ├── reviews.*                   # Rating & feedback system
│   │   ├── messages.*                  # In-deal chat
│   │   └── admin.*                     # User bans, item deletion, report management
│   │
│   ├── vision.ts                       # Google Cloud Vision wrapper
│   │   ├── Image safety classification
│   │   ├── Prohibited item detection
│   │   └── Client initialization
│   │
│   ├── upload.ts                       # Multer configuration
│   │   ├── File validation
│   │   └── Cloudinary upload handler
│   │
│   ├── pin.ts                          # PIN generation & verification
│   │   ├── 6-digit PIN generation
│   │   ├── Bcrypt hashing
│   │   └── Encryption/decryption
│   │
│   ├── validators.ts                   # Zod input validation schemas
│   │
│   ├── __tests__/                      # Vitest test files
│   │   ├── auth.test.ts
│   │   ├── items.test.ts
│   │   └── deals.test.ts
│   │
│   └── types.ts                        # Backend-only types
│
├── 📁 shared/                          # Shared Code (Frontend + Backend)
│   ├── types.ts                        # Shared TypeScript interfaces
│   ├── schemas.ts                      # Zod schemas used by both
│   ├── constants.ts                    # Shared constants
│   └── utils.ts                        # Shared utility functions
│
├── 📁 drizzle/                         # Database Migrations
│   ├── 0001_init.sql                   # Initial schema
│   ├── 0002_add_fields.sql             # Schema updates
│   └── meta/
│       └── _journal.json               # Migration journal
│
├── 📁 patches/                         # Dependency Patches
│   ├── wouter@3.7.1.patch              # Bug fixes for wouter package
│   └── ...
│
├── 📄 package.json                     # Project dependencies & scripts
├── 📄 tsconfig.json                    # TypeScript configuration
├── 📄 tailwind.config.ts               # Tailwind CSS config
├── 📄 postcss.config.js                # PostCSS configuration
├── 📄 drizzle.config.ts                # Drizzle ORM config
├── 📄 vite.config.ts                   # Vite bundler config
├── 📄 vitest.config.ts                 # Vitest test config
├── 📄 .env.example                     # Environment variables template
├── 📄 .prettierrc                      # Prettier formatting rules
├── 📄 .eslintrc.json                   # ESLint rules
├── 📄 .gitignore                       # Git ignore rules
├── 📄 LICENSE                          # MIT License
└── 📄 README.md                        # This file
```

---

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

| Requirement | Version | Download |
|-----------|---------|----------|
| **Node.js** | 18.x or 20.x | [nodejs.org](https://nodejs.org/) |
| **pnpm** | 10.x | [pnpm.io](https://pnpm.io/) |
| **MySQL** | 8.0+ | [mysql.com](https://www.mysql.com/) |
| **Git** | Latest | [git-scm.com](https://git-scm.com/) |

**Quick version check:**
```bash
node --version    # Should be v18.0.0 or higher
pnpm --version    # Should be 10.x
mysql --version   # Should be 8.0.x or higher
```

### Installation

#### Step 1: Clone the Repository

```bash
git clone https://github.com/Immortal-Ninja-1956/BorrowBox.git
cd BorrowBox
```

#### Step 2: Install Dependencies

Using pnpm (recommended):

```bash
pnpm install
```

**Expected output:**
```
packages in workspace
✓ resolved 456 packages
✓ downloaded 234 packages in 12s
✓ linked 0 packages
✓ packages installed [3456ms]
```

### Environment Setup

#### Step 3: Create Environment File

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Or manually create `.env` with the following variables:

```env
# ==========================================
# DATABASE CONFIGURATION
# ==========================================
DATABASE_URL=mysql://root:password@localhost:3306/borrowbox_dev

# ==========================================
# SUPABASE AUTHENTICATION
# ==========================================
# Get these from https://supabase.com
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-public-key
SUPABASE_JWT_SECRET=your-jwt-secret

# ==========================================
# GOOGLE CLOUD VISION (Image Safety)
# ==========================================
GOOGLE_PROJECT_ID=your-gcp-project-id
GOOGLE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# ==========================================
# CLOUDINARY (Media Optimization)
# ==========================================
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# ==========================================
# APPLICATION
# ==========================================
NODE_ENV=development
PORT=3000
CLIENT_PORT=5173
FRONTEND_URL=http://localhost:5173

# ==========================================
# CORS & SECURITY
# ==========================================
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

**Environment Variables Explanation:**

| Variable | Purpose | Example |
|----------|---------|---------|
| `DATABASE_URL` | MySQL connection string | `mysql://root:pass@localhost:3306/borrowbox` |
| `SUPABASE_URL` | Supabase project endpoint | `https://abc123.supabase.co` |
| `SUPABASE_KEY` | Supabase anonymous key | `eyJhbG...` |
| `GOOGLE_PROJECT_ID` | GCP project for Vision API | `my-project-12345` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary account name | `my-cloud` |
| `NODE_ENV` | Environment mode | `development` or `production` |
| `PORT` | Backend server port | `3000` |
| `CLIENT_PORT` | Frontend dev server port | `5173` |

### Database Setup

#### Step 4: Initialize MySQL Database

Create a new MySQL database:

```bash
mysql -u root -p
```

Then in MySQL console:

```sql
CREATE DATABASE borrowbox_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
SHOW DATABASES;
```

Exit with `exit`.

#### Step 5: Run Database Migrations

Apply Drizzle schema migrations:

```bash
pnpm db:push
```

**Expected output:**
```
✓ Schema synchronization successful
✓ Tables created:
  - users
  - items
  - deals
  - transactions
  - reviews
  - messages
  - reports
```

### Running Locally

#### Step 6: Start Development Server

Start both backend (Express + tRPC) and frontend (Vite) concurrently:

```bash
pnpm dev
```

**Expected output:**
```
> tRPC Server running on http://localhost:3000
> Vite dev server running on http://localhost:5173
> Database connected successfully
> Supabase client initialized
> Cloudinary client initialized
```

#### Step 7: Access the Application

Open your browser and navigate to:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000

**First-time setup checklist:**
- [ ] Create an account (Supabase signup)
- [ ] Verify email address
- [ ] Update your profile with UPI ID and WhatsApp number
- [ ] Verify WhatsApp via OTP
- [ ] List an item (triggers GCV safety check)
- [ ] Browse and initiate a deal

---

## 📱 Usage Guide

### User Roles & Workflows

#### Role 1: Buyer
1. **Register/Login** → Sign up via Supabase (email verification required)
2. **Browse Items** → Search, filter by category, view Cloudinary-optimized images
3. **Initiate Deal** → Click "I want this" on an item (creates OPEN deal)
4. **Negotiate** → Click WhatsApp icon → Get direct chat link with seller
5. **Schedule Meetup** → Coordinate time and location via WhatsApp
6. **Receive Item** → Meet seller, receive physical item
7. **Confirm Delivery** → Mark item as received in app
8. **Pay via UPI** → Scan dynamic UPI QR code → Complete payment
9. **Submit UTR** → (Optional) Submit UPI transaction reference for verification
10. **Review** → Rate seller and leave feedback

#### Role 2: Seller
1. **Register/Login** → Sign up via Supabase
2. **Verify WhatsApp** → Enable OTP verification (required for multiple listings)
3. **List Item** → Upload photo → GCV safety check → Set category, price, description
4. **Monitor Inquiries** → Dashboard shows buyer interest in real-time
5. **Negotiate** → Buyer initiates WhatsApp chat with prefilled message
6. **Arrange Meeting** → Discuss time and location via WhatsApp
7. **Handover** → Meet buyer at agreed location, transfer physical item
8. **Mark Shipped** → Update deal to "Shipped" status
9. **Deliver Item** → Finalize delivery to buyer
10. **Confirm Payment** → Receive payment via UPI QR or PIN handshake
11. **Review** → Rate buyer and leave feedback

### Marketplace Navigation

```
Home Page
├── Featured Items (Cloudinary-optimized thumbnails)
├── Browse by Category
└── User Authentication (Supabase)

Marketplace
├── Search by Title (Real-time autocomplete)
├── Filter by Category, Condition, Price
├── Sort by Price/Recent/Rating
└── Item Detail Pages (Full resolution Cloudinary images)

Dashboard (Authenticated Users)
├── Seller Dashboard
│   ├── My Listings (with image gallery)
│   ├── Incoming Inquiries
│   ├── Active Deals (with deal status)
│   └── Completed Transactions
└── Buyer Dashboard
    ├── My Purchases
    ├── Active Deals (with PIN & UTR tracking)
    ├── Deal Status Tracking
    └── Payment History

Profile
├── Personal Information
├── UPI ID & WhatsApp Setup
├── WhatsApp Verification Status
└── Trust Score & Reviews
```

---

## 🔌 API Documentation

### tRPC Router Overview

All API endpoints are fully type-safe via tRPC. The client-side types are automatically generated from server-side router definitions.

#### Authentication Router (Supabase-Managed)

```typescript
// Registration (via Supabase)
POST /trpc/auth.signUp
Input: { email: string; password: string; name: string }
Output: { user: AuthUser; session: Session }

// Login (via Supabase)
POST /trpc/auth.signIn
Input: { email: string; password: string }
Output: { user: AuthUser; session: Session }

// Get Current User
GET /trpc/auth.me
Output: { user: AuthUser | null }

// Logout (revoke session)
POST /trpc/auth.logout
Output: { success: boolean }

// Sync Supabase Session
POST /trpc/auth.syncSession
Input: { accessToken: string }
Output: { success: boolean }
```

#### Items Router (with GCV & Cloudinary)

```typescript
// Create new item with GCV safety check
POST /trpc/items.create
Input: { title, description, amount, imageUrl, category, condition }
Output: { success: boolean; itemId: number }
Note: imageUrl goes through Google Cloud Vision for prohibited item detection

// List all items (with pagination & filters)
GET /trpc/items.getAll?limit=12&offset=0&category=Books&search=calculus
Output: { items: Item[]; nextOffset: number | null }

// Get single item with seller info
GET /trpc/items.getById?id=item_123
Output: { item: Item; seller: UserProfile }

// Update item (with GCV recheck)
PUT /trpc/items.update
Input: { id: number; title?, description?, amount?, imageUrl?, category?, condition? }
Output: { success: boolean }

// Delete item
DELETE /trpc/items.delete?id=item_123
Output: { success: boolean }

// Report inappropriate listing
POST /trpc/items.report
Input: { itemId: number; reason: string; description?: string }
Output: { success: boolean }
```

#### Deals Router (with PIN & UTR)

```typescript
// Create a deal (buyer initiates interest)
POST /trpc/deals.create
Input: { itemId: number }
Output: { success: boolean; dealId: number }
Note: Automatically generates encrypted PIN

// Get deal by ID
GET /trpc/deals.getById?id=deal_456
Output: { deal: Deal }

// Update deal status
PUT /trpc/deals.updateStatus
Input: { dealId: number; status: "OPEN" | "Shipped" | "DELIVERED" }
Output: { success: boolean }

// Confirm delivery (buyer action)
POST /trpc/deals.confirmDelivery
Input: { dealId: number }
Output: { success: boolean }
Note: Generates dynamic UPI QR code

// Seller confirms with PIN
POST /trpc/deals.confirmWithPin
Input: { dealId: number; pin: string }
Output: { success: boolean }
Note: PIN must be exactly 6 digits; 5 attempts max

// Mark as paid (buyer action)
POST /trpc/deals.markPaid
Input: { dealId: number }
Output: { success: boolean }

// Submit UPI transaction reference
POST /trpc/deals.submitUtr
Input: { dealId: number; utr: string }
Output: { success: boolean }
Note: UTR must be exactly 12 digits

// Raise dispute (either party)
POST /trpc/deals.raiseDispute
Input: { dealId: number }
Output: { success: boolean }
Note: Automatically regenerates PIN and resets attempt counter

// Cancel deal
POST /trpc/deals.cancel
Input: { dealId: number }
Output: { success: boolean }
```

#### User Router

```typescript
// Get own profile (authenticated)
GET /trpc/user.getProfile
Output: { user: AuthUser; profile: UserProfile }

// Update profile
PUT /trpc/user.updateProfile
Input: { upiId?: string; upiName?: string; whatsapp?: string }
Output: { success: boolean }

// Get public profile by ID
GET /trpc/user.getPublicProfileById?userId=user_789
Output: { user: PublicUser; trustScore: number; reviews: Review[] }

// Send WhatsApp OTP
POST /trpc/user.sendWhatsAppOtp
Output: { success: boolean }

// Verify WhatsApp OTP
POST /trpc/user.verifyWhatsAppOtp
Input: { otp: string }
Output: { success: boolean }

// Delete account (anonymizes user)
POST /trpc/user.deleteAccount
Output: { success: boolean }
```

#### Reviews Router

```typescript
// Create review for completed deal
POST /trpc/reviews.create
Input: { dealId: number; rating: 1-5; comment?: string }
Output: { success: boolean }

// Get reviews for user
GET /trpc/reviews.getByUser?userId=user_789
Output: { reviews: Review[]; trustScore: number }
```

#### Admin Router (admin-only)

```typescript
// Get platform statistics
GET /trpc/admin.getStats
Output: { totalUsers: number; totalItems: number; totalDeals: number; ... }

// List all users
GET /trpc/admin.getAllUsers
Output: { users: User[] }

// Ban/unban user
POST /trpc/admin.banUser
Input: { userId: number; isBanned: 1 | 0 }
Output: { success: boolean }

// Get all item reports
GET /trpc/admin.getReports
Output: { reports: Report[] }

// Update report status
POST /trpc/admin.updateReportStatus
Input: { reportId: number; status: "OPEN" | "RESOLVED" | "DISMISSED" }
Output: { success: boolean }
```

### Request/Response Examples

#### Example 1: Create Item with Image Safety Check

```bash
# Request
curl -X POST http://localhost:3000/trpc/items.create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <supabase-token>" \
  -d '{
    "title": "Calculus Textbook",
    "description": "Advanced Calculus - Used for 1 semester",
    "amount": "300",
    "category": "Books",
    "imageUrl": "https://res.cloudinary.com/my-cloud/image/upload/...",
    "condition": "Good"
  }'

# Response (if image passes GCV safety check)
{
  "result": {
    "data": {
      "success": true,
      "itemId": 42
    }
  }
}

# Response (if image contains prohibited items)
{
  "error": {
    "message": "The uploaded image was flagged as unsafe or contains a restricted item."
  }
}
```

#### Example 2: Initiate Deal with PIN Generation

```bash
# Request
curl -X POST http://localhost:3000/trpc/deals.create \
  -H "Authorization: Bearer <supabase-token>" \
  -d '{ "itemId": 42 }'

# Response
{
  "result": {
    "data": {
      "success": true,
      "dealId": 99
    }
  }
}
```

#### Example 3: Get PIN and Confirm with PIN

```bash
# Get PIN (buyer action)
curl -X GET http://localhost:3000/trpc/deals.getMyDealPin?dealId=99 \
  -H "Authorization: Bearer <buyer-token>"

# Response
{ "result": { "data": { "pin": "123456", "viewedBefore": false } } }

# Seller confirms with PIN
curl -X POST http://localhost:3000/trpc/deals.confirmWithPin \
  -H "Authorization: Bearer <seller-token>" \
  -d '{ "dealId": 99, "pin": "123456" }'

# Response (deal is now PAID, item is SOLD)
{ "result": { "data": { "success": true } } }
```

#### Example 4: Submit UTR for Dispute Resolution

```bash
# Buyer submits UPI transaction reference
curl -X POST http://localhost:3000/trpc/deals.submitUtr \
  -H "Authorization: Bearer <buyer-token>" \
  -d '{ "dealId": 99, "utr": "429374923742" }'

# Response
{ "result": { "data": { "success": true } } }
```

---

## 🗄️ Database Schema

### Entity-Relationship Diagram

```
┌──────────────┐          ┌──────────────┐          ┌─────────────┐
│    users     │          │   items      │          │   reviews   │
├──────────────┤          ├──────────────┤          ├─────────────┤
│ id (PK)      │◄────┐    │ id (PK)      │          │ id (PK)     │
│ email        │     │    │ title        │          │ dealId(FK)  │
│ name         │     │    │ description  │          │ reviewerId  │
│ whatsapp     │     │    │ amount       │          │ revieweeId  │
│ verified     │     │    │ category     │          │ rating      │
│ rating       │     │    │ condition    │          │ comment     │
│ reviews      │     │    │ imageUrl     │          │ role        │
│ createdAt    │     │    │ sellerId(FK) ├──────────┤ createdAt   │
└──────────────┘     │    │ status       │          └─────────────┘
       ▲              │    │ createdAt    │
       │              │    │ updatedAt    │
       │              │    └──────────────┘
       │              │            ▲
       │              │            │ 1:N
       │              │            │
       │              │    ┌──────────────┐
       │              │    │   deals      │
       │              │    ├──────────────┤
       │              │    │ id (PK)      │
       │              │    │ itemId(FK)   │
       │              │    │ buyerId(FK)  │
       │              ├────┤ sellerId(FK) │
       │              │    │ status       │
       │              │    │ amount       │
       │              │    │ pinHash      │
       │              │    │ pinEncrypted │
       │              │    │ pinViewedAt  │
       │              │    │ pinAttempts  │
       │              │    │ upiQrCode    │
       │              │    │ utr          │
       │              │    │ createdAt    │
       │              │    └──────────────┘
       │              │            │
       │              │            │ 1:N
       │              │            ▼
       │              │    ┌──────────────┐
       └──────────────┼────┤ messages     │
                      │    ├──────────────┤
                      │    │ id (PK)      │
                      │    │ dealId(FK)   │
                      │    │ senderId(FK) │
                      │    │ text         │
                      │    │ createdAt    │
                      │    └──────────────┘
                      │
                      │    ┌──────────────┐
                      └────┤ reports      │
                           ├──────────────┤
                           │ id (PK)      │
                           │ itemId(FK)   │
                           │ reporterId   │
                           │ reason       │
                           │ description  │
                           │ status       │
                           │ createdAt    │
                           └──────────────┘
```

### Table Definitions

#### `users` Table
```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  upiId VARCHAR(50),
  upiName VARCHAR(80),
  whatsapp VARCHAR(15),
  whatsappVerified INT DEFAULT 0,
  whatsappOtp VARCHAR(255),
  whatsappOtpExpiresAt TIMESTAMP,
  isEmailVerified INT DEFAULT 0,
  trustScore DECIMAL(3,2) DEFAULT 0.0,
  reviews INT DEFAULT 0,
  isBanned INT DEFAULT 0,
  passwordHash VARCHAR(255),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_whatsappVerified (whatsappVerified)
);
```

#### `items` Table
```sql
CREATE TABLE items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  amount VARCHAR(20) NOT NULL,
  category VARCHAR(50),
  condition VARCHAR(20) DEFAULT 'Good',
  imageUrl VARCHAR(500),
  sellerId INT NOT NULL,
  status ENUM('OPEN', 'SOLD', 'DELISTED') DEFAULT 'OPEN',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (sellerId) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_status (status),
  INDEX idx_category (category),
  INDEX idx_sellerId (sellerId),
  FULLTEXT INDEX ft_search (title, description)
);
```

#### `deals` Table
```sql
CREATE TABLE deals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  itemId INT NOT NULL,
  buyerId INT NOT NULL,
  sellerId INT NOT NULL,
  amount VARCHAR(20),
  status ENUM('OPEN', 'Shipped', 'DELIVERED', 'PAID', 'CANCELLED', 'DISPUTED', 'NEEDS_ATTENTION') DEFAULT 'OPEN',
  pinHash VARCHAR(255),
  pinEncrypted VARCHAR(500),
  pinViewedAt TIMESTAMP,
  pinAttempts INT DEFAULT 0,
  pinLockedAt TIMESTAMP,
  upiQrCode LONGTEXT,
  buyerConfirmed INT DEFAULT 0,
  utr VARCHAR(20),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (itemId) REFERENCES items(id) ON DELETE CASCADE,
  FOREIGN KEY (buyerId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (sellerId) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_status (status),
  INDEX idx_buyerId (buyerId),
  INDEX idx_sellerId (sellerId),
  INDEX idx_itemId (itemId)
);
```

#### `reviews` Table
```sql
CREATE TABLE reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  dealId INT NOT NULL,
  reviewerId INT NOT NULL,
  revieweeId INT NOT NULL,
  rating INT NOT NULL,
  comment TEXT,
  role ENUM('buyer', 'seller'),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (dealId) REFERENCES deals(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewerId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (revieweeId) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_dealId (dealId),
  INDEX idx_revieweeId (revieweeId)
);
```

#### `messages` Table
```sql
CREATE TABLE messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  dealId INT NOT NULL,
  senderId INT NOT NULL,
  text TEXT NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (dealId) REFERENCES deals(id) ON DELETE CASCADE,
  FOREIGN KEY (senderId) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_dealId (dealId)
);
```

#### `reports` Table
```sql
CREATE TABLE reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  itemId INT NOT NULL,
  reporterId INT NOT NULL,
  reason VARCHAR(100),
  description TEXT,
  status ENUM('OPEN', 'RESOLVED', 'DISMISSED') DEFAULT 'OPEN',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (itemId) REFERENCES items(id) ON DELETE CASCADE,
  FOREIGN KEY (reporterId) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_status (status)
);
```

---

## 💻 Development

### Available Scripts

```bash
# Start development servers (Frontend + Backend with auto-reload)
pnpm dev

# Build for production
pnpm build
  # Compiles:
  # - Frontend: Vite production bundle → dist/
  # - Backend: esbuild → dist/index.js

# Start production server
pnpm start

# Type checking
pnpm check
  # Runs: tsc --noEmit
  # Checks TypeScript without emitting files

# Format code
pnpm format
  # Runs: prettier --write .
  # Auto-formats all files

# Run tests
pnpm test
  # Runs: vitest run
  # Executes all .test.ts files

# Database migration
pnpm db:push
  # Pushes schema changes to MySQL
  # Creates migration files if needed
```

### Code Quality

#### TypeScript Configuration
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "strict": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "jsxImportSource": "react"
  }
}
```

#### Code Style (Prettier)
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false
}
```

### Testing

#### Unit Tests (Vitest)
```typescript
// server/__tests__/items.test.ts
import { describe, it, expect } from 'vitest';
import { checkImageSafety } from '../vision';

describe('Image Safety Verification', () => {
  it('should flag prohibited items', async () => {
    const result = await checkImageSafety('image-url');
    expect(result).toHaveProperty('safe');
  });
});
```

---

## 🚢 Deployment

### Production Checklist

- [ ] Set `NODE_ENV=production` in deployment
- [ ] Configure Supabase production project
- [ ] Set up Cloudinary production account
- [ ] Configure Google Cloud Vision service account (production)
- [ ] Set database to production MySQL instance
- [ ] Enable HTTPS and configure CSP headers
- [ ] Set `FRONTEND_URL` to production domain
- [ ] Run `pnpm build` and test production bundle locally
- [ ] Configure environment variables in deployment platform
- [ ] Set up monitoring and error tracking (Sentry, etc.)
- [ ] Test all authentication flows end-to-end
- [ ] Verify Cloudinary images load correctly

### Deployment Platforms Tested

- **Render**: Frontend + Backend hosting
- **Vercel**: Frontend hosting (alternative)
- **Railway/Fly.io**: Backend hosting (alternatives)
- **AWS RDS**: MySQL database
- **Supabase Hosting**: Already managed

---

## 🛣️ Roadmap

### Phase 1 (Current)
- [x] Core marketplace with item listings
- [x] Deal lifecycle state machine
- [x] WhatsApp integration
- [x] UPI QR code generation
- [x] Supabase authentication
- [x] Cloudinary media optimization
- [x] Google Cloud Vision safety checks
- [x] PIN-based confirmation
- [x] Dispute resolution system
- [x] Rate limiting

### Phase 2 (In Progress)
- [ ] In-app messaging (replacing WhatsApp for sensitive communications)
- [ ] Email notifications
- [ ] Push notifications
- [ ] Seller analytics dashboard
- [ ] Advanced search with ML recommendations
- [ ] Bulk operations for sellers

### Phase 3 (Planned)
- [ ] Campus authentication (SSO)
- [ ] Payment processing (Razorpay, Stripe integration)
- [ ] Advanced dispute resolution with mediators
- [ ] Seller verification badges
- [ ] Campus-specific communities
- [ ] Item condition photos/360° views
- [ ] Automated refund system

---

## 🐛 Troubleshooting

### Common Issues

#### "Cannot find Cloudinary URL"
- Ensure `CLOUDINARY_CLOUD_NAME` is set in `.env`
- Check that images are uploaded to Cloudinary correctly
- Verify Cloudinary account permissions

#### "GCV safety check failed"
- Ensure Google Cloud credentials are properly set
- Check `GOOGLE_PROJECT_ID`, `GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY`
- Verify service account has Vision API permissions
- Check console for detailed error messages

#### "Supabase authentication not working"
- Verify `SUPABASE_URL` and `SUPABASE_KEY` are correct
- Check that email verification is enabled in Supabase
- Clear browser cookies and try again
- Check Supabase console for auth errors

#### "Database migration failed"
- Ensure MySQL is running: `mysql -u root -p`
- Check `DATABASE_URL` format
- Run `pnpm db:push` again
- Check Drizzle config for correct database name

#### "Port 3000 already in use"
- Server will automatically find next available port
- Or manually kill process: `lsof -i :3000` then `kill -9 <PID>`
- Or change `PORT` in `.env`

---

## 🤝 Contributing

We love your input! We want to make contributing to BorrowBox as easy and transparent as possible.

### Development Workflow

1. **Fork** the repository
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes** and commit: `git commit -m 'Add amazing feature'`
4. **Push to branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request** with detailed description

### Coding Standards

- Write TypeScript (no bare JavaScript)
- Follow the Prettier code style
- Add comments for complex logic
- Ensure tests pass: `pnpm test`
- Type check: `pnpm check`

---

## 🔐 Security

### Security Measures Implemented

1. **Authentication**: Supabase JWT tokens, HttpOnly cookies
2. **Authorization**: Role-based access control (buyer, seller, admin)
3. **Rate Limiting**: Per-endpoint rate limits on sensitive actions
4. **Input Validation**: Zod schema validation on all inputs
5. **Content Security**: DOMPurify, Helmet CSP headers
6. **Image Verification**: Google Cloud Vision for unsafe content
7. **Cryptography**: Bcrypt password hashing, PIN encryption
8. **Data Privacy**: User anonymization on account deletion
9. **HTTPS**: Required in production

### Reporting Security Issues

Found a security vulnerability? Please email `security@borrowbox.dev` (or create a private security advisory on GitHub).

**Do not** open a public issue for security vulnerabilities.

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 👏 Acknowledgments

- **Supabase** for authentication infrastructure
- **Cloudinary** for media optimization
- **Google Cloud Vision** for image safety verification
- **React**, **TypeScript**, **Tailwind CSS** communities
- **shadcn/ui** for beautiful components
- All contributors and beta testers

---

## 📞 Contact & Support

- **Issues**: [GitHub Issues](https://github.com/Immortal-Ninja-1956/BorrowBox/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Immortal-Ninja-1956/BorrowBox/discussions)
- **Email**: support@borrowbox.dev
- **Live Demo**: [https://borrowbox-last.onrender.com](https://borrowbox-last.onrender.com)

---

<div align="center">

### Made with ❤️ by [Immortal-Ninja-1956](https://github.com/Immortal-Ninja-1956)

⭐ **If this project helped you, please consider giving it a star!**

</div>
