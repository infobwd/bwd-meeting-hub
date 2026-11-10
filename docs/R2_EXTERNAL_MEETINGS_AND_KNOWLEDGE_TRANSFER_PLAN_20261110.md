# BWD Meeting Hub — External Meetings & Knowledge-to-Action Plan
Version: Planning 1.0 | Date: 2026-11-10 | **Plan only — not implemented**

Related: [Master Plan](MASTER_PLAN.md) · [Official Agenda & Minutes Standard](R2_OFFICIAL_AGENDA_MINUTES_STANDARD_PLAN_20261110.md)

## 1. Intent
เพิ่มการรองรับเมื่อ **ผู้อำนวยการ/ครูโรงเรียนบ้านวังด้งไปร่วมประชุมที่หน่วยงานอื่นจัด** เช่น สพป.กาญจนบุรี เขต 4, กลุ่มเครือข่ายหนองกุ่ม หรือโรงเรียนอื่น และกรณีโรงเรียนร่วมเป็นเจ้าภาพ; ให้เก็บแหล่งที่มาและแปลงเฉพาะเรื่องที่ยืนยันแล้วเป็นวาระประชุม/งานของโรงเรียนได้ โดยไม่ต้องสร้างงานซ้ำ.

แกนงาน: `รับหนังสือเชิญ → บันทึกการเข้าร่วม → บันทึกสาระสำคัญ/ข้อสั่งการ → ตรวจทาน → แจ้งภายใน/เสนอวาระ → มอบหมายและติดตาม → เก็บหลักฐาน`.

## 2. Three meeting modes (one meeting model; different workflows)
| Mode | ชื่อสำหรับผู้ใช้ | เจ้าภาพ | เจ้าของเอกสาร/ผลลัพธ์ในระบบ |
|---|---|---|---|
| `school_hosted` | โรงเรียนจัดประชุม | โรงเรียนบ้านวังด้ง | วาระ รายงานการประชุมทางการ มติรับรอง และภารกิจ |
| `externally_hosted` | ไปร่วมประชุมภายนอก | เขตพื้นที่/กลุ่มเครือข่าย/โรงเรียนอื่น/หน่วยงานอื่น | **รายงานผลการเข้าร่วมประชุม** ของบุคลากร + สำเนาเอกสารเจ้าภาพที่ได้รับอนุญาต; ไม่แอบอ้างว่าเป็นรายงานการประชุมฉบับรับรองของเจ้าภาพ |
| `co_hosted` | ร่วมจัดประชุม | เจ้าภาพหลักและหน่วยงานร่วม | บทบาท/ขอบเขตการรับผิดชอบ, มติและรายงานของเจ้าภาพที่กำหนด, งานของโรงเรียน |

ห้ามอนุมานว่าหน่วยงานเจ้าภาพภายนอกอนุมัติข้อมูลหรือรับรองมติในระบบ BWD. บันทึกว่า "ข้อมูลจากการเข้าร่วม/รอตรวจเอกสารเจ้าภาพ" จนมีหลักฐาน.

## 3. UX — create & record
หน้าสร้างรายการให้เลือกโหมดก่อน; เฉพาะช่องที่เกี่ยวข้องเท่านั้น. มือถือใช้คำง่าย ๆ, เลือกบุคลากรได้หลายคน, มีบันทึกร่างและส่งตรวจ; เน้นหนึ่งการประชุมหนึ่งเหตุการณ์ แม้ครูหลายคนไปประชุมเดียวกัน.

### 3.1 Common fields
- ชื่อ/หัวข้อประชุม, วันเวลาเริ่ม–เลิก (ถ้ายังไม่ทราบเก็บเป็น unknown ไม่แต่งเวลา), สถานที่/ออนไลน์, หมายเลขหนังสือเชิญถ้ามี
- ผู้จัดประชุม/หน่วยงานเจ้าภาพ (รหัสหรือชื่อแสดงผลที่ยืนยัน), ประเภทหน่วยงาน (สพป./กลุ่มเครือข่าย/โรงเรียนอื่น/อื่น ๆ), ผู้ติดต่อเฉพาะที่จำเป็น
- ความเกี่ยวข้องกับโรงเรียน, บทบาทการประชุม (ผู้เข้าร่วม/กรรมการ/ผู้แทน/ผู้ประสานงาน/เจ้าภาพร่วม), แหล่งเอกสาร
- เอกสาร: หนังสือเชิญ, กำหนดการ/ระเบียบวาระ, รูปหรือบันทึกส่วนบุคคล, เอกสารประกอบ, รายงานทางการของเจ้าภาพ (เมื่อได้รับ), หลักฐานดำเนินงาน; ทุกไฟล์มีประเภท/ที่มา/วันที่รับ/สิทธิ์
- ผู้เข้าร่วมหลายคนในหนึ่ง meeting, attendance status รายคน, บันทึกเพิ่มเติมรายคนและสรุปรวมที่มีผู้ตรวจทาน; ห้ามสร้าง meeting ซ้ำเมื่อเพิ่มผู้เข้าร่วม

### 3.2 External attendance report (NOT host's official minutes)
โครงเอกสารแนะนำ: ผู้รายงานและตำแหน่ง → ประชุมเรื่อง/จัดโดยใคร/เมื่อใด/ณ ที่ใด → วัตถุประสงค์ → สาระสำคัญที่ได้รับทราบ → ข้อสั่งการ/กำหนดการสำคัญจากแหล่งที่ระบุ → เรื่องที่เกี่ยวข้องกับโรงเรียน → ข้อเสนอเพื่อดำเนินการ → เอกสารประกอบ → ชื่อผู้รายงานและผู้รับทราบ/ตรวจทาน. รองรับการส่งออกเป็น **บันทึกข้อความรายงานผลการเข้าร่วมประชุม** ที่ตรวจรูปแบบงานสารบรรณแล้ว.

รายงานผลเข้าร่วม ≠ รายงานการประชุมเจ้าภาพที่รับรองแล้ว. ไม่สร้างมติของโรงเรียนจากบันทึกผลภายนอกโดยอัตโนมัติ.

### 3.3 Shared meeting with several staff
- ผอ./ครูหลายคนสามารถรายงานคนละประเด็นในรายการประชุมเดียว
- สรุปกลางรวมประเด็นซ้ำและอ้างอิงผู้รายงานได้, หากข้อเท็จจริงขัดแย้งให้ทำเครื่องหมาย `needs_review`
- ข้อมูลจากภาพ/PDF/เสียงหรือ AI จัดเป็น `draft_unverified` จนมนุษย์ตรวจและยืนยัน ไม่ใช่คำสั่งที่บังคับใช้ทันที
- ไม่สร้าง/ส่งเชิญ user จากทะเบียน `private.staff_directory`; เลือกได้เฉพาะบัญชีสมาชิกที่ active และมีสิทธิ์ (ตามข้อจำกัด UX-11)

## 4. From external knowledge to internal agenda and tasks
แยกชนิดของประเด็นแต่ละข้อ:
1. `information` — เรื่องแจ้งเพื่อทราบ (เสนอเข้า agenda `เรื่องเสนอเพื่อทราบ` ครั้งถัดไปเมื่อเลือก)
2. `proposal` — เรื่องที่โรงเรียนต้องพิจารณา (เสนอเข้า agenda `เรื่องเสนอเพื่อพิจารณา`; **ยังไม่เป็นมติ**)
3. `action_requested` — ข้อสั่งการ/งานที่ต้องตรวจสอบความถูกต้องและอำนาจ ก่อนมอบหมายในโรงเรียน
4. `follow_up` — รอติดตามเอกสารเจ้าภาพ ผลสรุป หรือกำหนดการเพิ่มเติม
5. `no_action` — เก็บเป็นความรู้และค้นย้อนหลังได้

For each item เก็บ `source_meeting_id`, `source_report_id`, `source_document_ref`, `source_excerpt_or_location` (ถ้าได้รับอนุญาต), `verification_status`, `reviewer`, `proposed_target_meeting_id`, `linked_task_id` ที่มีอยู่แล้วหรือสร้างเมื่อได้รับอนุมัติ, `due_at` ที่มีหลักฐานเท่านั้น. ห้ามเดากำหนดส่งจากวันที่ประชุม; การเปลี่ยนผู้รับผิดชอบต้องผ่าน reviewer และ audit ตาม UX-11.

**No-duplicate rule:** เรื่องเดียวกันนำไปแจ้งประชุมครูหลายครั้ง/ปรากฏในเอกสารหลายฉบับ ต้องผูก `task_meeting_links` ที่มีอยู่แทนการสร้างภารกิจซ้ำ; ใช้ idempotency/link candidate + ตรวจชื่อแหล่งที่มา/งานเดิมก่อนสร้างใหม่. งานที่ผูกหลายการประชุมมีประวัติและสิทธิ์เดียวกัน ไม่เพิ่มการเข้าถึงนอกขอบเขต.

**Authority rule:** คำสั่งเขต/ข้อความสรุปของครูที่กลับมารายงาน และมติประชุมครู เป็นคนละแหล่งอำนาจและคนละ record type. หากเป็นเพียง "รับทราบ" อย่าแปลงเป็น "เห็นชอบ/อนุมัติ".

## 5. Proposed conceptual data contract — investigate first, no migrations yet
Reuse existing `meetings`, `meeting_attendees`, `agendas`, `minutes`, `decisions`, `tasks`, `task_meeting_links`, `document_references`, `audit_events` where possible; do not assume field names or live schema support these examples until inspecting migrations:
- `meetings.meeting_mode`, `host_organization_id/name`, `co_host_role` (nullable, backwards-compatible default school_hosted)
- `meeting_participations` or extension of `meeting_attendees`: one event to many internal users + their attendance/role
- `attendance_reports` (event, author, draft/reviewed, sections, timestamps, version; one/many contributors)
- `external_meeting_items` (source, category, review status, action/agenda/task links)
- `organizations` lookup optional and scoped; support free text not exposing unrelated tenant records
- Document refs must preserve Drive permissions; no file bytes in public pages or public fixtures
- No external meeting writes through generic admin-only paths that bypass ACL; require RLS and authorized audited RPC

State model suggested: external event `planned → attended → report_draft → report_submitted → reviewed → archived`; specific `cancelled` if attendance did not occur. **This is not a ratification state**. Author may retract submitted report for correction if not yet approved, preserving history; reviewers may request corrections. Keep current internal meeting states unchanged.

## 6. Permissions, privacy, quota
- ผู้บริหาร/ผู้ได้รับสิทธิ์จัดรายการและมอบหมาย; ผู้เข้าร่วมบันทึกเฉพาะกิจกรรมของตน; ผู้ตรวจทานดูตาม scope; บุคคลภายนอกไม่ได้สิทธิ์เห็นข้อมูลทั้งโรงเรียน
- Document visibility defaults private; original Google Drive permissions stay authoritative; only metadata shared as allowed and authenticated file access checked, no public direct download URL
- มี audit trail กับการสร้าง/แก้/ถอนส่งตรวจ/รับรอง, ตรวจไม่มีสิทธิ์ข้ามบทบาท/ข้ามการประชุม
- ไม่ใช้ `private.staff_directory` เป็น Auth/รายชื่อเชิญหรือปลดล็อกสิทธิ์เอง; ไม่ส่ง email/LINE, ไม่สร้าง user และไม่แก้สถานะงานจริงในขั้นวางแผน
- Supabase Free: เลี่ยงการเก็บไฟล์ซ้ำ, เก็บเพียง Drive IDs/metadata เมื่อเหมาะสม, ออกแบบ pagination, retention + backup/restore, monitor quotas ตาม guardrails เดิม

## 7. Roadmap & acceptance gates
| Slice | Deliverable | Acceptance |
|---|---|---|
| **EXT-00 (NEXT)** | ตรวจ schema/RPC/RLS/UI ปัจจุบัน; field contract, threat model, role/action matrix, terminology, screen flow | ไม่ละเมิด UX-11; รายการ 10 พ.ย. และ 13 วาระเดิมไม่เปลี่ยน; documented migration plan + rollback |
| **EXT-01** | Non-breaking migrations/RPC สำหรับ mode/host/participants/report; mock seed (synthetic only) | legacy read/write still works; RLS deny unauthorized access; no invitations |
| **EXT-02** | UI สร้าง/ดู/แก้ รายการภายนอก เลือกผู้ร่วมประชุมหลายคน แนบเอกสาร ส่ง/ถอนส่งรายงาน | มือถือ/คีย์บอร์ด, conflict/version checks, owner/reviewer states, auth matrix |
| **EXT-03** | เปลี่ยนรายการสรุปที่ตรวจแล้วเป็นวาระหรือเชื่อมภารกิจเดิม; dedupe and provenance | ไม่มีงานซ้ำ, ไม่กลายเป็นมติเอง, ตรวจย้อนต้นทางและ rollback link ได้ |
| **EXT-04** | พรีวิวและส่งออกบันทึกข้อความรายงานผลการประชุม PDF และ (ภายหลัง) Google Docs | แยกจาก host minutes, ตรวจรูปแบบงานสารบรรณ, URL/Drive privacy intact |
| **EXT-05** | QA คนละบัญชีและมือถือจริง, backup/restore, quota and permissions | iPhone/Android, RLS negative cases, no public data, authorized school sign-off |

### Initial realistic scenarios for tests
- ผอ. ไปประชุมที่ สพป.กาญจนบุรี เขต 4 แล้วเสนอหนึ่งเรื่องแจ้งครู + หนึ่งเรื่องให้ดำเนินการ (ใช้ข้อมูลสมมติ)
- ครู 2 คนไปร่วมประชุมกลุ่มเครือข่ายหนองกุ่มครั้งเดียวกัน แล้วส่งรายงานทั้งสองคนโดยไม่สร้างรายการประชุมซ้ำ
- โรงเรียนเป็นเจ้าภาพร่วมในการประชุมกลุ่ม, แต่บุคคลภายนอกเข้าถึงเฉพาะเอกสารที่อนุญาต
- หนังสือเชิญยังไม่ใช่การอนุญาตไปราชการ / หลักฐานเบิกค่าใช้จ่าย; เก็บเอกสารอ้างอิงแยก ไม่อนุมัติแทนผู้มีอำนาจ
- รายงานมาจาก AI transcribe / ภาพ → ยังเป็นร่าง ต้องมีผู้ตรวจทานและห้าม assign tasks อัตโนมัติ
- User staff roster only 10 private pre-invite people → cannot select as active assignees until invited and authorized

## 8. Scope of current commit
- [x] วิเคราะห์และบันทึกแผนเพิ่มโหมดภายนอกใน docs
- [x] เชื่อมความเกี่ยวข้องกับแม่แบบเอกสารราชการและ Master Plan
- [ ] EXT-00 source/contract audit and design acceptance
- [ ] EXT-01 ถึง EXT-05 implementation/QA/sign-off

**No UI, migrations, Supabase data, staff invitations, Drive sharing, real notifications, approvals or meeting decisions modified by this documentation-only change.**
