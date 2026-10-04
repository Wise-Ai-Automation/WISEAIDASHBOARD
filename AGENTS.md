## Project rules

- All data access goes through `src/lib/api.ts` — the single swappable boundary between UI and backend (Supabase auth + server functions + live Retell), so the backend can change without touching components.
- Real auth is Supabase: `src/lib/api.ts` calls Supabase directly for sign-in/password flows, and role/assignment-aware server functions in `src/lib/secure.functions.ts` and `src/lib/admin.functions.ts` (admin-only fns verify `user_roles` server-side; subaccount filtering is re-derived server-side, never trusted from the browser).
- Retell access stays server-side only in `src/lib/retell.functions.ts` (`RETELL_API_KEY` secret); no call data is persisted — only profiles, roles, and agent assignments live in the database.
- Global date range and agent filters live in `src/lib/filters-context.tsx` and persist to localStorage, so Overview, Calls and Analytics always agree.
- Auth state and the effective `allowedAgentIds` come from `src/lib/auth-context.tsx`; components never compute access themselves.
- Charts and KPI aggregation live in `src/lib/analytics.ts`, kept pure so they can be unit tested and reused across pages.

- Campaign launches live in `src/lib/campaigns.functions.ts`; the server re-checks the agent and caller number against the user's assignments before calling Retell's batch-call API, so the browser can't reach agents or numbers it wasn't given.
- Pricing and Retell costs are strictly hidden from subaccounts across all pages, tables, detail drawers, CSV exports, and server API responses; Retell costs, billing rates, revenue, profit, and workspace limits remain admin-only.

- Theme is applied before paint in the root head, with the persisted light/dark preference controlled by ThemeToggle; this avoids a flash and keeps all pages consistent.
