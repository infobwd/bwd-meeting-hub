# R1 QA & acceptance checklist
Date: 2026-11-10 | Target: browser-local prototype

## Functional
- [ ] เปิดบนหน้าจอคอมพิวเตอร์และมือถือ 360px/390px/768px; ไม่มีแนวนอนล้น
- [ ] หน้าแรกแสดงสถานะทดลองและคำเตือนว่าข้อมูลเก็บเฉพาะเครื่อง
- [ ] เปิดร่างประชุมเริ่มต้นและเห็น 4 หัวข้อ โดยไม่มีมติ/ผู้รับผิดชอบเทียม
- [ ] สร้างการประชุมครูใหม่ เพิ่มวาระที่ 4 และบันทึกข้อสรุปแบบร่าง
- [ ] เพิ่มภารกิจจากวาระและบันทึกสถานะได้
- [ ] กรองรายการภารกิจและค้นหาการประชุม
- [ ] รีโหลดหน้าเว็บ ข้อมูลในเครื่องยังอยู่
- [ ] ส่งออก JSON แล้วนำเข้ากลับได้เมื่อยืนยัน
- [ ] ไฟล์นำเข้าผิดรูปแบบหรือขนาดเกินจำกัดถูกปฏิเสธ
- [ ] ทดสอบข้อความ special characters เพื่อยืนยันว่าไม่แสดงเป็น HTML/สคริปต์
- [ ] ใช้ keyboard เปิดเมนู/ฟอร์มและปิด dialog ได้

## Correctness and privacy
- [ ] ไม่มีการสร้างมติรับรองในต้นแบบ
- [ ] สถานะส่งให้ตรวจไม่แสดงว่าผู้บริหารตรวจรับแล้ว
- [ ] ไม่มีข้อมูลคนจริง เบอร์โทรหรือไฟล์แนบภายในใน repo
- [ ] ไม่แสดงว่าแจ้งเตือนแล้ว เนื่องจากไม่มี backend
- [ ] วันที่ 17–20 เดือน/ปียังรอยืนยัน และไม่สร้าง deadline เอง
- [ ] ความปลอดภัยและระบบสิทธิ์ยังจัดเป็น BLOCKER ก่อน real usage

## R2 blocking risks
- Authentication and authorization across meeting-scoped roles
- Multi-user sync and conflict resolution
- Audit trail and official minutes approval
- Private attachment access with revocation
- Backend notification engine and recipient opt-in
- Data policy and trusted backup/export

## Manual acceptance record
Tester: __________ | Device/browser: __________
Date: __________ | Result: PASS / FAIL | Notes: __________
