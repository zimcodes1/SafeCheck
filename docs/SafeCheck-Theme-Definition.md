# SafeCheck — Theme Definition (Light & Dark)

A standard set of theme tokens derived from the shield-and-magnifier logo's green, meant to be the single source of truth every Dashboard component pulls from — nobody should hardcode a hex value directly in a component; everything references one of these tokens.

---

## 1. Brand Color — Primary Green Scale

Pulled from the logo's gradient (a mid-bright green, lighter at the top, deeper toward the bottom). Standard 10-step scale, usable in both modes.

| Token | Hex | Typical use |
|---|---|---|
| `green-50` | `#F0FDF4` | Subtle tinted backgrounds (light mode) |
| `green-100` | `#DCFCE7` | Hover states on subtle backgrounds |
| `green-200` | `#BBF7D0` | Borders on tinted surfaces |
| `green-300` | `#86EFAC` | Disabled/muted primary elements |
| `green-400` | `#4ADE80` | Primary actions, **in dark mode** |
| `green-500` | `#22C55E` | Primary actions, **in light mode** — closest match to the logo |
| `green-600` | `#16A34A` | Primary hover/active (light mode) |
| `green-700` | `#15803D` | Primary hover/active (dark mode), strong emphasis text |
| `green-800` | `#166534` | Deep accents, dark-mode tinted backgrounds |
| `green-900` | `#14532D` | Darkest accent, rarely used directly |

---

## 2. Neutral Scale

Used for surfaces, borders, and text in both modes — same scale, different ends of it get used depending on mode.

| Token | Hex |
|---|---|
| `gray-50` | `#F8FAFC` |
| `gray-100` | `#F1F5F9` |
| `gray-200` | `#E2E8F0` |
| `gray-300` | `#CBD5E1` |
| `gray-400` | `#94A3B8` |
| `gray-500` | `#64748B` |
| `gray-600` | `#475569` |
| `gray-700` | `#334155` |
| `gray-800` | `#1E293B` |
| `gray-900` | `#0F172A` |
| `gray-950` | `#020617` |

---

## 3. Semantic Secondaries — Specific Use Cases

These exist because the brand green is already spoken for (primary actions, "safe/normal" states) — reusing it for alerts too would make a Critical alert visually blend in with a "system healthy" badge, which is exactly the kind of ambiguity a safety dashboard can't afford. Each of these is its own scale, but only the 500/600 shades are typically needed.

| Token | Light mode hex | Dark mode hex | Use case |
|---|---|---|---|
| `success` | `green-500` `#22C55E` | `green-400` `#4ADE80` | Reuses primary — pump/valve "on" lights, "certain" confidence, healthy connection status |
| `info` | `gray-500` `#64748B` | `gray-400` `#94A3B8` | Info-severity alerts, neutral badges |
| `warning` | `#F59E0B` | `#FBBF24` | Warning-severity alerts, near-danger tank fill state |
| `critical` | `#EF4444` | `#F87171` | Critical-severity alerts, danger-zone tank fill state, offline connection badge |
| `review` | `#8B5CF6` | `#A78BFA` | The "needs_review" confidence marker on `AlertCard` — deliberately distinct from all of the above so an uncertain detection never visually reads as a confirmed one |

---

## 4. Mode Tokens (Surfaces, Borders, Text)

These are what components actually consume — always reference these, never the raw scale values above, so switching modes never requires touching component code.

### Light mode

```css
:root {
  /* surfaces */
  --surface-0: #FFFFFF;      /* page background */
  --surface-1: #FFFFFF;      /* card / panel background */
  --surface-2: #F1F5F9;      /* raised / hover surface */

  /* borders */
  --border-subtle: #E2E8F0;
  --border-strong: #CBD5E1;

  /* text */
  --text-primary: #0F172A;
  --text-secondary: #475569;
  --text-tertiary: #94A3B8;

  /* brand */
  --primary: #22C55E;
  --primary-hover: #16A34A;
  --primary-subtle-bg: #F0FDF4;
  --primary-subtle-border: #BBF7D0;

  /* semantic */
  --success: #22C55E;
  --info: #64748B;
  --warning: #F59E0B;
  --critical: #EF4444;
  --review: #8B5CF6;
}
```

### Dark mode

```css
[data-theme="dark"] {
  /* surfaces */
  --surface-0: #020617;
  --surface-1: #0F172A;
  --surface-2: #1E293B;

  /* borders */
  --border-subtle: #1E293B;
  --border-strong: #334155;

  /* text */
  --text-primary: #F8FAFC;
  --text-secondary: #CBD5E1;
  --text-tertiary: #64748B;

  /* brand */
  --primary: #4ADE80;
  --primary-hover: #22C55E;
  --primary-subtle-bg: #14532D;
  --primary-subtle-border: #166534;

  /* semantic */
  --success: #4ADE80;
  --info: #94A3B8;
  --warning: #FBBF24;
  --critical: #F87171;
  --review: #A78BFA;
}
```

---

## 5. Typography

One font stack, one scale, used everywhere — no per-component font choices.

```css
:root {
  --font-sans: -apple-system, "Segoe UI", Roboto, Inter, sans-serif;

  --text-xs: 12px;
  --text-sm: 14px;
  --text-base: 16px;
  --text-lg: 18px;
  --text-xl: 24px;

  --weight-regular: 400;
  --weight-medium: 500;
  --weight-bold: 700;
}
```

---

## 6. Radius & Shadow

Kept minimal — enough for cards, badges, and buttons to look consistent without inventing a value per component.

```css
:root {
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;

  --shadow-sm: 0 1px 2px rgba(15, 23, 42, 0.06);
  --shadow-md: 0 4px 12px rgba(15, 23, 42, 0.10);
}
```

*(Dark mode typically wants shadows a touch stronger for the same visual weight — if it looks flat once built, bump the alpha up slightly rather than changing the color.)*

---

## 7. Token-to-Component Mapping

Ties this directly back into the Frontend Pages & Components Guide, so nothing there is left referencing an ad-hoc color:

| Component | Token(s) used |
|---|---|
| `TankGauge` — normal range | `--info` fill, or a neutral `--surface-2` fill with `--primary` outline |
| `TankGauge` — near-danger | `--warning` |
| `TankGauge` — at danger threshold | `--critical`, with the pulse effect using `--critical` at reduced opacity |
| `PumpStatusLight` / `ValveStatusLight` — on/open | `--success` |
| `PumpStatusLight` / `ValveStatusLight` — off/closed | `--text-tertiary` (dim, not colored — this is a neutral "off" state, not a warning) |
| `ConnectionStatusBadge` — connected | `--success` |
| `ConnectionStatusBadge` — disconnected | `--critical` |
| `AlertCard` — info severity | `--info` |
| `AlertCard` — warning severity | `--warning` |
| `AlertCard` — critical severity | `--critical` |
| `AlertCard` — needs_review marker | `--review` (dashed border, per the Frontend Guide's confidence-indicator note) |
| Primary buttons / active tab in `TabBar` | `--primary`, `--primary-hover` on interaction |
| All card/panel backgrounds | `--surface-1` |
| Page background | `--surface-0` |
| All body text | `--text-primary` (headings/values), `--text-secondary` (labels/metadata) |
