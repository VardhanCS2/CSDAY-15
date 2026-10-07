# E-commerce Frontend

## State Management

| Option | Strengths | Trade-offs | Fit here |
| --- | --- | --- | --- |
| React Context | Built into React; good for low-frequency values shared by a subtree | Provider value changes can rerender many consumers; async cache behavior must be built separately | Fine for small settings or theme state |
| Zustand | Small API, selector-based subscriptions, simple actions outside components | Requires an additional dependency and clear ownership boundaries | Chosen for authentication and the globally visible cart |
| Redux Toolkit | Explicit reducers, middleware, strong conventions and tooling for complex workflows | More structure and boilerplate than this store currently needs | Better fit if the app grows into many coordinated client-side workflows |

The app uses Zustand for client-owned session and cart state. TanStack Query owns remote data such as products, customer/admin orders, and the server cart; its cache is keyed by resource and user, kept fresh for 60 seconds, and invalidated after writes. The cart store mirrors the active user's query so the header count stays available across routes.

## Implemented Patterns

- Product listing uses `useInfiniteQuery`, the backend's existing page/limit contract, debounced search, and an `IntersectionObserver`. A load-more button remains as a keyboard-friendly fallback.
- Cart changes, checkout, order status transitions, product edits, and product removal optimistically update cached data. Failed requests restore the previous cache value.
- Query, debounce, and observer behavior live in custom hooks. Product cards are memoized; sorting and filter params use `useMemo`, and the add handler uses `useCallback`.
- Route pages are dynamically imported with `React.lazy` and `Suspense`.
- API requests use the same-origin `/api` proxy. Do not put tokens, credentials, or private API keys in frontend source; browser-visible `VITE_*` values are public.

## Run

```sh
npm install
npm run dev
```

The frontend expects FastAPI on the Vite proxy target at `http://127.0.0.1:8000`; backend setup is in `../ecommerce-backend/README.md`.

Copy `.env.example` to `.env` to override the Vite proxy target or public storefront settings. `VITE_API_BASE_URL` is optional; leave it unset to use the same-origin `/api` proxy. Locale and currency can be changed with `VITE_LOCALE` and `VITE_CURRENCY`. Never place credentials or private keys in `VITE_*` variables.

## Type Safety, Checkout, And Tests

The complete React application is TypeScript with strict compiler checks. Shared API/model contracts are in `src/types/`, Zod validates registration, catalog changes, and delivery details, Zustand owns client-side session/cart state, and TanStack Query owns server data and cache invalidation.

Checkout posts a validated delivery address to `POST /orders/`. The backend stores it on the order, so apply the migration before running the updated application:

```sh
cd ../ecommerce-backend
alembic upgrade head
```

The checkout captures delivery details only; it does not collect card data or claim to process payments.

The Playwright suite contains 20 independent browser scenarios for catalog browsing and filtering, authentication, cart mutations, checkout and order history, admin order/product workflows, and theme persistence. It intercepts API requests with stateful test doubles so the browser suite is repeatable and does not create data in a real store. In local runs `npm run test:e2e` launches a visible Chromium browser; `npm run test:e2e:ui` opens Playwright's interactive test runner, and `npm run test:e2e:headed` explicitly requests headed execution. CI runs the same suite headlessly.

Run the automated suites from this directory:

```sh
npm run typecheck
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Vitest uses React Testing Library and MSW for behavior-focused component tests, API contract handling, validation, and store coverage. Playwright's mocked browser suite verifies the frontend journeys, while the root GitHub Actions workflow separately runs these frontend checks and the FastAPI test suite on pushes and pull requests. To exercise the frontend against FastAPI locally, run the backend and its PostgreSQL/Redis dependencies as described in `../ecommerce-backend/README.md`, apply its Alembic migrations, then start Vite; the Vite `/api` proxy forwards requests to the configured `API_PROXY_TARGET`.

## Build And Audit

```sh
npm run lint
npm run build
npm run preview
```

In another terminal, audit the production preview (Vite's default preview URL is `http://localhost:4173/`):

```sh
npx lighthouse http://localhost:4173/ --only-categories=performance --output=html --output-path=./lighthouse-report.html
```

Route pages build as separate chunks. Lighthouse scores depend on browser/device emulation, network, API availability, and image-host response; 90+ is a measured target, not a guaranteed score. Do not use the Vite development server (`npm run dev`) for the score target because its unbundled modules and HMR skew performance results.