# Ticket Booking System

A full-stack ticket booking platform for movies and concerts with a visual seat map,
time-limited seat holds, concurrency-safe booking, an automatic waitlist, and QR-code
tickets delivered by email.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | NestJS (TypeScript) |
| Database | PostgreSQL (via Prisma ORM) |
| Cache / Queue | Redis (Upstash) + BullMQ |
| Frontend | React (Vite) |
| Auth | JWT + role-based guards (customer / organiser / admin) |
| Email | Resend |
| QR Codes | `qrcode` npm package |

---

## Project Structure

```
online-ticketbooking-system/
├── backend/     # NestJS API
└── frontend/    # React (Vite) client
```

---

## Setup Guide

### Prerequisites

- Node.js 18+
- PostgreSQL (local install, or a hosted instance e.g. Neon/Supabase)
- A Redis instance (e.g. free tier at upstash.com)
- A Resend account (free tier) for email delivery

### 1. Clone and install

```bash
git clone https://github.com/Manohar-Talabattula/ticket-booking-system.git
cd ticket-booking-system

cd backend
npm install

cd ../frontend
npm install
```

### 2. Configure environment variables

**`backend/.env`** — copy `.env.example` and fill in real values:

```
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/ticketbooking?schema=public"
JWT_SECRET="a-long-random-secret-string"
REDIS_URL="rediss://default:YOUR_TOKEN@your-redis-host.upstash.io:6379"
RESEND_API_KEY="re_your_resend_api_key"
FRONTEND_URL="http://localhost:5173"
```

**`frontend/.env`**:

```
VITE_API_URL=http://localhost:3000
```

### 3. Set up the database

```bash
cd backend
npx prisma migrate dev --name init
npx prisma generate
```

This creates all tables (`User`, `Venue`, `Seat`, `Show`, `ShowSeat`, `SeatHold`,
`Booking`, `Waitlist`) in your Postgres database.

### 4. Run the backend

```bash
cd backend
npm run start:dev
```

API runs at `http://localhost:3000`.

### 5. Run the frontend

```bash
cd frontend
npm run dev
```

App runs at `http://localhost:5173`.

### 6. Try it out

1. Register an account (choose role: `CUSTOMER`, `ORGANISER`, or `ADMIN`)
2. As `ADMIN`: create a venue and add seats to it
3. As `ORGANISER`: create a show against that venue, with per-category pricing
4. As `CUSTOMER`: browse shows, select a seat on the seat map, complete checkout,
   check your email for the QR code ticket

---

## `.env.example`

```
# backend/.env.example

DATABASE_URL="postgresql://postgres:password@localhost:5432/ticketbooking?schema=public"
JWT_SECRET="replace-with-a-long-random-string"
REDIS_URL="rediss://default:your-token@your-redis-host.upstash.io:6379"
RESEND_API_KEY="re_your_resend_api_key"
FRONTEND_URL="http://localhost:5173"
```

```
# frontend/.env.example

VITE_API_URL=http://localhost:3000
```

---

## Database Schema

Key tables and how they relate:

- **`User`** — id, name, email, hashed password, role (`CUSTOMER` / `ORGANISER` / `ADMIN`)
- **`Venue`** — belongs to an organiser (creator); has many `Seat`s
- **`Seat`** — the *physical* seat in a venue (row, number, category). Category is one of
  `PREMIUM`, `STANDARD`, `ECONOMY`.
- **`Show`** — an event: title, date, belongs to a `Venue` and an organiser; has many
  `ShowPricing` rows (price per category) and many `ShowSeat` rows.
- **`ShowSeat`** — **the seat map itself.** One row per physical seat, per show, with a
  `status` (`AVAILABLE` / `HELD` / `BOOKED`). This is deliberately separate from `Seat`
  because the same physical seat can be available for one show and booked for another —
  status is never stored on the venue's `Seat` table.
- **`SeatHold`** — a temporary lock on a `ShowSeat` while a customer is checking out.
  Has a unique constraint on `showSeatId`, which is the core mechanism preventing two
  customers from holding the same seat (see below).
- **`Booking`** — a confirmed, permanent reservation. `bookingRef` is the human-facing
  code encoded into the QR ticket.
- **`Waitlist`** — a queue entry per user/show/category, with a `status`
  (`WAITING` / `OFFERED` / `EXPIRED` / `CONVERTED`) and an `offerExpiresAt` timestamp
  once offered.

Full schema: see `backend/prisma/schema.prisma`.

---

## Seat Hold & TTL Logic

1. When a customer selects a seat, the backend attempts to create a `SeatHold` row for
   that `ShowSeat` inside a database transaction.
2. `SeatHold.showSeatId` is a **unique** column. If two customers try to hold the same
   seat at nearly the same instant, Postgres itself rejects the second `INSERT` with a
   unique-constraint violation — this is what actually prevents a double-hold, not
   application-level "check then act" logic (which would have a race condition).
3. On a successful hold, a BullMQ job is scheduled to fire after the TTL (default 10
   minutes) using Redis as the job store.
4. If the customer completes checkout before the TTL, the hold is deleted and the
   scheduled job is cancelled.
5. If the customer does nothing, the BullMQ job fires when the TTL expires, deletes the
   (still-existing) hold, and flips the seat back to `AVAILABLE` — this is the actual
   auto-release mechanism, running as a background worker independent of any HTTP request.
6. A safety check (`if (!hold) return`) in the worker ensures a stale job can never
   accidentally release a seat that was legitimately booked or already released in the
   meantime.

## Concurrency Protection

Handled entirely by the Postgres unique constraint on `SeatHold.showSeatId` described
above, combined with wrapping seat-status updates inside `$transaction` blocks. This
was verified with a real two-customer test: the first hold succeeds, the second
immediately receives `409 Conflict — "Seat is not available"`.

## Waitlist Auto-Assignment & Time-Limited Offers

1. When a show sells out for a category, customers can join a `Waitlist` entry for
   that show + category.
2. When a booking is cancelled, instead of releasing the seat straight to `AVAILABLE`,
   the system queries for the **earliest-joined** `WAITING` entry for that category
   (`ORDER BY joinedAt ASC` — a genuine FIFO queue).
3. If someone is waiting, the seat is put on hold specifically for them (reusing the
   same `SeatHold` mechanism, just with a longer TTL — 15 minutes) and their waitlist
   entry is marked `OFFERED`. They receive an email with a link to claim the seat.
4. A BullMQ job is scheduled for the offer's expiry, on a separate queue from regular
   seat holds.
5. If they complete the booking in time, the hold converts to a real `Booking` as normal.
6. If they don't respond in time, the offer-expiry worker marks their entry `EXPIRED`,
   deletes the hold, and recursively calls the same "offer to next in line" logic —
   which naturally finds the next `WAITING` entry and repeats the cycle. This chain is
   what makes the "if they don't respond, try the next person" requirement work without
   a separate polling loop.

---

## API Documentation

Base URL: `http://localhost:3000`

### Auth

| Method | Endpoint | Body | Notes |
|---|---|---|---|
| POST | `/auth/register` | `{ name, email, password, role }` | `role`: `CUSTOMER` \| `ORGANISER` \| `ADMIN` |
| POST | `/auth/login` | `{ email, password }` | Returns `{ access_token }` |

### Venues (Admin only for create)

| Method | Endpoint | Auth | Body |
|---|---|---|---|
| POST | `/venues` | ADMIN | `{ name, address }` |
| POST | `/venues/:id/seats` | ADMIN | `{ row, number, category }` |
| GET | `/venues` | Public | — |
| GET | `/venues/:id` | Public | — |

### Shows (Organiser only for create)

| Method | Endpoint | Auth | Body |
|---|---|---|---|
| POST | `/shows` | ORGANISER | `{ title, venueId, date, pricing: [{category, price}] }` |
| GET | `/shows` | Public | — |
| GET | `/shows/:id` | Public | Includes `showSeats` (the seat map) |

### Seat Hold

| Method | Endpoint | Auth | Notes |
|---|---|---|---|
| POST | `/seat-hold/:showSeatId` | Any logged-in user | Places a 10-minute hold |
| DELETE | `/seat-hold/:showSeatId` | Any logged-in user | Manually releases own hold |

### Bookings

| Method | Endpoint | Auth | Notes |
|---|---|---|---|
| POST | `/bookings/:showSeatId` | Any logged-in user | Converts an active hold into a confirmed booking; sends QR email |
| GET | `/bookings` | Any logged-in user | Booking history for the logged-in user |
| DELETE | `/bookings/:id` | Any logged-in user | Cancels; triggers waitlist auto-assignment |

### Waitlist

| Method | Endpoint | Auth | Body |
|---|---|---|---|
| POST | `/waitlist` | Any logged-in user | `{ showId, category }` |
| GET | `/waitlist` | Any logged-in user | Current user's waitlist entries |

---

## Known Limitations / Next Iteration

- Real-time seat map updates currently use polling (every 4s) rather than WebSockets —
  a deliberate trade-off for delivery speed; the seat-status data model is already
  shaped to support a WebSocket upgrade without changes.
- Organiser revenue/booking-summary dashboard is planned but not yet built.
- Admin/organiser UI is minimal (functional forms, not fully styled).
- No automated test suite yet.
- Not yet deployed to a public hosting URL — currently run locally per the setup guide
  above; deployment (Render + Vercel) is planned for the next iteration.

---

## License

Educational project — built as a course assignment.
