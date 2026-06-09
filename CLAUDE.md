# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev        # Start development server
npm run build      # Production build (runs tsc + next build)
npm run lint       # ESLint
npx tsc --noEmit   # Type-check without building
```

No test suite exists. Verify correctness by running `npx tsc --noEmit` and testing in the browser.

## Critical: Next.js 16 Breaking Changes

This project uses **Next.js 16.2.6**. Key differences from earlier versions:

- **`proxy.ts` replaces `middleware.ts`** — the exported function must be named `proxy`, not `middleware`. Do not create a `middleware.ts` file; having both causes a build error.
- **`searchParams` and `params` are Promises** in page components — always `await` them:
  ```ts
  export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
    const { q } = await searchParams;
  }
  ```
- Before writing any Next.js-specific code, check `node_modules/next/dist/docs/` for the current API.

## Data Access Architecture

**Prisma is NOT used for runtime queries.** Direct TCP connections to Supabase PostgreSQL are blocked by the network. All database operations use the **Supabase JavaScript client (PostgREST/Data API over HTTPS)**.

The Prisma schema (`prisma/schema.prisma`) and SQL file (`prisma/init.sql`) exist for reference only. Schema changes must be applied manually via the Supabase SQL Editor.

### Two Supabase clients — use the right one

| Client | File | Key used | Use for |
|--------|------|----------|---------|
| `createAdminClient()` | `lib/supabase/admin.ts` | `SUPABASE_SERVICE_ROLE_KEY` | All database reads/writes (bypasses RLS) |
| `createClient()` | `lib/supabase/server.ts` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Auth only — `supabase.auth.getUser()` |

Every server component and API route follows this pattern:
```ts
const supabase = await createClient();          // auth check only
const { data: { user } } = await supabase.auth.getUser();
if (!user) redirect("/login");                  // or return 401

const admin = createAdminClient();              // all DB queries
const { data } = await admin.from("tabla").select("*");
```

### Supabase query builder quirks

The query builder returns a `PromiseLike`, not a full `Promise`. **`.catch()` does not exist on it** — always use `try/catch` with `await`:

```ts
// WRONG — TypeError at runtime
const { data } = await admin.from("x").select("*").single().catch(() => ({ data: null }));

// CORRECT
let data = null;
try {
  const res = await admin.from("x").select("*").single();
  data = res.data;
} catch { data = null; }
```

`Promise.all([query1, query2])` is safe — `.catch()` on the `Promise.all(...)` result is on a real Promise.

### Manual operations that Prisma handled automatically

- **IDs**: Use `crypto.randomUUID()` on every insert.
- **`updatedAt`**: Set manually: `updatedAt: new Date().toISOString()`.
- **Relations (include)**: Fetch related records with `.in("id", ids)` and merge in JS.
- **Aggregations (groupBy/aggregate)**: Fetch raw rows and reduce in JS.
- **Transactions**: Not available — use sequential `await` calls.

## Venta (Sale) Lifecycle

Sales have two states that behave differently:

| Estado | Stock deducted | Caja movement | Mesa/Bolirana |
|--------|---------------|---------------|---------------|
| `ABIERTA` | No | No | Marked OCUPADA/EN_USO |
| `PAGADA` | Yes | Yes (INGRESO) | Marked DISPONIBLE |

- **Create open tab**: `POST /api/ventas` with `{ estado: "ABIERTA" }`
- **Update tab items**: `PUT /api/ventas/[id]`
- **Finalize payment**: `POST /api/ventas/[id]/pagar` with `{ metodoPago, propina, descuento }`
- **Create and pay immediately**: `POST /api/ventas` with `{ estado: "PAGADA", metodoPago }`

Venta numbering: `VTA-{year}-{5-digit-sequence}` (count existing ventas + 1).

## POS State (Zustand)

`hooks/use-pos-store.ts` holds the cart state. Key fields: `items`, `mesaId`, `boliranaId`, `ventaAbiertoId` (set when an ABIERTA venta exists for this session). `loadFromVenta()` pre-fills the cart from an existing venta's detalles.

When selecting an occupied mesa/bolirana in POS, the view auto-fetches `GET /api/ventas?estado=ABIERTA&mesaId={id}` then `GET /api/ventas/[id]` and calls `loadFromVenta()`.

## Auth & Route Protection

- `proxy.ts` calls `updateSession` from `lib/supabase/middleware.ts`, which redirects unauthenticated users to `/login`.
- Dashboard pages additionally call `supabase.auth.getUser()` and redirect manually (defense in depth).
- The `users` table links Supabase Auth users to app users via `authId = auth.users.id`. Look up the app user with `.eq("authId", user.id)`.
- Role check: fetch `users.role` and compare to `"ADMIN"` etc. before performing privileged operations.

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=          # unused at runtime; kept for Prisma CLI reference
DIRECT_URL=            # unused at runtime; kept for Prisma CLI reference
```

## Currency & Locale

All amounts are COP (Colombian pesos). Use `formatCurrency()` from `lib/utils.ts` for display. Never call `toFixed(2)` directly on prices shown to users.
