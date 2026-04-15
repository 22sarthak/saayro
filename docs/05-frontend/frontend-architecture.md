# Frontend Architecture

## Monorepo structure
- `apps/web` for the Next.js shell
- `apps/mobile` for the Expo shell
- `packages/ui` for shared presentational building blocks
- `packages/types` for shared product and API types

## Package sharing strategy
- share tokens, primitives, and product types
- keep platform-specific navigation and layout concerns inside each app

## Route structure
- marketing routes on web
- authenticated trip routes for dashboard, planner, Buddy, exports, and settings
- mobile route groups aligned to tabs and stack details

## Styling strategy
- Tailwind on web with design tokens mapped to Ivory Atlas roles
- token-driven styling parity for mobile
- centralize spacing, color, radius, and elevation definitions

## Data fetching strategy
- use mock data providers first
- design query boundaries around trips, itinerary, Buddy, exports, and connected travel
- keep optimistic UI limited to clearly reversible actions
