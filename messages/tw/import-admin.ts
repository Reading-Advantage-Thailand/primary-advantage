export default {
  targetSchool: "目標學校",
  selectSchoolPlaceholder: "選擇學校",
  selectSchoolFirst: "請在上傳前選擇目標學校",
  targetSchoolHint: "資料將匯入到所選學校下",
  conflict: {
    title: "解決教室名稱衝突",
    description:
      "您的檔案中有 {count, plural, one {# 個教室名稱} other {# 個教室名稱}} 已存在於您的學校中。請為每個衝突選擇處理方式。",
    applyToAllLabel: "全部套用：",
    applyToAllExisting: "全部使用現有教室",
    applyToAllNew: "全部新建教室",
    useExisting: "使用現有教室",
    createNew: "新建（附後綴）",
    createNewHint: '將以後綴形式建立，例如 "{name} (2)"',
    cancel: "取消",
    confirm: "確認並匯入",
    allMustChoose: "請為每個教室選擇一個選項。",
  },
  result: {
    suffixedCreated: '已從您的 "{originalName}" 列建立 "{newName}"',
  },
} as const;
