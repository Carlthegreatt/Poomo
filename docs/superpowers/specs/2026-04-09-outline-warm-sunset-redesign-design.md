# Retro Outline UI Redesign — Design Spec

## Goal

Transform Poomo's UI from a neutral/gray filled-element style to a **playful, vibrant outline style** with a **retro color palette** on a clean white background. Each timer phase gets a distinct bold color. Includes code cleanup and proper restructuring.

## Design Decisions

- **Style**: Playful & vibrant — thick rounded borders, bold saturated colors, minimal shadows
- **Palette**: Retro — coral red #FD5A46 (Focus), blue #058CD7 (Short Break), purple #552CB7 (Long Break), golden yellow #FFC567 (accent), green #00995E (success), pink #FB7DA8 (secondary)
- **Background**: Clean white/cream
- **Approach**: Systematic theme + shadcn variant overhaul (Approach B) with coding standards cleanup

---

## 1. Theme Foundation (`styles/globals.css`)

### New CSS Custom Properties

Replace the current neutral achromatic palette with warm sunset values.

**Phase tokens (new):**

| Token | Value | Purpose |
|-------|-------|---------|
| `--phase-focus` | `#FD5A46` | Coral red — Focus phase primary |
| `--phase-focus-light` | `#FEE2DF` | Light coral — Focus phase bg tint |
| `--phase-short` | `#058CD7` | Blue — Short Break primary |
| `--phase-short-light` | `#DCEEFB` | Light blue — Short Break bg tint |
| `--phase-long` | `#552CB7` | Purple — Long Break primary |
| `--phase-long-light` | `#E8E0F5` | Light purple — Long Break bg tint |

**Core variable overrides:**

| Token | Old Value | New Value | Reason |
|-------|-----------|-----------|--------|
| `--primary` | `oklch(0.205 0 0)` (near-black) | `#FD5A46` (coral red) | Retro primary brand color |
| `--primary-foreground` | `oklch(0.985 0 0)` (white) | `#ffffff` (white) | Stays white for contrast |
| `--secondary` | `oklch(0.97 0 0)` (gray) | `#FFF0F3` (light pink tint) | Soft retro secondary surface |
| `--secondary-foreground` | `oklch(0.205 0 0)` | `#3d2040` (warm dark) | Dark text on pink tint |
| `--muted` | `oklch(0.97 0 0)` | `#f5f0e8` (warm cream) | Subtle retro muted |
| `--muted-foreground` | `oklch(0.556 0 0)` | `#78716c` (warm mid gray) | Muted text |
| `--accent` | `oklch(0.97 0 0)` | `#FFF8E7` (light golden tint) | Golden hover background |
| `--accent-foreground` | `oklch(0.205 0 0)` | `#44403c` (warm dark) | Accent text |
| `--destructive` | `oklch(0.577 0.245 27.325)` | Keep as-is | Already fits retro red |
| `--border` | `oklch(0.922 0 0)` (light gray) | `#e8ddd0` (warm visible) | Warm visible border |
| `--input` | `oklch(0.922 0 0)` | `#e8ddd0` | Match border |
| `--ring` | `oklch(0.708 0 0)` | `#FD5A46` (coral red) | Coral focus ring |
| `--background` | `oklch(1 0 0)` | `#FFFDF9` (warm white) | Subtle warm white |
| `--foreground` | `oklch(0.145 0 0)` | `#1c1917` (warm near-black) | Warm dark text |
| `--card` | `oklch(1 0 0)` | `#ffffff` (white) | Clean white card |
| `--card-foreground` | `oklch(0.145 0 0)` | `#1c1917` | Warm dark |
| `--popover` | `oklch(1 0 0)` | `#ffffff` | White popover |
| `--popover-foreground` | `oklch(0.145 0 0)` | `#1c1917` | Warm dark |
| `--radius` | `0.625rem` | `0.75rem` | Rounder for playful feel |

**New token:**

| Token | Value | Purpose |
|-------|-------|---------|
| `--success` | `#00995E` | Success messages (retro green, replaces hardcoded `text-green-600`) |

**Removals:**
- All `--sidebar-*` variables (unused — no sidebar in the app)
- All `--chart-*` variables (no charts implemented)
- Entire `.dark` block (not wired up — no ThemeProvider in layout)

### `@theme inline` Block

Update to map new phase tokens and remove sidebar/chart mappings:

```
--color-phase-focus: var(--phase-focus);
--color-phase-focus-light: var(--phase-focus-light);
--color-phase-short: var(--phase-short);
--color-phase-short-light: var(--phase-short-light);
--color-phase-long: var(--phase-long);
--color-phase-long-light: var(--phase-long-light);
--color-success: var(--success);
```

---

## 2. Component Variant Overhaul

### Button (`components/ui/button.tsx`)

**Base class changes:**
- `rounded-md` → `rounded-xl` (rounder)
- Remove `shadow-xs` from base (outline style is border-driven)

**Variant changes:**

| Variant | Old | New |
|---------|-----|-----|
| `default` | `bg-primary text-primary-foreground shadow-xs hover:bg-primary/90` | `border-2 border-primary text-primary bg-transparent hover:bg-primary hover:text-white` |
| (new) `filled` | N/A | `border-2 border-primary bg-primary text-white hover:bg-primary/85` |
| `destructive` | `bg-destructive text-white shadow-xs ...` | `border-2 border-destructive text-destructive bg-transparent hover:bg-destructive hover:text-white` |
| `outline` | `border bg-background shadow-xs hover:bg-accent ...` | `border-2 border-border bg-transparent hover:bg-accent hover:text-accent-foreground` |
| `secondary` | `bg-secondary text-secondary-foreground shadow-xs ...` | `border-2 border-secondary-foreground/20 bg-secondary text-secondary-foreground hover:bg-secondary/80` |
| `ghost` | unchanged | unchanged |
| `link` | unchanged | unchanged |

### Input (`components/ui/input.tsx`)

- `border` → `border-2`
- `rounded-md` → `rounded-lg`
- `shadow-xs` → remove
- Focus ring stays `ring-ring/50` (now coral)

### Select Trigger (`components/ui/select.tsx`)

- `border` → `border-2` on SelectTrigger
- `rounded-md` → `rounded-lg`
- `shadow-xs` → remove

### Popover Content (`components/ui/popover.tsx`)

- `border` → `border-2`
- `rounded-md` → `rounded-xl`
- `shadow-md` → `shadow-sm` (de-emphasize shadow)

---

## 3. Timer Component (`components/timer/Timer.tsx`)

### Code Cleanup

**Remove dead code:**
- `bgClass` variable (lines 23-30) — never applied to any element
- `textClass` variable (lines 32-37) — broken logic, mixes strings with phase enum, never used
- `landscape-compact` CSS class reference — undefined in any stylesheet
- `text-responsive` CSS class reference — undefined in any stylesheet

### New: Phase Config Object

Extract phase styling into a centralized config to eliminate scattered hardcoded colors:

```typescript
const PHASE_CONFIG = {
  WORK: {
    label: "Focus",
    border: "border-phase-focus",
    bg: "bg-phase-focus-light",
    text: "text-phase-focus",
    filled: "bg-phase-focus border-phase-focus",
  },
  BREAK_SHORT: {
    label: "Short Break",
    border: "border-phase-short",
    bg: "bg-phase-short-light",
    text: "text-phase-short",
    filled: "bg-phase-short border-phase-short",
  },
  BREAK_LONG: {
    label: "Long Break",
    border: "border-phase-long",
    bg: "bg-phase-long-light",
    text: "text-phase-long",
    filled: "bg-phase-long border-phase-long",
  },
} as const;
```

### Phase Pills

- Selected: thick `border-2` in phase color, light phase bg, phase-colored text
- Unselected: default outline style (warm border from theme)
- Replace `getPhaseButtonClass` inline conditionals with `PHASE_CONFIG` lookup

### Timer Card

- Old: `bg-neutral-100 shadow-2xl rounded-xl`
- New: `bg-white border-2 rounded-3xl shadow-none` with dynamic `border-phase-{active}` class
- The card's border color shifts per active phase

### Start/Pause Button

- Old: `bg-neutral-800 hover:bg-neutral-700` (hardcoded dark)
- New: `filled` variant Button with phase color override via `className`
- The `filled` variant provides `border-2 bg-primary text-white` as a base; `PHASE_CONFIG[currentPhase].filled` overrides `bg-primary` and `border-primary` with phase-specific colors via `cn()` (tailwind-merge resolves conflicts, last class wins)
- Example for Focus phase: `<Button variant="filled" className="bg-phase-focus border-phase-focus hover:bg-phase-focus/85">`
- Text stays white

---

## 4. Header (`components/header/header.tsx`)

- `border-b` → `border-b-2` (thicker warm bottom edge)
- "Poomo" title: add `text-primary` (coral brand color)
- Settings sliders: `accentColor: "black"` → `accentColor: "var(--phase-focus)"` (coral)
- Ghost icon buttons: unchanged (work well for toolbar icons)
- User avatar circle: `bg-accent` unchanged (now warm-tinted from theme)

---

## 5. Player (`components/player/Player.tsx` + `components/player/upload.tsx`)

- Select trigger: inherits new outline treatment from Select component changes
- Play/Pause button: uses default (outline) variant — coral border, fills coral on hover. Remove inline size classes (`px-3 sm:px-4 lg:px-5 py-2 sm:py-2.5 lg:py-3 h-8 sm:h-9 lg:h-10`), use Button `size="default"` instead
- Upload button: same outline treatment. Remove inline size classes, use Button `size="default"` and `size="icon"` pattern instead
- Both buttons: keep responsive icon sizing (`w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5`) since icon sizes aren't covered by button size variants

---

## 6. Auth Pages

### Login (`app/login/loginForm.tsx`)

- "Ready to Focus?" heading: add `text-primary` (coral)
- "Login" CTA button: `filled` variant
- Google/GitHub OAuth buttons: stay `outline` (now warm-bordered by default)
- Error text: `text-destructive` (already warm from theme)
- "Login to your Account": `text-muted-foreground` (now warm gray)

### Register (`app/register/registerForm.tsx`)

- "Create account" CTA: `filled` variant
- Success message: `text-success` (new CSS variable) instead of hardcoded `text-green-600`
- Error text: `text-destructive`

---

## 7. General Cleanup

| File | Issue | Fix |
|------|-------|-----|
| `app/page.tsx` | `console.log(supabase)` left in | Remove |
| `app/layout.tsx` | Metadata says "GPomodoro app" | Fix to "Pomodoro app" |
| `globals.css` | Unused sidebar/chart/dark variables | Remove |
| `Timer.tsx` | Dead `bgClass`, `textClass` | Remove |
| `Timer.tsx` | Undefined `landscape-compact`, `text-responsive` classes | Remove |
| `header.tsx` | Inline `accentColor: "black"` | Use CSS variable |

---

## Files Affected

| File | Action |
|------|--------|
| `frontend/styles/globals.css` | Major rewrite — new theme variables |
| `frontend/components/ui/button.tsx` | Variant overhaul + new `filled` variant |
| `frontend/components/ui/input.tsx` | Border + radius update |
| `frontend/components/ui/select.tsx` | Border + radius update |
| `frontend/components/ui/popover.tsx` | Border + radius + shadow update |
| `frontend/components/timer/Timer.tsx` | Phase config, cleanup, outline card |
| `frontend/components/header/header.tsx` | Brand color, border, slider accent |
| `frontend/components/player/Player.tsx` | Inherit new component styles |
| `frontend/components/player/upload.tsx` | Inherit new component styles |
| `frontend/app/page.tsx` | Remove console.log |
| `frontend/app/layout.tsx` | Fix metadata |
| `frontend/app/login/loginForm.tsx` | Filled CTA, brand color heading |
| `frontend/app/register/registerForm.tsx` | Filled CTA, success color token |
