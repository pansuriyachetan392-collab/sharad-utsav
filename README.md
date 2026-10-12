# Sharad Utsav 2026 booking

Live URL: not deployed yet.

A family books Sharad Utsav at Radha Krishna Temple, Allen, Texas (10–14 November 2026), pays once, and gets a confirmation the door can check. The server owns the price, the age rules, the promo codes, and the stock.

## Run it locally

The page and the API are separate apps.

```bash
cd be
npm install
npm test
npm run dev
```

That API listens on http://localhost:4000.

```bash
cd fe
npm install
npm run dev
```

Open http://localhost:3000. No login. The page calls the API at `NEXT_PUBLIC_API_URL` (default `http://localhost:4000`).

The simulated card is `4242 4242 4242 4242`, any future expiry, and any 3-digit code. Nothing is really charged.

## Environment variables

| Name | Where | What it is for |
| --- | --- | --- |
| `DATABASE_URL` | `be`, optional locally. Required on Vercel. | Postgres connection string. When it is unset, stock and bookings are stored in `be/.data/bookings.json`. That file survives a local restart. It will not survive on Vercel, so set this before deploying. |
| `CLIENT_ORIGIN` | `be` | Browser origin allowed to call the API. Default `http://localhost:3000`. |
| `NEXT_PUBLIC_API_URL` | `fe` | Where the page sends quote and booking requests. Default `http://localhost:4000`. |

Copy `be/.env.example` and `fe/.env.example` if you need to change those. Never commit `.env*`.

## API

Prices are integer cents. The client does not send a total. If it does, that field is dropped.

| Method | Path | Body | Result |
| --- | --- | --- | --- |
| `GET` | `/api/catalog` | — | Event, days, products, menu prices, and live stock. |
| `POST` | `/api/quote` | `Booking` below | Line items, subtotal, discount, total, promo, door list, stock usage, and errors. Stock does not change. |
| `POST` | `/api/bookings` | `{ booking, idempotencyKey, payment? }` | Re-quotes inside a lock, charges the test card when the total is above zero, stores the booking, reduces stock. The same key and the same basket return the original booking. |
| `GET` | `/api/bookings/:code` | — | The stored confirmation. |

`Booking`:

```json
{
  "contact": { "firstName": "", "lastName": "", "email": "", "phone": "", "age": 36, "attending": true },
  "people": [{ "id": "p1", "firstName": "", "lastName": "", "age": 8, "accompanyingAdultId": "booker" }],
  "selections": [{ "personId": "booker", "kind": "day_adult", "days": ["2026-11-10"] }],
  "familyPasses": [{ "day": "2026-11-12", "personIds": ["booker", "a2", "c1", "c2"] }],
  "extras": { "dandiyaQty": 0, "dinner": [], "garba": [] },
  "promoCode": "SEVA10"
}
```

`kind` is `day_adult`, `day_child`, `allday_adult`, `allday_child`, or `none` (under 5). The paying adult, when they are attending, is person id `booker` and is not repeated in `people`. A quote with errors still returns the full price when the only problems are stock or a rejected promo. A basket that breaks an age or attendance rule returns no total.

`payment`, required only when the total is above zero: `{ "cardName", "cardNumber", "expiry": "MM/YY", "cvc" }`.

## Decisions I made

- Day-pass stock is per person-day. Two adults on three days use six adult day passes. An all-day pass uses one all-day unit, not five day passes. A family pass uses one family unit and no day-pass units.
- A family pass is exactly two adults (12+) and two children (5–11) for one single day. Those four cannot also hold another entry ticket on this booking. An under-5 does not fill a child seat.
- Under-5s are named for the door, pick the days they attend, pay nothing for entry, and may take dinner or Garba on those days.
- The booker may stay home. Every child and under-5 still needs an adult who is 18 or older and present on the same days. A 12–17-year-old is an adult for tickets only, not a responsible adult.
- Age is a whole number of years as of 10 November 2026, not a date of birth. A birthday during the festival does not change the band.
- Garba stock is one pool of two seats across 11 Nov and 13 Nov.
- Dinner and Garba are refused on a day that person is not attending. Garba is also refused on any other date.
- Dandiya is per booking, up to 30 pairs, not tied to a person.
- One promo code. `SEVA10` is 10% of the server total, rounded to the nearest cent. `FLAT20` cannot take the total below $0. `KIDSFREE` zeroes child day passes and child all-day passes only. The family pass is one flat price, so it is not reduced. `EXPIRED5` and `MAXEDOUT` are recognised and block payment until cleared.
- A mismatched ticket is rejected. It is not silently repriced.
- A $0 total is a real booking and does not ask for a card.
- The same idempotency key and the same basket cannot create two bookings. A failed card does not reduce stock.
- Checkouts run one at a time, in a file lock locally and a Postgres advisory lock when `DATABASE_URL` is set, so the last workshop places cannot be sold twice.
- We do not send email. The confirmation page is the record, and it says so.
- Child last names are optional. Adults need a last name. Children are not asked for email or phone.

The plan before any of this was built is in `DESIGN.md`. It has not been rewritten to match later code.

## Tests

From `be`, `npm test` covers the age bands, the price in integer cents, promo codes, sold-out stock, a client-supplied total being ignored, two bookings racing for the last Garba places, a repeated payment, and a declined card. The frontend does not price a booking. It asks `be`.

## Unfinished

- Production deploy to Vercel, and the production URL at the top of this file.
- `TEST-CASES.md`.
- The 3–5 minute recording, which has to be made on the deployed site.
- A real email receipt.
- Stripe. Payment is simulated on purpose for this pass.
