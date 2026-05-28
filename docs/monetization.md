# Plan de monetización

## Filosofía

Chorizo Lab es una herramienta de nicho para hobbistas. La propuesta de valor es clara: calculadora automática + versioning + comunidad + AI assistant. El modelo tiene que ser:

1. **Generoso gratis** — que la gente lo use de verdad antes de decidir pagar. El plan Free se sostiene con **Google AdSense** en banners no intrusivos.
2. **Fricción baja** — un solo click para upgradear, sin formularios complicados.
3. **BYOK siempre sin límites** — los usuarios con clave de Anthropic hacen lo que quieran. Sin caps, sin restricciones. Son power users, no los penalizamos.

---

## Tiers

### Free — $0 (con publicidad)

Sustentado por **Google AdSense** en banners discretos (sidebar / footer / between cards). Sin ads en flows críticos (creación de receta, calculadora, share page).

| Feature | Límite |
|---------|--------|
| Recetas privadas | hasta 20 |
| Recetas públicas | ilimitadas |
| Versiones por receta | ilimitadas |
| Forks / proposals | ilimitados |
| Análisis de receta | **10 en total** (pool vitalicio) |
| Importar ingredientes con IA | del mismo pool de 10 |
| Don Marco chat (`/don-marco`) | del mismo pool de 10 |
| Follow-ups por sesión de análisis | 8 mensajes por apertura del drawer |
| Google AdSense | sí (no intrusivo) |
| BYOK (clave propia de Anthropic) | sin ningún límite + sin ads |

> El pool de 10 es vitalicio — se agota una vez, no se renueva. Suficiente para tener 2-3 sesiones reales y sentir el valor; no tanto como para usarlo indefinidamente gratis.

> **BYOK quita los ads**: aunque sigan en plan Free, los usuarios con clave propia ven la app sin publicidad como reconocimiento de que están cubriendo sus propios costos de IA.

---

### Plus — **$5 / mes** o **$48 / año** (20% descuento)

Todo lo de Free, más:

| Feature | Límite en Plus |
|---------|--------------|
| Recetas privadas | ilimitadas |
| Sin publicidad | ✓ |
| Análisis de receta | **2 por versión de receta** |
| Importar ingredientes con IA | **2 por versión de receta** |
| Don Marco chat | 20 mensajes / día |
| Follow-ups por sesión de análisis | 8 mensajes por apertura del drawer |
| BYOK | sin ningún límite (bypasea todos los caps) |
| Badge "Plus" en perfil | ✓ |
| Exportar receta a PDF | ✓ (futuro) |
| Acceso anticipado a features | ✓ |

> **Topes en Plus**: análisis e imports de ingredientes están acotados a 2 usos por versión de receta — suficiente para iterar, no para abusar. Cada nueva versión que guardás resetea el contador. El chat general tiene cap diario. Con BYOK desaparecen todos los caps.

---

### Pro — **$15 / mes** o **$144 / año** (20% descuento)

Todo lo de Plus, más las features de **importación AI-driven** y la **extensión de Chrome**.

| Feature | Límite en Pro |
|---------|--------------|
| **Importar receta desde texto pegado** | ✓ — 50 imports / mes |
| **Importar receta desde imágenes (screenshots, fotos)** | ✓ — del mismo pool de 50 |
| **Chrome extension** — importar de cualquier sitio web en 1 click | ✓ — del mismo pool de 50 |
| Análisis de receta | **5 por versión** (vs 2 en Plus) |
| Don Marco chat | 60 mensajes / día (vs 20 en Plus) |
| Badge "Pro" en perfil | ✓ |
| BYOK | sin ningún límite (bypasea todos los caps) |

> **Sobre el cap de 50 imports/mes**: es **fair use** — cubre incluso power users (más de 1 import por día). Si alguien lo agota, queda evidente que es uso comercial y deberíamos hablar de Enterprise.

> **Por qué Pro existe**: la importación de recetas (texto + vision) tiene costo real significativo de tokens (vision es ~5-10x más caro que texto), y la Chrome extension es un moat técnico fuerte. Cobrar $15 cubre con margen y diferencia muy bien a quienes "traen recetas del mundo" de quienes "iteran sobre sus propias recetas" (Plus).

---

## Feature flagship de Pro: Chrome extension

One-click recipe import desde cualquier sitio web — blogs de cocina, NYT Cooking, BBC Good Food, foros, lo que sea.

**Flow esperado:**
1. Usuario navega un sitio con una receta.
2. Click en el icono de Chorizo Lab en la toolbar.
3. Extension capta el contenido de la página (HTML semántico + imágenes principales).
4. Manda al backend con auth del usuario.
5. Don Marco extrae estructura → preview en una tab/popup.
6. Usuario revisa, edita si quiere, guarda como receta nueva en su cuaderno.

**Detalles técnicos:**
- Manifest v3 (única opción aceptada por Chrome Web Store).
- Auth: OAuth con Supabase (mismo flujo que la app web, popup-based).
- Endpoint dedicado: `/api/import/from-url` (recibe HTML + imágenes, autenticado con session token).
- Reusa el mismo pipeline de Don Marco que el import manual de texto/imagen.

**Tradeoff**: codebase separada (extension), review inicial de Chrome Web Store (~1-2 semanas), y un endpoint público adicional. Pero el moat es real — ninguna otra app de embutidos tiene esto.

---

## Qué cuenta como "uso de IA"

Solo las llamadas que abren una sesión nueva, **no los follow-ups**:

| Acción | ¿Cuenta en pool/cap? |
|--------|----------------------|
| Abrir el drawer de análisis de receta | ✅ sí (1 uso) |
| Mensajes de seguimiento en el drawer | ❌ no (parte del análisis) |
| Importar ingredientes con IA | ✅ sí (1 uso) |
| Enviar mensaje en Don Marco chat | ✅ sí (1 uso) |
| Re-analizar (↺) | ✅ sí (1 uso nuevo) |
| **Importar receta de texto / imagen / URL** (Pro) | ✅ sí (1 del pool de 50) |
| Chrome extension import | ✅ sí (1 del pool de 50) |

Esto hace el trial justo: los follow-ups son parte del valor del análisis, no usos separados.

---

## Costos reales de IA por usuario (referencia)

| Acción | Modelo | Tokens aprox | Costo aprox |
|--------|--------|--------------|-------------|
| Análisis de receta + 5 follow-ups | Haiku 4.5 | ~6k | $0.007 |
| Mensaje en Don Marco chat | Haiku 4.5 | ~2k | $0.002 |
| Import de ingredientes (texto corto) | Haiku 4.5 | ~2k | $0.002 |
| **Import de receta de texto** | Sonnet/Opus | ~10k | $0.05 |
| **Import de receta de imagen** | Opus vision | ~15k | $0.15 |
| **Import via Chrome extension** | Sonnet/Opus | ~12k | $0.08 |

**Usuario Plus promedio** (~$0.24/mes en costo IA, margen ~95%):
- 10 análisis + 60 chats + 15 imports de ingredientes

**Usuario Pro promedio** (~$3-5/mes en costo IA, margen ~70%):
- Plus + 25 imports de recetas (mezcla de texto/imagen/URL)
- Tope teórico 50 imports → ~$5-7.50/mes en costos → margen ~50% en el peor caso, todavía sano

---

## Flujos de conversión

### Free → Plus (límite de chat o recetas)

1. Usuario nuevo tiene 10 usos en el pool.
2. Cada análisis, import o mensaje de chat descuenta 1.
3. Al llegar a 0, los botones de IA se deshabilitan e inline banner:
   > *"Usaste todos tus análisis de prueba. Para seguir usando Don Marco, upgradeá a Plus o traé tu propia clave de Anthropic."*
   > **[Ver planes]** · **[Usar mi clave →]**
4. Misma lógica al intentar crear la receta #21.

### Plus → Pro (al intentar importar receta)

1. Plus tiene los botones de "Importar receta" visibles pero deshabilitados con badge "Pro".
2. Click muestra:
   > *"La importación de recetas desde texto, imagen y web está en el plan Pro. Importás recetas de cualquier lado en un click."*
   > **[Pasar a Pro — $15/mes]** · **[Ver comparación]**

### BYOK siempre disponible

Bypasea todos los caps de IA (no los de feature). Pro-only features (import) **no se desbloquean con BYOK** — son features, no caps.

---

## Stack técnico

### Stripe
- **Stripe Checkout** para el flujo de pago (hosted, SCA, renovaciones).
- **Stripe Customer Portal** para self-service de cancelar/cambiar plan.
- **Webhooks** en `/api/webhooks/stripe`.

### Google AdSense (Free tier)
- Activar AdSense en el sitio aprobado, integrar via `<Script>` de Next.
- Slots ubicados estratégicamente:
  - Sidebar en `/explore` y `/library` (Free only).
  - Banner entre comments y version history en recipe view (Free only).
  - **Nunca**: en `/new`, calculator, share page, settings, login.
- Hook server-side: si `plan != 'free'` o `hasOwnApiKey`, no se renderizan los slots.

### DB

```sql
-- Suscripción activa del usuario
create table public.subscriptions (
  user_id              uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id   text unique,
  stripe_sub_id        text unique,
  plan                 text not null default 'free',   -- 'free' | 'plus' | 'pro'
  status               text not null default 'active', -- 'active' | 'canceled' | 'past_due'
  current_period_end   timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- Uso global de IA por usuario
create table public.ai_usage (
  user_id           uuid primary key references auth.users(id) on delete cascade,
  trial_used        int  not null default 0,           -- Free: pool vitalicio de 10
  chat_today        int  not null default 0,           -- cap diario (Plus/Pro)
  chat_date         date not null default current_date,
  imports_month     int  not null default 0,           -- Pro: pool mensual de 50
  imports_month_start date not null default date_trunc('month', current_date),
  updated_at        timestamptz not null default now()
);

-- Uso de IA por versión de receta (Plus/Pro)
create table public.ai_usage_per_version (
  user_id     uuid not null references auth.users(id) on delete cascade,
  version_id  uuid not null references recipe_versions(id) on delete cascade,
  analyses    int  not null default 0,  -- Plus: 2, Pro: 5
  imports     int  not null default 0,  -- Plus: 2, Pro: 5 (ingredient imports)
  primary key (user_id, version_id)
);
```

### Env vars nuevos
```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PLUS_MONTHLY_PRICE_ID=price_...
STRIPE_PLUS_YEARLY_PRICE_ID=price_...
STRIPE_PRO_MONTHLY_PRICE_ID=price_...
STRIPE_PRO_YEARLY_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
NEXT_PUBLIC_ADSENSE_CLIENT_ID=ca-pub-...
```

---

## Helpers en `src/lib/subscription.ts`

```ts
// 'free' | 'plus' | 'pro' — fallback a 'free' si no hay fila
getUserPlan(userId): Promise<'free' | 'plus' | 'pro'>

// Verifica si puede hacer una llamada de IA nueva (análisis, ingredient import, chat)
canUseAI(userId): Promise<{ allowed: boolean; reason: string }>

// Verifica si puede importar una receta (texto/imagen/URL) — solo Pro o BYOK con Pro
canImportRecipe(userId): Promise<{ allowed: boolean; reason: string; remaining?: number }>

// true si plan ≠ 'free' o recetas privadas < 20
canCreateRecipe(userId): Promise<boolean>

// true si debe ver ads (plan = 'free' y NO tiene BYOK)
shouldShowAds(userId): Promise<boolean>
```

Se llaman server-side en API routes y server actions, nunca en el cliente.

---

## Roadmap de implementación

### Fase 1 — Infraestructura (Plus first)
1. Migraciones `subscriptions` + `ai_usage` + `ai_usage_per_version`
2. `src/lib/subscription.ts` con `getUserPlan` / `canUseAI` / `canCreateRecipe`
3. Webhook de Stripe → sincroniza `subscriptions`
4. `canUseAI` verificado en todos los endpoints de IA; incremento de `trial_used` / `chat_today`

### Fase 2 — Límites en UI (Plus)
1. Banners/modales cuando se agotan trial, límite de recetas, límite diario Plus
2. Cap de 8 follow-ups en `DonMarcoDrawer` (estado local)
3. Cap de 20 msg/día en `/don-marco` chat (server-side)
4. Badge Plus en perfil

### Fase 3 — Checkout + pricing (Plus live)
1. Página `/pricing` con 3 tiers (Free / Plus / Pro)
2. Stripe Checkout para Plus → webhook → plan actualizado
3. Customer Portal
4. Google AdSense aprobado e integrado en slots Free-only

### Fase 4 — Pro tier: import de recetas
1. Migración: agregar columna `plan='pro'` válida + `imports_month` en `ai_usage`
2. `canImportRecipe` helper
3. UI: tercera card en `/new` "Importar receta" (Plus ve disabled con CTA a Pro)
4. Pantalla de import: tabs **Pegar texto** / **Subir imágenes**
5. Endpoint `/api/import/recipe` que recibe texto/imágenes → llama Anthropic vision/text → JSON estructurado → preview editable → guarda
6. Stripe price para Pro + checkout + portal

### Fase 5 — Chrome extension
1. Repo separado `chorizo-lab-extension`
2. Manifest v3, popup HTML mínimo, content script para extraer recipe schema.org / Open Graph / fallback heurístico
3. OAuth con Supabase (popup flow)
4. Endpoint `/api/import/from-url` que recibe HTML + imágenes seleccionadas
5. Submission a Chrome Web Store
6. Mismo cap de 50 imports/mes (compartido con import vía web)

### Fase 6 — Polish
1. Emails via Stripe (confirmación, aviso de cancelación)
2. Código de descuento para early adopters
3. Métricas (Stripe Dashboard + Vercel Analytics)

---

## Decisiones tomadas

| Decisión | Elección | Razonamiento |
|----------|----------|--------------|
| Modelo Free | Soportado por Google AdSense | Genera revenue del free tier sin paywalls duros |
| BYOK quita ads | Sí | Reconocer que ya cubren sus propios costos |
| Qué cuenta como uso de IA | Análisis + imports + chat (no follow-ups) | Follow-ups son parte del análisis |
| Trial mensual vs vitalicio | Vitalicio (10 usos totales) | Crea urgencia real de upgrade |
| Recetas públicas cuentan | No | Incentiva compartir, genera tráfico |
| Cap de follow-ups (todos los tiers) | 8 por sesión, cliente | Evita complejidad server-side |
| Cap diario chat en Plus/Pro | Server-side | Protege tokens reales |
| BYOK | Sin ningún límite de IA | Power users no se penalizan |
| **Pro tier** | **$15/mes** · $144/año | Cubre costos de vision + Chrome extension; segmento power |
| **Cap de imports en Pro** | 50/mes (texto + imagen + URL pooled) | Fair use que cubre power users sin riesgo de abuse |
| **Chrome extension auth** | OAuth con Supabase | Mejor UX vs personal access token |
| **Pro features con BYOK?** | BYOK quita caps de IA, no desbloquea features Pro | Import es feature, no tope de IA |
| Plus | $5/mes · $48/año | Punto dulce hobbista que solo quiere AI feedback |

---

## Pendiente de decidir

- **¿Grandfathering?** Usuarios con >20 recetas cuando implementemos: propongo no bloquearles nada, el límite aplica solo a creaciones nuevas.
- **¿Early adopter deal?** Código tipo `CHORIZO2026` para validar conversión inicial.
- **¿Trial de Pro?** ¿Dar 1-2 imports gratis a usuarios Plus para que prueben antes de upgradear?
- **¿Enterprise / Team plan?** Para carnicerías/comercios — fuera de scope MVP pero posible más adelante.
