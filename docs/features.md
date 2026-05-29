# Features

## Authentication
- Email magic link login
- Google OAuth
- Session handled via Supabase SSR middleware
- Auth-gated pages redirect to `/login`
- Login redirects to `/library` (Mi cuaderno)
- Logout always redirects to `/`

## Internationalization
- Spanish (default, rioplatense voseo) and English
- Locale switcher in nav
- Routes prefixed by locale: `/es/...`, `/en/...`

## PWA
- Installable from browser (manifest + service worker)
- Offline support for cached content

## Recipes

### Create & edit
- Title, description, visibility (public/private)
- Meat base weight with unit selector (g, kg, oz, lb)
- Step-by-step instructions
- Ingredient rows: each row is either **percent of meat weight** or **absolute quantity**
- Per-row unit selector matching ingredient type (mass / volume / length / count)
- Autocomplete combobox for ingredient search — type to filter, "+ Create new" option
- Inline dialog to create new catalog ingredients without leaving the form
- Lock icon (🔓/🔒) on absolute rows: toggle whether the amount scales proportionally with meat weight

### Versioning
- Every save creates a new immutable version (append-only)
- Change note required when saving a new version
- Version history page (`/versions`)
- Versions linked via `current_version_id` on the recipe

### Weight calculator (recipe view)
- Input meat weight in g, kg, oz, or lb
- All percent ingredients recalculate live
- Absolute ingredients scale proportionally unless locked (🔒)
- Locked ingredients show `*` with a footnote explaining they don't vary
- Each ingredient displayed in its preferred display unit

#### Visibility
- Public recipes visible to everyone
- Private recipes visible to owner only (enforced via RLS)
- Toggle inline from `/library` (no new version) — click the visibility badge on a card, confirm in popover

### Archive
- Owner can archive a recipe from the library card → hidden from all listings (library tabs, explore, share links return 404)
- Archived recipes appear in a separate "Archivadas" tab in `/library` with a Restore button
- While archived: read-only banner on `/r/[id]` for the owner; non-owners get 404; `/r/[id]/edit` redirects to view; share links return 404
- Forks made by other users are unaffected — archive does not cascade
- Restore brings the recipe back as private (visibility was forced to private on archive); existing share tokens become valid again

### Share links
- Public recipes: "Compartir" copies the canonical `/r/[id]` URL to clipboard
- Private recipes: generates a secret token (`/share/[token]`) — anyone with the link can view + use the calculator without logging in
- Owner can revoke the secret link at any time (generates a new token on next share)
- Share page shows a banner CTA to register; no login required to view or scale

## Ingredient catalog
- Global shared catalog (any user can add ingredients)
- Categories: meat, cure, spice, herb, liquid, casing, other
- Measurement types: mass, volume, length, count
- Optional density (g/ml) for cross-type conversion (e.g. wine in % of meat weight → ml)
- Bulk densities seeded for spices/herbs so they can be entered in tsp/tbsp/cup
- Pre-seeded with common Spanish and English charcuterie ingredients (~90 entries)

## Multi-unit support
| Type | Units |
|------|-------|
| Mass | g, kg, oz, lb |
| Volume | ml, l, fl oz, tsp, tbsp, cup |
| Length | cm, m |
| Count | piece |

All values stored in canonical base units (g, ml, cm, count) and displayed in the user-chosen unit.

## Social

### Favorites
- Bookmark any public recipe
- `/favorites` page lists your saved recipes
- Favorite count shown on recipe cards (maintained by DB trigger)

### Ratings
- 1–5 star rating per recipe
- Average and count updated by DB trigger

### Comments
- Threaded comments on recipes (1 level of nesting)
- "Publicar comentario" button

## Explore
- Public recipes only (private and archived are excluded)
- Search by title or ingredient
- Filter by rating, favorites

## Navigation
- Sticky top nav with logo, main links, theme + locale switchers, and auth controls
- On screens < md (768px): nav links collapse into a hamburger drawer (Explore, Library, Don Marco, Settings, Sign out)
- Email + Settings/Sign-out buttons hide responsively to make room on narrower screens

## User profiles
- Profile page at `/@username` with public recipes
- Display name, username, bio, avatar

## Forks
- Fork any public recipe → creates a private copy with attribution
- "Forked from @user/recipe" shown on forked recipes
- Fork list at `/forks`

## Proposals (PR-style contributions)
- From a fork, open a proposal to suggest changes to the original
- Owner of the original can accept or reject
- Accepting creates a new version in the original recipe
- Diff view comparing versions
- Comments on proposals

## Stores
- Create stores (name + address, optional coordinates)
- Link stores to ingredients
- Track where to buy specific ingredients

## AI — Don Marco
Don Marco is the app's AI persona: a master charcutier with 35 years of experience, son of an Italian immigrant butcher in the Río de la Plata. Responds warmly in the user's language, using voseo in Spanish.

### Disclaimer
- Modal shown on first use; acceptance stored on `profiles.don_marco_accepted_at`
- Footer disclaimer line on every chat block reminding the user that suggestions are guidance and use is at their own responsibility
- Disclaimer text in both locales

### New-recipe flow (`/new`)
- Chooser screen lets the user pick between Don Marco or manual form
- Don Marco card is disabled (with link to Settings) when the user has no API key
- Manual option opens the form directly

### Chat (`/don-marco`)
- Streaming chat with Don Marco
- Example prompts populate the input box for editing before sending
- Shows `● ● ●` while generating
- On 402 (no API key): shows inline link to Settings

### Recipe analysis (edit mode)
- "✦ Consultar a Don Marco" button in the recipe editor (only when ingredients exist)
- Gated by API key — if missing, the button links to Settings instead of opening the drawer
- Opens a drawer that streams expert feedback on the current recipe
- Checks: salt ratio (1.8–2.5% fresh / 2.5–3.0% cured), cure salt safety (0.20–0.25%), spice balance, technique tips
- Max ~200 words, flowing text
- After analysis, a chat input appears for contextual follow-up questions
- Full recipe context + conversation history sent on each turn
- Enter to send, Shift+Enter for new line; "↺ Re-analyze" clears and restarts

### AI ingredient import (edit mode)
- "✦ Importar con IA" panel in the ingredient editor
- Paste a free-text list → AI parses names, amounts, and units
- Preview table shows matched catalog entries (✓) and new ingredients (✦ new)
- Unmatched ingredients are auto-created in the catalog on confirm
- Supports Spanish and English ingredient names and units

## Per-user Anthropic API keys
- Each user adds their own Anthropic API key in Settings
- Key is AES-256-GCM encrypted before storage (`user_api_keys` table)
- Never returned to the browser; decrypted server-side per request
- Dev environments can use `ANTHROPIC_API_KEY` env var as fallback
- Settings page shows connected/disconnected status without revealing the key
