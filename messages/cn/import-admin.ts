export default {
  targetSchool: "目标学校",
  selectSchoolPlaceholder: "选择学校",
  selectSchoolFirst: "请在上传前选择目标学校",
  targetSchoolHint: "数据将导入到所选学校下",
  conflict: {
    title: "解决教室名称冲突",
    description:
      "您的文件中有 {count, plural, one {# 个教室名称} other {# 个教室名称}} 已存在于您的学校中。请为每个冲突选择处理方式。",
    applyToAllLabel: "全部应用：",
    applyToAllExisting: "全部使用现有教室",
    applyToAllNew: "全部新建教室",
    useExisting: "使用现有教室",
    createNew: "新建（带后缀）",
    createNewHint: '将以后缀形式创建，例如 "{name} (2)"',
    cancel: "取消",
    confirm: "确认并导入",
    allMustChoose: "请为每个教室选择一个选项。",
  },
  result: {
    suffixedCreated: '已从您的 "{originalName}" 行创建 "{newName}"',
  },
} as const;
