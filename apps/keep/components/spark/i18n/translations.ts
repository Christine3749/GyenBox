export type Language = "zh" | "en";

export interface Translations {
  // App Header
  appName: string;
  appBadge: string;
  appTagline: string;
  searchPlaceholderSemantic: string;
  searchPlaceholderExact: string;
  semanticSearchBtn: string;
  keywordSearchBtn: string;
  semanticSearchTooltip: string;
  todayCleanupBtn: string;
  todayCleanupTooltip: string;
  viewModeListTooltip: string;
  viewModeGridTooltip: string;
  darkModeLightTooltip: string;
  darkModeDarkTooltip: string;
  languageToggleTooltip: string;

  // Sidebar
  navAllNotes: string;
  navReminders: string;
  navLabelsHeading: string;
  navManageLabelsTooltip: string;
  navNewManageLabels: string;
  navArchive: string;
  navTrash: string;
  aiInsightTitle: string;
  aiInsightText: string;
  aiInsightLink: string;

  // Quick Create Bar
  quickCreatePlaceholder: string;
  quickVoiceBtn: string;
  quickOcrBtn: string;
  noteTitlePlaceholder: string;
  noteContentPlaceholder: string;
  addChecklistItemPlaceholder: string;
  typeChecklist: string;
  typeText: string;
  setReminderBtn: string;
  reminderSetBtn: string;
  reminderDateLabel: string;
  reminderLocationLabel: string;
  locationPlaceholder: string;
  colorPickerTitle: string;
  addTagTitle: string;
  attachImageBtn: string;
  cancelBtn: string;
  saveBtn: string;
  quickInputPlaceholder: string;
  quickChecklistTooltip: string;
  quickVoiceTooltip: string;
  quickOcrTooltip: string;
  labelsLabel: string;
  saveNoteBtn: string;

  // Note Grid
  pinnedSectionTitle: string;
  otherSectionTitle: string;
  emptyStateTitle: string;
  emptyStateSearchText: string;
  emptyStateDefaultText: string;
  noNotesHere: string;
  noNotesSearchMatch: string;
  noNotesInstruction: string;
  pinnedSectionHeader: string;
  otherNotesSectionHeader: string;

  // Note Card
  pinTooltip: string;
  unpinTooltip: string;
  archiveTooltip: string;
  unarchiveTooltip: string;
  trashTooltip: string;
  restoreTooltip: string;
  deletePermanentlyTooltip: string;
  remindBadgePrefix: string;
  whyMatchBadgePrefix: string;
  relatedBadgePrefix: string;
  imageAlt: string;
  untitledNote: string;
  noContentText: string;
  moreItemsNotShown: string;
  relatedNotesCount: string;
  collaboratorTooltip: string;
  restoreBtn: string;
  deleteForeverTooltip: string;
  deleteForeverBtn: string;

  // Note Editor Modal
  noteDetailsHeader: string;
  checklistNoteHeader: string;
  aiAnalyzing: string;
  addBtn: string;
  setReminderPanelTitle: string;
  selectedTagsHeading: string;
  aiSuggestedTagsHeading: string;
  aiRelatedNotesTitle: string;
  relatedReasonPrefix: string;
  insertLinkBtn: string;
  aiReanalyzeBtn: string;
  saveAndDoneBtn: string;
  noteDetailTitle: string;
  noteChecklistDetailTitle: string;
  editorTitlePlaceholder: string;
  editorContentPlaceholder: string;
  reminderTimeAndLocationHeading: string;
  reminderTimeLabel: string;
  reminderLocationPlaceholder: string;
  selectedLabelsLabel: string;
  aiSuggestedTagsLabel: string;
  aiRelatedNotesCount: string;
  insertLinkTooltip: string;
  setReminderTooltip: string;
  reminderUnsetBtn: string;
  switchToList: string;
  switchToText: string;
  reAnalyzeTooltip: string;
  reAnalyzeBtn: string;
  doneAndSaveBtn: string;

  // AI Overview Banner
  aiOverviewTitle: string;
  aiOverviewHeader: string;
  aiAnalyzingSummaryDefault: string;
  analyzingText: string;
  analyzingState: string;
  aiOverviewDefaultSummary: string;
  collapsePanelTooltip: string;
  expandPanelTooltip: string;
  collapsePanel: string;
  expandDetails: string;
  dueTodayTitle: string;
  dueTodayHeading: string;
  dueTodayCountBadge: string;
  itemsUnit: string;
  allDayText: string;
  allDay: string;
  noDueTodayText: string;
  noDueToday: string;
  duplicateMergeTitle: string;
  duplicateMergeHeading: string;
  duplicateMergeCountBadge: string;
  groupsUnit: string;
  previewMergeBtn: string;
  noDuplicatesText: string;
  noDuplicates: string;
  staleNotesTitle: string;
  staleNotesHeading: string;
  staleNotesCountBadge: string;
  staleDetectedText: string;
  staleNotesDetectedText: string;
  batchArchiveBtn: string;
  batchArchiveStaleBtn: string;
  noStaleText: string;
  notebookClean: string;

  // Merge Modal
  mergeModalTitle: string;
  mergeModalHeader: string;
  mergeReasonPrefix: string;
  noteAOriginal: string;
  noteBOriginal: string;
  aiProposedMergeResult: string;
  proposedMergedResultLabel: string;
  mergedTitleLabel: string;
  mergedContentLabel: string;
  mergeFooterNotice: string;
  confirmMergeBtn: string;

  // Voice Modal
  voiceModalTitle: string;
  voiceModalHeader: string;
  voiceModalSubtitle: string;
  voiceModalSubheader: string;
  voiceInputLabel: string;
  voiceTextLabel: string;
  changeSampleSpeechBtn: string;
  trySampleVoiceBtn: string;
  voiceTextareaPlaceholder: string;
  voiceInputPlaceholder: string;
  geminiSmartOrganizeBtn: string;
  geminiExtractingState: string;
  voiceExtractingState: string;
  voiceProcessBtn: string;
  aiResultPreviewHeader: string;
  voiceResultPreviewTitle: string;
  confirmCreateNoteBtn: string;

  // OCR Modal
  ocrModalTitle: string;
  ocrModalHeader: string;
  ocrModalSubtitle: string;
  ocrModalSubheader: string;
  selectSampleImageLabel: string;
  geminiScanOrganizeBtn: string;
  geminiScanningState: string;
  ocrExtractingState: string;
  ocrProcessBtn: string;
  ocrResultHeader: string;
  ocrResultPreviewTitle: string;
  saveImageNoteBtn: string;

  // Edit Labels Modal
  manageLabelsTitle: string;
  manageLabelsHeader: string;
  createNewLabelPlaceholder: string;
  deleteLabelTooltip: string;
  doneBtn: string;

  // Trash Banner & App Indicators
  trashNotice: string;
  trashNoticeText: string;
  emptyTrashBtn: string;
  searchFilterPrefix: string;
  searchConditionPrefix: string;
  searchModeSemantic: string;
  searchModeExact: string;
  semanticSearchModeSuffix: string;
  keywordSearchModeSuffix: string;
  clearSearchBtn: string;

  // Default labels
  defaultLabels: string[];
  restoreDefaultLabels: string;

  // OCR Sample Names
  sampleReceiptName: string;
  sampleTodoName: string;
  sampleWhiteboardName: string;
}

export const translations: Record<Language, Translations> = {
  zh: {
    // Header
    appName: "Gyen Keep",
    appBadge: "AI Notes",
    appTagline: "同步便签 · 即时捕捉与智能整理",
    searchPlaceholderSemantic: "输入任何模糊记忆或想法（如：要还给老王的东西）...",
    searchPlaceholderExact: "搜索标题、正文、清单或标签...",
    semanticSearchBtn: "AI语义检索",
    keywordSearchBtn: "关键词",
    semanticSearchTooltip: "切换AI语义理解搜索，支持近义词与模糊回忆检索",
    todayCleanupBtn: "今日整理",
    todayCleanupTooltip: "查看 AI 今日概览与整理建议",
    viewModeListTooltip: "切换为单列列表",
    viewModeGridTooltip: "切换为莫兰迪网格",
    darkModeLightTooltip: "切换亮色模式",
    darkModeDarkTooltip: "切换深色模式",
    languageToggleTooltip: "切换语言 / Switch Language",

    // Sidebar
    navAllNotes: "所有便签",
    navReminders: "提醒事项",
    navLabelsHeading: "分类标签",
    navManageLabelsTooltip: "管理标签",
    navNewManageLabels: "新建/管理标签",
    navArchive: "归档箱",
    navTrash: "回收站",
    aiInsightTitle: "AI Storage Insight",
    aiInsightText: "支持语音、图文与智能重复合并。",
    aiInsightLink: "了解详情",

    // Quick Create Bar
    quickCreatePlaceholder: "记下一条便签，或使用语音与图片识图...",
    quickVoiceBtn: "语音随口说",
    quickOcrBtn: "图片/纸牌识图",
    noteTitlePlaceholder: "标题",
    noteContentPlaceholder: "记下一条便签...",
    addChecklistItemPlaceholder: "添加清单项目 (按 Enter 确认)",
    typeChecklist: "清单模式",
    typeText: "文本模式",
    setReminderBtn: "设置提醒",
    reminderSetBtn: "已设提醒",
    reminderDateLabel: "提醒时间",
    reminderLocationLabel: "地点 (可选)",
    locationPlaceholder: "例如: 3楼会议室",
    colorPickerTitle: "便签颜色",
    addTagTitle: "添加标签",
    attachImageBtn: "图片附件",
    cancelBtn: "取消",
    saveBtn: "保存便签",
    quickInputPlaceholder: "记下一条便签，或使用语音与图片识图...",
    quickChecklistTooltip: "新建清单",
    quickVoiceTooltip: "语音随口说",
    quickOcrTooltip: "图片/纸牌识图",
    labelsLabel: "标签:",
    saveNoteBtn: "保存便签",

    // Note Grid
    pinnedSectionTitle: "已置顶",
    otherSectionTitle: "其他便签",
    emptyStateTitle: "这里暂无便签",
    emptyStateSearchText: "没有找到与搜索条件匹配的便签，请尝试其他关键词或AI语义检索。",
    emptyStateDefaultText: "使用顶部速记框，或者通过语音与图片一键生成便签。",
    noNotesHere: "这里暂无便签",
    noNotesSearchMatch: "没有找到与搜索条件匹配的便签，请尝试其他关键词或AI语义检索。",
    noNotesInstruction: "使用顶部速记框，或者通过语音与图片一键生成便签。",
    pinnedSectionHeader: "已置顶 ({count})",
    otherNotesSectionHeader: "其他便签 ({count})",

    // Note Card
    pinTooltip: "置顶便签",
    unpinTooltip: "取消置顶",
    archiveTooltip: "移入归档箱",
    unarchiveTooltip: "取消归档",
    trashTooltip: "移入回收站",
    restoreTooltip: "恢复便签",
    deletePermanentlyTooltip: "彻底删除",
    remindBadgePrefix: "提醒:",
    whyMatchBadgePrefix: "💡 匹配原因:",
    relatedBadgePrefix: "🔗 推荐关联:",
    imageAlt: "便签图片",
    untitledNote: "无标题便签",
    noContentText: "无正文",
    moreItemsNotShown: "还有 {n} 项未显示",
    relatedNotesCount: "{n} 条关联便签",
    collaboratorTooltip: "共享协同",
    restoreBtn: "恢复",
    deleteForeverTooltip: "彻底删除便签",
    deleteForeverBtn: "彻底删除",

    // Note Editor Modal
    noteDetailsHeader: "便签详情",
    checklistNoteHeader: "清单便签",
    aiAnalyzing: "AI 分析中...",
    addBtn: "添加",
    setReminderPanelTitle: "设置提醒时间与地点",
    selectedTagsHeading: "已选标签:",
    aiSuggestedTagsHeading: "AI 推荐标签:",
    aiRelatedNotesTitle: "Gemini 识别到 {n} 条关联笔记 (语义卡片网络)",
    relatedReasonPrefix: "💡 关联原因:",
    insertLinkBtn: "🔗 插入链接",
    aiReanalyzeBtn: "AI 重分析",
    saveAndDoneBtn: "完成并保存",
    noteDetailTitle: "便签详情",
    noteChecklistDetailTitle: "清单便签",
    editorTitlePlaceholder: "标题",
    editorContentPlaceholder: "记下一条便签...",
    reminderTimeAndLocationHeading: "设置提醒时间与地点",
    reminderTimeLabel: "提醒时间",
    reminderLocationPlaceholder: "例如: 3楼会议室",
    selectedLabelsLabel: "已选标签:",
    aiSuggestedTagsLabel: "AI 推荐标签:",
    aiRelatedNotesCount: "Gemini 识别到 {n} 条关联笔记 (语义卡片网络)",
    insertLinkTooltip: "插入链接",
    setReminderTooltip: "设置提醒",
    reminderUnsetBtn: "设置提醒",
    switchToList: "切换为清单模式",
    switchToText: "切换为正文模式",
    reAnalyzeTooltip: "重新执行 AI 分析",
    reAnalyzeBtn: "AI 重分析",
    doneAndSaveBtn: "完成并保存",

    // AI Overview Banner
    aiOverviewTitle: "Keep AI 今日概览与定期整理",
    aiOverviewHeader: "Keep AI 今日概览与定期整理",
    aiAnalyzingSummaryDefault: "Keep AI 正在分析你的便签库，为你提供定期清理与合并建议...",
    analyzingText: "分析中...",
    analyzingState: "分析中...",
    aiOverviewDefaultSummary: "Keep AI 正在分析你的便签库，为你提供定期清理与合并建议...",
    collapsePanelTooltip: "折叠面板",
    expandPanelTooltip: "展开细节",
    collapsePanel: "折叠面板",
    expandDetails: "展开细节",
    dueTodayTitle: "今日到期提醒",
    dueTodayHeading: "今日到期提醒",
    dueTodayCountBadge: "{n} 项",
    itemsUnit: "项",
    allDayText: "全天",
    allDay: "全天",
    noDueTodayText: "今日无紧急到期提醒。",
    noDueToday: "今日无紧急到期提醒。",
    duplicateMergeTitle: "重复便签合并建议",
    duplicateMergeHeading: "重复便签合并建议",
    duplicateMergeCountBadge: "{n} 组",
    groupsUnit: "组",
    previewMergeBtn: "预览合并",
    noDuplicatesText: "暂无内容高度重复的便签。",
    noDuplicates: "暂无内容高度重复的便签。",
    staleNotesTitle: "陈旧未更新清理建议",
    staleNotesHeading: "陈旧未更新清理建议",
    staleNotesCountBadge: "{n} 条",
    staleDetectedText: "检测到 {count} 条超过 30 天未修改的旧草稿或完成便签。",
    staleNotesDetectedText: "检测到 {count} 条超过 30 天未修改的旧草稿或完成便签。",
    batchArchiveBtn: "一键批量归档陈旧便签",
    batchArchiveStaleBtn: "一键批量归档陈旧便签",
    noStaleText: "你的便签库非常整洁！",
    notebookClean: "你的便签库非常整洁！",

    // Merge Modal
    mergeModalTitle: "重复便签智能合并预览与确认",
    mergeModalHeader: "重复便签智能合并预览与确认",
    mergeReasonPrefix: "💡 理由:",
    noteAOriginal: "便签 A (原件)",
    noteBOriginal: "便签 B (原件)",
    aiProposedMergeResult: "✨ AI 拟合并结果 (可微调)",
    proposedMergedResultLabel: "✨ AI 拟合并结果 (可微调)",
    mergedTitleLabel: "合并标题",
    mergedContentLabel: "合并正文",
    mergeFooterNotice: "合并后原便签 A 与 B 将会自动移入回收站，不会丢失历史。",
    confirmMergeBtn: "确认合并便签",

    // Voice Modal
    voiceModalTitle: "语音随口说 · AI 智能结构化",
    voiceModalHeader: "语音随口说 · AI 智能结构化",
    voiceModalSubtitle: "自动过滤闲聊，智能拆解为有序清单与提醒",
    voiceModalSubheader: "自动过滤闲聊，智能拆解为有序清单与提醒",
    voiceInputLabel: "口述内容 / 语音识别文本",
    voiceTextLabel: "口述内容 / 语音识别文本",
    changeSampleSpeechBtn: "换一段示例语音",
    trySampleVoiceBtn: "换一段示例语音",
    voiceTextareaPlaceholder: "请输入或说出一段杂乱的想法...",
    voiceInputPlaceholder: "请输入或说出一段杂乱的想法...",
    geminiSmartOrganizeBtn: "Gemini 智能一键整理",
    geminiExtractingState: "Gemini 提取中...",
    voiceExtractingState: "Gemini 提取中...",
    voiceProcessBtn: "Gemini 智能一键整理",
    aiResultPreviewHeader: "AI 整理结果预览 (无需手动敲字)",
    voiceResultPreviewTitle: "AI 整理结果预览 (无需手动敲字)",
    confirmCreateNoteBtn: "确认并新建便签",

    // OCR Modal
    ocrModalTitle: "图片 / 纸质清单 OCR 结构化",
    ocrModalHeader: "图片 / 纸质清单 OCR 结构化",
    ocrModalSubtitle: "提取白板、收据或手写纸条内容为清晰文本/清单",
    ocrModalSubheader: "提取白板、收据或手写纸条内容为清晰文本/清单",
    selectSampleImageLabel: "选择待扫描示例图片",
    geminiScanOrganizeBtn: "Gemini 识图与结构化",
    geminiScanningState: "Gemini 识图提取中...",
    ocrExtractingState: "Gemini 识图提取中...",
    ocrProcessBtn: "Gemini 识图与结构化",
    ocrResultHeader: "OCR 提取识别结果",
    ocrResultPreviewTitle: "OCR 提取识别结果",
    saveImageNoteBtn: "保存图文便签",

    // Edit Labels Modal
    manageLabelsTitle: "管理标签分类",
    manageLabelsHeader: "管理标签分类",
    createNewLabelPlaceholder: "创建新标签...",
    deleteLabelTooltip: "删除标签",
    doneBtn: "完成",

    // Trash Banner & App Indicators
    trashNotice: "回收站中的便签保留 7 天后将自动彻底清空。",
    trashNoticeText: "回收站中的便签保留 7 天后将自动彻底清空。",
    emptyTrashBtn: "清空回收站",
    searchFilterPrefix: "搜索条件:",
    searchConditionPrefix: "搜索条件:",
    searchModeSemantic: " (Gemini AI 语义模式)",
    searchModeExact: " (关键词精确匹配)",
    semanticSearchModeSuffix: "Gemini AI 语义模式",
    keywordSearchModeSuffix: "关键词精确匹配",
    clearSearchBtn: "清除搜索",

    // Default labels
    defaultLabels: ["工作", "生活", "购物", "灵感", "财务", "阅读", "健康", "旅行", "会议", "学习"],
    restoreDefaultLabels: "恢复默认分类",

    // OCR Samples
    sampleReceiptName: "超市收据小票",
    sampleTodoName: "手写待办清单纸条",
    sampleWhiteboardName: "白板讨论会议记录",
  },

  en: {
    // Header
    appName: "Gyen Keep",
    appBadge: "AI Notes",
    appTagline: "Synced notes · instant capture and smart organization",
    searchPlaceholderSemantic: "Search anything in natural language (e.g., item to return)...",
    searchPlaceholderExact: "Search title, text, checklist or tags...",
    semanticSearchBtn: "AI Semantic",
    keywordSearchBtn: "Keywords",
    semanticSearchTooltip: "Toggle AI semantic search for natural language retrieval",
    todayCleanupBtn: "AI Clean-up",
    todayCleanupTooltip: "View AI daily overview & cleanup suggestions",
    viewModeListTooltip: "Switch to list view",
    viewModeGridTooltip: "Switch to grid view",
    darkModeLightTooltip: "Switch to light mode",
    darkModeDarkTooltip: "Switch to dark mode",
    languageToggleTooltip: "Switch Language / 切换语言",

    // Sidebar
    navAllNotes: "All Notes",
    navReminders: "Reminders",
    navLabelsHeading: "Labels",
    navManageLabelsTooltip: "Manage labels",
    navNewManageLabels: "New / Manage Labels",
    navArchive: "Archive",
    navTrash: "Trash",
    aiInsightTitle: "AI Storage Insight",
    aiInsightText: "Supports voice transcription, OCR image scan & duplicate merge.",
    aiInsightLink: "Learn more",

    // Quick Create Bar
    quickCreatePlaceholder: "Take a note, or record voice & scan image...",
    quickVoiceBtn: "Voice Record",
    quickOcrBtn: "Scan Image / OCR",
    noteTitlePlaceholder: "Title",
    noteContentPlaceholder: "Take a note...",
    addChecklistItemPlaceholder: "Add item (Press Enter)",
    typeChecklist: "Checklist",
    typeText: "Text",
    setReminderBtn: "Set Reminder",
    reminderSetBtn: "Reminder Set",
    reminderDateLabel: "Reminder Date & Time",
    reminderLocationLabel: "Location (Optional)",
    locationPlaceholder: "e.g., Room 302",
    colorPickerTitle: "Note Color",
    addTagTitle: "Add Label",
    attachImageBtn: "Attach Image",
    cancelBtn: "Cancel",
    saveBtn: "Save Note",
    quickInputPlaceholder: "Take a note, or record voice & scan image...",
    quickChecklistTooltip: "New checklist",
    quickVoiceTooltip: "Voice Record",
    quickOcrTooltip: "Scan Image / OCR",
    labelsLabel: "Labels:",
    saveNoteBtn: "Save Note",

    // Note Grid
    pinnedSectionTitle: "Pinned",
    otherSectionTitle: "Other Notes",
    emptyStateTitle: "No Notes Found",
    emptyStateSearchText: "No notes match your search. Try different keywords or AI semantic search.",
    emptyStateDefaultText: "Use the quick bar above, or generate notes via voice and image scanning.",
    noNotesHere: "No Notes Here",
    noNotesSearchMatch: "No notes found matching your search query. Try different keywords or AI semantic search.",
    noNotesInstruction: "Use the top quick bar or capture notes via voice and image scanning.",
    pinnedSectionHeader: "Pinned ({count})",
    otherNotesSectionHeader: "Other Notes ({count})",

    // Note Card
    pinTooltip: "Pin note",
    unpinTooltip: "Unpin note",
    archiveTooltip: "Move to archive",
    unarchiveTooltip: "Unarchive note",
    trashTooltip: "Move to trash",
    restoreTooltip: "Restore note",
    deletePermanentlyTooltip: "Delete permanently",
    remindBadgePrefix: "Remind:",
    whyMatchBadgePrefix: "💡 Why matched:",
    relatedBadgePrefix: "🔗 Related:",
    imageAlt: "Note attachment",
    untitledNote: "Untitled Note",
    noContentText: "No content",
    moreItemsNotShown: "{n} more items not shown",
    relatedNotesCount: "{n} related notes",
    collaboratorTooltip: "Collaborate",
    restoreBtn: "Restore",
    deleteForeverTooltip: "Delete note permanently",
    deleteForeverBtn: "Delete Forever",

    // Note Editor Modal
    noteDetailsHeader: "Note Details",
    checklistNoteHeader: "Checklist Note",
    aiAnalyzing: "AI Analyzing...",
    addBtn: "Add",
    setReminderPanelTitle: "Set Reminder Date & Location",
    selectedTagsHeading: "Selected Labels:",
    aiSuggestedTagsHeading: "AI Suggested Labels:",
    aiRelatedNotesTitle: "Gemini detected {n} related notes (Knowledge Graph)",
    relatedReasonPrefix: "💡 Reason:",
    insertLinkBtn: "🔗 Insert Link",
    aiReanalyzeBtn: "AI Re-analyze",
    saveAndDoneBtn: "Save & Done",
    noteDetailTitle: "Note Details",
    noteChecklistDetailTitle: "Checklist Note",
    editorTitlePlaceholder: "Title",
    editorContentPlaceholder: "Take a note...",
    reminderTimeAndLocationHeading: "Set Reminder Date & Location",
    reminderTimeLabel: "Reminder Time",
    reminderLocationPlaceholder: "e.g., Room 302",
    selectedLabelsLabel: "Selected Labels:",
    aiSuggestedTagsLabel: "AI Suggested Labels:",
    aiRelatedNotesCount: "Gemini detected {n} related notes (Knowledge Graph)",
    insertLinkTooltip: "Insert Link",
    setReminderTooltip: "Set Reminder",
    reminderUnsetBtn: "Set Reminder",
    switchToList: "Switch to Checklist",
    switchToText: "Switch to Text",
    reAnalyzeTooltip: "Re-analyze with AI",
    reAnalyzeBtn: "AI Re-analyze",
    doneAndSaveBtn: "Save & Done",

    // AI Overview Banner
    aiOverviewTitle: "Keep AI Daily Overview & Auto Cleanup",
    aiOverviewHeader: "Keep AI Daily Overview & Auto Cleanup",
    aiAnalyzingSummaryDefault: "Keep AI is analyzing your notebook to offer cleanup and duplicate merge suggestions...",
    analyzingText: "Analyzing...",
    analyzingState: "Analyzing...",
    aiOverviewDefaultSummary: "Keep AI is analyzing your notebook to offer cleanup and duplicate merge suggestions...",
    collapsePanelTooltip: "Collapse panel",
    expandPanelTooltip: "Expand details",
    collapsePanel: "Collapse panel",
    expandDetails: "Expand details",
    dueTodayTitle: "Due Today Reminders",
    dueTodayHeading: "Due Today Reminders",
    dueTodayCountBadge: "{n} items",
    itemsUnit: "items",
    allDayText: "All day",
    allDay: "All day",
    noDueTodayText: "No urgent reminders due today.",
    noDueToday: "No urgent reminders due today.",
    duplicateMergeTitle: "Duplicate Merge Suggestions",
    duplicateMergeHeading: "Duplicate Merge Suggestions",
    duplicateMergeCountBadge: "{n} pairs",
    groupsUnit: "pairs",
    previewMergeBtn: "Preview Merge",
    noDuplicatesText: "No duplicate notes detected.",
    noDuplicates: "No duplicate notes detected.",
    staleNotesTitle: "Stale Notes Cleanup Suggestions",
    staleNotesHeading: "Stale Notes Cleanup Suggestions",
    staleNotesCountBadge: "{n} items",
    staleDetectedText: "Detected {count} notes unedited for over 30 days.",
    staleNotesDetectedText: "Detected {count} notes unedited for over 30 days.",
    batchArchiveBtn: "Batch Archive Stale Notes",
    batchArchiveStaleBtn: "Batch Archive Stale Notes",
    noStaleText: "Your notes library is tidy!",
    notebookClean: "Your notes library is perfectly clean!",

    // Merge Modal
    mergeModalTitle: "Smart Duplicate Merge Preview & Confirmation",
    mergeModalHeader: "Smart Duplicate Merge Preview & Confirmation",
    mergeReasonPrefix: "💡 Reason:",
    noteAOriginal: "Note A (Original)",
    noteBOriginal: "Note B (Original)",
    aiProposedMergeResult: "✨ AI Proposed Merge (Editable)",
    proposedMergedResultLabel: "✨ AI Proposed Merge (Editable)",
    mergedTitleLabel: "Merged Title",
    mergedContentLabel: "Merged Content",
    mergeFooterNotice: "Original notes A & B will be moved to trash after merge, preserving history.",
    confirmMergeBtn: "Confirm & Merge Notes",

    // Voice Modal
    voiceModalTitle: "Voice Note · AI Smart Structuring",
    voiceModalHeader: "Voice Note · AI Smart Structuring",
    voiceModalSubtitle: "Filters chatter, structuring speech into organized checklists and reminders",
    voiceModalSubheader: "Filters chatter, structuring speech into organized checklists and reminders",
    voiceInputLabel: "Voice Transcript / Input Text",
    voiceTextLabel: "Voice Transcript / Input Text",
    changeSampleSpeechBtn: "Try another sample voice",
    trySampleVoiceBtn: "Try another sample voice",
    voiceTextareaPlaceholder: "Type or record your raw thoughts...",
    voiceInputPlaceholder: "Type or record your raw thoughts...",
    geminiSmartOrganizeBtn: "Gemini Smart Organize",
    geminiExtractingState: "Gemini Extracting...",
    voiceExtractingState: "Gemini Extracting...",
    voiceProcessBtn: "Gemini Smart Organize",
    aiResultPreviewHeader: "AI Structured Result Preview",
    voiceResultPreviewTitle: "AI Structured Result Preview",
    confirmCreateNoteBtn: "Confirm & Create Note",

    // OCR Modal
    ocrModalTitle: "Image & Document OCR Structuring",
    ocrModalHeader: "Image & Document OCR Structuring",
    ocrModalSubtitle: "Extract whiteboard, receipts, or handwritten notes into text & checklists",
    ocrModalSubheader: "Extract whiteboard, receipts, or handwritten notes into text & checklists",
    selectSampleImageLabel: "Select sample image to scan",
    geminiScanOrganizeBtn: "Gemini Scan & Structure",
    geminiScanningState: "Gemini Scanning...",
    ocrExtractingState: "Gemini Scanning...",
    ocrProcessBtn: "Gemini Scan & Structure",
    ocrResultHeader: "OCR Extraction Result",
    ocrResultPreviewTitle: "OCR Extraction Result",
    saveImageNoteBtn: "Save Image Note",

    // Edit Labels Modal
    manageLabelsTitle: "Manage Labels",
    manageLabelsHeader: "Manage Labels",
    createNewLabelPlaceholder: "Create new label...",
    deleteLabelTooltip: "Delete label",
    doneBtn: "Done",

    // Trash Banner & App Indicators
    trashNotice: "Notes in trash will be automatically deleted after 7 days.",
    trashNoticeText: "Notes in trash will be automatically deleted after 7 days.",
    emptyTrashBtn: "Empty Trash",
    searchFilterPrefix: "Search query:",
    searchConditionPrefix: "Search query:",
    searchModeSemantic: " (Gemini AI Semantic Mode)",
    searchModeExact: " (Exact Keyword Match)",
    semanticSearchModeSuffix: "Gemini AI Semantic Mode",
    keywordSearchModeSuffix: "Exact Keyword Match",
    clearSearchBtn: "Clear Search",

    // Default labels
    defaultLabels: ["Work", "Personal", "Shopping", "Ideas", "Finance", "Reading", "Health", "Travel", "Meeting", "Study"],
    restoreDefaultLabels: "Restore default labels",

    // OCR Samples
    sampleReceiptName: "Supermarket Receipt",
    sampleTodoName: "Handwritten Todo Note",
    sampleWhiteboardName: "Whiteboard Meeting Notes",
  },
};
