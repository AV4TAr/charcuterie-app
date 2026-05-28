# Estado de desarrollo — Chorizo Lab

Log operativo del proyecto. Pensado para handoff a otro agente (ej. Claude Code en terminal local) o para vos mismo después de una pausa larga.

**Última actualización:** 2026-05-25

---

## TL;DR

App de recetas de chorizo deployada en Vercel + Supabase. Magic-link auth funcionando, CRUD de recetas básico vivo, explore + detalle con calculadora-scaler en vivo. Trabajando en Fase 3: edición/versionado, favoritos, seedeo de recetas reales.

---

## Stack y servicios

| Pieza | Valor |
|---|---|
| Repo | `https://github.com/AV4TAr/charcuterie-app` |
| Branch activa (todo el código nuevo) | `develop` |
| Production branch en Vercel | `develop` |
| URL de producción | `https://charcuterie-app.vercel.app` |
| Proyecto Vercel | `charcuterie-app` (Diego Sapriza's account) |
| Proyecto Supabase | `csjokghtruorrvqubvpl` |
| URL Supabase | `https://csjokghtruorrvqubvpl.supabase.co` |
| Dashboard Supabase | `https://supabase.com/dashboard/project/csjokghtruorrvqubvpl` |
| Framework | Next.js 16.2.6 (App Router, Turbopack) |
| Runtime | Node 22 (Vercel default) |
| Package manager | pnpm |
| DB | Postgres (Supabase) con RLS habilitado |

### Variables de entorno requeridas

```
NEXT_PUBLIC_SUPABASE_URL=https://csjokghtruorrvqubvpl.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_a9dEjzqGMCsvYc-ABCfvFA_ddf7DuO2
```

(Estas son las claves *publishable* del esquema nuevo de Supabase — seguras para exponer al cliente. La service_role key NO se usa todavía y NO debería commitearse.)

Configuradas en Vercel para todos los entornos (Production / Preview / Development) y en `.env.local` para desarrollo local.

---

## Cómo levantar local

```bash
git clone https://github.com/AV4TAr/charcuterie-app.git
cd charcuterie-app
git checkout develop
pnpm install

# crear .env.local con las dos vars de arriba

pnpm dev          # next dev en :3000
pnpm test         # vitest, lógica pura de units + calculator
pnpm build        # next build (verifica TypeScript + genera bundle PWA)
```

Para que la sesión de Supabase funcione en local, agregar `http://localhost:3000/auth/callback` a *Authentication → URL Configuration → Redirect URLs* en el dashboard. Ya está agregado.

---

## Configuración de Supabase

### Authentication
- **Site URL:** `https://charcuterie-app.vercel.app`
- **Redirect URLs:**
  - `https://charcuterie-app.vercel.app/auth/callback`
  - `https://charcuterie-app.vercel.app/**` (wildcard para previews)
  - `http://localhost:3000/auth/callback`
- **Email provider:** habilitado, "Confirm email" ON (magic-link igual valida).
- **Rate limit de emails:** subido a 100/hora (antes 2/hora del free tier — se bloqueó durante testing).
- **SMTP:** built-in de Supabase. Para producción real conviene Resend (3000 emails/mes free) — pendiente.

### Database
- Migrations vivas en `supabase/migrations/`, aplicadas automáticamente por la integración GitHub de Supabase (configurada para branch `develop`).
- RLS aplicado en todas las tablas excepto `ingredients` (lectura pública).
- Triggers: `on_auth_user_created` crea profile automáticamente, `bump_favorites_count` y similares mantienen contadores.

---

## Convenciones de código

- **Next.js 16:** el viejo `middleware.ts` ahora es `proxy.ts` (mismo concepto). Si ves esa convención en código viejo, está deprecada.
- **Server Components por default.** `"use client"` solo donde hace falta interactividad (forms, botones con state).
- **i18n con next-intl 4:** `useTranslations` en cliente, `getTranslations` async en server. `redirect({ href, locale })` y `Link` desde `@/lib/i18n/routing`.
- **Supabase clients:**
  - `@/lib/supabase/client.ts` → browser (`createBrowserClient`)
  - `@/lib/supabase/server.ts` → server components / route handlers (lee cookies)
  - El proxy refresca tokens via `supabase.auth.getUser()` en cada navegación.
- **Forms:** react-hook-form. Zod disponible pero todavía no se usa en producción.
- **UI:** Tailwind 4. Componentes propios en `src/components/ui/` (Card, Button, Input, Label, Select). Sin librería externa.

---

## Estructura de rutas

| Path | Tipo | Notas |
|---|---|---|
| `/[locale]` | static-ish | Landing con calculadora demo (hardcoded). `locale` ∈ {es, en}. |
| `/[locale]/explore` | dynamic | Lista recetas públicas desde DB. |
| `/[locale]/login` | dynamic | Magic-link form + redirect si ya está logueado. |
| `/[locale]/new` | dynamic | Form completo (auth-gated). |
| `/[locale]/r/[id]` | dynamic | Detalle con scaler. |
| `/[locale]/r/[id]/edit` | dynamic | (En desarrollo) Editor para crear v2+. |
| `/[locale]/favorites` | dynamic | (En desarrollo) Lista de favoritos del user. |
| `/auth/callback` | route handler | Intercambia el code por sesión. |
| `/auth/logout` | route handler | POST → signOut + redirect. |

---

## Decisiones tomadas (y por qué)

- **Production branch = `develop`** en Vercel (no `main`). Permite iterar rápido sin necesidad de merges. Cuando haya release process formal, lo cambiamos a `main`.
- **Magic-link en vez de password.** Menos superficie a mantener (sin reset password, sin política de contraseñas), mejor UX en mobile.
- **PKCE flow para auth.** El callback debe ser en el mismo dominio donde se inició el login (porque el `code_verifier` queda en localStorage). Si se inicia desde un preview URL y Supabase falla el redirect, el flujo se rompe. Por eso siempre pedimos al user que use la URL de producción.
- **`amount_canonical` + `display_unit` en lugar de `amount + unit`.** Storage es siempre en gramos/ml/cm/unidades; el display unit es solo metadata. Permite consultas/sumas sin conversión.
- **Versionado append-only:** cada edición crea un row nuevo en `recipe_versions`, no se hace UPDATE in-place. `current_version_id` es el puntero al "último commit". Aún no implementado en UI pero el schema ya lo soporta.
- **Slugs:** generados client-side desde el título + sufijo aleatorio de 4 chars (`chorizo-criollo-a1b2`). Único por dueño.

---

## Trabajo realizado por fase

### Fase 1 — Foundation
Scaffolding completo: schema (8 tablas + RLS + triggers), calculadora multi-unit (`src/lib/units.ts` + `src/lib/recipes/calculator.ts`, 26 tests), landing bilingüe, PWA wiring.

### Fase 2 — Auth + creación
- Magic-link end-to-end (`src/proxy.ts`, `/login`, `/auth/callback`, `/auth/logout`).
- `/explore` listando recetas reales con empty state.
- `/new` con form dinámico (título, descripción, visibilidad, peso base, ingredientes %/absolutos, instrucciones).
- `/r/[id]` con detalle + scaler en vivo sobre datos de Supabase.

### Fase 3 — Edit + favoritos + seed (cerrada esta sesión)
- ✅ Traducciones nuevas (edit, favoritos, favorites count, version note required).
- ✅ Migration de seed con curator user + 5 recetas tradicionales (criollo argentino, cantimpalos, parrillera uruguaya, longaniza catalana, chorizo mexicano). Vive en `supabase/migrations/20260524180004_seed_recipes.sql` con helper plpgsql idempotente.
- ✅ Dropdown de unidades en form: en modo absoluto muestra las 13 unidades agrupadas; en modo % restringe al tipo del ingrediente.
- ✅ Refactor `RecipeForm`: ahora acepta `editing?: { recipeId, currentVersionNumber }` + `initialValues?: Partial<RecipeFormValues>`. Branchea entre insert (create) y update+new-version (edit). Submit label cambia ("Save recipe" vs "Save new version"). En edit, `changeNote` se vuelve required.
- ✅ `/r/[id]/edit` page. Server component con auth+ownership check, carga current_version + ingredients, los transforma a `RecipeFormValues` y pasa al form.
- ✅ Botón Edit en `/r/[id]` (solo si `user.id === recipe.owner_id`).
- ✅ `FavoriteButton` component (`src/components/recipe/favorite-button.tsx`). UI optimista: toggle inmediato local, request en `useTransition`, rollback si falla. Si no hay sesión redirige a `/login`.
- ✅ Botón de favorito en `/r/[id]` arriba a la derecha junto a Edit. Lee favorited inicial via maybeSingle.
- ✅ `/favorites` page (auth-gated). Lista las favoritas del user con join a recipes + profiles.
- ✅ Link "Favoritos" en SiteNav cuando hay sesión.
- ✅ Cards de explore con badges `★ <count>` y `<avg>/5` (solo cuando > 0).

---

## Pendientes (orden de prioridad)

### Fase 4 — Comunidad y colaboración (cerrada esta sesión)
- ✅ Histórico de versiones colapsable en `/r/[id]` con número, change_note, autor y fecha. Versión current marcada en ámbar.
- ✅ `RatingStars` client component: hover/click sobre 5 estrellas, upsert con onConflict (user_id, recipe_id), muestra avg + count. El trigger `recalc_rating` actualiza counters (con SECURITY DEFINER ya).
- ✅ `Comments` con threads de 1 nivel: top-level + replies. Form de comentario para usuarios autenticados, botón Reply inline. RLS permite ver comments si la receta es pública o propia.
- ✅ Fork via server action (`src/app/actions/fork.ts`): copia recipe + current version + ingredientes bajo el user actual, con `forked_from_recipe_id` y `forked_from_version_id` poblados. Visibilidad inicial = private.
- ✅ `ForkButton` visible para no-dueños. Botón Edit reemplaza Fork cuando sos dueño (no tiene sentido forkear lo propio).
- ✅ Lineage visible en detail: "Forkeada de [original] (autor)" cuando aplica.

### Fase 5 — Design system (Lab) (parcial, en curso)
- ✅ Sistema visual Lab implementado en `src/app/globals.css`: tokens (light + dark), tipografía (Instrument Serif display, Geist UI, JetBrains Mono datos), clases utilitarias (`.stamp`, `.eyebrow`, `.serif`, `.mono`, `.paper-bg`, `.lab-grid-bg`, `.btn`, `.tag`, `.field`, `.card`).
- ✅ Brand identity en `src/components/brand/`: `BrandMark` (SVG: corte transversal de chorizo + dial de medición) y `Logo` con wordmark "Chorizo *Lab*" en cursiva con accent.
- ✅ `ThemeToggle` con persistencia en localStorage. Dark default, light disponible. Script inline en `<body>` aplica el tema antes de hidratar para evitar flash.
- ✅ SiteNav rediseñada con Logo + paleta Lab + botones .btn .btn-sm.
- ✅ Landing rediseñada con hero serif grande, stamp "LAB · SPEC 04.26", em accent en "fórmula", stats con líneas verticales, demo card con shadow offset "8px 8px 0", 3 pilares numerados.
- ⏳ Aplicar el nuevo sistema visual a páginas existentes (/explore, /new, /r/[id], /favorites, /login). Hoy siguen viéndose con la mezcla anterior de Tailwind zinc/amber.
- ⏳ Componentes UI existentes (Button, Card, Input, etc.) migrar a usar variables var(--ink), var(--paper), var(--accent) en lugar de zinc/amber hardcoded.
- ⏳ AI Assistant "Don Marco" (chat con preview en vivo).
- ⏳ Version diff visual (side-by-side / commit log / barras proporcionales — el diseño tiene 3 variantes).

### Mediano plazo (Fase 4 — comunidad)
- Comments en recetas (con threads).
- Ratings (1–5 estrellas, un voto por user).
- Perfiles públicos navegables (`/u/[username]`).
- Diff visual entre versiones de una receta.

### Largo plazo (Fases 5–7)
- Forks (crear copia + tracking del original/versión origen).
- Proposals (PR-style entre recetas).
- Stores + mapa para "dónde comprar".
- Custom SMTP (Resend), dominio propio, analytics, SEO.

---

## Gotchas y "lecciones aprendidas"

1. **Vercel: production branch se configura en Settings → Environments → Production, no en Settings → Git.** En el UI nuevo lo cambiaron de lugar.
2. **Promote to Production NO rebuilda** — promueve el último deploy preview de esa branch. Si necesitás que aplique cambios nuevos, push un commit nuevo en lugar de promote.
3. **PKCE auth requiere consistencia de dominio.** El magic link debe abrirse en el mismo dominio donde se inició el login. Iniciar desde preview URL y abrir en producción rompe el flow.
4. **Supabase rate limit free tier:** 2 emails/hora por default. Subir a 100 en Auth → Rate Limits para testing.
5. **TypeScript + Supabase joins:** los embedded selects (`profiles!owner_id(...)`) vienen tipados como array genérico. Hay que castear con `as unknown as { ... }` para acceder a los campos.
6. **Migrations idempotentes:** Supabase corre las migrations en orden cada vez que ve cambios en `supabase/migrations/`. Usar `on conflict do nothing` o `create or replace`.
7. **El seed de recetas necesita un user en `auth.users`.** Lo creamos con UUID fijo (`00000000-0000-0000-0000-000000000c01`) vía INSERT directo en `auth.users`. El trigger crea el profile automáticamente.
8. **Triggers que actualizan otras tablas necesitan `SECURITY DEFINER`.** El `bump_favorites_count` y `recalc_rating` corren en el contexto del usuario que insertó la fila en `favorites`/`ratings`, así que cuando intentaban UPDATE sobre `recipes` para una receta ajena, RLS los bloqueaba silenciosamente. La migration `20260524180005_fix_counter_triggers.sql` los re-declara con `security definer` + backfill de los contadores.

---

## Comandos útiles

```bash
# Ver logs de Vercel (necesita vercel CLI logueado)
vercel logs charcuterie-app.vercel.app

# Conectarse a la DB de Supabase via psql (necesita la connection string del dashboard)
psql "postgres://..."

# Re-aplicar todas las migrations localmente con Supabase CLI
supabase db reset

# Ver el último deploy
gh api repos/AV4TAr/charcuterie-app/commits/develop --jq '.sha'
```

---

## Cómo continuar este trabajo en otro agente

1. **Cloná el repo, instalá deps, configurá `.env.local`** (ver "Cómo levantar local").
2. **Leé estos 3 archivos en orden** para tener contexto:
   - `docs/documentacion.md` — qué es el producto, problema, user stories, modelo de datos.
   - `docs/estado_desarrollo.md` (este archivo) — qué está hecho, qué falta, gotchas.
   - `CLAUDE.md` / `AGENTS.md` — convenciones específicas de este repo (en particular: Next.js 16 tiene cambios breaking, leer las docs en `node_modules/next/dist/docs/` antes de escribir código nuevo).
3. **Verificá que el build pasa local:**
   ```bash
   pnpm build && pnpm test
   ```
4. **Mirá el git log de la última sesión** para entender qué se hizo recién:
   ```bash
   git log --oneline -20 develop
   ```
5. **Continuá por los `⏳` de "Trabajo realizado por fase".**

Al terminar tu sesión, **actualizá este archivo** con lo que hiciste, los gotchas nuevos que encontraste, y los pendientes que dejás abiertos.
