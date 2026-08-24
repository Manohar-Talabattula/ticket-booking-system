# System Design Write-Up

## Seat Hold & TTL Mechanism

Every physical seat in a venue is represented once per show as a `ShowSeat` row, carrying
a `status` of `AVAILABLE`, `HELD`, or `BOOKED`. This separation — physical `Seat` versus
per-show `ShowSeat` — matters because the same chair is independently available for one
show and sold out for another; status can never live on the seat itself.

When a customer selects a seat, the backend creates a `SeatHold` row referencing that
`ShowSeat`, with an `expiresAt` timestamp ten minutes in the future, and flips the
`ShowSeat` status to `HELD`. Immediately after, a delayed job is scheduled on a BullMQ
queue (backed by Redis) with a `delay` equal to the TTL. BullMQ, not application code,
owns the clock: a dedicated worker process (`SeatHoldProcessor`) sits independently of
any HTTP request, and Redis fires the job the moment the delay elapses — even if the
server that created the hold has long since finished handling that request. When the job
fires, the worker checks whether the hold still exists; if it does, it deletes the hold
and resets the seat to `AVAILABLE`. If the customer completed checkout or manually
released the seat earlier, the hold is already gone by the time the job runs, and the
worker exits harmlessly — a deliberate safety check that prevents a stale timer from ever
releasing a seat that was legitimately booked in the meantime.

This design keeps TTL enforcement decoupled from customer behaviour: nothing needs to
poll or check expiry on read — the release is driven by the scheduler itself.

## Concurrency Prevention

The central design decision here is that Postgres, not application logic, is the source
of truth for exclusivity. `SeatHold.showSeatId` carries a unique constraint. When two
customers attempt to hold the same seat within milliseconds of each other, both requests
pass an initial `status === 'AVAILABLE'` check (which alone is insufficient — a classic
check-then-act race condition), but only one `INSERT` into `SeatHold` can succeed; the
second is rejected by Postgres with a unique-violation error (`P2002`), which the service
layer catches and converts into a clean `409 Conflict` response. Both the hold-creation
and the later booking-creation steps additionally run inside `$transaction` blocks, so
that a seat's status update and the corresponding row creation commit atomically — no
window exists where a seat could appear updated without a matching hold or booking record,
or vice versa. This was validated directly: two simulated customers requesting the same
seat produced one success and one `409`, not two successes.

## Waitlist Auto-Assignment Flow

Waitlist entries are stored per show and per seat category, each with a `joinedAt`
timestamp and a `status` of `WAITING`, `OFFERED`, or `EXPIRED`. Cancellation is the
trigger point: rather than releasing a cancelled seat straight to `AVAILABLE`, the
booking-cancellation flow first asks the waitlist service whether anyone is waiting for
that show and category. The query orders by `joinedAt ascending`, making this a genuine
first-in-first-out queue rather than an arbitrary pick. If a match is found, the seat is
never exposed as generally available at all — it moves directly from `BOOKED` to `HELD`,
now reserved specifically for that one waiting customer.

## Time-Limited Offer Handling

An offer is implemented as an ordinary `SeatHold`, deliberately reusing the same
mechanism as a normal seat selection, but with a longer TTL (fifteen minutes instead of
ten) and a different creation trigger — the waitlist service rather than a customer's own
click. This reuse is intentional: because the offer is a real hold on a real
`SeatHold`/`ShowSeat` pair, the customer completes it through the exact same booking
endpoint used everywhere else in the app, with no separate "waitlist booking" code path
to maintain. The waitlist entry itself is marked `OFFERED` with an `offerExpiresAt`
timestamp, and the customer is emailed a direct link to the seat. A second BullMQ queue,
separate from the standard seat-hold queue, schedules the offer's expiry job.

If the customer books within the window, the hold converts to a booking exactly as a
normal purchase would, and the waitlist entry can be considered resolved. If the window
lapses, the offer-expiry worker marks that waitlist entry `EXPIRED`, deletes the
now-stale hold, and immediately re-invokes the same "offer to next in line" function that
handled the original cancellation. Because that function always queries for the earliest
remaining `WAITING` entry, this naturally finds whoever is next in the queue and repeats
the offer cycle against them — no explicit loop or separate scheduler is needed to
produce the cascading "try the next person" behaviour; it falls out of the same function
being called recursively by the expiry path as by the original cancellation path.

## Trade-offs Made Under Time Constraints

Real-time seat map updates use client-side polling (every four seconds) rather than
WebSockets. The `ShowSeat` status model was built so a WebSocket layer could be added
later purely as an additional notification mechanism, without altering how holds,
bookings, or the waitlist itself are represented or enforced — the correctness of the
system does not depend on how quickly a browser learns about a status change, only on
the database and queue guarantees described above.