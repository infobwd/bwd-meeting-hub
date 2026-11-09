# R1 data contract — Demo only
This schema describes browser-local test data; it is **not** a production API.

Stored as \`bwd-meeting-hub-demo-v1\` localStorage object:
- version: 1
- meetings[]: \`{id,title,type,date,location,status,agendas:[{id,section,title,notes,decision,decisionStatus}]}\`
- tasks[]: \`{id,title,meetingId,agendaId,assignee,dueDate,status,notes,updatedAt}\`

Dates use ISO YYYY-MM-DD or empty string; no inferred date. Ids are opaque, generated in browser. Texts treated as plain text and rendered with textContent to prevent HTML injection. The app does not store official identities and does not prove who edited data. JSON exported from demo may contain entered text; store safely, never commit to public GitHub.

For R2 migration, normalized DB tables, per-meeting ACL, audit records, decision ratification and approval controls must replace client-side trust.
