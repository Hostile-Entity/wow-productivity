## Tech stack

- React 19 + TypeScript
- Vite
- Zustand, IDB, Zod, date-fns
- Optional: Capacitor for native builds

## Getting started (local dev)

```bash
npm ci
npm run dev
```

Open http://localhost:5173

## Build and preview (production)

```bash
npm run build
npm run preview
```

Preview URL (Vite default): http://localhost:4173/wow-productivity/

## Scripts

- `npm run dev` - start Vite dev server
- `npm run build` - production build to `dist`
- `npm run preview` - preview the production build
- `npm run deploy` - deploy `dist` to GitHub Pages

## Notes

- The production base path is `/wow-productivity/` (see `vite.config.ts`).
- Service worker registers in the web build; it is skipped for Capacitor.
