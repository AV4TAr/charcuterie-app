# Chorizo Lab

Aplicación web (PWA instalable) para gestionar recetas de chorizo y embutidos con cálculos automáticos de ingredientes según el peso de carne disponible. Pensada con dinámica comunitaria estilo GitHub: forks, proposals (PRs), versiones, favoritos, ratings y comentarios.

## Características

- **Calculadora multi-unidad**: ingresá el peso de carne en `kg`, `g`, `oz` o `lb` y la app escala automáticamente todos los ingredientes.
- **Unidades por ingrediente**: cada fila se puede mostrar en su unidad preferida — masa (g, kg, oz, lb), volumen (ml, l, fl oz, cdta, cda, taza), longitud (cm, m) o cantidad (unidades).
- **Modos por ingrediente**: cada ingrediente puede estar definido como **% del peso de carne** (típico para sal, especias, curantes) o como **cantidad absoluta** (tripa, ajos, hilo).
- **Densidad para líquidos**: ingredientes en volumen guardan una densidad opcional para que `% del peso de carne` se convierta correctamente a ml.
- **i18n**: UI disponible en español (default) e inglés (`/es`, `/en`).
- **PWA**: manifest e installer listos.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS v4
- next-intl (i18n)
- @ducanh2912/next-pwa
- Supabase (Postgres + Auth + Storage) — esquema completo en `supabase/migrations/`
- Vitest para tests de la lógica de cálculo y conversión

## Estructura

```
src/
├── app/[locale]/        # rutas internacionalizadas (es, en)
├── components/
│   ├── ui/              # primitivas (Button, Input, Select, Card, Label)
│   ├── recipe/          # WeightCalculator, etc.
│   └── layout/          # SiteNav, LocaleSwitcher
├── lib/
│   ├── units.ts         # conversiones de unidades (con tests)
│   ├── recipes/
│   │   ├── calculator.ts        # escalado %/abs + multi-unidad (con tests)
│   │   └── demo-recipe.ts       # receta de ejemplo en home
│   ├── supabase/        # clientes browser/server
│   └── i18n/            # config y routing de next-intl
├── messages/{es,en}.json
└── middleware.ts        # next-intl
supabase/
├── migrations/0001_init_schema.sql
├── migrations/0002_rls_policies.sql
├── migrations/0003_triggers.sql
└── seed.sql             # ingredientes comunes (sal, pimentón, vino, tripa, ajo…)
```

## Setup local

```bash
pnpm install
cp .env.local.example .env.local   # cargar credenciales Supabase
pnpm dev                            # http://localhost:3000
```

Aplicar las migraciones a un proyecto Supabase:

```bash
# con supabase CLI
supabase db push

# o desde Studio: pegar el contenido de los archivos de migrations en orden
```

## Comandos

| Comando | Descripción |
| --- | --- |
| `pnpm dev` | Dev server (Turbopack) |
| `pnpm build` | Build producción |
| `pnpm start` | Servir el build |
| `pnpm lint` | ESLint |
| `pnpm test` | Vitest (units + calculator) |
| `pnpm test:watch` | Vitest watch mode |

## Estado actual

✅ **Fase 1 — Foundation**
- Scaffold Next.js + Tailwind + i18n + PWA
- Clientes Supabase listos (browser y server con cookies)
- Layout responsive con nav + locale switcher

✅ **Fase 2 — Núcleo de cálculo**
- `src/lib/units.ts` con 13 unidades soportadas y conversiones bidireccionales (con tests)
- `src/lib/recipes/calculator.ts` mezcla % del peso de carne y absoluto, respeta unidad por ingrediente (con tests)
- `WeightCalculator` interactivo en la home: cambiá el peso de carne (kg/g/oz/lb), cambiá cada ingrediente a la unidad que quieras (oz, lb, fl oz, tsp, tbsp, cup, cm, m, unidades) y ves todo recalcularse en vivo
- Schema SQL completo con RLS y triggers (favoritos, ratings, current_version)
- Seed con 21 ingredientes comunes y sus densidades

🚧 **Próximos pasos**
- Wiring real de auth (magic link + Google)
- Editor de recetas conectado a Supabase
- Página de receta servida desde DB
- Forks, proposals, comentarios, favoritos, ratings
- Tiendas e ingredient_stores
