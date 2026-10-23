# Lummora_DataSheet_Studio (full-stack)

Run (Node 18+, no npm install needed):
    API_KEY=yourSecret PORT=3000 node server.js
Open http://localhost:3000   (leave API_KEY empty for open local use)

What the backend does
- 26 datasheet templates served from /templates (base.json, extra.js) plus custom ones in data/db.json
- Saved datasheets with permanent numbers DS-000001... (never reused), revisions, status Draft > Review > Approved
- Editing an Approved sheet creates the next revision; the old one becomes Superseded (read-only). Delete is blocked.
- Audit log of every action (GET /api/audit), atomic save to data/db.json
- Writes need header x-api-key when API_KEY is set. The page asks for the key once.

API
GET /api/templates | POST /api/templates (add a template, JSON same shape as templates/extra.js)
GET/POST /api/sheets | GET/PUT /api/sheets/:id | GET /api/audit

Add a template: POST its JSON to /api/templates, or add it to templates/extra.js and restart.
Backup: copy data/db.json. Restore: put it back and restart.
Calculated values are checks on entered data and do not replace vendor design calculations or engineer approval.
