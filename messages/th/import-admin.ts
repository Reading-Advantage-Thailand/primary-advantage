export default {
  targetSchool: "โรงเรียนเป้าหมาย",
  selectSchoolPlaceholder: "เลือกโรงเรียน",
  selectSchoolFirst: "กรุณาเลือกโรงเรียนเป้าหมายก่อนอัปโหลด",
  targetSchoolHint: "ข้อมูลจะถูกนำเข้าภายใต้โรงเรียนที่เลือก",
  conflict: {
    title: "แก้ไขข้อขัดแย้งของห้องเรียน",
    description:
      "{count, plural, one {# ชื่อห้องเรียน} other {# ชื่อห้องเรียน}} ในไฟล์ของคุณมีอยู่แล้วในโรงเรียนของคุณ กรุณาเลือกวิธีดำเนินการสำหรับแต่ละรายการ",
    applyToAllLabel: "ใช้กับทั้งหมด:",
    applyToAllExisting: "ใช้ที่มีอยู่สำหรับทั้งหมด",
    applyToAllNew: "สร้างใหม่สำหรับทั้งหมด",
    useExisting: "ใช้ห้องเรียนที่มีอยู่",
    createNew: "สร้างใหม่ (พร้อมส่วนต่อท้าย)",
    createNewHint: 'จะสร้างด้วยส่วนต่อท้าย เช่น "{name} (2)"',
    cancel: "ยกเลิก",
    confirm: "ยืนยันและนำเข้า",
    allMustChoose: "กรุณาเลือกตัวเลือกสำหรับทุกห้องเรียน",
  },
  result: {
    suffixedCreated: 'สร้าง "{newName}" จากแถว "{originalName}" ของคุณ',
  },
} as const;
