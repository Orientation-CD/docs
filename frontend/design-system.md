# Design System

The mini program uses a **token-driven design system**. Design decisions live in
a JSON source of truth, are compiled into SCSS variables and TypeScript icon
maps, and are enforced by a **design-system check** in CI so the UI stays
consistent. The visual language is a calm, warm "natural wood" interior feel:
sage green brand on an off-white canvas.

## Where the tokens live

| File | Purpose |
| --- | --- |
| `src/styles/design-tokens.json` | **Source of truth** — primitive, semantic and component tokens |
| `src/styles/_design-primitives.generated.scss` | Generated SCSS primitives (`$yz-*`) |
| `src/styles/design-tokens.generated.scss` | Generated CSS custom properties (`--yz-*`) |
| `src/styles/designTokens.generated.ts` | Generated TypeScript token map |
| `src/styles/designIcons.generated.ts` | Generated TypeScript icon name map |
| `src/styles/placeholder.scss` | Local image placeholders |
| `scripts/generate-design-system.mjs` | Generator: JSON → SCSS + TS |
| `scripts/check-design-system.mjs` | CI checker: verifies generated files are in sync |

`App.vue` imports `./styles/design-tokens.generated.scss` globally, and
`src/uni.scss` re-maps uview-plus's built-in `$uni-*` variables onto the
`$yz-*` primitives so the component library inherits the brand palette.

## Structure: primitive → semantic → component

The token JSON has three layers:

- **Primitive** — the raw palette and scale:
  - Colors: a **sage** green family (`sage100` … `sage950`), a **warm** neutral
    family (`warm0` … `warm900`), plus functional green/amber/red/blue.
  - Space: `8, 12, 16, 24, 32, 40, 48, 64, 80` rpx.
  - Radius: `12, 20, 28, 34` rpx plus `pill` (999rpx) and `circle`.
  - Typography: two families (sans body, serif display), size steps
    `18/20/22/26/30/40/48` rpx, weights `400/600/700/800`, line heights
    `1.25/1.55/1.7`.
  - Shadows: low/high/focus; motion: `120/200/320ms` with a standard ease.
- **Semantic** (`--yz-*`) — what components consume:
  - Colors: `--yz-color-canvas`, `--yz-color-surface`, `--yz-color-surface-muted`,
    `--yz-color-text-primary/secondary/tertiary/inverse`,
    `--yz-color-action-primary/pressed`, `--yz-color-accent/-soft/-pale/-glow`,
    `--yz-color-border-subtle/strong`, `--yz-color-success/-warning/-danger/-info`
    (each with a `*-soft` variant), `--yz-color-overlay`.
  - Space, radius, font size/weight/line, shadow, motion, touch target sizes.
- **Component** — concrete recipes for buttons, cards, option tiles, home
  feature tiles, icon containers, nav capsule, tag, bottom action bar.

Components reference only **semantic** tokens; changing the brand palette is a
one-line token change rather than a code sweep.

## The palette

The signature is warm and natural:

| Token family | Example | Use |
| --- | --- | --- |
| **Sage green** | `--yz-color-action-primary: #526F5A` | Primary buttons, active tab, progress rings |
| **Warm off-white** | `--yz-color-canvas: #F6F6F1` | App background (also `globalStyle.backgroundColor`) |
| **Warm surface** | `--yz-color-surface: #FFFFFF` | Cards |
| **Warm muted** | `--yz-color-surface-muted: #EFF1EC` | Inputs, recording rows |
| **Sage accent** | `--yz-color-accent: #718D78`, `--yz-color-accent-pale: #F0F4F1` | Hero gradients, selected option backgrounds |
| **Functional** | success `#3F684E`, warning `#8A5A12`, danger `#A9473D`, info `#356786` | Status only — never decorative |

The tab bar echoes this: idle text `#858A85`, selected text `#526F5A`, white
background.

## Typography

- Body font: `"PingFang SC", "Microsoft YaHei", sans-serif`
  (`--yz-font-family-body`).
- Display/headline font: `"Songti SC", "STSong", serif`
  (`--yz-font-family-display`) — used on brand wordmarks and page titles.
- Size scale (semantic): `--yz-font-size-caption` 18rpx,
  `--yz-font-size-meta` 20rpx, `--yz-font-size-body-small` 22rpx,
  `--yz-font-size-body` 26rpx, `--yz-font-size-subtitle` 30rpx,
  `--yz-font-size-title` 40rpx, `--yz-font-size-display` 48rpx.

## Styling conventions

- **rpx everywhere**. `750rpx` = screen width. Spacing and radius are always
  token-based.
- CSS custom properties are consumed directly in SFC `<style scoped lang="scss">`,
  e.g. `background: var(--yz-color-surface); border-radius: var(--yz-radius-lg);`.
- Global resets in `App.vue`:
  ```scss
  page {
    min-height: 100%;
    background: var(--yz-color-canvas);
    color: var(--yz-color-text-primary);
    font-family: var(--yz-font-family-body);
    font-size: var(--yz-font-size-body);
  }
  view, text, image { box-sizing: border-box; }
  button::after { border: 0; }
  ```
- Cards use `var(--yz-shadow-card)`; floating bars use
  `var(--yz-shadow-floating)`.
- Progress rings (voice playback) are built with a `conic-gradient` driven by
  the inline CSS variable `--audio-progress`.

## Components

Shared, reusable building blocks:

| Component | Path | Purpose |
| --- | --- | --- |
| `FeatureGrid` | `components/home/FeatureGrid.vue` | 3-column home feature cards |
| `HeroCarousel` | `components/home/HeroCarousel.vue` | Auto-rotating feature hero |
| `RemoteImage` | `components/common/RemoteImage.vue` | CDN image with bundled fallback |
| `DesignIcon` | `components/common/DesignIcon.vue` | Renders generated design icons |
| `AccountGuestState` | `components/account/AccountGuestState.vue` | Guest-state card on profile |
| `BackendStatus` / `BackendStatusHidden` | `components/dev/` | Dev-only connection overlay |
| `FeatureShell` | `pkg-features/components/FeatureShell.vue` | Shared header/footer for feature pages |
| `StandardFeaturePage` | `pkg-features/components/StandardFeaturePage.vue` | Multi-step standard design flow |
| `OptionGrid` / `ImageOptionGrid` | `pkg-features/components/` | Choice tiles (icon / image) |
| `UploadStep` / `ImageConfirmStep` | `pkg-features/components/` | Upload + preview steps |
| `ClientInfoForm` | `pkg-features/components/ClientInfoForm.vue` | Natural-wood client info (last name / salutation / project) |
| `SubmittedStep` | `pkg-features/components/SubmittedStep.vue` | "Task submitted" state |
| `TokenShortageDialog` | `pkg-features/components/TokenShortageDialog.vue` | Token-gating modal |
| `AccountPage` | `pkg-account/components/AccountPage.vue` | Shared account subpage shell |
| `SubscriptionScenarioPanel` | `pkg-account/components/dev/` | Dev-only subscription override |

uview-plus components are auto-imported via `easycom` in `pages.json`
(`^u-(.*)` → `uview-plus/components/u-$1/u-$1.vue`).

## Icons

Icons are SVG files under `src/static/icons/` (`tabbar`, `design`, `editor`,
`account`, `contact`, `navigation`) and referenced through the generated
`DesignIconName` union in `designIcons.generated.ts`. There are ~90 design
icons covering rooms, styles, furniture, report sections and actions.

## Regenerating tokens

When you change `design-tokens.json`:

```bash
pnpm design:generate        # regenerate SCSS + TS
pnpm check:design-system    # verify everything is in sync (also runs in CI)
```

If the check fails in CI, regenerate and commit the updated `.generated.*`
files — never edit them by hand.

## Accessibility & consistency notes

- Touch targets are ≥ `--yz-size-touch` (88rpx); compact targets 64rpx.
- Status colors (amber/red/blue) are reserved for their semantic meanings.
- Buttons reset the WeChat default border (`button::after { border: 0 }`).
- All boxes use `border-box`.

## Next steps

- [Testing & Quality Gates](/frontend/testing) — how `check:design-system` is enforced.
- [Data Source Modes](/frontend/data-source-modes) — build configuration.
