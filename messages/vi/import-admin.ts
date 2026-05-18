export default {
  targetSchool: "Trường đích",
  selectSchoolPlaceholder: "Chọn trường",
  selectSchoolFirst: "Vui lòng chọn trường đích trước khi tải lên",
  targetSchoolHint: "Dữ liệu sẽ được nhập vào trường đã chọn",
  conflict: {
    title: "Giải quyết xung đột lớp học",
    description:
      "{count, plural, one {# tên lớp học} other {# tên lớp học}} trong tệp của bạn đã tồn tại trong trường của bạn. Hãy chọn cách xử lý cho từng lớp.",
    applyToAllLabel: "Áp dụng cho tất cả:",
    applyToAllExisting: "Dùng lớp hiện có cho tất cả",
    applyToAllNew: "Tạo mới cho tất cả",
    useExisting: "Dùng lớp học hiện có",
    createNew: "Tạo mới (với hậu tố)",
    createNewHint: 'Sẽ được tạo với hậu tố như "{name} (2)"',
    cancel: "Hủy",
    confirm: "Xác nhận và nhập",
    allMustChoose: "Vui lòng chọn một tùy chọn cho mỗi lớp học.",
  },
  result: {
    suffixedCreated: 'Đã tạo "{newName}" từ hàng "{originalName}" của bạn',
  },
} as const;
