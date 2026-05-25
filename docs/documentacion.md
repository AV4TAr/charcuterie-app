# Chorizo Lab — Especificación

Versión viva del documento. Se actualiza a medida que el producto evoluciona.

## 1. Introducción

**Chorizo Lab** es una aplicación web (PWA) para diseñar, escalar, versionar y compartir recetas de chorizo y embutidos artesanales.

Está pensada para charcuteros aficionados y semi-profesionales que iteran sus recetas a lo largo del tiempo, prueban variaciones según la carne disponible y aprenden de la comunidad.

La unidad de medida no es un detalle: la app convierte automáticamente entre gramos, kilos, onzas, libras, mililitros, litros, onzas fluidas, cucharaditas, cucharadas, tazas, centímetros, metros y unidades — independientemente de en qué unidad fue cargada cada parte de la receta.

## 2. Problema a resolver

Hacer chorizo casero combina química, intuición y aritmética. La mayoría de las recetas se comparten en formatos que rompen al menor cambio de escala:

- "Para 1 kg de carne, 25 g de sal" — y si tengo 2,7 lb de carne, ¿cuánta sal va?
- "1 cucharadita de pimentón por kilo" — y si quiero hacer 4 kg, ¿cuántas cucharaditas son? ¿Mejor en gramos?
- "Mi versión nueva tiene menos ajo" — pero no quedó registro de la versión anterior ni de por qué se cambió.
- "Le pasé la receta a un amigo y la modificó" — pero no hay forma limpia de proponer su cambio de vuelta al original.
- "¿Dónde compro tripa natural buena cerca?" — la respuesta vive en chats privados, no en un mapa compartido.

Las herramientas existentes (notas, planillas, blogs) resuelven una parte cada una, pero ninguna integra **escalado multi-unidad, versionado, comunidad y comercio local**.

Chorizo Lab cubre ese hueco con un modelo familiar: pensar las recetas como repositorios de código — con commits, forks, pull requests y comentarios — pero diseñado para la cocina, no para programadores.

## 3. Principios de diseño

1. **La unidad la elige el cocinero, no la receta.** Cada ingrediente se carga una vez en la unidad más cómoda; el sistema convierte al vuelo a cualquier otra.
2. **Porcentaje de carne como ciudadano de primera clase.** "2 % del peso de la carne" es una expresión válida y de hecho la preferida para sales, especias y curas, porque escala perfecto.
3. **Versiones inmutables.** Cada cambio en una receta produce una nueva versión numerada con su nota; nada se pierde.
4. **Pública o privada por decisión explícita.** Las recetas son privadas por default; el dueño elige publicar.
5. **Mobile-first y offline-capable.** Se cocina con las manos sucias y a veces sin señal — la app es PWA instalable y resiliente.
6. **Bilingüe nativo.** Español e inglés, intercambiables sin perder estado, con la unidad y la convención de redondeo de cada idioma.

## 4. Usuarios

- **Cocinero casero.** Tiene 3–5 recetas favoritas, ajusta ingredientes según la carne del día, quiere replicar resultados pasados.
- **Charcutero serio.** Mantiene un cuaderno con 20–50 fórmulas, itera por temporada, comparte con un grupo cerrado.
- **Vendedor/productor.** Necesita escalar de prueba (1 kg) a producción (50 kg) sin error.
- **Curioso/aprendiz.** Llega a la app sin recetas propias; quiere descubrir, probar las de otros, copiar y modificar.

## 5. Historias de usuario

### 5.1 Crear y escalar (cocinero casero)

> *Como cocinero casero, quiero cargar mi receta una sola vez (en las unidades que tengo a mano: kg para carne, % para sales y especias, cm para tripa) y que la app me diga exactamente cuánta sal, ajo y vino van para los 2,3 kg de carne que compré hoy.*

Aceptación:
- Cargo "Sal — 2,5 % de la carne" y veo que para 2 300 g de carne van 57,5 g.
- Cambio el peso de carne a "5 lb" y todos los ingredientes se recalculan en sus respectivas unidades sin que yo toque nada más.
- Cada fila puede cambiar individualmente su unidad de despliegue ("quiero ver el vino en cucharadas, no en ml").

### 5.2 Versionar (charcutero serio)

> *Como charcutero, quiero anotar por qué cambié algo entre una tanda y la siguiente, y poder volver a una versión vieja si la nueva no salió mejor.*

Aceptación:
- Cada vez que edito una receta y guardo, se crea una versión nueva numerada (v1, v2, v3…) con la nota que escribí ("subí pimentón ahumado a 1 %").
- Puedo ver el historial completo y abrir cualquier versión anterior con sus ingredientes intactos.
- El "diff" entre versiones es visible: qué cambió, en cuánto.

### 5.3 Compartir y forkear (comunidad)

> *Como usuario, quiero hacer pública mi receta para que otros la copien, y también partir de la receta de otro como base para hacer la mía.*

Aceptación:
- Marco una receta como `pública` y aparece en `/explore`.
- Desde una receta ajena, hago "Fork": se crea una copia bajo mi cuenta, con referencia al original y a la versión exacta de la que partí.
- En mi fork puedo cambiar lo que quiera sin afectar el original.

### 5.4 Proponer cambios (proposals — PR-style)

> *Como autor de un fork, quiero proponerle al dueño del original que adopte mi cambio (más vino, menos sal), y que él pueda aceptarlo, rechazarlo o discutirlo.*

Aceptación:
- Desde mi fork creo un *proposal* apuntando al original, con título y descripción.
- El dueño del original ve los proposals abiertos, abre uno, ve el diff y decide: `accept` (crea una versión nueva en el original que incorpora el cambio), `reject` o `comment`.
- Hay un hilo de comentarios por cada proposal.

### 5.5 Calificar, comentar, marcar favorito

> *Como cocinero, quiero recordar las recetas que me funcionaron y leer qué dijo la comunidad sobre cada una antes de probarla.*

Aceptación:
- Cada receta tiene rating de 1 a 5 estrellas (un voto por usuario) y se muestra el promedio.
- Puedo comentar la receta y responder a otros comentarios (threads).
- Puedo marcar/desmarcar como favorita; mis favoritas aparecen en una vista propia.
- Existen "cooking tips" — comentarios marcados como consejos prácticos por el autor o por curaduría.

### 5.6 Dónde comprar (stores)

> *Como recién llegado a la charcutería, quiero saber dónde se consigue tripa natural, sales de cura o pimentón ahumado decente cerca de donde vivo.*

Aceptación:
- Cada ingrediente del catálogo puede asociarse a una o más tiendas (con dirección y coordenadas).
- Cualquier usuario puede sugerir una tienda o asociar una existente a un ingrediente.
- Mapa con pines y filtro por ingrediente.

### 5.7 Identidad y privacidad

> *Como usuario nuevo, quiero ingresar rápido (sin recordar contraseñas) y controlar qué se ve público de mí.*

Aceptación:
- Login por **magic link por email**. Sin contraseñas.
- Perfil con username (único, citext), display name, avatar opcional y bio.
- El perfil es público por default, pero las recetas son privadas hasta publicarlas.

## 6. Modelo de datos (resumen)

Tablas principales (Supabase / Postgres):

- `profiles` — uno por `auth.users`, con username único.
- `ingredients` — catálogo compartido, con `measurement_type` ∈ {mass, volume, length, count} y `default_density_g_per_ml` cuando aplica.
- `recipes` — metadata (dueño, slug, título, descripción, visibilidad, contadores, fork lineage).
- `recipe_versions` — append-only; cada edición es un row nuevo con su `change_note` y `meat_base_weight_grams`.
- `recipe_version_ingredients` — filas por versión, con `mode` ∈ {percent, absolute}, `percent_of_meat` **o** `amount_canonical`, y `display_unit`.
- `stores` + `ingredient_stores` — comercio local.
- `favorites`, `ratings`, `comments` — capa social.
- `proposals` + `proposal_comments` — PR-style cross-recipe change requests.

RLS estricto: cualquiera lee recetas públicas; solo el dueño escribe las suyas; perfiles e ingredientes son lectura pública.

## 7. Conversiones y unidades

Sistema canónico:

- **Masa** → gramos.
- **Volumen** → mililitros.
- **Longitud** → centímetros.
- **Cantidad** → unidades.

Conversión cruzada **masa ↔ volumen** vía `density_g_per_ml` (declarada en el ingrediente o en la fila). Sin densidad, la conversión cruzada lanza error explícito.

Unidades soportadas hoy: `g, kg, oz, lb, ml, l, fl oz, tsp, tbsp, cup, cm, m, piece`.

## 8. Arquitectura técnica

- **Frontend:** Next.js 16 (App Router, RSC, Turbopack), React 19, TypeScript, Tailwind 4.
- **i18n:** next-intl 4, locale-prefix `as-needed`, default `es`, también `en`.
- **PWA:** `@ducanh2912/next-pwa` con manifest y service worker.
- **Auth & DB:** Supabase (Postgres + Auth + Storage). Cliente `@supabase/ssr` con session refresh en `proxy.ts`.
- **Forms:** react-hook-form + Zod.
- **Tests:** Vitest (lógica pura de unidades y calculadora).
- **Hosting:** Vercel (production branch = `develop`).
- **CI/CD:** push a `develop` → Vercel build → producción en `charcuterie-app.vercel.app`. Supabase GitHub integration aplica migraciones desde `supabase/migrations/`.

Convenciones Next.js 16:

- El antiguo `middleware.ts` ahora se llama `proxy.ts` (cambio de Next 16).
- Server Components por default; `"use client"` solo donde hace falta interactividad.

## 9. Estado actual (snapshot)

Funcionando en producción:

- Landing bilingüe con calculadora demo (chorizo criollo hardcodeado).
- Auth magic link end-to-end (login, callback, logout, profile auto-create por trigger).
- `/explore` listando recetas públicas reales con badges de favoritos y rating.
- `/new` con form completo: título, descripción, visibilidad, peso base, ingredientes dinámicos %/absoluto, instrucciones. Dropdown de unidades en modo absoluto muestra las 13 unidades agrupadas.
- `/r/[id]` con detalle completo:
  - Scaler en vivo (cambiá el peso de carne y todo se recalcula)
  - Botón Favorito (★) con conteo optimista
  - Rating de 5 estrellas con upsert (un voto por user, avg en vivo)
  - Botón Edit (solo dueño) o Fork (no-dueño autenticado)
  - Histórico colapsable de versiones con change_notes
  - Comentarios threaded de 1 nivel (post + reply)
  - Lineage "Forkeada de…" cuando aplica
- `/r/[id]/edit` editor de receta existente: crea v2, v3… con `change_note` requerido.
- `/favorites` lista las recetas marcadas (auth-gated).
- Fork via server action: copia receta + ingredientes bajo el user, lineage poblado.
- 21 ingredientes seedados con densidades para líquidos + 5 recetas curadas (chorizo criollo argentino, cantimpalos español, parrillera uruguaya, longaniza catalana, chorizo mexicano) bajo el usuario `chorizolab`.
- RLS aplicado en todas las tablas. Triggers de contadores con `SECURITY DEFINER` para bypassear RLS al actualizar `recipes.favorites_count` / `recipes.ratings_avg`.

Sistema visual (Lab — diseño definitivo):

- Tipografía: Instrument Serif (display, italics expresivas), Geist (UI sans), JetBrains Mono (datos, %, unidades).
- Paleta única "Lab" con dark + light:
  - Light: papel #ecebe4, ink #1a1a22, accent (rojo bisturí) #d33a2c, accent-2 (azul tinta) #213044.
  - Dark: bg #131318, paper #1c1c23, ink #ecebe4, accent #f55b4d.
- Identidad: glifo dual lectura (corte de chorizo + dial de medición) + wordmark "Chorizo *Lab*".
- Lenguaje visual: cuaderno de laboratorio, grid de papel cuadriculado en hero, stamps rotados, % como ciudadano de primera, mono para datos.
- Toggle dark/light persistido en localStorage (`cl-theme`), dark default.

Pendiente (próximas iteraciones):

- Aplicar el sistema visual Lab a páginas internas (/explore, /new, /r/[id], /favorites, /login). Hoy solo landing y nav lo usan; el resto sigue con la mezcla zinc/amber anterior.
- Diff visual entre versiones de una receta.
- Cooking tips destacados (subset de comments).
- Perfiles públicos navegables (`/u/[username]`).
- Stores y mapa.
- Proposals UI (PR-style entre recetas).
- AI assistant "Don Marco" (chat para crear/modificar recetas con preview en vivo).
- Custom SMTP (Resend), dominio propio, SEO, analytics.

## 10. Roadmap por fases

**Fase 1 — Foundation (✅ hecho)**
Scaffolding, schema, calculadora, i18n, PWA, deploy.

**Fase 2 — Auth + creación (✅ hecho)**
Magic link, `/new`, `/explore`, `/r/[id]`.

**Fase 3 — Versionado y edición**
Editor de receta existente, historial de versiones, diff entre versiones.

**Fase 4 — Comunidad**
Favoritos, ratings, comentarios, perfiles públicos navegables.

**Fase 5 — Colaboración**
Forks, proposals (PR-style), aceptar/rechazar proposals con merge.

**Fase 6 — Comercio local**
Stores, asociar ingredientes a tiendas, mapa.

**Fase 7 — Production polish**
Custom SMTP, dominio propio, SEO, analytics, performance.

## 11. Métricas de éxito

- Un cocinero puede cargar una receta nueva en menos de 3 minutos.
- El recálculo al cambiar el peso de carne es instantáneo y correcto en cualquier unidad.
- Cero pérdida de versiones: cada edición queda registrada con su nota.
- Al menos 1 fork + 1 proposal aceptada antes de mover a Fase 6.
