# Design System and Shared Navigation

The visual system uses sage green actions, warm neutral surfaces and generated semantic tokens. Edit the source tokens or icon registry, regenerate, then inspect the actual mini-program UI. A generated-file diff alone cannot prove native button/text alignment.

## Sources and generated outputs

| File | Role |
| --- | --- |
| `src/styles/design-tokens.json` | Primitive, semantic and component token source |
| `src/styles/_design-primitives.generated.scss` | Generated SCSS primitives |
| `src/styles/design-tokens.generated.scss` | Generated CSS custom properties |
| `src/styles/designTokens.generated.ts` | Generated TypeScript colors |
| `src/styles/designIcons.generated.ts` | Generated icon-name union |
| `src/static/icons` | SVG/bitmap icons organized by use |
| `scripts/generate-design-system.mjs` | Generator |
| `scripts/check-design-system.mjs` | Consistency and usage checks |

`App.vue` imports the generated tokens globally. `uni.scss` maps library variables onto the design primitives. Components consume semantic `--yz-*` names for surfaces, text, actions, status, spacing, radius and typography, rather than introducing arbitrary local colors.

```bash
pnpm design:generate
pnpm check:design-system
```

Commit the source change and generated outputs together. Never use a hand edit to a generated file as the durable fix.

## Component boundaries

`PageNavBar` provides shared back/home controls. `FeatureShell` composes feature layouts; project and result pages reuse the navigation behavior. The feature-group breadcrumb derives its parent path from the same group definitions as its cards. It returns to an existing parent when possible and falls back safely to the parent/home route.

Home uses full-width group entries, while group pages use the feature grid. Keep those roles separate when changing layout. `RemoteImage` handles CDN media and local placeholders; configure content images through the shared assets/advertisement mechanisms instead of bundling them into every package.

Feature steps reuse option grids, upload/confirmation, project client information, submitted state and Token-shortage dialogs. Account pages use the account shell; project outcomes and activity have their own reusable controls. Use these components to keep touch behavior and native rendering consistent.

## Native layout and accessibility

Use rpx/token spacing, semantic status colors and the existing touch-target sizes. Native mini-program `button` line boxes differ from browser defaults: shared `_button-layout.scss` mixins explicitly align content and reset borders. Test text centering, outlines, long names and disabled states in DevTools, including narrow screens.

Shared navigation must preserve member project/activity back stacks, and home actions must use the correct Tab navigation. Scrollable project/activity content needs a bounded flex/scroll container; adding `overflow` to an unbounded element is insufficient on a native mini program.

Markdown output uses its own safe rich-text presentation because scoped Vue styles do not automatically inherit into rich-text children. Parser-generated elements receive known styles, source HTML passes through the sanitizer, and unsupported markup stays visible as text.

## Review a visual change

Run design-system and relevant component tests, then the appropriate [artifact gate](/frontend/testing). Inspect the built target for long translated text, loading/error/empty states, guest and read-only permissions, keyboard/safe-area behavior and image placeholders. For shared changes check both WeChat and Douyin; browser/happy-dom layout is only one source of evidence.

## Source evidence

Frontend `eca0a5f`, backend `b13cc56` (2026-10-20): [Token source](https://github.com/Orientation-CD/wechat_mini_program/blob/eca0a5f9e0a2aa1cb3fd4f9714114bb3db7fae5f/src/styles/design-tokens.json) · [Shared navigation](https://github.com/Orientation-CD/wechat_mini_program/blob/eca0a5f9e0a2aa1cb3fd4f9714114bb3db7fae5f/src/components/common/PageNavBar.vue) · [Button layout](https://github.com/Orientation-CD/wechat_mini_program/blob/eca0a5f9e0a2aa1cb3fd4f9714114bb3db7fae5f/src/styles/_button-layout.scss) · [Markdown rendering](https://github.com/Orientation-CD/wechat_mini_program/blob/eca0a5f9e0a2aa1cb3fd4f9714114bb3db7fae5f/src/pkg-plans/services/markdownSummary.ts).
