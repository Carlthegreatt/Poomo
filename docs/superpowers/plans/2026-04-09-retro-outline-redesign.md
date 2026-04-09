# Retro Outline UI Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform Poomo into a bold retro-themed outline UI with black borders, colorful fills, offset shadows, and a press-down button effect using the 6-color retro palette.

**Architecture:** CSS-variable-first theme in `globals.css` sets black borders and maps all 6 retro palette colors. Button variants get retro offset shadows with active press effects. Timer card gets a phase-colored drop shadow. All bordered UI elements inherit black from the `--border` / `--input` vars.

**Tech Stack:** Next.js 15, React 19, Tailwind CSS v4 (CSS-first config), shadcn/ui (New York style), class-variance-authority (CVA)

**Retro Palette:**
| Color | Hex | Role |
|-------|-----|------|
| Golden Yellow | #FFC567 | `--secondary` — warm secondary fills |
| Pink | #FB7DA8 | `--accent` — hover highlights, playful tints |
| Coral | #FD5A46 | `--primary` + `--phase-focus` — CTAs, Focus phase |
| Purple | #552CB7 | `--phase-long` — Long Break phase |
| Green | #00995E | `--success` — success messages |
| Blue | #058CD7 | `--phase-short` — Short Break phase |

---

### Task 1: Theme Foundation — Retro Palette with Black Borders

**Files:**
- Modify: `frontend/styles/globals.css`

- [ ] **Step 1: Replace the `:root` block with retro palette**

In `frontend/styles/globals.css`, replace the entire `:root { ... }` block.

Old:
```css
:root {
  --radius: 0.75rem;
  --background: #FFFDF9;
  --foreground: #1c1917;
  --card: #ffffff;
  --card-foreground: #1c1917;
  --popover: #ffffff;
  --popover-foreground: #1c1917;
  --primary: #FD5A46;
  --primary-foreground: #ffffff;
  --secondary: #FFF0F3;
  --secondary-foreground: #3d2040;
  --muted: #f5f0e8;
  --muted-foreground: #78716c;
  --accent: #FFF8E7;
  --accent-foreground: #44403c;
  --destructive: oklch(0.577 0.245 27.325);
  --border: #e8ddd0;
  --input: #e8ddd0;
  --ring: #FD5A46;
  --success: #00995E;
  --phase-focus: #FD5A46;
  --phase-focus-light: #FEE2DF;
  --phase-short: #058CD7;
  --phase-short-light: #DCEEFB;
  --phase-long: #552CB7;
  --phase-long-light: #E8E0F5;
}
```

New:
```css
:root {
  --radius: 0.75rem;
  --background: #FFF8F0;
  --foreground: #1a1a1a;
  --card: #ffffff;
  --card-foreground: #1a1a1a;
  --popover: #ffffff;
  --popover-foreground: #1a1a1a;
  --primary: #FD5A46;
  --primary-foreground: #ffffff;
  --secondary: #FFC567;
  --secondary-foreground: #1a1a1a;
  --muted: #f5f0e8;
  --muted-foreground: #78716c;
  --accent: #FB7DA8;
  --accent-foreground: #1a1a1a;
  --destructive: oklch(0.577 0.245 27.325);
  --border: #000000;
  --input: #000000;
  --ring: #FD5A46;
  --success: #00995E;
  --phase-focus: #FD5A46;
  --phase-focus-light: #FEE2DF;
  --phase-short: #058CD7;
  --phase-short-light: #DCEEFB;
  --phase-long: #552CB7;
  --phase-long-light: #E8E0F5;
}
```

Key changes:
- `--border` and `--input`: `#e8ddd0` → `#000000` (pure black borders)
- `--secondary`: `#FFF0F3` → `#FFC567` (golden yellow from palette)
- `--secondary-foreground`: `#3d2040` → `#1a1a1a` (dark on yellow)
- `--accent`: `#FFF8E7` → `#FB7DA8` (pink from palette)
- `--accent-foreground`: `#44403c` → `#1a1a1a` (dark on pink)
- `--background`: `#FFFDF9` → `#FFF8F0` (warmer cream)
- `--foreground` / `--card-foreground` / `--popover-foreground`: `#1c1917` → `#1a1a1a`

- [ ] **Step 2: Verify the dev server compiles without CSS errors**

Run: `cd frontend && npx next build --no-lint 2>&1 | head -20`
Expected: No CSS parsing errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/styles/globals.css
git commit -m "style: retro palette with black borders and bright accent colors

Map all 6 retro palette colors: yellow secondary, pink accent,
coral primary, purple/blue phases, green success. Borders now
pure black for bold retro outline look."
```

---

### Task 2: Button Variants — Black Borders + Retro Shadow + Press Effect

**Files:**
- Modify: `frontend/components/ui/button.tsx`

- [ ] **Step 1: Replace `buttonVariants` with retro version**

In `frontend/components/ui/button.tsx`, replace the entire `buttonVariants` const (from `const buttonVariants = cva(` through the closing `)`) with:

```typescript
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 aria-invalid:border-destructive cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "border-2 border-border text-primary bg-transparent shadow-[3px_3px_0_black] hover:bg-primary hover:text-white active:shadow-none active:translate-x-[3px] active:translate-y-[3px]",
        filled:
          "border-2 border-border bg-primary text-white shadow-[3px_3px_0_black] hover:bg-primary/90 active:shadow-none active:translate-x-[3px] active:translate-y-[3px]",
        destructive:
          "border-2 border-border text-destructive bg-transparent shadow-[3px_3px_0_black] hover:bg-destructive hover:text-white active:shadow-none active:translate-x-[3px] active:translate-y-[3px] focus-visible:ring-destructive/20",
        outline:
          "border-2 border-border bg-transparent shadow-[3px_3px_0_black] hover:bg-accent hover:text-accent-foreground active:shadow-none active:translate-x-[3px] active:translate-y-[3px]",
        secondary:
          "border-2 border-border bg-secondary text-secondary-foreground shadow-[3px_3px_0_black] hover:bg-secondary/80 active:shadow-none active:translate-x-[3px] active:translate-y-[3px]",
        ghost:
          "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-lg gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-xl px-6 has-[>svg]:px-4",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)
```

Changes from current:
- Base: `font-medium` → `font-semibold` (bolder for retro)
- `default`: `border-primary` → `border-border` (black), added retro shadow + press effect
- `filled`: `border-primary` → `border-border`, `hover:bg-primary/85` → `hover:bg-primary/90`, added retro shadow + press effect
- `destructive`: `border-destructive` → `border-border`, added retro shadow + press effect
- `outline`: added retro shadow + press effect
- `secondary`: `border-secondary-foreground/20` → `border-border`, added retro shadow + press effect
- `ghost` and `link`: unchanged (no borders, no shadows)

The retro shadow pattern: `shadow-[3px_3px_0_black]` creates a 3px offset black shadow (paper cutout effect). On active/click: `active:shadow-none active:translate-x-[3px] active:translate-y-[3px]` makes the button "press in" by removing the shadow and translating the button into where the shadow was.

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit 2>&1 | head -20`
Expected: No type errors. CVA infers the new variant names.

- [ ] **Step 3: Commit**

```bash
git add frontend/components/ui/button.tsx
git commit -m "style: retro buttons with black borders, offset shadows, press effect

All bordered variants get black borders, 3px offset shadow, and
active press-in animation. Font weight bumped to semibold."
```

---

### Task 3: Timer Redesign — Retro Card with Colored Shadow

**Files:**
- Modify: `frontend/components/timer/Timer.tsx`

This task updates `PHASE_CONFIG` to remove phase-colored borders (now all black), adds colored offset shadows to the timer card, and makes selected phase pills show solid colored fills.

- [ ] **Step 1: Replace `PHASE_CONFIG` with retro version**

In `frontend/components/timer/Timer.tsx`, replace the entire `PHASE_CONFIG` const:

Old:
```typescript
const PHASE_CONFIG = {
  WORK: {
    label: "Focus",
    border: "border-phase-focus",
    bg: "bg-phase-focus-light",
    text: "text-phase-focus",
    filled: "bg-phase-focus border-phase-focus hover:bg-phase-focus/85",
  },
  BREAK_SHORT: {
    label: "Short Break",
    border: "border-phase-short",
    bg: "bg-phase-short-light",
    text: "text-phase-short",
    filled: "bg-phase-short border-phase-short hover:bg-phase-short/85",
  },
  BREAK_LONG: {
    label: "Long Break",
    border: "border-phase-long",
    bg: "bg-phase-long-light",
    text: "text-phase-long",
    filled: "bg-phase-long border-phase-long hover:bg-phase-long/85",
  },
} as const;
```

New:
```typescript
const PHASE_CONFIG = {
  WORK: {
    label: "Focus",
    text: "text-phase-focus",
    filled: "bg-phase-focus hover:bg-phase-focus/85",
    pillSelected: "bg-phase-focus text-white",
    shadowColor: "var(--phase-focus)",
  },
  BREAK_SHORT: {
    label: "Short Break",
    text: "text-phase-short",
    filled: "bg-phase-short hover:bg-phase-short/85",
    pillSelected: "bg-phase-short text-white",
    shadowColor: "var(--phase-short)",
  },
  BREAK_LONG: {
    label: "Long Break",
    text: "text-phase-long",
    filled: "bg-phase-long hover:bg-phase-long/85",
    pillSelected: "bg-phase-long text-white",
    shadowColor: "var(--phase-long)",
  },
} as const;
```

Changes:
- Removed `border` property (all borders now black via `border-border`)
- Removed `bg` property (light phase backgrounds no longer used)
- Added `pillSelected` — solid colored fill + white text for selected phase pills
- Added `shadowColor` — CSS variable reference for inline box-shadow on card
- `filled` — removed `border-phase-*` (button variant handles black border)

- [ ] **Step 2: Update `getPhaseButtonClass` for retro pill style**

Replace the `getPhaseButtonClass` function:

Old:
```typescript
  const getPhaseButtonClass = (type: Exclude<Phase, "IDLE">) => {
    const isSelected = isRunning ? phase === type : selectedPhase === type;
    if (!isSelected) return "";
    const config = PHASE_CONFIG[type];
    return `${config.border} ${config.bg} ${config.text}`;
  };
```

New:
```typescript
  const getPhaseButtonClass = (type: Exclude<Phase, "IDLE">) => {
    const isSelected = isRunning ? phase === type : selectedPhase === type;
    if (!isSelected) return "";
    return `${PHASE_CONFIG[type].pillSelected} shadow-none translate-x-[3px] translate-y-[3px]`;
  };
```

The selected pill now gets:
- Solid phase-colored fill + white text
- `shadow-none` removes the outline variant's retro shadow
- `translate-x-[3px] translate-y-[3px]` makes it look "pressed in" — a retro toggle effect

- [ ] **Step 3: Update the timer card div — black border + colored offset shadow**

Replace the timer card opening div:

Old:
```tsx
        <div className={`flex flex-col justify-center items-center border-2 ${PHASE_CONFIG[activePhase].border} bg-white w-full max-w-xs sm:max-w-md lg:max-w-lg xl:max-w-xl aspect-[4/3] rounded-3xl p-3 sm:p-6 lg:p-8 transition-colors`}>
```

New:
```tsx
        <div
          className="flex flex-col justify-center items-center border-2 border-border bg-white w-full max-w-xs sm:max-w-md lg:max-w-lg xl:max-w-xl aspect-[4/3] rounded-3xl p-3 sm:p-6 lg:p-8 transition-all"
          style={{ boxShadow: `6px 6px 0 ${PHASE_CONFIG[activePhase].shadowColor}` }}
        >
```

Changes:
- `${PHASE_CONFIG[activePhase].border}` → `border-border` (black, static)
- `transition-colors` → `transition-all` (also transitions box-shadow)
- Added inline `style` with phase-colored 6px offset shadow. The shadow color transitions when the phase changes.

- [ ] **Step 4: Keep the countdown text as-is (already uses `PHASE_CONFIG[activePhase].text`)**

The countdown text div already uses `${PHASE_CONFIG[activePhase].text}` which still works:
```tsx
            <div className={`font-bold text-6xl sm:text-7xl lg:text-7xl xl:text-7xl 2xl:text-8xl ${PHASE_CONFIG[activePhase].text} text-center leading-none transition-colors`}>
```
No change needed.

- [ ] **Step 5: Update the Start/Pause button — remove border override**

Replace the Start/Pause Button:

Old:
```tsx
            <Button
              variant="filled"
              className={`w-full sm:w-auto text-base lg:text-lg xl:text-xl h-11 sm:h-12 lg:h-12 px-6 sm:px-8 lg:px-10 ${PHASE_CONFIG[activePhase].filled} text-white transition-colors`}
```

New:
```tsx
            <Button
              variant="filled"
              className={`w-full sm:w-auto text-base lg:text-lg xl:text-xl h-11 sm:h-12 lg:h-12 px-6 sm:px-8 lg:px-10 ${PHASE_CONFIG[activePhase].filled} text-white`}
```

Changes: Removed `transition-colors` (the button variant's `transition-all` handles it). The `filled` config overrides `bg-primary` with the phase-specific color, while the button variant provides the black border and retro shadow.

- [ ] **Step 6: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit 2>&1 | head -20`
Expected: No type errors.

- [ ] **Step 7: Commit**

```bash
git add frontend/components/timer/Timer.tsx
git commit -m "style: retro timer with colored offset shadow and pill press effect

Timer card gets black border + 6px phase-colored offset shadow.
Selected phase pills show solid color fill with pressed-in look.
Remove phase-colored borders in favor of black everywhere."
```

---

### Task 4: Select & Popover — Retro Shadows

**Files:**
- Modify: `frontend/components/ui/select.tsx`
- Modify: `frontend/components/ui/popover.tsx`

These already inherit black borders from `--border` / `--input` CSS vars. We just need to add retro offset shadows and adjust border widths.

- [ ] **Step 1: Update SelectContent — retro shadow + thicker border**

In `frontend/components/ui/select.tsx`, in the `SelectContent` function's className, find:

```
rounded-md border shadow-md
```

Replace with:

```
rounded-xl border-2 shadow-[4px_4px_0_black]
```

(This occurs inside the first `cn()` call in SelectContent.)

- [ ] **Step 2: Update PopoverContent — retro shadow**

In `frontend/components/ui/popover.tsx`, in the `PopoverContent` function's className, find:

```
rounded-xl border-2 p-4 shadow-sm
```

Replace with:

```
rounded-xl border-2 p-4 shadow-[4px_4px_0_black]
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit 2>&1 | head -20`
Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/components/ui/select.tsx frontend/components/ui/popover.tsx
git commit -m "style: retro offset shadows on Select dropdown and Popover

SelectContent gets border-2 + rounded-xl + 4px offset shadow.
PopoverContent shadow upgraded to 4px offset."
```

---

### Task 5: Auth Pages — Theme Token Cleanup

**Files:**
- Modify: `frontend/app/login/loginForm.tsx`
- Modify: `frontend/app/register/registerForm.tsx`

These pages already use `variant="filled"` and theme tokens. Only minor cleanup needed: replace hardcoded `text-red-500` error colors with the theme's `text-destructive`.

- [ ] **Step 1: Update Login form error color**

In `frontend/app/login/loginForm.tsx`, find:

```tsx
          {error && <p className="text-red-500 text-sm">{error}</p>}
```

Replace with:

```tsx
          {error && <p className="text-destructive text-sm">{error}</p>}
```

- [ ] **Step 2: Update Register form error color**

In `frontend/app/register/registerForm.tsx`, find:

```tsx
        {error && <p className="text-red-500 text-sm">{error}</p>}
```

Replace with:

```tsx
        {error && <p className="text-destructive text-sm">{error}</p>}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/app/login/loginForm.tsx frontend/app/register/registerForm.tsx
git commit -m "style: replace hardcoded red-500 with theme destructive token"
```

---

### Task 6: Build Verification

**Files:** None (verification only)

- [ ] **Step 1: Run TypeScript type checking**

Run: `cd frontend && npx tsc --noEmit`
Expected: Clean exit (0 errors).

- [ ] **Step 2: Run production build**

Run: `cd frontend && npx next build`
Expected: Build succeeds. Pages compile without errors.

- [ ] **Step 3: Visual spot-check (manual)**

Run: `cd frontend && npx next dev --turbopack`
Open http://localhost:3000 and verify:
- **Background**: warm cream (#FFF8F0)
- **Header**: black bottom border, coral "Poomo" title
- **Timer card**: white bg, black 2px border, 6px coral offset shadow (Focus phase)
- **Phase pills**: black borders with retro shadow. Selected pill = solid coral fill + white text + pressed-in look
- **Start button**: coral fill, black border, retro shadow, presses in on click
- **Click Short Break pill**: card shadow turns blue, countdown text turns blue, start button turns blue
- **Click Long Break pill**: card shadow turns purple, countdown text turns purple, start button turns purple
- **Outline buttons**: black border, retro shadow, pink hover highlight
- **Settings popover**: black border, 4px offset shadow, coral slider accents
- **Login page** (`/login`): coral heading, filled coral Login button with black border + shadow, outlined OAuth buttons with black border + shadow
- **Register page** (`/register`): filled coral Create Account button with black border + shadow
- **Music select dropdown**: black border, retro offset shadow

- [ ] **Step 4: Final commit (if any fixes needed)**

If spot-checking reveals issues, fix and commit. Otherwise, done.
