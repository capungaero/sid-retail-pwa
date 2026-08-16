# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** SID Retail PWA
**Generated:** 2026-08-15 19:33:07
**Category:** Retail POS / Operations Dashboard
**Design Dials:** Variance 3/10 (Minimal) | Motion 1/10 (State feedback only) | Density 9/10 (Dense / Dashboard)

---

## Global Rules

### Color Palette

| Role | Hex | CSS Variable |
|------|-----|--------------|
| Primary | `#1E40AF` | `--color-primary` |
| On Primary | `#FFFFFF` | `--color-on-primary` |
| Secondary | `#3B82F6` | `--color-secondary` |
| On Secondary | `#000000` | `--color-on-secondary` |
| Accent/CTA | `#D97706` | `--color-accent` |
| On Accent/CTA | `#000000` | `--color-on-accent` |
| Background | `#F8FAFC` | `--color-background` |
| Foreground | `#172554` | `--color-foreground` |
| Card | `#FFFFFF` | `--color-card` |
| Card Foreground | `#172554` | `--color-card-foreground` |
| Muted | `#E9EEF6` | `--color-muted` |
| Muted Foreground | `#475569` | `--color-muted-foreground` |
| Border | `#BFDBFE` | `--color-border` |
| Destructive | `#DC2626` | `--color-destructive` |
| On Destructive | `#FFFFFF` | `--color-on-destructive` |
| Ring | `#1E40AF` | `--color-ring` |

**Color Notes:** Light operational UI. Blue communicates navigation and selection, amber attention, and red is reserved for destructive/error states.

### Typography

- **Heading Font:** Fira Sans
- **Body Font:** Fira Sans
- **Numeric/Data Font:** Fira Code
- **Mood:** operational, precise, familiar, fast data entry
- **Google Fonts:** [Fira Sans + Fira Code](https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600;700&family=Fira+Sans:wght@300;400;500;600;700&display=swap)

**CSS Import:**
```css
@import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600;700&family=Fira+Sans:wght@300;400;500;600;700&display=swap');
```

### Spacing Variables

*Density: 9/10 — Dense / Dashboard*

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | `2px` / `0.125rem` | Tight gaps |
| `--space-sm` | `4px` / `0.25rem` | Icon gaps, inline spacing |
| `--space-md` | `8px` / `0.5rem` | Standard padding |
| `--space-lg` | `12px` / `0.75rem` | Section padding |
| `--space-xl` | `16px` / `1rem` | Large gaps |
| `--space-2xl` | `24px` / `1.5rem` | Section margins |
| `--space-3xl` | `32px` / `2rem` | Hero padding |

### Shadow Depths

| Level | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Subtle lift |
| `--shadow-md` | `0 4px 6px rgba(0,0,0,0.1)` | Cards, buttons |
| `--shadow-lg` | `0 10px 15px rgba(0,0,0,0.1)` | Modals, dropdowns |
| `--shadow-xl` | `0 20px 25px rgba(0,0,0,0.15)` | Hero images, featured cards |

---

## Component Specs

### Buttons

```css
/* Primary Button */
.btn-primary {
  background: var(--color-primary);
  color: var(--color-on-primary);
  padding: 8px 12px;
  border-radius: 6px;
  font-weight: 600;
  transition: background-color 120ms ease, opacity 120ms ease;
  cursor: pointer;
}

.btn-primary:hover {
  opacity: 0.9;
}

/* Secondary Button */
.btn-secondary {
  background: transparent;
  color: var(--color-primary);
  border: 1px solid var(--color-primary);
  padding: 8px 12px;
  border-radius: 6px;
  font-weight: 600;
  transition: background-color 120ms ease, color 120ms ease;
  cursor: pointer;
}
```

### Cards

```css
.card {
  background: var(--color-card);
  color: var(--color-card-foreground);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: var(--space-lg);
  box-shadow: var(--shadow-sm);
}
```

### Inputs

```css
.input {
  padding: 8px 10px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 16px;
  transition: border-color 120ms ease, box-shadow 120ms ease;
}

.input:focus {
  border-color: var(--color-ring);
  outline: 2px solid var(--color-ring);
  outline-offset: 1px;
}
```

### Modals

```css
.modal-overlay {
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
}

.modal {
  background: var(--color-card);
  color: var(--color-card-foreground);
  border-radius: 8px;
  padding: var(--space-xl);
  box-shadow: var(--shadow-xl);
  max-width: 500px;
  width: 90%;
}
```

---

## Style Guidelines

**Style:** Minimal Swiss Enterprise UI

**Keywords:** 2D, minimalist, restrained colors, minimal shadows, clean lines, simple shapes, typography-focused, modern, icon-consistent

**Best For:** Web apps, mobile apps, cross-platform, startup MVPs, user-friendly, SaaS, dashboards, corporate

**Key Effects:** No gradients, minimal shadows, 100-150ms state feedback, consistent SVG icons, and no decorative motion in cashier flows.

### Page Pattern

**Pattern Name:** Operational POS Workspace

- **Primary Goal:** Complete repetitive retail transactions quickly, safely, and accurately with keyboard-first interaction.
- **Action Placement:** Persistent action bar, predictable tab order, and shortcut hints beside the related action.
- **Section Order:** Persistent navigation > page title/actions > filters or transaction header > dense data workspace > totals and primary action.

---

## Motion

Use motion only for loading, success, error, selection, and modal state feedback. Keep transitions between 100-150ms and disable non-essential motion under `prefers-reduced-motion`.

---

## Anti-Patterns (Do NOT Use)

- ❌ Tiny tap targets
- ❌ scroll-heavy layout
- ❌ flashy motion
- ❌ hover-only actions
- ❌ delayed keyboard response
- ❌ destructive actions without confirmation and audit context

### Additional Forbidden Patterns

- ❌ **Emojis as icons** — Use SVG icons (Heroicons, Lucide, Simple Icons)
- ❌ **Missing cursor:pointer** — All clickable elements must have cursor:pointer
- ❌ **Layout-shifting hovers** — Avoid scale transforms that shift layout
- ❌ **Low contrast text** — Maintain 4.5:1 minimum contrast ratio
- ❌ **Instant state changes** — Use responsive shared transitions (100-150ms) for state feedback
- ❌ **Invisible focus states** — Focus states must be visible for a11y

---

## Pre-Delivery Checklist

Before delivering any UI code, verify:

- [ ] No emojis used as icons (use SVG instead)
- [ ] All icons from consistent icon set (Heroicons/Lucide)
- [ ] `cursor-pointer` on all clickable elements
- [ ] Hover and pressed states use consistent 100-150ms transitions
- [ ] Light mode: text contrast 4.5:1 minimum
- [ ] Focus states visible for keyboard navigation
- [ ] `prefers-reduced-motion` respected
- [ ] Responsive: 375px, 768px, 1024px, 1440px
- [ ] No content hidden behind fixed navbars
- [ ] No horizontal scroll on mobile
