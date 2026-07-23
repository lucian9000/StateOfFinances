# StateOfFinances Design System

> Personal budget tracker — Telegram-native input, Next.js mobile dashboard, OpenClaw AI agent.

**Sources:**
- GitHub: https://github.com/lucian9000/StateOfFinances — explore `web/`, `openclaw-agent/budget-workspace/`, and SQL migrations for full product context. You may not have access, but the URL is stored here for reference.
- Logo: `assets/logo.png` (provided by user).

---

## Product Overview

StateOfFinances is a self-hosted, single-user (Lucian, South Africa) budget tracker. Input is entirely via Telegram — text a description, send a receipt photo, or type `balance 12345`. An n8n workflow routes each message: income confirmations, OCR → classify → log, balance snapshots, or conversational chat with the Budget Coach AI.

Three live phases:

| Phase | Component | Status |
|---|---|---|
| 1 — Backend | n8n + OpenClaw capture skill + Postgres | Live |
| 2 — Dashboard | Next.js mobile web app (read-only, magic-link auth) | Live (feature branch) |
| 3 — Advisor | Budget Coach OpenClaw agent + proactive weekly check | Live |

**Currency:** South African Rand (ZAR). Format: `R 12,450` (en-ZA locale, comma thousands, "R " prefix with a space, no decimals unless cents).

---

## Content Fundamentals

**Voice:** Budget Coach — warm, encouraging, a supportive coach not an auditor.

- Acknowledge progress before flagging problems.
- Always ground statements in real figures: never "spending looks high" without the number.
- No filler ("Great question!", "I'd be happy to help!") — just help.
- Telegram-brevity: a few lines, not essays, unless a full breakdown is requested.
- Sentence case for body copy; Title Case for headings and card labels.

**Amount formatting:** `R 12,450` — always. Never `R12450`, never `ZAR 12 450`.  
**Emoji:** Minimal. 💰 is the Budget Coach's only identifier emoji; no decorative emoji in UI copy.

**Do say:** "You've spent R 3,200 of your R 8,000 pool — 40% with 4 days left."  
**Don't say:** "Spending looks a bit high." (no number = no signal)

---

## Visual Foundations

### Colors
Deep-space dark purple backgrounds with vibrant, glowing semantic accents. No neutral greys.

| Token | Hex | Use |
|---|---|---|
| `--bg` | #120E1F | Page background |
| `--surface` | #1E1830 | Cards, list items |
| `--surface-raised` | #28203F | Elevated elements, hero gradient start |
| `--violet` | #8B5CF6 | Primary — buttons, active states |
| `--magenta` | #E64FCC | Spend / negative amounts |
| `--cyan` | #22D3EE | Income / positive amounts |
| `--amber` | #F5A623 | Goals / savings |
| `--text` | #F5F3FA | Primary foreground |
| `--text-muted` | #9C93B5 | Secondary — captions, inactive |

Alpha tints (20% opacity) are used as icon badge well backgrounds: `--violet-20`, `--magenta-20`, `--cyan-20`, `--amber-20`.

### Typography
Three families, all Google Fonts, imported via CDN in `tokens/typography.css`.

| Role | Family | Weights | Use |
|---|---|---|---|
| Display | Space Grotesk | 500, 600, 700 | Headings, balance numbers, UI labels |
| Body | Inter | 400, 500, 600 | Copy, captions, navigation |
| Mono | JetBrains Mono | 400, 500, 700 | Amounts, %, timestamps |

All monetary values use `font-variant-numeric: tabular-nums`.

### Backgrounds & Surfaces
No images, no textures, no full-bleed photography. Three flat dark surfaces (bg → surface → surface-raised). One gradient, only on the BalanceHeroCard: `linear-gradient(135deg, surface-raised → violet/20)`. No blur or backdrop-filter.

### Animation
- Odometer digit-roll on balance number (production: `OdometerNumber.tsx`).
- Hover/active: `150ms ease` on background and color only — no bounce, no spring, no scale.
- Transitions are functional, not decorative.

### Hover & Press States
- Hover: color/background shift only (e.g. `text-muted → text`).
- Active pill/chip: fills with `--violet`.
- No scale, no shadow change on press.

### Shadows
- `--shadow-card`: violet-tinted — BalanceHeroCard only.
- `--shadow-glow-*`: reserved for future dashboard gauges and data-viz (not yet used).
- No shadows on list items or navigation rows.

### Corner Radii
- `--radius-card` (24px): all cards, list items.
- `--radius-full`: pill buttons, filter chips, avatar circles.
- `--radius-lg` (16px): category thumbnail badges (overview large icons).
- No borders between list items — gap provides visual separation.

### Layout
Mobile-first. Max width 448px (`max-w-md`), centered. 20px horizontal padding (`--page-px`). 24px section gap (`--gap-section`). No sticky nav in current version.

### Iconography
Uses **Lucide React** (`lucide-react` npm package). Icons are inline SVG, stroke-based, 16–18px. Key icons:
- `ChevronRight` — nav rows
- `ChevronLeft` — back button
- `LogOut` — sign-out
- `ArrowDownRight` / `ArrowUpRight` — spend / profit stats
- `Target` — goal fallback icon
- Dynamic icon lookup: `goal.icon` string → PascalCase → `Icons[name]`

No custom SVGs. No emoji as icons. No icon font. Icons are loaded via npm in the Next.js app — use a CDN link (`https://cdn.jsdelivr.net/npm/lucide@latest`) for standalone prototypes.

---

## Components

### Core (`components/core/`)
| Component | Description |
|---|---|
| `Button` | Pill CTA — 5 variants (primary, secondary, ghost, danger, income) |
| `Badge` | Category initial badge — circle or rounded-lg, 4-color palette |
| `Card` | Surface container — default / raised / hero |
| `Input` | Pill text input, optional leading icon slot |
| `FilterChip` | Category filter pill — active (violet) / inactive |
| `PillPicker` | Scrollable time range pills (Daily / Weekly / Monthly / Yearly) |

### Display (`components/display/`)
| Component | Description |
|---|---|
| `BalanceHeroCard` | Gradient balance card with spend + profit stats |
| `GoalCard` | Savings goal row — amber icon, target, progress % |
| `TransactionRow` | Ledger entry — category badge, name, note, amount |

### Intentional Additions
- `Button` and `Card` are not explicitly primitives in the source but are implied by component patterns. Added for consumer consistency.
- `PillPicker` wraps the source's stateless `TimeRangePicker` with internal state for standalone use.

---

## UI Kits

### Dashboard (`ui_kits/dashboard/`)
Interactive mobile prototype of both dashboard pages:
1. **Overview** — greeting, category thumbnails, balance hero, time range pills, donut, category list, goals, nav link.
2. **Transactions** — search bar, category filter chips, transaction groups by day.

---

## File Index

```
styles.css                       Global CSS entry (@import only)
tokens/
  colors.css                     Color tokens (bg, surfaces, accents, text, alpha, category palette)
  typography.css                 Google Fonts import + type scale + weight tokens
  spacing.css                    Space scale + semantic aliases
  effects.css                    Radii, shadows, gradients, transitions
assets/
  logo.png                       Phoenix + circuit board (provided by user)
guidelines/                      Foundation specimen cards — Design System tab
  colors-accents.card.html       Violet / Magenta / Cyan / Amber
  colors-surfaces.card.html      bg / surface / surface-raised
  colors-text.card.html          text / text-muted
  colors-alpha.card.html         Alpha tint wells (20%)
  colors-gradients.card.html     Hero gradient + violet gradient
  type-display.card.html         Space Grotesk
  type-body.card.html            Inter
  type-mono.card.html            JetBrains Mono
  type-scale.card.html           Full size scale xs–4xl
  spacing.card.html              Space 1–12
  effects-radius.card.html       Border radius tokens
  effects-shadows.card.html      Shadow + glow tokens
  brand-logo.card.html           Logo + brand name
  brand-category-palette.card.html  Category cycling palette
components/
  core/                          Button · Badge · Card · Input · FilterChip · PillPicker
  display/                       BalanceHeroCard · GoalCard · TransactionRow
ui_kits/
  dashboard/
    index.html                   Interactive dashboard prototype (Overview + Transactions)
thumbnail.html                   Project tile
readme.md                        This file
SKILL.md                         Agent skill definition
```

---

## Fonts Note
All fonts are Google Fonts, loaded from CDN. No local font files. For offline use, download WOFF2 files from fonts.google.com and add `@font-face` rules to `tokens/typography.css`.
