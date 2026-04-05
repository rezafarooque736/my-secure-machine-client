# 🖥️ Remote Desktop Manager

A production‑ready, secure web interface for managing remote desktop connections. Built with **Next.js 16**, **React 19**, **Prisma**, **guacamole** and **Tailwind CSS**.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-16.1-black)
![React](https://img.shields.io/badge/React-19.2-61dafb)
![Prisma](https://img.shields.io/badge/Prisma-7.6-2d3748)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6)

---

## ✨ Features

- 🔐 **Secure authentication** – httpOnly cookies, rate limiting, CSP headers, XSS protection.
- 🖥️ **Remote desktop access** – RDP, VNC, SSH, Telnet via Guacamole.
- 📊 **Dashboard** – Real‑time usage stats, recent sessions, system notices.
- 👤 **User profile** – Manage personal info, view activity summary.
- 📈 **Activity analytics** – Session timeline charts, protocol distribution, duration metrics.
- 🌙 **Dark / light mode** – Persistent theme preference.
- 🐳 **Docker Compose** – Full stack (PostgreSQL, Guacamole, guacd, VNC test container) for easy evaluation.

---

## 🧱 Tech Stack

| Category           | Technologies                                                                   |
| ------------------ | ------------------------------------------------------------------------------ |
| **Frontend**       | Next.js (App Router), React 19, Tailwind CSS, Radix UI, Recharts, Lucide Icons |
| **Backend**        | Next.js API routes, Prisma ORM, PostgreSQL                                     |
| **Auth**           | Guacamole token stored in httpOnly cookie, rate limiting, Zod validation       |
| **Remote Desktop** | Apache Guacamole (guacd, Guacamole web app), WebSocket tunnel                  |
| **DevOps**         | Docker Compose, standalone Next.js output                                      |

---

## 🏗️ Architecture Overview

The application acts as a **proxy layer** between the user and Apache Guacamole:

1. User logs in via the Next.js login page.
2. The Next.js API route (`/api/auth/login`) authenticates against Guacamole’s REST API.
3. Upon success, a **secure httpOnly cookie** is set containing the Guacamole auth token.
4. All subsequent API calls (dashboard stats, connections list, profile) use this cookie – **token never touches `localStorage`**.
5. The remote desktop connection page fetches the token on‑demand via `/api/auth/token` and establishes a WebSocket tunnel directly to guacd.
6. Session history and audit logs are stored in the local PostgreSQL database.

---

## 📋 Prerequisites

- **Node.js** 20+
- **Docker** (to run locally vnc, postgresql and guacamole)
- **PostgreSQL** 15+ (or use the included Docker Compose)
- **Apache Guacamole** with MySQL/MariaDB backend (Docker Compose provides a ready‑to‑use setup)

---

# Using Docker Compose (Full Stack)

The included `docker-compose.yml` starts:

- PostgreSQL (for the Next.js app)
- MariaDB (for Guacamole’s internal database)
- guacd (Guacamole proxy daemon)
- Guacamole web application (port 8080)
- A VNC test container (for trying connections)

```bash
docker compose up -d
```

# 🔒 Security Highlights

This project follows **OWASP** and **Next.js** security best practices:

| Measure                  | Implementation                                                              |
| ------------------------ | --------------------------------------------------------------------------- |
| HttpOnly cookies         | Auth token never accessible via JavaScript → prevents XSS token theft.      |
| Content Security Policy  | Strict CSP headers (middleware + next.config.ts) block malicious scripts.   |
| Rate limiting            | Login, and API endpoints limited per IP.                                    |
| Input validation         | Zod schemas used on every API route – rejects malformed input.              |
| SQL injection protection | Prisma ORM parameterises all queries – no raw SQL concatenation.            |
| Secure headers           | X-Frame-Options: DENY, X-Content-Type-Options: nosniff, HSTS in production. |
| Generic error messages   | Internal details never leaked to the client – logged server‑side.           |
| Session management       | User sessions tracked in database, automatic logout on token expiry.        |

# 📡 API Routes Overview

All API routes are protected by the httpOnly cookie (except /api/auth/login and /api/auth/token).
| Method | Endpoint | Description |
| ------ | --------------- | ----------- |
| POST | /api/auth/login | Authenticate with Guacamole, set cookie. |
| DELETE | /api/auth/logout | Revoke token, clear cookie, close session. |
| GET | /api/auth/token | Return current auth token (for Guacamole client). |
| GET | /api/connections/list | List all connections available to the user. |
| GET | /api/connections/[id] | Fetch a single connection by ID. |
| GET | /api/sessions/recent | Last N sessions (default 5). |
| GET | /api/stats/dashboard | Aggregated usage stats (active, today, month). |
| GET | /api/stats/activity | Detailed activity timeline + protocol stats. |
| GET | /api/profile | Get user profile attributes. |
| PUT | /api/profile | Update profile (full name, email, org, role). |
| GET | /api/user-sessions | Paginated user session history (local DB). |

# 📁 Project Structure

.
├── app/ # Next.js App Router
│ ├── api/ # API routes (auth, connections, profile, stats, etc.)
│ ├── connection/[id]/ # Remote desktop client page
│ ├── dashboard/ # Dashboard, connections, activity, profile pages
│ ├── layout.tsx # Root layout (ThemeProvider, Toaster)
│ ├── page.tsx # Login page
│ └── not-found.tsx # Global 404
├── components/ # Reusable UI components (Radix based)
│ ├── ui/ # shadcn/ui components
│ ├── app-sidebar.tsx
│ ├── theme-toggle.tsx
│ └── dynamic-breadcrumb.tsx
├── lib/ # Utilities
│ ├── auth.ts # Token verification helpers
│ ├── cookie.ts # HttpOnly cookie management
│ ├── rate-limit.ts # IP‑based rate limiter (LRU cache)
│ ├── logger.ts # Structured logger (console + DB)
│ ├── prisma.ts # Prisma client singleton
│ ├── store.ts # Zustand store (no token persisted)
│ ├── utils.ts # cn() class merger
│ └── validations/ # Zod schemas for all inputs
├── prisma/ # Database schema and migrations
│ ├── schema.prisma
│ └── seed.ts
├── public/ # Static assets (logos, favicon)
├── **tests**/ # Jest tests
├── hooks/ # Custom React hooks (useIsMobile)
├── types/ # TypeScript declarations (Guacamole)
├── middleware.ts # Security headers, CSP, cookie validation
├── next.config.ts # Next.js config + additional CSP
├── docker-compose.yml # Full stack (PostgreSQL, Guacamole, guacd, VNC)
├── Dockerfile # Multi‑stage build for Next.js standalone
├── package.json
└── README.md # You are here

## to deploy this project in your system

only run this command `Docker compose up -d`
