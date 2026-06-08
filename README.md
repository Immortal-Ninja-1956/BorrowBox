# BorrowBox

[![Status](https://img.shields.io/badge/status-active-success.svg)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF.svg)](https://vite.dev/)
[![tRPC](https://img.shields.io/badge/tRPC-v11-2596be.svg)](https://trpc.io/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38B2AC.svg)](https://tailwindcss.com/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle%20ORM-v0.44-C5F74F.svg?logo=drizzle)](https://orm.drizzle.team/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1.svg?logo=mysql&logoColor=white)](https://www.mysql.com/)

**Borrow. Share. Repeat.** A secure, localized peer-to-peer campus marketplace web application designed specifically for college students to buy, sell, or rent items.

---

## 📖 Table of Contents
- [About the Project](#about-the-project)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Environment Variables](#environment-variables)
  - [Installation & Local Run](#installation--local-run)
- [Usage & User Flow](#usage--user-flow)
- [Roadmap](#roadmap)
- [Known Limitations](#known-limitations)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

---

## 🌐 About the Project

BorrowBox is a peer-to-peer marketplace tailored to the unique financial and logistical constraints of college students. It solves the problem of underutilized assets on campus (such as textbooks, calculators, lab gear, and mini-fridges) by providing a fast, trusted campus-bound meetup framework.

Instead of paying high shipping costs or dealing with online payment scams, BorrowBox operates on a physical campus meetup model with a strictly governed transaction lifecycle, integrated WhatsApp deep links for communications, and dynamic UPI QR code generation.

---

## ⚡ Key Features

### 🌟 Core Standout Features
* **Direct-to-WhatsApp Integration**: One-click connection using normalized WhatsApp `wa.me` deep links. Once a buyer clicks *"I want this"*, the platform instantly generates a direct chat link with a pre-filled transaction message, bypassing the need for in-app chat clutter and enabling immediate, real-world coordination.
* **Trust-Enforced UPI QR Code Flow**: A unique payment flow designed to prevent pre-payment scams. A dynamic UPI QR code (`upi://pay`) prepopulated with the seller's UPI credentials and the exact item price is **only generated and shown to the buyer** after the seller has physically met the buyer and marked the item as `DELIVERED`.

### 🛡️ Platform Capabilities
* **Campus-Scoped Discovery**: Fast, client-side autocomplete search and category-based filtering (Books, Electronics, Gear, etc.) for high-speed local item discovery.
* **Secure Authentication & Profiles**: Robust login system with password hashing (`bcryptjs`) and session tokens protected via `HttpOnly` and `Secure` cookies.
* **Step-by-Step Deal Lifecycles**: A highly structured 4-state state machine (`OPEN` ➔ `Contacted` ➔ `DELIVERED` ➔ `PAID`) coordinating buyer and seller actions.
* **Interactive Dashboards**: Unified workspace for users to manage listed items, monitor incoming buyer inquiries, and trace ongoing purchases/sales.

---

## 🛠️ Tech Stack

### Frontend
- **React 19** & **TypeScript**
- **Vite 7** (Build tool)
- **Tailwind CSS v4** (Utility-first styling)
- **tRPC Client** & **TanStack React Query** (Type-safe RPC & cache management)
- **shadcn/ui** & **Lucide React** (Component styling and iconography)
- **wouter** (Lightweight router)

### Backend
- **Node.js** & **Express**
- **tRPC Server** (Fully type-safe API boundaries)
- **Multer** (Local file uploads)
- **Jose** & **jsonwebtoken** (Auth tokens validation)

### Database & Storage
- **MySQL** (Relational storage)
- **Drizzle ORM** & **Drizzle Kit** (Schema management & queries)
- **AWS S3 / S3 API** (Optional object storage integration, falls back to local disk storage)

---

## 📁 Project Structure

```
borrowbox/
├── client/                 # React frontend application
│   ├── public/             # Static public assets
│   └── src/                # Frontend source code
│       ├── _core/          # Global configurations
│       ├── components/     # Reusable shadcn/ui and layout components
│       ├── contexts/       # React contexts (e.g., AuthProvider)
│       ├── hooks/          # Custom utility hooks
│       ├── lib/            # Libraries (e.g., tRPC client API configuration)
│       ├── pages/          # View routes (Marketplace, Dashboard, Details, etc.)
│       └── index.css       # Global Tailwind v4 stylesheet
├── server/                 # Express + tRPC API backend
│   ├── _core/              # Server bootstrap and entry point
│   ├── db.ts               # Drizzle schema definitions and database connection
│   ├── routers.ts          # tRPC API router endpoints (auth, items, deals)
│   ├── storage.ts          # Storage handlers (S3 client / local filesystem)
│   ├── upload.ts           # Multer file upload middleware configuration
│   └── *.test.ts           # Vitest API backend unit tests
├── shared/                 # Common interfaces and validation schemas
├── drizzle/                # SQL migrations folder managed by Drizzle Kit
├── patches/                # Dependency hotfixes (e.g., wouter patches)
├── package.json            # Configuration and script file
└── tsconfig.json           # TypeScript configuration
```

---

## 🚀 Getting Started

Follow these steps to get BorrowBox running on your local machine.

### Prerequisites

- **Node.js** (v18.x or v20.x recommended)
- **pnpm** (or npm/yarn)
- **MySQL** (A running local or cloud instance)

### Environment Variables

Create a `.env` file in the root `borrowbox/` directory:

```env
# Database Connection URL (Drizzle uses MySQL)
DATABASE_URL=mysql://<db_user>:<db_password>@<db_host>:<db_port>/<db_name>

# JSON Web Token Secret
JWT_SECRET=your-random-jwt-development-secret-key
```

### Installation & Local Run

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/borrowbox.git
   cd borrowbox
   ```

2. **Install dependencies:**
   Using `pnpm` (which is configured in this repository):
   ```bash
   pnpm install
   ```
   *(Or run `npm install`)*

3. **Set up the Database Schema:**
   Apply migrations to your MySQL database:
   ```bash
   pnpm db:push
   ```

4. **Start the Development Server:**
   This starts the Vite client and Node.js Express/tRPC server concurrently:
   ```bash
   pnpm dev
   ```
   Open [http://localhost:5173](http://localhost:5173) in your browser to view the application.

---

## 🛠️ Usage & User Flow

1. **Register/Login**: Create an account using an email address and set your UPI ID/Name and WhatsApp phone number in your profile.
2. **List an Item**: Upload a picture of an item you want to sell/rent, specify a category, and set a price.
3. **Initiate Deal**: As a buyer, click **"I want this"** on an item. This creates an `OPEN` deal.
4. **Negotiation**: The buyer is prompted with a direct WhatsApp message shortcut to coordinate a physical meetup.
5. **Meetup & Handover**: The physical exchange occurs. Once done, the seller marks the deal as `DELIVERED`.
6. **Payment**: The buyer’s dashboard automatically updates to show a custom UPI QR code containing the exact item price. The buyer scans the QR code using Google Pay, PhonePe, or Paytm and completes the payment.
7. **Complete Deal**: Once the seller verifies the payment in their banking app, they click **"Confirm Payment"** to close the deal as `PAID` and mark the item as `SOLD`.

---

## 🗺️ Roadmap

- [ ] **Phase 1: Trust & Verification**
  - Integrate college `.edu` email validation to restrict access to real university students.
  - Implement a peer rating and review system post-deal.
- [ ] **Phase 2: Platform Enhancements**
  - Implement S3 storage configurations as the default option for horizontal scalability.
  - Transition client-side search autocomplete to a lightweight server-side fuzzy search.
- [ ] **Phase 3: Messaging & Scalability**
  - Add in-app WebSocket instant messaging to eliminate reliance on external WhatsApp deep-links.
  - Add support for multiple image uploads per item listing.

---

## ⚠️ Known Limitations

- **P2P Trust Reliance**: The platform does not use an Escrow system or verify UPI transfers via webhook callbacks. It relies on the seller verifying funds in their personal accounts before clicking "Confirm Payment."
- **Local Media Storage**: By default, uploaded item images are saved to the server's local file system (`/uploads`), which requires local persistence. S3 configuration variables are recommended for containerized deployments.

---

## 🤝 Contributing

Contributions make the open-source community an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

## ✉️ Contact

- **Project Link**: ([https://github.com/your-username/borrowbox](https://github.com/Immortal-Ninja-1956/BorrowBox))

---
*Created with ❤️ for VIT college students.*
