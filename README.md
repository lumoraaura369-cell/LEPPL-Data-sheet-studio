# Lummora_DataSheet_Studio — GitHub + Vercel + Supabase

1. Supabase: create a project > SQL Editor > run supabase/schema.sql
   Settings > API: copy the Project URL and the service_role key (keep it secret, server only).
2. GitHub: push this folder (.env and data/ are in .gitignore).
3. Vercel: Import the repo (no build command, output folder = public is picked from vercel.json / default).
   Environment Variables: SUPABASE_URL, SUPABASE_SERVICE_KEY, APP_KEY (a long random team key). Deploy.
4. Open the site. The first Save asks for the APP_KEY (stored in that browser only).

Local test without Supabase: node server.js  (file storage in data/db.json, set API_KEY to protect writes)

Notes
- The service_role key and APP_KEY live only in Vercel env vars. RLS is enabled with no policies, so the public anon key cannot read tables.
- All sheet and audit endpoints need the APP_KEY. One shared key is fine for a small trusted team; for per-user login add Supabase Auth later.
- Sheet numbers DS-000001... come from a database sequence (never reused). Editing an Approved sheet creates the next revision in one transaction.
- Backup: Supabase > Database > Backups, or export the sheets / audit tables.
- Calculated values are checks on entered data and do not replace vendor design calculations or engineer approval.

## Views
Dashboard (KPIs, charts, check status), Library (45 templates, search), Datasheet (form + printable sheet, CSV and Excel export),
Compare (field-by-field revision diff), Cross-check (same parameter, different values across datasheets of one service or tag).
