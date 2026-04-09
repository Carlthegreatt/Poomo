# Outline Warm Sunset UI Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform Poomo from neutral/gray filled UI to playful outline style with warm sunset colors (coral, orange, hot pink, golden yellow).

**Architecture:** CSS-variable-first theme overhaul in `globals.css`, then propagate through shadcn UI primitives (Button, Input, Select, Popover), then restyle application components (Timer, Header, Player, Auth) to use the new theme tokens + outline patterns.

**Tech Stack:** Next.js 15, React 19, Tailwind CSS v4 (CSS-first config), shadcn/ui (New York style), class-variance-authority (CVA)

**Spec:** `docs/superpowers/specs/2026-04-09-outline-warm-sunset-redesign-design.md`

---

### Task 1: Theme Foundation — Rewrite `globals.css`

**Files:**
- Modify: `frontend/styles/globals.css`

- [ ] **Step 1: Replace `globals.css` with new warm sunset theme**

Replace the entire file contents with:

```css
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-inter);
  --color-ring: var(--ring);
  --color-input: var(--input);
  --color-border: var(--border);
  --color-destructive: var(--destructive);
  --color-accent-foreground: var(--accent-foreground);
  --color-accent: var(--accent);
  --color-muted-foreground: var(--muted-foreground);
  --color-muted: var(--muted);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-secondary: var(--secondary);
  --color-primary-foreground: var(--primary-foreground);
  --color-primary: var(--primary);
  --color-popover-foreground: var(--popover-foreground);
  --color-popover: var(--popover);
  --color-card-foreground: var(--card-foreground);
  --color-card: var(--card);
  --color-success: var(--success);
  --color-phase-focus: var(--phase-focus);
  --color-phase-focus-light: var(--phase-focus-light);
  --color-phase-short: var(--phase-short);
  --color-phase-short-light: var(--phase-short-light);
  --color-phase-long: var(--phase-long);
  --color-phase-long-light: var(--phase-long-light);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}

:root {
  --radius: 0.75rem;
  --background: oklch(0.995 0.003 80);
  --foreground: oklch(0.2 0.02 25);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.2 0.02 25);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.2 0.02 25);
  --primary: oklch(0.65 0.2 25);
  --primary-foreground: oklch(1 0 0);
  --secondary: oklch(0.95 0.03 55);
  --secondary-foreground: oklch(0.35 0.05 25);
  --muted: oklch(0.96 0.015 55);
  --muted-foreground: oklch(0.55 0.03 25);
  --accent: oklch(0.95 0.03 55);
  --accent-foreground: oklch(0.35 0.05 25);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.85 0.04 25);
  --input: oklch(0.85 0.04 25);
  --ring: oklch(0.65 0.2 25);
  --success: oklch(0.65 0.17 145);
  --phase-focus: oklch(0.65 0.2 25);
  --phase-focus-light: oklch(0.92 0.06 25);
  --phase-short: oklch(0.72 0.17 55);
  --phase-short-light: oklch(0.93 0.05 55);
  --phase-long: oklch(0.65 0.22 350);
  --phase-long-light: oklch(0.93 0.06 350);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

- [ ] **Step 2: Verify the dev server starts without CSS errors**

Run: `cd frontend && npx next build --no-lint 2>&1 | head -20`
Expected: No CSS parsing errors. Build may have other warnings but CSS should compile cleanly.

- [ ] **Step 3: Commit**

```bash
git add frontend/styles/globals.css
git commit -m "style: replace neutral theme with warm sunset palette

Add phase-specific tokens (focus/short/long), warm primary/border/ring
colors, remove unused sidebar/chart/dark variables."
```

---

### Task 2: Button Variant Overhaul

**Files:**
- Modify: `frontend/components/ui/button.tsx`

- [ ] **Step 1: Rewrite button variants to outline-first style**

Replace the entire `buttonVariants` definition and keep the `Button` component unchanged:

```typescript
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 aria-invalid:border-destructive cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "border-2 border-primary text-primary bg-transparent hover:bg-primary hover:text-white",
        filled:
          "border-2 border-primary bg-primary text-white hover:bg-primary/85",
        destructive:
          "border-2 border-destructive text-destructive bg-transparent hover:bg-destructive hover:text-white focus-visible:ring-destructive/20",
        outline:
          "border-2 border-border bg-transparent hover:bg-accent hover:text-accent-foreground",
        secondary:
          "border-2 border-secondary-foreground/20 bg-secondary text-secondary-foreground hover:bg-secondary/80",
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

Note: `sm` size uses `rounded-lg` (not `rounded-md`) to stay playful. Base and `lg` use `rounded-xl`. `cursor-pointer` added to base class since multiple components were adding it individually. The `dark:` prefixed classes are removed (dark mode not wired).

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit 2>&1 | head -20`
Expected: No new type errors from button changes. The new `filled` variant is auto-inferred by CVA's `VariantProps`.

- [ ] **Step 3: Commit**

```bash
git add frontend/components/ui/button.tsx
git commit -m "style: overhaul Button to outline-first with filled variant

Default is now outlined with coral border. New 'filled' variant for
primary CTAs. Rounder corners, removed shadows, added cursor-pointer
to base."
```

---

### Task 3: Input, Select, Popover Updates

**Files:**
- Modify: `frontend/components/ui/input.tsx`
- Modify: `frontend/components/ui/select.tsx`
- Modify: `frontend/components/ui/popover.tsx`

- [ ] **Step 1: Update Input — thicker border, rounder**

In `frontend/components/ui/input.tsx`, replace the className string in the `cn()` call.

Old first line of className:
```
"file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
```

New first line:
```
"file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground border-input flex h-9 w-full min-w-0 rounded-lg border-2 bg-transparent px-3 py-1 text-base transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
```

Changes: `rounded-md` → `rounded-lg`, `border` → `border-2`, remove `shadow-xs`, remove `dark:bg-input/30`.

- [ ] **Step 2: Update SelectTrigger — thicker border, rounder**

In `frontend/components/ui/select.tsx`, in the `SelectTrigger` function, update the className.

Find in the className string:
- `rounded-md border` → replace with `rounded-lg border-2`
- `shadow-xs` → remove
- `dark:bg-input/30 dark:hover:bg-input/50` → remove

The full updated className for SelectTrigger:
```
"border-input data-[placeholder]:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 aria-invalid:border-destructive flex w-fit items-center justify-between gap-2 rounded-lg border-2 bg-transparent px-3 py-2 text-sm whitespace-nowrap transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-9 data-[size=sm]:h-8 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
```

Also update `SelectContent` className: remove `dark:` classes if present (none in current code — already clean).

- [ ] **Step 3: Update PopoverContent — thicker border, rounder, lighter shadow**

In `frontend/components/ui/popover.tsx`, in the `PopoverContent` function, update the className.

Find in className: `rounded-md border p-4 shadow-md`
Replace with: `rounded-xl border-2 p-4 shadow-sm`

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit 2>&1 | head -20`
Expected: No type errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/components/ui/input.tsx frontend/components/ui/select.tsx frontend/components/ui/popover.tsx
git commit -m "style: update Input, Select, Popover to outline style

Thicker borders (border-2), rounder corners, removed shadows,
removed dark-mode-only classes."
```

---

### Task 4: Timer Component Redesign

**Files:**
- Modify: `frontend/components/timer/Timer.tsx`

This is the largest single task. It involves dead code removal, adding `PHASE_CONFIG`, and restyling all visual elements.

- [ ] **Step 1: Remove dead code — `bgClass` and `textClass`**

Delete these two blocks (lines 23-37 in original):

```typescript
  const bgClass =
    phase === "BREAK_SHORT"
      ? "bg-emerald-50"
      : phase === "BREAK_LONG"
      ? "bg-sky-50"
      : phase === "WORK"
      ? "bg-white"
      : "bg-white";

  const textClass =
    phase === "BREAK_SHORT"
      ? "Short Break"
      : phase === "BREAK_LONG"
      ? "Long Break"
      : phase === "WORK";
```

- [ ] **Step 2: Add `PHASE_CONFIG` object at the top of the file (before the component)**

Add after the imports, before `export default function Timer()`:

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

- [ ] **Step 3: Replace `getPhaseButtonClass` with `PHASE_CONFIG` lookup**

Delete the old `getPhaseButtonClass` function:

```typescript
  const getPhaseButtonClass = (type: Exclude<Phase, "IDLE">) => {
    const isSelected = isRunning ? phase === type : selectedPhase === type;
    if (!isSelected) return "";
    switch (type) {
      case "WORK":
        return "bg-red-100 border border-neutral-300";
      case "BREAK_SHORT":
        return "bg-emerald-100 border border-emerald-200";
      case "BREAK_LONG":
        return "bg-sky-100 border border-sky-200";
    }
  };
```

Add a new helper in its place:

```typescript
  const getPhaseButtonClass = (type: Exclude<Phase, "IDLE">) => {
    const isSelected = isRunning ? phase === type : selectedPhase === type;
    if (!isSelected) return "";
    const config = PHASE_CONFIG[type];
    return `${config.border} ${config.bg} ${config.text}`;
  };
```

- [ ] **Step 4: Replace phase pill buttons — remove `landscape-compact`, use `PHASE_CONFIG` for labels**

Replace the entire phase pills section (the `<div className="flex flex-wrap gap-2 ...">` block) with:

```tsx
        <div className="flex flex-wrap gap-2 sm:gap-3 lg:gap-4 justify-center">
          {(["WORK", "BREAK_SHORT", "BREAK_LONG"] as const).map((type) => (
            <Button
              key={type}
              variant="outline"
              className={`rounded-full text-xs sm:text-sm lg:text-base px-3 sm:px-4 lg:px-6 py-2 ${getPhaseButtonClass(type)}`}
              disabled={isRunning}
              onClick={() => {
                setSelectedPhase(type);
                if (!isRunning) setPhasePreview(type);
              }}
            >
              {PHASE_CONFIG[type].label}
            </Button>
          ))}
        </div>
```

This also removes the duplicated pill markup (DRY).

- [ ] **Step 5: Restyle the timer card — outline style with phase-colored border**

Determine the active phase for styling:

Add this line near the other derived state (after `selectedPhase` state declaration):

```typescript
  const activePhase: Exclude<Phase, "IDLE"> =
    phase !== "IDLE" ? (phase as Exclude<Phase, "IDLE">) : selectedPhase;
```

Replace the timer card `div`:

Old:
```tsx
        <div className="flex flex-col justify-center items-center shadow-2xl bg-neutral-100 w-full max-w-xs sm:max-w-md lg:max-w-lg xl:max-w-xl aspect-[4/3] rounded-xl sm:rounded-3xl lg:rounded-4xl p-3 sm:p-6 lg:p-8">
```

New:
```tsx
        <div className={`flex flex-col justify-center items-center border-2 ${PHASE_CONFIG[activePhase].border} bg-white w-full max-w-xs sm:max-w-md lg:max-w-lg xl:max-w-xl aspect-[4/3] rounded-3xl p-3 sm:p-6 lg:p-8 transition-colors`}>
```

- [ ] **Step 6: Restyle the countdown text and Start/Pause button**

Replace the countdown text div:

Old:
```tsx
            <div className="font-bold text-6xl sm:text-7xl lg:text-7xl xl:text-7xl 2xl:text-8xl text-neutral-800 text-center text-responsive leading-none">
```

New:
```tsx
            <div className={`font-bold text-6xl sm:text-7xl lg:text-7xl xl:text-7xl 2xl:text-8xl ${PHASE_CONFIG[activePhase].text} text-center leading-none transition-colors`}>
```

Replace the Start/Pause Button:

Old:
```tsx
            <Button
              className="cursor-pointer w-full sm:w-auto text-base sm:text-base lg:text-lg xl:text-xl h-11 sm:h-12 lg:h-12 px-6 sm:px-8 lg:px-10 bg-neutral-800 hover:bg-neutral-700"
```

New:
```tsx
            <Button
              variant="filled"
              className={`w-full sm:w-auto text-base lg:text-lg xl:text-xl h-11 sm:h-12 lg:h-12 px-6 sm:px-8 lg:px-10 ${PHASE_CONFIG[activePhase].filled} text-white transition-colors`}
```

- [ ] **Step 7: Remove `landscape-compact` and `text-responsive` references**

In the outer container div:

Old:
```tsx
      <div className="flex flex-col items-center justify-center gap-4 sm:gap-6 lg:gap-8 xl:gap-10 landscape-compact">
```

New:
```tsx
      <div className="flex flex-col items-center justify-center gap-4 sm:gap-6 lg:gap-8 xl:gap-10">
```

(The `text-responsive` reference was removed in Step 6 when we replaced the countdown text div.)

- [ ] **Step 8: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit 2>&1 | head -20`
Expected: No type errors.

- [ ] **Step 9: Commit**

```bash
git add frontend/components/timer/Timer.tsx
git commit -m "style: redesign Timer with phase-colored outlines

Add PHASE_CONFIG for centralized phase styling. Timer card uses
outline with dynamic phase border. Remove dead code (bgClass,
textClass) and undefined CSS classes."
```

---

### Task 5: Header Restyling

**Files:**
- Modify: `frontend/components/header/header.tsx`

- [ ] **Step 1: Update header border and brand title**

In the `<header>` element, change `border-b` to `border-b-2`:

Old:
```tsx
    <header className="sticky flex items-center justify-center top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
```

New:
```tsx
    <header className="sticky flex items-center justify-center top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b-2">
```

Update the "Poomo" title to use brand color:

Old:
```tsx
          <div className="font-semibold text-lg sm:text-xl lg:text-2xl">
            Poomo
          </div>
```

New:
```tsx
          <div className="font-semibold text-lg sm:text-xl lg:text-2xl text-primary">
            Poomo
          </div>
```

- [ ] **Step 2: Update settings slider accent colors**

In the `SettingsPopover` function, find both `<input type="range" ... />` elements.

Replace `style={{ accentColor: "black" }}` with `style={{ accentColor: "var(--phase-focus)" }}` on both sliders.

- [ ] **Step 3: Remove `cursor-pointer` from buttons that now get it from base**

The Button base class now includes `cursor-pointer`, so remove `className="cursor-pointer"` from each Button in header.tsx. Where className had only `cursor-pointer`, remove the className prop entirely:

Old (3 buttons):
```tsx
<Button className="cursor-pointer" variant="ghost" size="icon">
```

New:
```tsx
<Button variant="ghost" size="icon">
```

Also the `cursor-pointer` on `<ChartBar className="cursor-pointer h-4 w-4" />` should be removed — it's an icon inside a button and doesn't need its own cursor:

Old:
```tsx
<ChartBar className="cursor-pointer h-4 w-4" />
```

New:
```tsx
<ChartBar className="h-4 w-4" />
```

- [ ] **Step 4: Commit**

```bash
git add frontend/components/header/header.tsx
git commit -m "style: restyle Header with coral brand title and warm borders

Thicker bottom border, coral 'Poomo' title, warm slider accent,
clean up redundant cursor-pointer classes."
```

---

### Task 6: Player Restyling

**Files:**
- Modify: `frontend/components/player/Player.tsx`
- Modify: `frontend/components/player/upload.tsx`

- [ ] **Step 1: Clean up Player button classes**

In `frontend/components/player/Player.tsx`, update the play/pause Button:

Old:
```tsx
        <Button
          onClick={togglePlayPause}
          disabled={isLoading}
          className="cursor-pointer w-full sm:w-auto px-3 sm:px-4 lg:px-5 py-2 sm:py-2.5 lg:py-3 rounded-lg disabled:opacity-60 text-xs sm:text-sm lg:text-base h-8 sm:h-9 lg:h-10"
        >
```

New:
```tsx
        <Button
          onClick={togglePlayPause}
          disabled={isLoading}
          size="icon"
        >
```

- [ ] **Step 2: Clean up Upload button classes**

In `frontend/components/player/upload.tsx`, update the upload Button:

Old:
```tsx
      <Button
        onClick={handleButtonClick}
        disabled={isRunning}
        className="cursor-pointer w-full sm:w-auto px-3 sm:px-4 lg:px-5 py-2 sm:py-2.5 lg:py-3 rounded-lg disabled:opacity-60 text-xs sm:text-sm lg:text-base h-8 sm:h-9 lg:h-10"
      >
```

New:
```tsx
      <Button
        onClick={handleButtonClick}
        disabled={isRunning}
        size="icon"
      >
```

Also simplify the icon inside (no need for responsive sizing with `size="icon"`):

Old:
```tsx
          <UploadIcon className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5"></UploadIcon>
```

New:
```tsx
          <UploadIcon className="size-4" />
```

- [ ] **Step 3: Simplify Player icon sizing to match**

In `frontend/components/player/Player.tsx`, simplify the play/pause/loading icons:

Old loading spinner:
```tsx
            <div className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
```

New:
```tsx
            <div className="size-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
```

Old Pause/Play icons:
```tsx
            <Pause className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
```
```tsx
            <Play className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
```

New:
```tsx
            <Pause className="size-4" />
```
```tsx
            <Play className="size-4" />
```

- [ ] **Step 4: Commit**

```bash
git add frontend/components/player/Player.tsx frontend/components/player/upload.tsx
git commit -m "style: clean up Player buttons to use size variants

Replace verbose inline size classes with Button size='icon' variant.
Simplify icon sizing to size-4."
```

---

### Task 7: Auth Pages Restyling

**Files:**
- Modify: `frontend/app/login/loginForm.tsx`
- Modify: `frontend/app/register/registerForm.tsx`

- [ ] **Step 1: Update Login form**

In `frontend/app/login/loginForm.tsx`:

1. Add coral color to the heading. Old:
```tsx
          <p className="font-bold text-5xl my-5">Ready to Focus?</p>
```
New:
```tsx
          <p className="font-bold text-5xl my-5 text-primary">Ready to Focus?</p>
```

2. Change subtitle to use theme token. Old:
```tsx
          <p className="text-neutral-700">Login to your Account</p>
```
New:
```tsx
          <p className="text-muted-foreground">Login to your Account</p>
```

3. Make Login button `filled` variant. Old:
```tsx
          <Button type="submit" className="w-full">
            Login
          </Button>
```
New:
```tsx
          <Button type="submit" variant="filled" className="w-full">
            Login
          </Button>
```

4. OAuth buttons — add explicit `variant="outline"` (already outline, but explicit is clearer). Old:
```tsx
              <Button
                variant="outline"
                className="w-1/2"
                onClick={signInWithGoogle}
              >
```
These are already `variant="outline"` — no change needed.

5. Remove `cursor-pointer` if present (it's now in Button base). Not present in this file — no change needed.

- [ ] **Step 2: Update Register form**

In `frontend/app/register/registerForm.tsx`:

1. Make Create Account button `filled`. Old:
```tsx
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? "Creating account..." : "Create account"}
        </Button>
```
New:
```tsx
        <Button type="submit" variant="filled" disabled={isSubmitting} className="w-full">
          {isSubmitting ? "Creating account..." : "Create account"}
        </Button>
```

2. Replace hardcoded success color. Old:
```tsx
        {message && <p className="text-green-600 text-sm">{message}</p>}
```
New:
```tsx
        {message && <p className="text-success text-sm">{message}</p>}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/app/login/loginForm.tsx frontend/app/register/registerForm.tsx
git commit -m "style: restyle auth pages with warm sunset theme

Coral heading, filled CTA buttons, theme-token success color,
warm muted text."
```

---

### Task 8: General Cleanup

**Files:**
- Modify: `frontend/app/page.tsx`
- Modify: `frontend/app/layout.tsx`

- [ ] **Step 1: Remove `console.log(supabase)` from home page**

In `frontend/app/page.tsx`, delete this line:

```typescript
  console.log(supabase);
```

Also remove the now-unused `supabase` import:

```typescript
import supabase from "@/lib/supabaseClient";
```

- [ ] **Step 2: Fix metadata description**

In `frontend/app/layout.tsx`, update:

Old:
```typescript
  description: "GPomodoro app",
```

New:
```typescript
  description: "Pomodoro app",
```

- [ ] **Step 3: Commit**

```bash
git add frontend/app/page.tsx frontend/app/layout.tsx
git commit -m "chore: remove debug console.log, fix metadata typo"
```

---

### Task 9: Build Verification

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
- Home page: warm white background, coral "Poomo" title, outlined timer card with coral border, phase pills with distinct colors, coral filled Start button
- Click Short Break pill: card border turns orange, button turns orange
- Click Long Break pill: card border turns hot pink, button turns hot pink
- Settings popover: warm borders, coral slider accents
- Login page (`/login`): coral "Ready to Focus?" heading, filled coral Login button, outlined OAuth buttons
- Register page (`/register`): filled coral Create Account button

- [ ] **Step 4: Final commit (if any fixes needed)**

If spot-checking reveals issues, fix and commit. Otherwise, done.
