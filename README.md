# Finlight — Personal Finance Management

A production-oriented personal finance module covering budgeting, expense/income
tracking, accounts, loans, debt avalanche/snowball planning, SIP/investment
tracking with pause-resume, an emergency fund tracker, cash-flow forecasting,
and a dashboard — built on Next.js (App Router), Prisma, and Auth.js.

## Stack

- **Framework**: Next.js 16 (App Router, Server Actions, Turbopack)
- **Database / ORM**: PostgreSQL + Prisma 6
- **Auth**: Auth.js v5 (`next-auth`), Credentials provider, JWT sessions
- **UI**: Tailwind CSS v4 + shadcn/ui (Radix primitives)
- **Forms/validation**: React Hook Form + Zod
- **Charts**: Recharts
- **Tests**: Vitest

## Deployment

Live on Railway: project `finlight-personal-finance` (Postgres + app service,
both in the `production` environment). The `app` service's `start` script
runs `prisma migrate deploy` before `next start` — migrations apply
automatically on every deploy, at container start (Railway's build stage has
no private-network access, so migrations can't run during `npm run build`;
they must run at start instead). The GitHub repo is
[shkmd/finlight-personal-finance](https://github.com/shkmd/finlight-personal-finance);
connect it in the Railway dashboard (Settings → Source) for auto-deploy on
push, or redeploy from a local checkout with `railway up --service app`.

## Getting started (local development)

Needs a Postgres database — either your own local instance, or a tunnel to
the Railway one via `railway connect Postgres --tunnel-only --port 25432`
(prints a `postgresql://...@127.0.0.1:25432/...` URL to use as `DATABASE_URL`
below; keep the tunnel running while you develop).

```bash
npm install
npm run db:migrate   # applies Prisma migrations
npm run dev          # http://localhost:3000
```

Environment variables (`.env`):

```
DATABASE_URL="postgresql://user:password@host:5432/dbname"
AUTH_SECRET="<32+ char random string>"   # generate: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
NEXTAUTH_URL="http://localhost:3000"     # must match whatever host/port you actually run on
```

Register an account at `/register`, then use **"Use sample data"** on the
dashboard or settings page to populate clearly-labelled demo records (never
mixed with real data — a "Sample" badge marks every seeded row, and "Clear
sample data" removes them all in one action).

## Scripts

- `npm run dev` / `npm run build` / `npm start`
- `npm run lint` — ESLint
- `npm test` / `npm run test:watch` — Vitest (74 tests covering every
  calculation engine: EMI/amortization, avalanche/snowball payoff
  simulation, SIP monthly-equivalent conversion, budget math, emergency-fund
  targets, currency rounding, and date edge cases)
- `npm run db:migrate` — `prisma migrate dev`
- `npm run db:seed` — placeholder for a future `prisma/seed.ts` (sample data
  is currently generated per-user from the app itself, not a global seed)

## Architecture

```
src/
  app/
    login/, register/            — auth pages (public)
    (app)/                       — authenticated shell (sidebar + mobile nav)
      dashboard/ budget/ transactions/ accounts/ loans/ debt-planner/
      investments/ emergency-fund/ calendar/ reports/ settings/
    api/auth/[...nextauth]/      — Auth.js route handler
  components/
    ui/                          — shadcn/ui primitives
    finance/                     — feature components, one folder per domain
  lib/
    finance/                     — pure calculation engines (no I/O):
      emi.ts        — EMI formula, amortization schedule, loan warnings
      payoff.ts     — multi-loan avalanche/snowball/custom simulator
      sip.ts        — frequency → monthly-equivalent conversion
      budget.ts     — planned-vs-actual, spending pace, zero-based check
      emergencyFund.ts, creditCard.ts
    actions/                     — Server Actions (the only DB access point;
                                    every function starts with requireUserId())
    validations/                 — Zod schemas (client + server share these)
    auth.ts, session.ts, prisma.ts, money.ts, dates.ts, defaults.ts
  middleware.ts → proxy.ts       — route protection (renamed per Next.js 16's
                                    "middleware → proxy" convention)
prisma/schema.prisma             — full data model (see comments at the top)
```

### Security model

Every Server Action calls `requireUserId()` first (`src/lib/session.ts`),
which resolves the session server-side and throws if unauthenticated —
this is the single ownership-check chokepoint. Every mutation additionally
re-fetches the target row and checks `row.userId === userId` before writing,
so no query trusts a client-supplied user id. `middleware.ts`/`proxy.ts`
only handles the UX-level redirect (bounce anonymous visitors to `/login`);
it is not the security boundary.

## Calculation assumptions (documented once, applied everywhere)

- **Money**: every amount is persisted as an **integer in minor units**
  (paise) — never a float. Rounding is round-half-away-from-zero, applied
  only when a figure is about to be persisted or displayed
  (`src/lib/money.ts`).
- **Dates**: transaction/due/EMI dates are calendar-day concepts, stored as
  UTC midnight and always read back via UTC getters, so the calendar day
  never shifts under a viewer's timezone. Audit timestamps (`createdAt`)
  are true instants, formatted in the browser's local timezone.
  `src/lib/dates.ts` documents this in detail.
- **Loan amortization**: standard reducing-balance amortization. **Interest
  for a month accrues on the opening balance, and the EMI is applied at the
  end of that month** — this convention is used consistently in the
  single-loan schedule (`emi.ts`) and the multi-loan payoff simulator
  (`payoff.ts`); it is never mixed with a beginning-of-month convention.
- **Debt payoff simulator**: avalanche/snowball/shortest-tenure order is
  computed **once** from the loans' starting state, not re-sorted monthly.
  Extra payments cascade down that order within the same month as loans
  close, and a closed loan's EMI is added to the extra pool starting the
  *next* month. The baseline ("minimum payments only") comparison is
  mathematically simpler — with zero extra payment nothing ever cascades,
  so it's computed as each loan amortizing independently.
- **SIP/investment frequency normalization**: daily ×365/12, weekly ×52/12,
  quarterly ÷3, yearly ÷12 — a fixed, documented conversion, not a
  date-based day-count.
- **Transfers vs. expenses**: an `AccountTransfer` between the user's own
  accounts never touches income/expense totals; only an explicit `fee` on
  the transfer is a real cost.
- **Credit cards**: a purchase is an expense on the purchase date; the
  monthly bill payment is a transfer/liability payment, not a second
  expense; refunds net against the original category.
- **Pausing an investment** never deletes history (`InvestmentStatusHistory`
  records every pause/resume) and never auto-creates a financial
  transaction — the user explicitly chooses where released cash goes
  (`CashAllocationRule`), and only a choice of "next debt" feeds the debt
  payoff planner's "released SIP" input (as a suggested prefill, not a
  forced value).

## Known limitations

- **No browser-based UI testing was performed** — this environment has no
  browser/screenshot tool. Verification instead combined: 74 unit tests
  covering every calculation engine's edge cases (zero-interest loans,
  insufficient EMI, same-month loan closures and payment redistribution,
  lump sums, EMI rollover, SIP frequency conversion, budget/pace math,
  emergency-fund targets, currency rounding); a clean `tsc`/`eslint`/
  production build; and an end-to-end HTTP smoke test (register → sign in
  via the real Auth.js credentials flow → seed realistic accounts/loans/
  investments/budget data → verify every one of the 11 authenticated pages
  renders real data with HTTP 200, then verify cleanup). Interactive
  dialog submission (the actual click-a-button-fill-a-form path) was not
  exercised in a live browser — the client and server sides of every form
  type-check against the same Zod schema, and the underlying Server
  Actions were exercised directly during the smoke test, but this is not a
  substitute for manual or automated browser testing before shipping.
- **Receipt upload** is modelled in the schema (`ReceiptAttachment`) but no
  file storage backend is wired up — there's nowhere to actually persist an
  uploaded file yet.
- **Recurring-transaction auto-generation** (turning a `RecurringTransaction`
  into a pending income/expense row automatically) is stored and
  surfaced in the cash-flow calendar as a projection, but no scheduled job
  materializes it into a real transaction automatically — a user still
  records the actual transaction when it happens.
- **PDF export** was intentionally not added — the spec says to add it only
  if the project already had a PDF library, and this is a from-scratch
  build. CSV export covers every report listed in the spec.
- **Bank sync** was intentionally not built, per the spec.
