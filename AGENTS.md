# AGENTS.md — Element Web

## Project Overview

Element Web is a Matrix chat client built with React and TypeScript. It is a **pnpm monorepo** managed with Nx, containing:

- **`apps/web`** — Main Element Web application (webpack, Jest, Playwright)
- **`packages/shared-components`** — Reusable UI component library (Vite, Vitest, Storybook)
- **`packages/playwright-common`** — Shared Playwright test utilities

## Build & Run

```bash
pnpm install                  # Install all dependencies
pnpm start                    # Dev server at http://127.0.0.1:8080/ (via Nx)
pnpm --filter element-web build   # Production build (webpack -> apps/web/webapp/)
```

## Lint

```bash
pnpm lint                     # Run ALL linters (types, prettier, eslint, stylelint, workflows, knip)
pnpm lint:prettier             # Prettier check across entire repo
pnpm lint:prettier-fix         # Prettier auto-fix
pnpm --filter element-web lint:js       # ESLint for apps/web
pnpm --filter element-web lint:js-fix   # ESLint auto-fix for apps/web
pnpm --filter element-web lint:style    # Stylelint for PostCSS files
```

## Tests

### Unit Tests — apps/web (Jest)

```bash
pnpm --filter element-web test                          # Run all Jest tests
pnpm --filter element-web test -- --testPathPattern="EventTile"   # Single test file by name
pnpm --filter element-web test -- --testPathPattern="test/unit-tests/components/views/rooms/EventTile-test.tsx"
pnpm --filter element-web test -- --testNamePattern="should render" --testPathPattern="EventTile"
```

Test files live in `apps/web/test/` mirroring `src/` structure. Pattern: `*-test.tsx`.

### Unit Tests — packages/shared-components (Vitest)

```bash
pnpm --filter @element-hq/web-shared-components test:unit                          # All unit tests
pnpm --filter @element-hq/web-shared-components test:unit -- --testPathPattern="PlayPauseButton"
```

Test files are **co-located** with source: `ComponentName.test.tsx` next to `ComponentName.tsx`.

### E2E Tests — apps/web (Playwright)

```bash
pnpm --filter element-web test:playwright                                    # All E2E tests
pnpm --filter element-web test:playwright -- playwright/e2e/crypto/crypto.spec.ts  # Single file
pnpm --filter element-web test:playwright -- --grep "test name"              # By test name
pnpm --filter element-web test:playwright:open                               # Interactive UI mode
```

## Code Style

Formatting is handled by Prettier (config inherited from `eslint-plugin-matrix-org`):

- **4-space indentation**, 120 char line width, double quotes, trailing commas, semicolons, LF newlines.

### TypeScript

- **Strict mode is enabled** in all tsconfigs. Target: `es2022`, module resolution: `bundler`.
- Write TypeScript; convert JS to TS when touching existing JS files.
- Use `const` by default, `let` only when mutation is needed.
- Describe types exhaustively — avoid implicit `any`. When `any` is necessary, add a comment explaining why.
- Use `import` syntax, never `require`.
- Prefer `async`/`await` over raw promise chains.
- **No default exports** — always use named exports.
- Terminate interface/type properties with **semicolons** (not commas).
- Prefer interfaces for object shapes; use type aliases for unions, intersections, and parameter-value-only types.
- Declare member visibility (`public`/`private`/`protected`) explicitly on classes.
- Prefer `readonly` properties over getter-only accessors.
- Use TSDoc (`/** ... */`) for all exported types, methods, and functions.

### Naming Conventions

| Thing                             | Convention                              | Example                                |
| --------------------------------- | --------------------------------------- | -------------------------------------- |
| Functions, variables              | lowerCamelCase                          | `messageForSyncError`, `errorText`     |
| Classes, types, interfaces, enums | UpperCamelCase                          | `MatrixClientPeg`, `StorageContext`    |
| React components                  | UpperCamelCase                          | `EventTile`, `RoomListItemView`        |
| Component files                   | UpperCamelCase                          | `EventTile.tsx`, `PlayPauseButton.tsx` |
| Utility files                     | lowerCamelCase or kebab-case            | `createRoom.ts`, `call-types.ts`       |
| Type-only files                   | `types.ts`, `*-types.ts`, `global.d.ts` |                                        |
| Interfaces                        | **No `I` prefix**                       | `ConfigOptions` not `IConfigOptions`   |
| Test files (apps/web)             | `*-test.tsx` in `test/` mirror tree     | `EventTile-test.tsx`                   |
| Test files (shared-components)    | `*.test.tsx` co-located with source     | `PlayPauseButton.test.tsx`             |
| CSS classes (apps/web)            | `mx_` prefix                            | `mx_RoomTile`, `mx_RoomTile_content`   |
| CSS classes (shared-components)   | Semantic camelCase in CSS modules       | `.playButton`, `.primaryAction`        |

### File Organization

Each file should follow this order:

1. Copyright/license header (required — enforced by ESLint `matrix-org/require-copyright-header`)
2. Imports (external first, then internal)
3. Constants
4. Enums
5. Interfaces/Types
6. Functions
7. Classes

~1 interface/class/enum per file. Bulk utility functions go in `foo-utils.ts` or `utils/foo.ts`.

### Copyright Header

Every source file must start with:

```
/*
Copyright 2025 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/
```

### Import Rules

- External imports first, then internal imports.
- No duplicate imports from the same module.
- **matrix-js-sdk**: Import from `matrix-js-sdk/src/matrix`, not bare `matrix-js-sdk` or `matrix-js-sdk/src`.
- **@testing-library/react**: Banned in apps/web — use `jest-matrix-react` instead (custom wrapper adding TooltipProvider and I18nContext).
- **react `forwardRef`**: Banned — use ref props directly.
- **Icons**: Use `@vector-im/compound-design-tokens/assets/web/icons/*`, not `/icons/*`.
- **Shared components**: Import from `@element-hq/web-shared-components`, never from relative `packages/shared-components/` paths.
- Use `type` keyword for type-only imports: `import { type MatrixClient } from "..."`.

### React

- Prefer functional components with hooks over class components.
- One component per file (small helper components for the primary one are acceptable).
- Do not export Props/State types — consumers should use `React.ComponentProps<typeof X>`.
- Use Compound typography components over raw HTML (`<h1>`, `<p>`, etc.).
- Use `Flex`/`Box` from shared-components for layout.
- `react-compiler` ESLint plugin is enforced (ensures components are compatible with React Compiler).

### MVVM Architecture (shared-components + apps/web)

- **View** (`packages/shared-components/src/`): Stateless React components using `useViewModel` hook. Define `FooViewSnapshot` and `FooViewActions` interfaces.
- **ViewModel** (`apps/web/src/viewmodels/`): Classes extending `BaseViewModel<T, P>`. Use `this.snapshot.set()`/`this.snapshot.merge()` for state. All actions must be arrow functions (class properties) for correct `this` binding.
- Use `this.disposables.trackListener()` and `this.disposables.track()` for cleanup.

### Shared Components Directory Pattern

```
packages/shared-components/src/ComponentName/
  ComponentName.tsx            # View component
  ComponentName.module.css     # CSS module (import as `styles`)
  ComponentName.test.tsx       # Co-located unit test
  ComponentName.stories.tsx    # Storybook story
```

### Stylesheets

**apps/web (PostCSS):** Files at `res/css/` mirroring component path, prefixed with `_`: `res/css/components/views/rooms/_RoomTile.pcss`. Use Compound design tokens (`var(--cpd-color-text-primary)`, `var(--cpd-space-2x)`, `var(--cpd-font-body-md-regular)`). Avoid `!important`.

**packages/shared-components (CSS Modules):** Co-located `.module.css` files. Semantic class names in camelCase. No nesting. Use CSS custom properties and Compound tokens.

### Error Handling

- Use `instanceof MatrixError` / `instanceof ConnectionError` for SDK errors.
- Log with `logger` from `matrix-js-sdk/src/logger` (never raw `console.*`).
- Show user-facing errors via `Modal.createDialog(ErrorDialog, { title, description })`.
- Catch-all: `logErrorAndShowErrorDialog(title, error)` from `src/utils/ErrorUtils.tsx`.

### Tests

- Written in TypeScript.
- Jest mocks declared below imports, above all other code.
- Structure: `describe("ComponentName", () => { it("should do X", async () => { ... }); });`
- Use "it should..." phrasing for test names.
- New features require comprehensive unit tests + happy-path E2E tests. Bug fixes require at least one test.
- Target 80%+ code coverage.

## PR Guidelines

- Target the **`develop`** branch (never `master`/`main` directly).
- PR titles are used for changelog — make them concise and descriptive.
- Do **not** force push to PR branches; squash merge is used.
- Include: bug references (`Fixes #123`), explanation of why/what, screenshots, and testing steps.
