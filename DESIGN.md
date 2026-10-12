# Design note — Sharad Utsav 2026 booking

Written before implementation. This is the plan, not a description of whatever the code later became.

## How I'm modelling it

A booking is one payment, made by one adult, for a party. Age is a whole number of years as of 10 November 2026. I am not taking dates of birth, so a birthday in the middle of the festival does not change the price.

Age picks a band: under 5, child (5–11), or adult (12+). The person paying has to be 18 or older. That is a separate rule from the adult ticket band, because a 16-year-old is an adult for pricing and still cannot be the one paying.

Each paying person gets exactly one entry product:

- A day pass, priced per chosen day. Stock is counted per person-day: two adults on three days use six adult day passes.
- An all-day pass, one flat price, one stock unit, always all five days.
- A family pass, $40, exactly two adults (12+) and two children (5–11), one day. It uses one family-pass unit and no day-pass units. Those four people cannot add other days on the same booking. An under-5 does not fill a child seat.

Under-5s are on the door list, pick the days they are coming, and can take dinner or a workshop on those days. They have no entry line and use no entry stock.

The booker may stay home. Their name, email, phone, and age are always required. If they come, they are the attendee `booker` and need a ticket like anyone else. Every child and under-5 must name an adult who is 18 or older and actually present on the same days.

Money is integer cents. The server prices every quote and every booking from its own catalog. The browser never sends a total. A client field named like a price is ignored.

## Endpoints I intend to build

`GET /api/catalog`
Returns the event, the five days, ticket and extra products, menu prices, and live stock. Nothing is reserved.

`POST /api/quote`
Body: contact, other people, ticket selections, family passes, extras, optional promo code. No payment and no total.
Response: line items, subtotal, discount, total, promo message, door-list preview, stock usage, and field errors.
Stock does not change.

`POST /api/bookings`
Same body, plus an idempotency key and, when the total is above zero, test-card details.
The server quotes again from current stock, inside a lock. On success it stores the booking and reduces stock. The same key and the same basket return the original booking instead of creating a second one.

`GET /api/bookings/:code`
The stored confirmation. Refreshing the page reads this. It does not recalculate a new price.

Promos, one code only:

- `SEVA10` — 10% off the server total, nearest cent.
- `FLAT20` — $20 off, and the total stops at $0.
- `KIDSFREE` — child day passes and child all-day passes become free. Adult tickets, extras, and the family pass do not.
- `EXPIRED5` and `MAXEDOUT` — recognised, refused, with distinct messages.
- Anything else — not a code. A rejected code blocks payment until it is cleared.

Payment is simulated. The only card that works is `4242 4242 4242 4242`. A $0 total confirms without a card.

## Tricky cases already visible

- Adult all-day stock is already 0. The page should say sold out, and the API should refuse it anyway.
- Garba has two places in total, shared by 11 Nov and 13 Nov, not two per day.
- Two checkouts can hit those last places together. The stock write has to be atomic.
- A child on an adult ticket, or an adult on a child ticket, is rejected. I will not silently reprice it.
- Dinner and Garba only on a day that person is actually coming. Garba also only on its two dates.
- Nonsense ages, a booker under 18, and a party that does not match the tickets.
- Pay clicked twice, and a promo that is real but does not change this particular basket.
- Family pass mixed with other days, or used as a cheaper way to bring under-5s.

## What I am leaving out

Real email, real Stripe, accounts, refunds, editing a paid booking, stacking promo codes, a door-scanning app, and more than this one festival. I am also not writing the edge-case essay or deploying in this first pass.

Locally, stock and bookings live in a file behind an in-process lock, so a restart does not forget them. The same store interface has a Postgres path for later, because a file on Vercel would not survive the way a festival weekend needs. One checkout runs at a time. That is deliberate: the event is a few thousand people, and a single lock is easier to trust than a clever per-row scheme.
