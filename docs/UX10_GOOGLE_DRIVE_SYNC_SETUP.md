# UX-10 — Google Drive meeting photo gallery: operations and acceptance

## What already works (10 Nov 2026)
- Meetings still belong to the private Supabase Meeting project.
- The administrator-only photo chooser uses `public.meeting_photo_catalog` to show a 2-column mobile photo gallery from verified Drive metadata. The 10 JPEG files in `ภาพประกอบการประชุม_10-11-2569` are seeded into that catalog.
- A chosen image is saved only after the editor presses **บันทึก**, using existing audited `r2_set_meeting_cover`.
- No photos, image bytes, credentials, or public thumbnails are stored in GitHub, Supabase Storage, or the database.
- Google Drive controls whether a particular viewer can display the thumbnail. A permission failure falls back to filename and an original Drive link, without changing sharing.

## Enabling “ดึงภาพใหม่จาก Drive”
The `meeting-photo-sync` Edge Function is deployed with JWT enforcement, but requires a **Google service-account credential** to make an authenticated list request to the private Google Drive folder.

1. In a school-controlled Google Cloud project, enable the Google Drive API and create a service account with a JSON credential. Keep the private key out of GitHub, public code, chat and spreadsheets.
2. Share only the appropriate Google Drive photo folder with that **service account email** as Viewer. Do not enable "Anyone with the link".
3. In Supabase Dashboard, open project `zprxvpfkvforoxrboqiv` → Edge Functions → Secrets. Create `GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON` containing the complete service-account JSON as a secret. This installation is **not performed** by the chat and cannot be assumed complete.
4. Log in to the hub as an authorized meeting administrator/editor. Open the meeting → **เลือกภาพปกจาก Google Drive** → **ดึงภาพใหม่จาก Drive**.
5. The server verifies the user's JWT, workspace membership, meeting SELECT visibility, and administrator/editor privilege, and then reads only the configured `photo_drive_folder_id` via the Google Drive API. The backend keeps only file ID, filename, MIME type and sync time (maximum 500 images). A folder the service account cannot read will return a permission error.
6. If automatic sync is not set up, the existing catalog still offers the reviewed 10 files. The UI reports that automatic sync is unavailable rather than falsely claiming the images were refreshed.

A new meeting can configure its image folder in the photo dialog using the expandable **เปลี่ยนโฟลเดอร์ภาพการประชุม** control. The save action uses an editor-only, audited RPC. If the folder changes, the administrator should sync again and ensure only intended images are offered.

## Security boundaries
- `meeting_photo_catalog` has RLS; SELECT uses `private.can_view_meeting(meeting_id)`. Anonymous read and browser writes are denied.
- Sync is restricted to authenticated administrators or editors for the selected meeting; no wildcard Drive listing, public image proxy, or browser-exposed service credential.
- Google Drive file MIME types are filtered to JPEG, PNG, WEBP and GIF before catalog insert. Browser-side preview remains best-effort for private images.
- The server does not change Drive sharing and cannot guarantee thumbnails for viewers without Drive permission.
- Preserve meeting draft/ratification gates, task history, evidence access and existing Supabase Free-usage guardrails.

## Manual tests still required
- In-app iPhone browser: 2-column gallery visible, select photo, preview selected, save and view cover.
- Private photo: unauthorized Drive account sees fallback rather than an exposed image.
- Test active staff member not invited to meeting: cannot query meeting photo catalog.
- Test meeting attendee without editor privilege: cannot refresh or change photo folder.
- Confirm Edge Function says "not configured" when secret is absent, and that configuring it then adding a new JPEG to Drive makes it appear after refresh.
- Confirm photos added to another, unconfigured folder never appear in this meeting.
