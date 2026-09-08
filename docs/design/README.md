# Handoff: Finlight dashboard redesign

## Overview
A redesign of the Finlight dashboard (`/dashboard`) plus restyled Debt Planner and Transactions
screens, for the Next.js app in `shkmd/finlight-personal-finance` (branch `master`).

The current dashboard renders 20+ identical `StatCard`s in a flat grid. The redesign keeps the same
metric coverage but organises it: four headline tiles (one filled), a six-month cash-flow chart, an
upcoming-commitments card, a debt-cleared gauge, a debt-free countdown, a category breakdown with
drill-down, and a latest-activity list.

## About the design files
The two `.dc.html` files in this bundle are **design references written in plain HTML/JS** —
prototypes that show intended look and behaviour. They are **not production code to copy**.
The task is to **recreate them in this repo's existing environment**: Next.js App Router,
React server/client components, Tailwind CSS, the shadcn-style primitives in `src/components/ui/`,
and the existing server actions in `src/lib/actions/`. Every number in the prototype is fake sample
data; in the real app it comes from `getDashboardSummary()` and friends.

Open a `.dc.html` file directly in a browser to interact with it.

## Fidelity
**High fidelity.** Colors, type sizes, weights, radii, spacing and interaction states are final and
listed below — recreate them pixel-close using Tailwind utilities (extend the theme with the tokens
in the Design tokens section rather than hard-coding hexes at call sites).

Two visual directions are included:
- `Finlight Dashboard v2.dc.html` — **the primary design.** Green/rounded/soft-card.
- `Finlight Dashboard (Modernist variant).dc.html` — an alternative flat, red-accent, zero-radius
  treatment of the same information architecture. Reference only unless you prefer it.

Everything below describes the **v2 (green)** design.

---

## Design tokens

### Color
| Token | Value | Use |
| --- | --- | --- |
| `--fl-bg` | `#e9ece9` | Page background behind the app shell |
| `--fl-card` | `#ffffff` | App shell, cards |
| content bg | `#fbfcfb` | Main content column background (inside shell) |
| `--fl-ink` | `#0f1512` | Primary text, neutral figures |
| `--fl-muted` | `#6c7873` | Labels, secondary text |
| `--fl-line` | `#e8ebe9` | 1px card borders and row rules |
| `--fl-green` | `#1a7f4b` | Primary actions, income, active states |
| `--fl-green-dark` | `#0c4429` | Primary hover, income text, active nav text |
| `--fl-green-deep` | `#083322` | Filled stat tile, countdown card, tooltips, toast |
| `--fl-mint` | `#bfe4cf` | On-dark accents, dark-card CTA fill |
| `--fl-mint-soft` | `#eaf5ee` | Active nav pill, income chips, tinted panels |
| `--fl-red` | `#c0392b` | Expenses (bars, figures) |
| `--fl-red-soft` | `#fdeeec` | Expense chips, error panel |
| neutral fill | `#f4f6f5` | Search pill, segmented tracks, date squares |
| track | `#eef1ef` | Progress-bar and gauge tracks |
| hatch | `repeating-linear-gradient(45deg,#dfe3e0 0 3px,#f3f5f4 3px 7px)` | Inactive chart bars |

Semantic rule the user asked for explicitly: **income is green, expenses are red**, everywhere
(chart bars, legends, tooltips, signed amounts, "Money in"/"Money out").

### Typography
Plus Jakarta Sans (Google Fonts, weights 400/500/600/700/800), `-webkit-font-smoothing: antialiased`.

| Role | Size / weight / tracking |
| --- | --- |
| Page title | 30px / 800 / -0.035em |
| Page subtitle | 13.5px / 500 / `--fl-muted` |
| Card title (h2) | 16px / 800 / -0.02em |
| Stat tile value | 30px / 800 / -0.035em, `tabular-nums` |
| Debt-planner tile value | 27px / 800 / -0.035em |
| Countdown number | 44px / 800 / -0.04em |
| Gauge percentage | 36px / 800 / -0.04em |
| Row title | 13–13.5px / 700 |
| Row meta | 11px / 500 / `--fl-muted` |
| Section label (uppercase) | 10–11px / 700 / 0.12–0.14em / uppercase |
| Nav item | 13.5px / 600 |
| Chip / pill | 11–12px / 700 |
| Button | 12.5–13px / 700 |

All currency and count figures use `font-variant-numeric: tabular-nums`.

### Spacing, radius, elevation
- Shell padding: `20px` page gutter; shell radius `26px`; shell shadow `0 18px 50px rgba(15,21,18,0.10)`.
- Content column: `22px 24px 28px` padding, `16px` vertical gap between blocks.
- Card padding `20px`; card radius `20px`; inner panels `16px`; inputs `14px`; nav items `12px`; pills `999px`.
- Grid gaps: `14px` between cards, `12–14px` inside cards.
- Sheet: fixed inset `16px`, radius `24px`, shadow `0 24px 60px rgba(15,21,18,0.28)`.
- Icon squares: `34–38px` at radius `11–12px`.
- Sidebar width `246px` expanded / `76px` collapsed.

### Icons
Lucide (`lucide-react` is already the repo's icon set, see `src/lib/nav.ts`). Stroke width 2,
17px in the sidebar, 15–16px inline. Icon names per nav item are in `NAV_ITEMS`.

---

## Screens / views

### 1. App shell
- Full-viewport `--fl-bg`, 20px padding, one centered `max-width: 1400px` white shell,
  radius 26px, `display:flex`, `overflow:hidden`.
- **Sidebar** (fixed `246px`, `1px solid --fl-line` right border, `22px 14px` padding, `22px` gap):
  - Brand row: 34px green rounded-square button with a hamburger icon (toggles collapse) + "Finlight" 19px/800.
  - Group label "MENU" (10px/700/0.14em/uppercase/muted), then: Dashboard, Transactions (with a
    count chip in `--fl-mint-soft`), Debt Planner, Budget, Investments, Cash-Flow Calendar.
  - Group label "GENERAL", then: Accounts, Emergency Fund, Settings.
  - Nav item: `display:flex; gap:11px; padding:10px 12px; radius:12px`. Active = background
    `--fl-mint-soft`, text `--fl-green-dark`. Hover = `--fl-mint-soft`. No left bar.
  - Bottom promo card: `--fl-green-deep`, radius 18px, decorative translucent circle offset
    top-right, "DEBT-FREE TARGET" mint label, target month 17px/800, sub-line, full-width mint
    pill CTA "Open planner".
  - Collapsed state hides every text label (icons only).
- **Topbar** (`16px 24px`, bottom `1px solid --fl-line`, wraps):
  search pill (grows) · month stepper pill (‹ label ›) · Sample/Empty segmented pill ·
  38px circular avatar `--fl-green-dark` + name/locale block.
- **Content column**: background `#fbfcfb`, holds the page header row (title + subtitle left;
  "Add expense" green pill and "Add income" outline pill right) then the active screen.

### 2. Dashboard
Maps 1:1 onto `getDashboardSummary()`.

1. **Headline tiles** — `repeat(auto-fit, minmax(210px,1fr))`, gap 14px:
   - Tile 1 **filled** (`--fl-green-deep`, white text): "Net this month" = income − expenses,
     chip = savings rate, sub = "Income minus everything paid".
   - Tiles 2–4 white with `--fl-line` border: "Available cash" (chip "4 accounts", sub unallocated
     cash), "Outstanding debt" (value in `--fl-red`, chip total EMI, sub EMI-to-income %),
     "Emergency fund" (chip "47% funded", sub months of expenses).
   - Each tile: label 13px/700 top-left, 26px circular outline arrow button top-right (navigates to
     the related screen), value 30px/800 with 16px top margin, then chip + sub row.
2. **Cash flow** (spans 2 columns) — six month groups, each two pill-shaped bars
   (`width:26%`, `border-radius:999px`, min height 3%), 196px plot height.
   Bars are hatched until the month is hovered or selected, then income → `--fl-green`,
   expenses → `--fl-red`. Hover shows a dark rounded tooltip above the group with In / Out / Net
   (Net divided by a hairline). Clicking a group sets the selected month (drives the whole page).
   Month labels below, selected one in `--fl-green-dark`.
3. **Upcoming** — the first commitment as a `--fl-mint-soft` panel ("DUE FIRST", label 16px/800,
   when · kind, amount 20px/800 + green "Calendar" pill); remaining three as rows with a 38px
   day/month square, label + kind, right-aligned amount.
4. **Debt cleared gauge** — half-donut: two SVG arc paths (`M20 120 A90 90 0 0 1 200 120`,
   `stroke-width:26`, round caps; track `#eef1ef`, progress `--fl-green` via `stroke-dasharray`
   over a 282.7 arc length). The percentage and "Principal repaid" caption are **HTML overlaid on
   the SVG**, not `<text>` nodes. Legend below: cleared / left amounts.
5. **Debt-free countdown** — `--fl-green-deep` card: mint label, months 44px/800, date sub-line,
   hairline, two label/value rows (extra per month, interest saved in mint), mint pill "Run a scenario".
6. **Where it went** — top 7 expense categories for the selected month: name / % of spend / amount,
   then a 7px rounded progress bar (width relative to the largest category). Click selects the
   category: row background `--fl-mint-soft`, bar `--fl-green`, and a `#f7f9f8` drill-down panel
   appears with the matching transactions and a "See all in transactions" button that jumps to the
   Transactions screen with the category filter pre-applied.
7. **Latest activity** — five most recent transactions: 34px rounded `+`/`−` badge (mint-soft/green
   for income, red-soft/red for expense), description, `date · category · method`, signed amount.

**Empty state**: when there is no data, a `--fl-mint-soft` / `--fl-mint` banner sits under the page
header ("New here?" + "Use sample data" green pill), all figures read `₹0` or `—`, and the upcoming
card shows "Nothing scheduled right now." This replaces the current `SampleDataBanner` treatment.

### 3. Debt Planner
- Four headline tiles (first filled): Debt-free date, Months saved, Interest saved, Total interest paid.
- **Scenario card**: "Extra towards debt each month" label, value 36px/800 in `--fl-green-dark`,
  native `range` input (0–30,000 step 500, `accent-color: --fl-green`), min/max captions,
  free-cash line, hairline, then an Avalanche/Snowball segmented pill (active = green fill, white
  text) and an explanatory paragraph that changes with the strategy.
- **Total balance over time** (spans 2 columns): `viewBox="0 0 100 46"`,
  `preserveAspectRatio="none"`, `vector-effect="non-scaling-stroke"`. Baseline = `#c8cfcb` 2px
  dashed; accelerated = `--fl-green` 3px round-capped. Axis captions Today → baseline end month, legend below.
- **Loans list**, ordered by the chosen strategy: rank badge (green for #1), name + balance bar,
  then right-aligned Outstanding / Rate / EMI / Paid-off columns as label-over-value pairs (wraps on narrow widths).

### 4. Transactions
- Filter row: type `select`, category `select` (both white pills with `1.5px --fl-line` border),
  month-scope segmented pill ("Sep 2026" / "All months"), and a hint that search lives in the topbar.
- Three stat cards: matching count, Money in (green), Money out (red).
- Rows in one card: 34px `+`/`−` badge, description + `date · method`, category chip, signed amount.
- Empty result: "No transactions match these filters."

### 5. Add expense / income sheet
Right-hand sheet (fixed, inset 16px, radius 24px) over a `rgba(15,21,18,0.42)` scrim (click to close):
month label + title, Expense/Income segmented pill, then Amount (₹) · Description · Category/Source ·
Day + Method (two-up). Inputs `1.5px --fl-line`, radius 14px, focus border `--fl-green`.
Footer: green "Save expense/income" + outline "Cancel". Invalid amount shows a `--fl-red-soft` panel.
On save a dark pill toast appears bottom-center for ~2.2s.

---

## Interactions & behavior
| Interaction | Behavior |
| --- | --- |
| Sidebar toggle | Collapses to 76px, hides all labels |
| Nav click | Switches screen; Dashboard / Transactions / Debt Planner are built, others show a placeholder card |
| Month stepper | Moves through Apr–Sep 2026; drives every figure, the category list, activity list and default transaction scope; clears the drill-down |
| Chart bar hover | Un-hatches that month's bars and shows the tooltip |
| Chart bar click | Selects that month (same as the stepper) |
| Category click | Toggles drill-down; second click clears |
| "See all in transactions" | Navigates to Transactions with `category` filter + month scope set |
| Topbar search | Typing filters transactions and switches to the Transactions screen |
| Extra-payment slider | Re-runs the payoff simulation live (on `input`), updating both curves, all four tiles, the loan order and payoff dates |
| Avalanche / Snowball | Re-sorts the payoff target order and re-runs the simulation |
| Sample / Empty toggle | Swaps between populated and first-run empty state |
| Add expense/income | Opens the sheet; save prepends the transaction to the selected month and shows a toast |
| Focus | `:focus-visible { outline: 2px solid var(--fl-green); outline-offset: 2px; }` |
| Hover | Primary buttons → `--fl-green-dark`; outline buttons → green border + dark green text; rows/nav → `--fl-mint-soft` or `#f4f6f5`; mint CTA on dark → `#fff` |

No entrance animations; only color/background transitions (keep them ≤150ms if you add any).

### Responsive
Everything is fluid: `repeat(auto-fit, minmax(…,1fr))` grids, wrapping flex rows, `min-width:0` on
every grid/flex child that holds text, and `text-overflow: ellipsis` on single-line titles. Below
roughly 900px the two-column blocks stack. The sidebar is desktop-only in the prototype — for mobile
use the existing `MOBILE_NAV_ITEMS` bottom bar from `src/lib/nav.ts`.

## State management
Client state in the prototype (a client component in the real app):
`selectedMonth`, `strategy: 'avalanche' | 'snowball'`, `extraPerMonth`, `hoveredBar`,
`drillCategory`, `sidebarCollapsed`, `sheet: null | 'expense' | 'income'`, `sheetError`,
`toast`, and the transaction filters (`q`, `type`, `category`, `scope`).

In the real app, replace the prototype's seeded arrays with:
- `getDashboardSummary()` — every headline and metric value.
- `listExpenses({from,to})` / income — the cash-flow series, category totals, activity list, transactions table.
- `listLoans()` — loan rows, EMI totals, weighted rate.
- `summary.upcoming` — the Upcoming card.
- `src/lib/finance/payoff.ts` — the payoff simulation (the prototype re-implements avalanche/snowball
  amortization inline; **use the repo's tested `payoff.ts` instead**, and make the slider a
  client-side call to a memoized version or a server action).
- `formatCurrency` / `formatPercent` from `src/lib/money.ts` — all formatting. Amounts stay in
  minor units; the prototype's `₹` strings are `formatCurrency(minor)` output (`en-IN`, 0 decimals).
- `parseAmountToMinorUnits` for the sheet's amount field.

Existing dialogs (`expense-form-dialog.tsx`, `income-form-dialog.tsx`) already cover the add flows —
restyle them as the sheet rather than writing new forms.

## Suggested implementation map
| Design piece | Repo target |
| --- | --- |
| App shell + sidebar + topbar | `src/app/(app)/layout.tsx`, `src/components/layout/*` |
| Dashboard page composition | `src/app/(app)/dashboard/page.tsx` |
| Headline tiles | replace `src/components/finance/stat-card.tsx` with a `variant="filled" \| "plain"` tile |
| Cash-flow chart | `src/components/finance/charts/money-bar-chart.tsx` |
| Balance-over-time chart | `src/components/finance/charts/money-line-chart.tsx` |
| Gauge, countdown, category drill-down, activity list | new components under `src/components/finance/dashboard/` |
| Empty state | `src/components/finance/dashboard/sample-data-banner.tsx` |
| Debt planner | `src/components/finance/debt-planner/scenario-builder.tsx` |
| Transactions | `src/components/finance/transactions/transactions-client.tsx` |
| Tokens | `src/app/globals.css` (`@theme` / CSS variables) + Tailwind theme extension |

Keep the existing `CategoryGroup` colors in `src/lib/defaults.ts` in mind: the redesign does **not**
color categories individually — bars are green, and the ranking carries the meaning. If you want the
group colors back, apply them to the category bars only.

## Assets
None. All graphics are inline SVG (Lucide icons, two arc paths, two polylines) or CSS gradients.
Font: Plus Jakarta Sans via Google Fonts — add it to `src/app/layout.tsx` with `next/font/google`.

## Files
- `Finlight Dashboard v2.dc.html` — the primary design (open in a browser; all three screens, all interactions).
- `Finlight Dashboard (Modernist variant).dc.html` — alternative flat/red direction, same information architecture.

---

## Implementation notes (as-built)

A few deliberate adaptations made while implementing this spec in the real app:

- **Font loading**: used a plain `<link>` tag in `src/app/layout.tsx` (runtime, browser-fetched)
  rather than `next/font/google`, since `next/font/google` fetches at *build* time and this
  environment's build sandbox doesn't reliably have outbound network access. A `<link>` tag fetches
  from the visitor's own browser instead, sidestepping that entirely.
- **App shell height**: the shell is `h-screen` (not `min-h-screen`) with `main` scrolling
  internally (`overflow-y-auto`). Without this, a tall dashboard pushes the sidebar's `mt-auto`
  promo card far below the visible fold instead of staying pinned to the shell's bottom edge.
- **Month stepper scope**: the topbar's `‹ month ›` stepper is wired to `/dashboard` and `/budget`
  (both already read `?year=&month=` search params) via `router.push`; on other routes it renders
  but is inert, rather than fabricating month-scoped data fetching for pages that don't have it.
- **Sample/Empty topbar toggle**: wired to the app's real `generateSampleData()` / `clearSampleData()`
  server actions instead of a fake demo switch — "Sample" seeds real (labelled) rows, "Empty" deletes
  them.
- **Debt Planner slider**: runs `src/lib/finance/payoff.ts`'s simulator directly client-side on every
  slider tick (no server round-trip) exactly as the spec asked. The scenario's other real fields
  (lump sum, annual increase, custom loan order, min cash buffer, released-SIP inclusion) live behind
  an "Advanced options" disclosure so the primary interaction matches the prototype's simplicity
  while the rest of the app's existing payoff-planning functionality is preserved.
- **Transactions**: unified into one filterable income+expense list (matching the prototype) with
  the pre-existing recurring-transactions management kept as a second, lightly-styled tab rather than
  dropped, since it isn't part of this design but is real functionality.
