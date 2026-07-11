# Design System Specification: ตีนแมวfoto

`DESIGN.md` defines the visual system, style tokens, component specifications, and anti-pattern boundaries for **ตีนแมวfoto** to enforce a luxury dark gold brand style.

---

## 1. Color Palette Tokens

### Primary Dark Neutrals
*   **Deep Background (`--bg`):** `#0a0a0a` (A deep, rich neutral black with a very slight warm tint. Avoid pure `#000000` except for absolute shadows).
*   **Elevated Card Surface (`--card`):** `#141414` / `#121212` (Tinted warm grey).
*   **Elevated Card Hover (`--card-elevated`):** `#1a1a1a`.

### Warm Gold Accents (Brand Identity)
*   **Primary Gold (`--gold`):** `#d8b76c` (Elegant, historical gold. Never use generic neon yellow).
*   **Light Gold Accent (`--gold-light`):** `#f0d695` (Soft highlight gold).
*   **Dark Gold Shadow (`--gold-dark`):** `#9e7937` (Muted antique gold for borders and status shadows).
*   **Golden Borders (`--border-gold`):** `rgba(216,183,108,0.3)` (Low-opacity border outline).

### Status Colors
*   **Completed / Verified (Green):** `#74d98a` / `rgba(116,217,138,0.1)`
*   **Overdue / Alert (Red):** `#ff6b6b` / `rgba(255,107,107,0.1)`
*   **Pending / Warning (Amber):** `#f59e0b` / `rgba(245,158,11,0.1)`

### Paper Sheet Tokens (For Booking Slips/Canvas)
*   **Paper Tint:** `#f4f1ea` (Classic ivory paper, soft on the eyes).
*   **Ink Text:** `#1f1e1a` (Deep charcoal, warm ink).
*   **Muted Text:** `#625f57` (Soft grey).
*   **Gold Ink:** `#b89449` (Printable muted gold).

---

## 2. Typography Rules
*   **Headings & Display:** Use **serif** or display fonts (`Bodoni`, `Georgia`, `Didot`, or `Outfit` headers) for a classic, bespoke editorial look.
*   **Body & UI Text:** Use readable, high-legibility sans-serif fonts (`Segoe UI`, `Plus Jakarta Sans`, or `Noto Sans Thai` for native Thai language readability).
*   **Numbers & Status Codes:** Use clean, tabular monospaced fonts (`Courier New`, monospace) to align financials and status codes perfectly.

---

## 3. UI Patterns & Layouts
*   **Glassmorphism (`oracat-card`):** Cards are semi-translucent with a subtle gold border, deep backdrops, and soft ambient drop shadows.
*   **Tactile Buttons:** Gold buttons use an elegant, vertical gradient (`linear-gradient(180deg, var(--gold-light), var(--gold))`) with a dark, high-contrast text color (`#161006`).
*   **Scrollbars:** Custom slim, scrollbars using `#2a2a2a` thumb and a `#0a0a0a` track.

---

## 4. Slop-Mitigation & Anti-Patterns (What to Avoid)
*   ❌ **No Purple-to-Blue Linear Gradients:** Avoid standard AI coding template gradients. Accents are gold and white only.
*   ❌ **No Pure Gray Tailwind Backgrounds:** Never use default Tailwind `bg-slate-900` or `bg-zinc-900` body backgrounds. Use the rich dark gold-tinted gradient.
*   ❌ **No Default Drop Shadows:** Do not use unstyled, harsh box-shadows. Use low-spread ambient shadows with a tint.
*   ❌ **No Missing Fallbacks:** Always support clean placeholder images and initial empty lists to avoid layout collapse.
