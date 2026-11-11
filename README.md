# Nuxt Minimal Starter

## Gemini suggestions

Set `NUXT_GEMINI_API_KEY` in your local `.env` (see `.env.example`), then restart the dev server. Production hosting must provide the same environment variable. The key is private Nuxt runtime configuration and is never included in browser configuration.

`NUXT_GEMINI_MODEL` optionally overrides the default `gemini-3.8-flash` model.

Uploading a CSV still parses it locally. **Get Suggestions** sends the prepared headers, sample rows, numeric candidates, data quality, and potential statistics to `POST /api/suggestions`. The server calls Gemini using `@google/genai` with structured JSON output, then validates column and statistic references before returning the result. Requests are limited to a 256 KB prepared payload, 200 columns, and 10 sample rows.

Edit the instruction in `server/prompts/suggestions.ts`. Shared payload and recommendation contracts live in `shared/utils/suggestions.ts`. Users can change the proposed entity column, metric, direction, and statistics before confirming. Changing the metric clears the previous statistic choices. Confirmation is local to the current upload; it does not publish or generate an article.

## Article generation and publishing

The confirmed upload is sent to `POST /api/articles/generate`. The server recalculates all candidates, selected statistics and ranking values before preparing a compact Gemini context. Gemini returns editorial fields only, and the validated response is combined with deterministic data into an unsaved article preview. This generation step does not require Supabase.

After reading the preview, the user explicitly confirms publication. `POST /api/articles/publish` revalidates and rebuilds the article, then saves it through the transactional `publish_article` database function. If Supabase is unavailable, the preview remains readable and nothing is partially saved.

Configure `NUXT_SUPABASE_URL` and `NUXT_SUPABASE_SECRET_KEY` as private server variables, then apply [the Supabase migration](supabase/migrations/20261111160000_article_publishing.sql). It creates the generic dataset, article and section tables and the atomic publishing RPC. The secret key must remain server-only.

Set `NUXT_PUBLIC_SITE_URL` to the production origin, for example `https://example.com`. Canonical links, Open Graph URLs, JSON-LD, `robots.txt`, and the dynamic sitemap use this value. When it is omitted locally, the application falls back to the current request origin.

The final generation contract and assembler live in `shared/utils/articleGeneration.ts`, the instruction is in `server/prompts/articleGeneration.ts`, and database access is isolated in `server/utils/articleRepository.ts`. Published `/blog/:slug` pages load the stored article and dataset during SSR, then rebuild ranking metrics and rows with the existing parser and statistics logic.

Run `npm test`, `npx nuxt typecheck`, and `npm run build` to verify changes. Tests use synthetic data and make no Gemini calls.

Look at the [Nuxt documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

## Setup

Make sure to install dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

## Production

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.
