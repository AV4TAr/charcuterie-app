# Plan de monetización

## Filosofía

Chorizo Lab es una herramienta de nicho para hobbistas. La propuesta de valor es clara: calculadora automática + versioning + comunidad. El modelo tiene que ser:

1. **Generoso gratis** — que la gente lo use de verdad antes de decidir pagar.
2. **Fricción baja** — un solo click para upgradear, sin formularios complicados.
3. **BYOK siempre sin límites** — los usuarios con clave de Anthropic hacen lo que quieran. Sin caps, sin restricciones. Son power users, no los penalizamos.

---

## Tiers propuestos

### Free
| Feature | Límite |
|---------|--------|
| Recetas privadas | hasta 20 |
| Recetas públicas | ilimitadas |
| Versiones por receta | ilimitadas |
| Forks / proposals | ilimitados |
| Análisis de receta | **10 en total** (pool vitalicio) |
| Importar con IA | del mismo pool de 10 |
| Don Marco chat (/don-marco) | del mismo pool de 10 |
| Follow-ups por sesión de análisis | 8 mensajes por apertura del drawer |
| BYOK (clave propia de Anthropic) | sin ningún límite |

> El pool de 10 es vitalicio — se agota una vez, no se renueva. Suficiente para tener 2-3 sesiones reales y sentir el valor; no tanto como para usarlo indefinidamente gratis.

---

### Pro — **$5 / mes** o **$48 / año** (20% descuento)
Todo lo de Free, más:

| Feature | Límite en Pro |
|---------|--------------|
| Recetas privadas | ilimitadas |
| Análisis de receta | ilimitados |
| Importar con IA | ilimitado |
| Don Marco chat (/don-marco) | 20 mensajes / día |
| Follow-ups por sesión de análisis | 8 mensajes por apertura del drawer |
| Don Marco chat (/don-marco) | 20 mensajes / día |
| BYOK | sin ningún límite (bypasea todos los caps) |
| Badge "Pro" en perfil | ✓ |
| Exportar receta a PDF | ✓ (futuro) |
| Acceso anticipado a features | ✓ |

> **Topes en Pro**: los caps de Pro (8 follow-ups por análisis, 20 msg/día en chat) protegen los tokens del sistema. El análisis de receta es una herramienta de trabajo, no un chatbot de uso general. Si alguien quiere charlar sin límite, trae su propia key. Con BYOK, desaparecen todos los caps.

> **Sobre el precio**: $5/mes es el punto dulce para hobbistas — menos que un café. $10/mes solo por IA es demasiado para este segmento; bundlear todo en $5 es más fácil de justificar.

---

## Qué cuenta como "uso de IA"

Solo las llamadas que abren una sesión nueva, **no los follow-ups**:

| Acción | ¿Cuenta? |
|--------|----------|
| Abrir el drawer de análisis de receta | ✅ sí (1 uso) |
| Mensajes de seguimiento en el drawer | ❌ no (son parte del análisis) |
| Importar ingredientes con IA | ✅ sí (1 uso) |
| Enviar mensaje en Don Marco chat | ✅ sí (1 uso) |
| Re-analizar (↺) | ✅ sí (1 uso nuevo) |

Esto hace el trial justo: los follow-ups son parte del valor del análisis, no usos separados.

---

## Costos reales de IA por usuario Pro (referencia)

Haiku 4.5 es muy barato:

| Uso estimado/mes | Tokens | Costo |
|-----------------|--------|-------|
| 10 análisis de receta (+ 5 follow-ups c/u) | ~60k tokens | ~$0.07 |
| 60 mensajes en Don Marco chat (3 días/semana) | ~120k tokens | ~$0.14 |
| 15 AI imports | ~30k tokens | ~$0.03 |
| **Total** | ~210k tokens | **~$0.24/usuario/mes** |

Con $5/mes por Pro, el margen de IA es ~95%. El costo operativo real es Supabase + Vercel + Stripe fees (~$0.30/transacción).

Un usuario muy activo que chatea todos los días y agota el cap diario costaría ~$0.80/mes — sigue siendo un margen del 84%.

---

## Flujo de trial (Free → upgrade)

1. Usuario nuevo tiene 10 usos en el pool.
2. Cada análisis, import o mensaje de chat descuenta 1 del pool.
3. Al llegar a 0, los botones de IA se deshabilitan y aparece un banner inline:
   > *"Usaste todos tus análisis de prueba. Para seguir usando Don Marco, upgradeá a Pro o traé tu propia clave de Anthropic."*
   > **[Pro — $5/mes]** · **[Usar mi clave →]**
4. BYOK siempre disponible, bypasea todo.

---

## Flujo de límite de recetas (Free)

1. Al intentar crear la receta #21: modal de upgrade.
   > *"Llegaste al límite de 20 recetas en el plan gratuito."*
   > **[Ver planes]**
2. Recetas existentes nunca se bloquean.
3. Recetas públicas no cuentan para el límite (incentiva compartir + SEO).

---

## Flujo de cap en Pro (tokens del sistema)

1. Al agotar los 8 follow-ups en un drawer de análisis:
   > *"Llegaste al límite de esta sesión. Abrí un nuevo análisis o traé tu propia clave para charla ilimitada."*
2. Al agotar los 20 mensajes diarios en el chat:
   > *"Llegaste al límite diario de Don Marco. Volvé mañana o configurá tu propia clave de Anthropic para uso ilimitado."*
3. Con BYOK: ningún cap aplica.

---

## Stack técnico

### Stripe
- **Stripe Checkout** para el flujo de pago (hosted, maneja SCA, renovaciones, etc.)
- **Stripe Customer Portal** para que el usuario cancele/cambie plan sin contactarnos
- **Webhooks** en `/api/webhooks/stripe` para sincronizar estado de suscripción

### DB (nuevas tablas)

```sql
-- Suscripción activa del usuario
create table public.subscriptions (
  user_id              uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id   text unique,
  stripe_sub_id        text unique,
  plan                 text not null default 'free',   -- 'free' | 'pro'
  status               text not null default 'active', -- 'active' | 'canceled' | 'past_due'
  current_period_end   timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- Contador de uso de IA
-- Para Free: pool vitalicio (nunca se resetea)
-- Para Pro: contador diario de mensajes en el chat (se resetea cada día)
create table public.ai_usage (
  user_id          uuid primary key references auth.users(id) on delete cascade,
  trial_used       int  not null default 0,   -- pool vitalicio (Free)
  chat_today       int  not null default 0,   -- mensajes hoy en /don-marco (Pro)
  chat_date        date not null default current_date,
  updated_at       timestamptz not null default now()
);
```

### Lógica de caps por sesión de análisis

Los follow-ups del drawer se cuentan en el **cliente** (estado local del componente `DonMarcoDrawer`). El cap de 8 aplica a todos los tiers (Free y Pro) — es un límite de UX, no de seguridad. El servidor no necesita validarlo. Con BYOK el cap no aparece.

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
| `src/app/[locale]/pricing/page.tsx` | Tabla de planes, botón de checkout |
| `src/app/api/stripe/checkout/route.ts` | Crea Stripe Checkout Session |
| `src/app/api/stripe/portal/route.ts` | Crea Customer Portal Session |
| `src/app/api/webhooks/stripe/route.ts` | Recibe eventos (sub creada/cancelada/renovada) |
| `src/components/upgrade-modal.tsx` | Modal reutilizable por límite alcanzado |
| `src/lib/subscription.ts` | Helpers de acceso (ver abajo) |

---

## Helpers en `src/lib/subscription.ts`

```ts
// 'free' | 'pro' — fallback a 'free' si no hay fila
getUserPlan(userId): Promise<'free' | 'pro'>

// Verifica si puede hacer una llamada de IA nueva (análisis, import, chat)
// Retorna { allowed, reason: 'pro' | 'byok' | 'trial' | 'exhausted' | 'daily_limit' }
canUseAI(userId): Promise<{ allowed: boolean; reason: string }>

// true si plan=pro o recetas privadas < 20
canCreateRecipe(userId): Promise<boolean>
```

Se llaman server-side en API routes y server actions, nunca en el cliente.

---

## Roadmap de implementación

### Fase 1 — Infraestructura
1. Migraciones `subscriptions` + `ai_usage`
2. `src/lib/subscription.ts`
3. Webhook de Stripe → sincroniza `subscriptions`
4. `canUseAI` verificado en todos los endpoints de IA; incremento de `trial_used` / `chat_today`

### Fase 2 — Límites en UI
1. Banners/modales cuando se agotan trial, límite de recetas, límite diario Pro
2. Cap de 8 follow-ups en `DonMarcoDrawer` (estado local)
3. Cap de 20 msg/día en `/don-marco` chat (verificado server-side)

### Fase 3 — Checkout + pricing
1. Página `/pricing`
2. Stripe Checkout → webhook → plan actualizado
3. Customer Portal (cancelar/cambiar plan)
4. Badge Pro en perfil

### Fase 4 — Polish
1. Emails via Stripe (confirmación, aviso de cancelación)
2. Código de descuento para early adopters
3. Métricas (Stripe Dashboard es suficiente inicialmente)

---

## Decisiones tomadas

| Decisión | Elección | Razonamiento |
|----------|----------|--------------|
| Qué cuenta en el trial | Análisis + imports + mensajes en chat (no follow-ups) | Los follow-ups son parte del análisis, no usos separados |
| Trial mensual vs vitalicio | Vitalicio (10 usos totales) | Crea urgencia real; mensual reduce la presión de upgrade |
| Recetas públicas cuentan | No | Incentiva compartir, genera tráfico |
| Cap de follow-ups (todos los tiers) | 8 por sesión, cliente (UX) | Evita complejidad server-side; con BYOK no aplica |
| Cap diario chat en Pro | Server-side | Protege tokens reales; se resetea cada día |
| BYOK | Sin ningún límite | Son power users, no los penalizamos |
| Precio | $5/mes · $48/año | Punto dulce hobbista; margen ~95% sobre costo IA |

---

## Pendiente de decidir

- **¿Grandfathering?** Usuarios con >20 recetas cuando implementemos: propongo no bloquearles nada, el límite aplica solo a creaciones nuevas.
- **¿Early adopter deal?** Un código de descuento tipo `CHORIZO2026` para los primeros N usuarios podría ayudar a validar la conversión.
