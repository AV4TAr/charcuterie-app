# Plan de monetización

## Filosofía

Chorizo Lab es una herramienta de nicho para hobbistas. La propuesta de valor es clara: calculadora automática + versioning + comunidad. El modelo tiene que ser:

1. **Generoso gratis** — que la gente lo use de verdad antes de decidir pagar.
2. **Fricción baja** — un solo click para upgradear, sin formularios complicados.
3. **BYOK siempre disponible** — los usuarios con clave de Anthropic nunca pagan por IA, eso los mantiene contentos y evita churn en power users.

---

## Tiers propuestos

### Free
| Feature | Límite |
|---------|--------|
| Recetas privadas | hasta 20 |
| Recetas públicas | ilimitadas |
| Versiones por receta | ilimitadas |
| Forks / proposals | ilimitados |
| Don Marco (chat) | 30 mensajes de prueba totales (no por mes — se agotan una vez) |
| Importar con IA | 5 usos de prueba totales |
| Análisis de receta | 5 usos de prueba totales |
| BYOK (clave propia de Anthropic) | IA ilimitada, sin costo |

> **Razonamiento**: 20 recetas es suficiente para que cualquier hobbista serio sienta el valor. El trial de Don Marco es "de por vida" (no mensual) — lo agotás, lo agotás. Eso crea urgencia real sin ser agresivo.

---

### Pro — **$5 / mes** o **$48 / año** (20% descuento)
Todo lo de Free, más:

| Feature | Pro |
|---------|-----|
| Recetas privadas | ilimitadas |
| Don Marco (chat) | ilimitado (usa key del sistema) |
| Importar con IA | ilimitado |
| Análisis de receta | ilimitado |
| Badge "Pro" en perfil | ✓ |
| Exportar receta a PDF | ✓ (futuro) |
| Acceso anticipado a features | ✓ |

> **Sobre el precio**: $5/mes es el punto dulce para hobbistas — menos que un café. $10/mes solo por IA es demasiado para este segmento; bundlear todo en $5 es más fácil de justificar. Si el costo de IA sube, subimos el tier, no complicamos el modelo.

---

## Costos reales de IA (referencia)

Haiku 4.5 es barato. Estimado por usuario Pro activo:

| Uso | Tokens estimados/mes | Costo |
|-----|---------------------|-------|
| Don Marco chat (~20 mensajes) | ~40k tokens | ~$0.05 |
| Análisis de receta (~5 análisis) | ~15k tokens | ~$0.02 |
| AI import (~10 usos) | ~20k tokens | ~$0.02 |
| **Total** | ~75k tokens | **~$0.09/usuario/mes** |

Con $5/mes por Pro, el margen de IA es ~98%. El costo real es Supabase + Vercel + Stripe fees (~$0.30/transacción).

---

## Trial de Don Marco

El trial sirve para crear hábito antes de mostrar la barrera de pago.

**Flujo**:
1. Usuario nuevo: 30 mensajes gratis de Don Marco (chat + análisis + import, todos cuentan juntos en un pool).
2. Al llegar a 0: el input se deshabilita y aparece un modal/banner:
   > *"Ya usaste tus 30 mensajes de prueba con Don Marco. Para seguir consultándolo, upgradeá a Pro o traé tu propia clave de Anthropic."*
   > **[Ir a Pro — $5/mes]** | **[Usar mi propia clave →]**
3. BYOK siempre bypasea el límite — importante para no alienar a power users.

**Implementación**: tabla `ai_usage(user_id, count)` — incrementa con cada llamada a cualquier endpoint de IA, verifica antes de procesar. Simple, sin redis ni jobs.

---

## Límite de recetas

**Flujo**:
1. Al intentar crear receta #21 como Free: modal de upgrade.
   > *"Llegaste al límite de 20 recetas en el plan gratuito. Upgradeá a Pro para recetas ilimitadas."*
   > **[Ver planes]**
2. Las recetas existentes nunca se bloquean — nunca le sacamos acceso a lo que ya tenía.
3. Las recetas públicas no cuentan para el límite (incentivo para compartir + SEO para la app).

---

## Stack técnico

### Stripe
- **Stripe Checkout** para el flujo de pago (hosted, maneja SCA, renovaciones, etc.)
- **Stripe Customer Portal** para que el usuario cancele/cambie plan
- **Webhooks** en `/api/webhooks/stripe` para sincronizar estado de suscripción

### DB (nuevas tablas)

```sql
-- Suscripción activa del usuario
create table public.subscriptions (
  user_id         uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id  text unique,
  stripe_sub_id       text unique,
  plan            text not null default 'free',  -- 'free' | 'pro'
  status          text not null default 'active', -- 'active' | 'canceled' | 'past_due'
  current_period_end  timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Contador de uso de IA (para el trial y rate limiting futuro)
create table public.ai_usage (
  user_id   uuid primary key references auth.users(id) on delete cascade,
  count     int not null default 0,
  updated_at timestamptz not null default now()
);
```

### RLS
- `subscriptions`: SELECT propio, UPDATE/INSERT solo via service role (webhook).
- `ai_usage`: SELECT propio, UPDATE solo via service role (API routes).

### Env vars nuevos
```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_MONTHLY_PRICE_ID=price_...
STRIPE_PRO_YEARLY_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

---

## Páginas / componentes nuevos

| Archivo | Descripción |
|---------|-------------|
| `src/app/[locale]/pricing/page.tsx` | Página de precios con tabla comparativa |
| `src/app/api/stripe/checkout/route.ts` | Crea Stripe Checkout Session |
| `src/app/api/stripe/portal/route.ts` | Crea Customer Portal Session |
| `src/app/api/webhooks/stripe/route.ts` | Recibe eventos de Stripe (sub creada, cancelada, renovada) |
| `src/components/upgrade-modal.tsx` | Modal reutilizable que aparece cuando se alcanza un límite |
| `src/lib/subscription.ts` | Helper: `getUserPlan(userId)`, `canUseAI(userId)`, `canCreateRecipe(userId)` |

---

## Lógica de acceso (helpers en `src/lib/subscription.ts`)

```ts
// Retorna 'free' | 'pro' — fallback a 'free' si no hay fila
async function getUserPlan(userId: string): Promise<'free' | 'pro'>

// true si plan=pro, o si tiene BYOK configurado
async function canUseAI(userId: string): Promise<{ allowed: boolean; reason?: 'pro' | 'byok' | 'trial' | 'exhausted' }>

// true si plan=pro, o count de recetas privadas < 20
async function canCreateRecipe(userId: string): Promise<boolean>
```

Estas funciones se llaman server-side en los API routes y server actions, nunca en el cliente.

---

## Roadmap de implementación

### Fase 1 — Infraestructura (prerequisito)
1. Migraciones `subscriptions` + `ai_usage`
2. `src/lib/subscription.ts` con los helpers
3. Webhook de Stripe (sincroniza plan en DB)
4. Incremento de `ai_usage` en todos los endpoints de IA

### Fase 2 — Límites y upgrade modal
1. Verificar `canUseAI` antes de procesar en `/api/don-marco`, `/api/analyze-recipe`, `/api/parse-ingredients`, `/api/recipe-chat`, `/api/translate-ingredient`
2. Verificar `canCreateRecipe` en el server action de save
3. `<UpgradeModal>` reutilizable con copy según el límite alcanzado

### Fase 3 — Checkout + pricing page
1. Página `/pricing` con tabla de planes
2. Botón "Upgradear" → Stripe Checkout → webhook → plan actualizado
3. Customer Portal para gestionar suscripción
4. Badge Pro en perfil

### Fase 4 — Polish
1. Emails transaccionales (confirmación de pago, aviso de cancelación) via Stripe
2. Métricas: MRR, churn, conversión free→pro (Stripe Dashboard es suficiente inicialmente)
3. Código de descuento para early adopters

---

## Preguntas abiertas

- **¿Cuántos mensajes de trial?** Propongo 30 (suficiente para tener 2-3 sesiones reales con Don Marco y sentir el valor). Podés bajar a 20 si querés más urgencia.
- **¿Las recetas públicas cuentan para el límite?** Propongo que no — incentiva compartir y genera tráfico orgánico.
- **¿Trial mensual o vitalicio?** Propongo vitalicio (se agotan una vez). Trial mensual es más generoso pero da menos urgencia de upgrade.
- **¿Precio anual?** $48/año ($4/mes efectivo). El descuento del 20% es estándar y mejora el LTV.
- **¿Cómo manejamos usuarios que ya tienen recetas?** Grandfathering: si ya tenés más de 20 cuando implementemos esto, no te bloqueamos nada — el límite aplica solo a nuevas creaciones.
