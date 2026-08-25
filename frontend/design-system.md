# Design System

The mini program uses a **token-driven design system**. Design decisions live
in a JSON source of truth, are compiled into SCSS variables and TypeScript icon
maps, and are enforced by a **design-system check** in CI so the UI stays
consistent.

## Where the tokens live

| File | Purpose |
| --- | --- |
| `src/styles/design-tokens.json` | **Source of truth** — the design token definitions |
| `src/styles/_design-primitives.generated.scss` | Generated SCSS primitives (colors, spacing, radius, typography) |
| `src/styles/design-tokens.generated.scss` | Generated semantic tokens (`--yz-*`) + primitive import |
| `src/styles/designIcons.generated.ts` | Generated TypeScript icon map for UI components |
| `scripts/generate-design-system.mjs` | Generator: JSON → SCSS + TS |
| `scripts/check-design-system.mjs` | CI checker: verifies generated files are in sync |

## How it is structured

The design system follows a **primitive → semantic** split:

- **Primitives** (`--yz-primitive-*`) — the raw palette and scale:
  - Colors: a **sage** green family (primary brand), a **warm** neutral family,
    plus functional green/amber/red/blue for states.
  - Space: a small set of spacing steps in `rpx` (8, 12, 16, 24, 32, 40, 48,
    64, 80).
  - Radius: 12 / 20 / 28 / 34 rpx and a `pill`.
- **Semantic tokens** (`--yz-*`) — what components actually consume, e.g.
  `--yz-color-canvas`, `--yz-color-text-primary`, `--yz-color-accent`,
  `--yz-font-family-body`, `--yz-font-size-body`.

Components reference only **semantic** tokens; changing the brand palette is
then a one-line token change rather than a code sweep.

## The palette

The app's signature is a calm, warm natural palette:

| Token family | Purpose |
| --- | --- |
| **Sage green** (`sage100` … `sage950`) | Brand / primary actions — e.g. `--yz-color-accent: sage700` |
| **Warm neutrals** (`warm0` … `warm900`) | Backgrounds and text — e.g. `--yz-color-canvas: #F6F6F1` |
| **Green / amber / red / blue** | Status colors (success / warning / danger / info) |

## Typography & layout

- Font family and size scale are part of the semantic tokens
  (`--yz-font-family-body`, `--yz-font-size-*`).
- Spacing is **8 rpx-based** and applied through tokens, so screens share a
  consistent rhythm.
- The global page background is the warm canvas (`#F6F6F1`) — a deliberately
  soft, non-clinical backdrop.

## Regenerating tokens

When you change `design-tokens.json`:

```bash
pnpm design:generate        # regenerate SCSS + TS
pnpm check:design-system    # verify everything is in sync (also runs in CI)
```

If the check fails in CI, regenerate and commit the updated generated files —
never edit the `.generated.*` files by hand.

## Icons

- Icon glyphs are also generated (`designIcons.generated.ts`) from the design
  source so the UI, brand and icons stay in one place.
- Icons are organized by purpose under `src/static/icons/` (`tabbar`, `design`,
  `editor`, `account`, `contact`, `navigation`).

## Accessibility & consistency notes

- Buttons reset default borders (`button::after { border: 0 }`) for a clean look.
- All boxes use `border-box` sizing.
- Status colors (amber/red/blue) are reserved for their semantic meanings —
  don't reuse them decoratively.

## Next steps

- [Testing & Quality Gates](/frontend/testing) — how the design system is
  enforced.
- [Data Source Modes](/frontend/data-source-modes) — build configuration.
