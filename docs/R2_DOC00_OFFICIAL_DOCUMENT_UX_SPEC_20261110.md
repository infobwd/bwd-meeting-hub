# DOC-00 — Official Documents and Mobile-first Screen Design
Date: 2026-11-10 | Status: **Draft UX & document specification; school/secretary sign-off pending**  
Related: [Official documents plan](R2_OFFICIAL_AGENDA_MINUTES_STANDARD_PLAN_20261110.md) · [EXT-00 baseline](R2_EXT00_SOURCE_BASELINE_AND_CONTRACT_20261110.md)

## 1. Standards checked; no automatic legal approval
Reference for document fields: ระเบียบสำนักนายกรัฐมนตรีว่าด้วยงานสารบรรณ พ.ศ. 2526 และที่แก้ไขเพิ่มเติม, **ข้อ 25 / แบบที่ 11** (รายงานการประชุม) and **ข้อ 26** (บันทึกข้อความ): https://www3.ago.go.th/center/wp-content/uploads/2022/04/ระเบียบสำนักนายกรัฐมนตรีว่าด้วยงานสารบรรณ-พ.ศ.2526-และที่แก้ไขเพิ่มเติมจนถึงฉบับที่-4-พ.ศ.-2564.pdf

- 6-section agenda is a **suggested, editable starting template** for *new* school-hosted meetings, **not mandatory under the archival regulation**.
- Formal **minutes (แบบที่ 11)** belong to the responsible meeting secretary/host. For staff participating at a district/network event, create **รายงานผลการเข้าร่วมประชุม** and optionally an accompanying **บันทึกข้อความ**; never label it as the external host's ratified minutes.
- Each committee's authority to resolve/approve, quorum and how its minutes are ratified require individual confirmation with school secretariat/committee rules before production.
- An AI-derived draft is always marked unverified and requires accountable human inspection and approval. No simulated signatures or ratifications.

## 2. Information architecture (existing three-tab mobile shell retained)
Keep current Overview / Meetings / Tasks navigation and meeting cards. **Do not add a fourth fixed mobile tab.**

- Meetings list: add chips/filters `ทั้งหมด / โรงเรียนจัด / ไปร่วมภายนอก / ร่วมจัด`; one primary `＋ บันทึกการประชุม` action for authorized users.
- Create flow: `ขั้น 1 เลือกรูปแบบการประชุม` → context-specific fields → `บันทึกร่าง`.
- Meeting detail: shared header (title, date, organization, permission/status), then **mode-specific** body:
  - school-hosted: `วาระ | เอกสาร | รายงานการประชุม | ภารกิจ | ผู้เกี่ยวข้อง`
  - externally-hosted: `ข้อมูลการเข้าร่วม | หนังสือเชิญ/เอกสาร | รายงานผลการเข้าร่วม | เรื่องที่ต้องดำเนินการ | ผู้เข้าร่วม`
  - co-hosted: `เจ้าภาพและบทบาท | วาระ/เอกสาร | รายงานหรือผลประชุม | ภารกิจ | ผู้เข้าร่วม`; owner of official minutes must be explicit
- Use native disclosure (accordion) per section to avoid long phones. Current 44px touch targets, iOS input font >=16px, bottom-navigation safe area, keyboard-aware forms and safe retry preserved.
- No automatic notifications or invitations.

## 3. Low-fidelity phone wireframes (text-only design; no code/UI implementation)

### Screen A — choose mode
```text
┌────────────────────────────────────┐
│ ← สร้างรายการประชุม               │
│ ขั้นที่ 1 จาก 2                     │
│                                    │
│ รูปแบบการประชุม                    │
│ ◉ โรงเรียนจัดประชุม                │
│   วาระ + รายงานการประชุมทางการ     │
│ ○ ไปร่วมประชุมภายนอก               │
│   ครู/ผอ. รายงานผลจากเขต/เครือข่าย │
│ ○ โรงเรียนร่วมจัดประชุม            │
│   ระบุเจ้าภาพหลักและบทบาทโรงเรียน  │
│                                    │
│ [ ยกเลิก ]     [ ถัดไป → ]          │
└────────────────────────────────────┘
```

### Screen B — external event draft (no actual identity preloaded)
```text
┌────────────────────────────────────┐
│ ← รายงานการไปร่วมประชุม            │
│ ประเภท: ไปร่วมประชุมภายนอก         │
│                                    │
│ เรื่อง * [____________________]    │
│ ผู้จัด * [สพป./เครือข่าย/อื่น ๆ ▾] │
│ ชื่อหน่วยงาน [________________]    │
│ วันที่ [เลือกวัน] เวลา [ไม่ทราบ ▾]  │
│ สถานที่ / ออนไลน์ [___________]    │
│ ผู้เข้าร่วม [เลือกบัญชีที่มีสิทธิ์]  │
│ + เพิ่มผู้เข้าร่วม (รายการเดียว)   │
│ บทบาท [ผู้เข้าร่วม ▾]               │
│ เอกสารเชิญ [แนบไฟล์ที่มีสิทธิ์]     │
│                                    │
│ [บันทึกร่าง]   [บันทึกและเปิดต่อ]   │
└────────────────────────────────────┘
```

### Screen C — report & actions (external)
```text
┌────────────────────────────────────┐
│ ← ประชุมผู้บริหารที่เขต (ตัวอย่าง) │
│ [ร่างรายงาน] ผู้จัด: เขตพื้นที่    │
│                                    │
│ ▾ สาระสำคัญที่ได้รับทราบ           │
│   [พิมพ์ / แนบหลักฐาน]             │
│ ▾ ข้อสั่งการ/กำหนดส่งจากเจ้าภาพ   │
│   [ระบุแหล่งที่มา+ตรวจสอบ]         │
│ ▾ เรื่องที่เสนอแจ้งครู             │
│   [เสนอเข้าวาระ: เพื่อทราบ]        │
│ ▾ เรื่องที่ต้องดำเนินการ           │
│   [เชื่อมงานเดิม] [+ เสนอสร้างงาน] │
│ ▾ หลักฐาน / รายงานฉบับเจ้าภาพ     │
│                                    │
│ [บันทึกร่าง] [ส่งให้ตรวจทาน]       │
└────────────────────────────────────┘
```

### Screen D — school-hosted agenda & official minutes
```text
┌────────────────────────────────────┐
│ ← ประชุมครู โรงเรียนบ้านวังด้ง     │
│ [ฉบับร่าง] แม่แบบวาระ: 6 หมวด ▾    │
│                                    │
│ ▾ 1 ประธานแจ้งให้ทราบ             │
│ ▾ 2 รับรองรายงานครั้งก่อน         │
│ ▾ 3 เรื่องสืบเนื่อง                │
│ ▾ 4 เรื่องเสนอเพื่อทราบ            │
│ ▾ 5 เรื่องเสนอเพื่อพิจารณา         │
│ ▾ 6 เรื่องอื่น ๆ                   │
│ [เพิ่มเรื่องย่อย]                  │
│                                    │
│ [พรีวิววาระ A4] [บันทึกร่าง]       │
│ รายงานการประชุม → [แบบที่ 11]      │
└────────────────────────────────────┘
```

### Screen E — report lifecycle and status
```text
┌────────────────────────────────────┐
│ รายงานการประชุม — ฉบับร่าง         │
│ [พรีวิว A4] [บันทึก] [ส่งตรวจ]     │
│                                    │
│ ● เลขานุการจัดทำร่าง               │
│ ○ ผู้บริหารตรวจทาน                  │
│ ○ เสนอรับรองโดยคณะประชุม (ถ้ามี)   │
│ ○ จัดเก็บฉบับรับรอง                │
│                                    │
│ หมายเหตุ: ตรวจทาน ≠ รับรองโดยที่ประชุม │
└────────────────────────────────────┘
```

All screen contents are illustrative only and MUST NOT be seeded as real meeting records. Form validations, authorization, version conflict, empty/error/loading states are specified below.

## 4. UI field contract

| Screen / field group | Required on draft | Required before submit/review | Guardrails |
|---|---|---|---|
| Create: meeting mode | Yes | Yes | Explicit mode, do not infer from existing `kind` |
| Create: title, host | Title; host for external/co-hosted | Host verified | Organization other/free text allowed, no fake agency ID |
| Create: date, times, place | Optional date/time if unknown | Clarify unknowns; timestamps optional unless procedure demands | Never infer time from `scheduled_on` |
| External: participants | Author only until authorized roster available | Correct actual attendees and roles | ACL != attendance; multiple people one event; uninvited staff not selectable as active |
| External: report sections | Can draft partial | Essential context, factual summary, source/attachments, school impact, reporter | Human-check AI/attachments |
| External: action item | Optional | Verified source and classification before internal linkage | Proposal is not school resolution |
| School-hosted: agenda | Optional until prepared | Use committee template/version and ordered entries | 6-section only new template; 5-section old meeting remains unchanged |
| School-hosted: formal minutes | Draft partial | All 11 groups from แบบที่ 11, as applicable | Review vs ratification separated |
| Official export | Not while incomplete | Format preview + authorized sign-off | No claim of signed minutes from browser print |
| Attachments | Optional | Access-scoped metadata; verify rights | Do not turn Drive URL into public media |

### Current/target API behavior
- Current `r2_create_meeting` title/kind/date/location remains in place. UI "mode" cannot be persisted until **EXT-01 migration** and new scoped RPC.
- Current `minutes.body` stays untouched. Structured fields appear first in a **prototype**; persistence/export waits for **DOC-01 / DOC-03**.
- Current five sections shown for existing meetings. Preview "six sections" must be tagged *sample only* until contract is implemented.
- Current staff roster remains private/uninvited; do not invite to make screenshot demo appear populated.

## 5. Document templates (content models)

### A. ระเบียบวาระการประชุม — school-hosted
Header: `ระเบียบวาระการประชุม [ชื่อคณะ] โรงเรียนบ้านวังด้ง ครั้งที่ [ ]/[ปี] วันที่ [ ] เวลา [ ] ณ [ ]`. Suggested 6 optional/editable sections:
1. ประธานแจ้งให้ทราบ
2. รับรองรายงานการประชุมครั้งที่ผ่านมา
3. เรื่องสืบเนื่อง
4. เรื่องเสนอเพื่อทราบ
5. เรื่องเสนอเพื่อพิจารณา
6. เรื่องอื่น ๆ (ถ้ามี)

Each issue: `เลขวาระย่อย / ชื่อเรื่อง / ความเป็นมา / ข้อเท็จจริง / เอกสารประกอบ / ข้อเสนอ / สิ่งที่ต้องพิจารณา`. If the committee uses a different agenda structure, keep it; never auto-add a false resolution.

### B. รายงานการประชุม — แบบที่ 11
Required layout fields from Clause 25, with '(ถ้ามี)' where prescribed:
1. รายงานการประชุม (ชื่อคณะหรือชื่อประชุม)
2. ครั้งที่
3. เมื่อ (วันเดือนปี)
4. ณ (สถานที่)
5. ผู้มาประชุม (พร้อมสถานะผู้แทนเมื่อเกี่ยวข้อง)
6. ผู้ไม่มาประชุม (ถ้ามี พร้อมเหตุผลเมื่อมี)
7. ผู้เข้าร่วมประชุม (ถ้ามี แยกจากกรรมการ)
8. เริ่มประชุมเวลา
9. ข้อความบันทึกตามวาระ (สาระ/ความคิดเห็นสำคัญ/มติหรือข้อสรุปในแต่ละเรื่อง)
10. เลิกประชุมเวลา
11. ผู้จดรายงานการประชุม

UI may provide metadata additional to legal template: checked_by, check_at, ratification_meeting_id/date, version/snapshot, authoritative recorded action/decision and audit history. **Not part of mandated 11-field list.** Signatures and methods of ratification reviewed with school before release.

### C. รายงานผลการเข้าร่วมประชุม / บันทึกข้อความ
Fields: ผู้รายงาน/ตำแหน่ง/ผู้รับ, เรื่อง/หน่วยงานผู้จัด/วันเวลา/สถานที่, วัตถุประสงค์, สาระสำคัญ, ข้อสั่งการจากแหล่งที่มา (พร้อมระดับความเชื่อมั่น), ผลกระทบกับโรงเรียน, ข้อเสนอ/งานติดตาม, สิ่งที่ต้องนำเข้าวาระภายใน, ไฟล์แนบ, วันที่รายงานและผู้รับทราบ/ตรวจทาน.

Document title **not** `รายงานการประชุม [หน่วยงานภายนอก]` unless the school is explicitly assigned as the host's official minutes secretary and has appropriate authority.

## 6. Status/help/empty/error wording
- External: `ร่างรายงาน`, `ส่งให้ตรวจทาน`, `ผู้ตรวจขอแก้ไข`, `ตรวจทานแล้ว`, `จัดเก็บ`. Do not use `รับรองมติของเขต`.
- Internal: `ร่างรายงาน`, `รอตรวจทาน`, `ผู้บริหารตรวจทานแล้ว`, `รอให้ที่ประชุมรับรอง`, `รับรองแล้ว`, `จัดเก็บ`.
- No date: `ยังไม่กำหนดวันประชุม`; no participants: `ยังไม่ได้บันทึกผู้เข้าร่วมจริง`; no Drive access: `ไม่มีสิทธิ์ดูเอกสารนี้ กรุณาขอสิทธิ์จากเจ้าของไฟล์`.
- Avoid technical terms `RPC`, `RLS`, `UUID`, `state machine` on user-facing screens. Use error retry, not silent failures; show last saved state, pending change and safe withdraw reason when applicable.

## 7. A4 export design & accessibility acceptance
- A4 portrait, clear black-on-white; formal Thai font selected with school (e.g. TH Sarabun New, typical body 16pt), predictable margins, repeat header/page numbering on multi-page if appropriate; no browser-only `Tahoma` print as official model.
- Preview on phone: PDF.js reading controls/fit-width preserved; print layout should not depend on phone width. Google Docs output **not connected today**.
- 360/390px phones, 820px tablet, 1280px desktop: no horizontal overflow, 44px+ targets, Thai text wraps, keyboard navigation, screen-reader labels, system font zoom, status labels not color-only; long agenda/document and many participants tested.
- Report evidence and source attribution visible before converting to tasks; duplicate detection and owner/date confirmation mandatory.
- Review/ratification must log who/when/method. A reviewed report cannot be silently rewritten; use versioning/correction workflow.

## 8. DOC-00 school decision checklist (required before DOC-01)
- [ ] Confirm official agenda wording and which meeting types use 6 sections vs existing 5/other.
- [ ] Confirm meeting attendee list, replacement/absent reasons, quorum/committee authority and ratification process for each committee.
- [ ] Confirm official document header, letterhead/signature, fonts, dates and custody/retention rules.
- [ ] Confirm who can author vs review external attendance reports and whether one consolidated report is desired when staff attend together.
- [ ] Approve sample A4 previews from **fictional test data**, including multipage reports and no-personal-info fixtures.
- [ ] Confirm Google Drive attachments/scoped access, export approval and notification policy.
- [ ] Authorize non-breaking EXT-01/DOC-01 migration **only after** contract and multi-role/security testing plan approval.

## 9. Delivery status
- [x] Drafted mode-first information architecture, low-fidelity mobile screen designs, field contract and standardized document content models
- [x] Compared intended screens with current UI/runtime limitations
- [x] Recorded role/approval/print/accessibility acceptance criteria and responsible sign-off checklist
- [ ] School/secretary formal template sign-off; independent legal/committee procedure review
- [ ] Implemented UI, migrations, PDF/Docs generation, multi-user access tests and real-device acceptance

**This document is a design specification, not an implemented app screen, not a formal approved document template, and not authorization to issue or ratify minutes.**
