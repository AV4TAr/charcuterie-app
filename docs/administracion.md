# Panel de Administración — Superadmin

## Filosofía de seguridad

El panel de administración es la superficie de mayor riesgo de toda la app. Un atacante con acceso a admin puede ver datos de todos los usuarios, cambiar planes sin pagar, y potencialmente comprometer la plataforma completa. Por eso el diseño parte de un principio de **defensa en profundidad**: cada capa asume que la anterior puede fallar.

Las reglas base:

1. **El estado de admin vive en la base de datos, no en el token JWT.** Cualquier claim en el JWT puede ser forjado o robado; la verificación server-side contra la DB es la fuente de verdad.
2. **Doble check en cada request**: middleware intercepta la ruta + server component/action verifica antes de tocar datos.
3. **Todo admin action deja audit trail**. Si algo sale mal, podemos rastrear qué pasó y cuándo.
4. **El único camino para crear un admin es a través del Supabase Dashboard directo** (no existe ninguna UI ni endpoint que eleve privilegios).
5. **Principio de mínimo privilegio**: el admin ve y gestiona lo necesario, no tiene acceso directo a claves de API de usuarios ni datos sensibles cifrados.

---

## Modelo de datos

### Tabla: `profiles` — campo `is_superadmin`

```sql
alter table public.profiles
  add column is_superadmin boolean not null default false;
```

Solo se puede cambiar este campo desde el Supabase Dashboard (o SQL directo). Ninguna API route, server action ni trigger lo modifica. RLS: `is_superadmin` no es visible para otros usuarios (SELECT policy existente no lo expone).

### Tabla: `admin_audit_log`

```sql
create table public.admin_audit_log (
  id            uuid        primary key default gen_random_uuid(),
  admin_id      uuid        not null references auth.users(id),
  action        text        not null,   -- 'change_plan' | 'override_limit' | 'ban_user' | 'reset_trial' | 'view_user'
  target_user_id uuid       references auth.users(id),
  details       jsonb       not null default '{}',  -- antes/después, motivo, etc.
  ip_address    text,
  created_at    timestamptz not null default now()
);

alter table public.admin_audit_log enable row level security;
-- Solo el propio admin puede leer sus acciones; nadie puede insertar desde cliente
create policy "admins read own audit log"
  on public.admin_audit_log for select
  using (auth.uid() = admin_id);
-- INSERT solo via service role (server actions con service client)
```

### Tabla: `user_plan_overrides`

Permite dar límites customizados a usuarios específicos (early adopters, colaboradores, cuentas de prueba).

```sql
create table public.user_plan_overrides (
  user_id           uuid primary key references auth.users(id) on delete cascade,
  plan              text,          -- fuerza un plan específico (ignora subscriptions)
  trial_limit       int,           -- sobreescribe el 10 del free tier (null = default)
  analyses_limit    int,           -- por versión de receta (null = default del plan)
  imports_limit     int,           -- por versión de receta (null = default del plan)
  chat_daily_limit  int,           -- mensajes/día en don-marco (null = default del plan)
  note              text,          -- razón del override (visible solo para admins)
  created_by        uuid           references auth.users(id),
  created_at        timestamptz    not null default now(),
  updated_at        timestamptz    not null default now()
);

alter table public.user_plan_overrides enable row level security;
-- Sin policies de usuario: solo accesible via service role
```

---

## Estructura de rutas

```
src/app/[locale]/admin/
├── layout.tsx          ← verifica is_superadmin; redirect si no cumple
├── page.tsx            ← dashboard: métricas globales
├── users/
│   ├── page.tsx        ← lista paginada de usuarios + buscador
│   └── [id]/
│       └── page.tsx    ← detalle: plan, uso, overrides, historial
└── audit/
    └── page.tsx        ← log de acciones admin (paginado)
```

URL: `/{locale}/admin` — protegida a nivel de layout + middleware.

---

## Seguridad en capas

### Capa 1 — Middleware

El `proxy.ts` (middleware) verifica que el path `/admin` solo sea accesible si el usuario está autenticado. No verifica `is_superadmin` (eso es costoso en middleware); solo bloquea no-autenticados y redirige a `/login`.

```ts
// en proxy.ts: agregar antes del return
if (request.nextUrl.pathname.includes('/admin')) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL(`/${locale}/login`, request.url))
}
```

### Capa 2 — Layout server component

`admin/layout.tsx` hace la verificación real contra la DB usando service client:

```ts
// admin/layout.tsx
const { data: profile } = await supabase
  .from("profiles")
  .select("is_superadmin")
  .eq("id", user.id)
  .single();

if (!profile?.is_superadmin) notFound(); // 404, no redirect (no revela que existe)
```

Devuelve 404 (no 403) para no revelar que la ruta existe.

### Capa 3 — Cada server action o API route de admin

Antes de cualquier mutación, re-verifica:

```ts
async function assertAdmin(userId: string) {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("profiles")
    .select("is_superadmin")
    .eq("id", userId)
    .single();
  if (!data?.is_superadmin) throw new Error("Unauthorized");
}
```

Nunca confía solo en el layout. Una vulnerabilidad CSRF o una llamada directa al endpoint no bypasea este check.

### Capa 4 — RLS y service role

Todas las operaciones admin usan el **service client** (service role), que bypasea RLS. Esto es intencional: el admin necesita ver usuarios que no son sus datos. Sin embargo, el service role key **nunca llega al cliente**.

### Capa 5 — Audit log obligatorio

Cualquier mutación (cambio de plan, override, ban) escribe en `admin_audit_log` antes de confirmar la acción. Si el log falla, la acción no se ejecuta (transacción o check manual).

---

## Funcionalidades del panel

### Dashboard (`/admin`)

| Métrica | Fuente |
|---------|--------|
| Total usuarios registrados | `profiles` count |
| Usuarios Free / Plus | `subscriptions` |
| Pool de trial agotado (Free exhaustos) | `ai_usage.trial_used >= 10` |
| Llamadas de IA hoy | `ai_usage.chat_date = today` sum |
| Nuevos registros últimos 7 días | `profiles.created_at` |

### Lista de usuarios (`/admin/users`)

- Paginación (50/página)
- Búsqueda por email o username
- Columnas: username · email · plan · trial_used · created_at · último login
- Filtros: plan (free/plus), trial agotado (sí/no), con override (sí/no)

### Detalle de usuario (`/admin/users/[id]`)

**Sección: Cuenta**
- Email, username, display_name, created_at
- Plan actual (de `subscriptions`) + override activo (si hay)

**Sección: Uso de IA**
- `trial_used` / 10 (pool vitalicio)
- `chat_today` / cap diario
- Análisis e imports por versión activa

**Sección: Gestión**

| Acción | Descripción |
|--------|-------------|
| Cambiar plan | Fuerza free/plus en `user_plan_overrides.plan` |
| Resetear trial | Pone `ai_usage.trial_used = 0` |
| Override de límites | Setea `trial_limit`, `analyses_limit`, etc. |
| Dar acceso ilimitado | Override con todos los límites = -1 (sin límite) |
| Agregar nota interna | Texto visible solo para admins |
| Ban / suspend | Flag en profiles (a definir) |

Cada acción muestra confirmación + campo de "motivo" (guardado en audit log).

### Log de auditoría (`/admin/audit`)

- Tabla cronológica: timestamp · admin · acción · usuario afectado · detalle
- Filtros por acción y por usuario
- No se puede borrar (append-only)

---

## Cómo crear el primer superadmin

**Nunca a través de la app.** Solo por SQL directo:

```sql
-- En Supabase Dashboard → SQL Editor
update public.profiles
set is_superadmin = true
where id = '<user_uuid>';
```

El `user_uuid` se obtiene de `auth.users` en el Supabase Dashboard. Este proceso requiere acceso al proyecto de Supabase, lo cual ya implica un nivel de confianza alto.

Para verificar que sos admin, después del SQL refrescá `/library` (cualquier página logueada) — el link "Admin ★" aparece en el nav.

---

## Qué NO hace el panel de admin

- No muestra las claves de API de Anthropic de los usuarios (están cifradas en DB y el admin no tiene motivo para verlas).
- No permite hacer login como otro usuario (impersonación) — demasiado riesgo operativo para el MVP.
- No expone passwords ni datos de pago (Stripe los maneja por su cuenta).
- No tiene endpoint público de "crear admin" (ni con contraseña especial).

---

## Roadmap de implementación

### Fase 1 — Infraestructura ✅ implementada
1. ✅ Migración `20260529000000_admin_infra.sql`: `profiles.is_superadmin` + `admin_audit_log` + `user_plan_overrides`
2. ✅ `assertAdmin()` / `isCurrentUserAdmin()` en `src/lib/admin.ts`
3. ✅ `logAdminAction()` en `src/lib/admin.ts`
4. ⏳ Integración con `getUserPlan()` / `canUseAI()` — pendiente hasta que `src/lib/subscription.ts` exista (monetization phase 1)

### Fase 2 — UI ✅ implementada
1. ✅ `admin/layout.tsx` con verificación is_superadmin (`notFound()` si no cumple)
2. ✅ `admin/page.tsx` — dashboard con métricas globales (users, recetas, favoritos, comentarios, forks, proposals abiertos, BYOK, overrides, superadmins, signups 7d)
3. ✅ `admin/users/page.tsx` — lista paginada 50/página + search por username/display name + email desde auth.admin
4. ✅ `admin/users/[id]/page.tsx` — detalle (cuenta + actividad + override form + audit log filtrado)
5. ✅ `admin/audit/page.tsx` — log global paginado con filtro por acción
6. ✅ Server actions `upsertPlanOverride` / `clearPlanOverride` con `assertAdmin()` + `logAdminAction()` antes de mutar
7. ✅ Link "Admin ★" en site-nav solo visible si `is_superadmin = true`

### Fase 3 — Pendiente
1. Acciones de plan/usage que dependen de tablas de monetization:
   - Cambiar plan real (necesita `subscriptions`)
   - Resetear trial (`ai_usage.trial_used = 0`)
   - Mostrar uso real de IA por usuario
2. Ban / suspend de usuarios (definir flag `is_banned` en profiles)
3. Métricas adicionales una vez `ai_usage` exista: llamadas hoy, top users por consumo
4. Capturar `ip_address` en los logs (hoy queda en null — requiere headers de request en server actions)

### Fase 4 — Hardening (opcional)
1. IP allowlisting via Vercel Middleware o load balancer
2. 2FA obligatorio para admins (Supabase soporta TOTP)
3. Notificación de acceso desde IP nueva

---

## Decisiones tomadas

| Decisión | Elección | Razonamiento |
|----------|----------|--------------|
| ¿Dónde vive el flag de admin? | `profiles.is_superadmin` en DB | JWTs son stateless y difíciles de invalidar; DB es fuente de verdad |
| ¿Cómo se crea un admin? | Solo por SQL directo en Supabase Dashboard | Elimina cualquier vector de escalada de privilegios via app |
| ¿Qué devuelve la ruta si no es admin? | 404, no 403 | No revela la existencia del panel |
| ¿Audit log antes o después de la acción? | Antes (o en transacción) | Garantiza que toda acción queda registrada |
| ¿Impersonación? | No (MVP) | Alto riesgo, bajo valor inicial |
| ¿Panel separado o dentro de la app? | Dentro, ruta `/admin` | Más simple; si la superficie crece, se puede extraer |

---

## Pendiente de decidir

- **¿IP allowlisting?** Para mayor seguridad, restringir el panel a IPs conocidas (casa + trabajo). Se puede hacer en Vercel Middleware o en el load balancer.
- **¿2FA obligatorio para admins?** Supabase Auth soporta TOTP. Recomendado si se esperan más de 1-2 admins.
- **¿Notificaciones de acceso?** Enviar email al admin cuando alguien (incluido él mismo) accede al panel desde una IP nueva.
