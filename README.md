# Vaucher App

Comprehensive Gift Card / Voucher Purchase Agreement (*«Договор купли-продажи подарочных карт»*) management platform with an **Angular** frontend, **NestJS** backend, and **Neon PostgreSQL** database.

---

## 1. Why This Project is Needed & How It Works

### Business Problem Solved
In corporate retail sales, businesses purchase gift cards and vouchers in bulk. Generating legal purchase agreements manually involves complex calculations (voucher counts, denominations, 12% VAT calculations, price before VAT, and spelled-out amount in Russian) and multi-format document exporting (DOCX and PDF). Furthermore, operations teams must track delivery numbers, contractor IDs, order numbers, and invoice numbers across the document lifecycle.

### Key Features
1. **Contract Drafting & Calculations (`/`)**:
   - Dynamic form modal and inline editing for contract number, date, company name, signatory, document basis, bank requisites, and denomination breakdown.
   - Automatic calculations: subtotal, delivery cost, 12% VAT, grand total, and Russian spelled-out number (*число прописью*).
   - High-fidelity **PDF** and native Microsoft Word **DOCX** generation.
   - One-click submission to save the document to the Neon PostgreSQL database with auto-incremented 3-digit identifiers (`001`, `002`, ...).

2. **Operations Dashboard (`/dashboard`)**:
   - Password-protected manager dashboard (`KorzinkaVaucher2026`).
   - Real-time search across all contract metadata, TIN/ИНН, contractor numbers, order numbers, delivery numbers, and notes.
   - Document inspection, editing, and deletion.
   - Status tagging with custom row and note background colors.
   - Stylized **Excel (`.xlsx`)** export with cell background colors.

---

## 2. Project Architecture

```text
vaucher-app/
├── backend/                       # NestJS Application
│   ├── prisma/
│   │   └── schema.prisma          # PostgreSQL Schema (Neon)
│   ├── src/
│   │   ├── documents/             # Documents Module (controller, service, DTOs)
│   │   ├── prisma/                # Prisma ORM Module & Service
│   │   ├── app.module.ts
│   │   └── main.ts                # App entry (port 3000, CORS, /api prefix)
│   ├── .env.example               # Database connection template
│   └── package.json
│
├── frontend/                      # Angular Application
│   ├── src/
│   │   ├── app/
│   │   │   ├── dashboard/         # Dashboard & Modals
│   │   │   ├── services/
│   │   │   │   ├── document-api.service.ts  # Communicates with NestJS API
│   │   │   │   └── document.service.ts      # DOCX & PDF generation logic
│   │   │   └── app.ts             # Main Contract Editor
│   │   └── environments/
│   ├── proxy.conf.json            # Proxies /api/* to localhost:3000
│   ├── angular.json
│   └── package.json
│
├── package.json                   # Root workspace scripts
└── README.md
```

---

## 3. Getting Started

### Requirements
- **Node.js**: v20+ (tested on Node v24)
- **npm**: v10+
- **Neon PostgreSQL**: A free Neon database project from [neon.tech](https://neon.tech)

---

### Step 1: Install Dependencies

From the project root:

```bash
npm run install:all
```

---

### Step 2: Configure Neon Database

1. In the `backend/` folder, copy `.env.example` to `.env`:
   ```bash
   cp backend/.env.example backend/.env
   ```
2. Open `backend/.env` and paste your Neon PostgreSQL connection string:
   ```env
   DATABASE_URL="postgresql://<user>:<password>@<ep-xyz>.neon.tech/neondb?sslmode=require"
   PORT=3000
   ```
3. Push the schema to your Neon database:
   ```bash
   npm run prisma:push
   ```

---

### Step 3: Run the Application

#### Start Backend (NestJS on port 3000):
```bash
npm run start:backend
```

#### Start Frontend (Angular on port 4200):
```bash
npm run start:frontend
```

Now open:
- **Contract Editor**: [http://localhost:4200](http://localhost:4200)
- **Dashboard**: [http://localhost:4200/dashboard](http://localhost:4200/dashboard) (Password: `KorzinkaVaucher2026`)
- **Backend API**: [http://localhost:3000/api/documents](http://localhost:3000/api/documents)

---

## 4. Useful Scripts

| Command | Description |
|---|---|
| `npm run start:backend` | Starts the NestJS API server in development mode |
| `npm run start:frontend` | Starts the Angular frontend dev server |
| `npm run build` | Builds both backend and frontend applications |
| `npm run prisma:generate` | Regenerates Prisma Client from schema |
| `npm run prisma:push` | Syncs schema changes directly to Neon PostgreSQL |
| `npm run prisma:studio` | Launches Prisma Studio GUI for database inspection |
