# NovaStock — Sistema de Gestión Integral de Bar

Aplicación web monolítica profesional para la gestión de bares. Construida con Next.js 16, TypeScript, Supabase y Prisma.

## Stack Tecnológico

- **Framework**: Next.js 16 (App Router) + TypeScript
- **Estilos**: TailwindCSS v4 + shadcn/ui
- **ORM**: Prisma v7
- **Base de datos**: PostgreSQL en Supabase
- **Autenticación**: Supabase Auth
- **Estado**: Zustand (POS)
- **Gráficas**: Recharts
- **Exportación**: jsPDF + xlsx

## Módulos

| Módulo | URL | Descripción |
|--------|-----|-------------|
| Dashboard | `/dashboard` | Métricas en tiempo real |
| Mesas | `/mesas` | Gestión de mesas del bar |
| Boliranas | `/boliranas` | Control de tiempo y cobro |
| POS | `/pos` | Sistema de punto de venta |
| Inventario | `/inventario` | Stock, movimientos, alertas |
| Contabilidad | `/contabilidad` | Caja, ingresos y egresos |
| Reportes | `/reportes` | Análisis + exportación PDF/Excel |
| Usuarios | `/usuarios` | Roles y permisos (solo ADMIN) |

## Configuración inicial

### 1. Variables de entorno

```bash
cp .env.local.example .env.local
```

Completa las variables en `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL` — URL del proyecto Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Anon key de Supabase
- `SUPABASE_SERVICE_ROLE_KEY` — Service role key (solo backend)
- `DATABASE_URL` — PostgreSQL Transaction pooler (puerto 6543)
- `DIRECT_URL` — PostgreSQL Direct/Session (puerto 5432)

### 2. Aplicar migraciones

```bash
npx prisma migrate dev --name init
```

### 3. Poblar datos de prueba

```bash
npm run seed
```

El seed crea: 5 categorías, 18 productos, 12 mesas, 6 boliranas, 2 proveedores.

### 4. Crear primer usuario admin

En Supabase Dashboard → Authentication → Users → Add user, luego en SQL Editor:

```sql
INSERT INTO users ("authId", email, nombre, role, activo, "createdAt", "updatedAt")
SELECT id, email, 'Administrador', 'ADMIN', true, now(), now()
FROM auth.users WHERE email = 'admin@tubar.com';
```

### 5. Ejecutar en desarrollo

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
