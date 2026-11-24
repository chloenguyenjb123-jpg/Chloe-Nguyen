import type {
  GoalPeriod,
  HabitFrequency,
  LanguageCode,
  PaymentMethod,
  ReportPeriodType,
  TaskPriority,
  TaskRecurrence,
  TaskStatus,
  TransactionCategory,
  TransactionRecurrence,
} from '../types';

export interface TranslationDictionary {
  brandTagline: string;
  loadingApp: string;
  nav: {
    dashboard: string;
    tasks: string;
    expenses: string;
    notes: string;
    goalsHabits: string;
    exchangeRates: string;
    aiAssistant: string;
    reports: string;
    settings: string;
  };
  common: {
    save: string;
    saving: string;
    saved: string;
    cancel: string;
    create: string;
    edit: string;
    delete: string;
    confirm: string;
    search: string;
    all: string;
    today: string;
    yesterday: string;
    tomorrow: string;
    none: string;
    add: string;
    close: string;
    refresh: string;
    loading: string;
    noData: string;
    viewAll: string;
    signOut: string;
    timezoneNote: string;
    quickAddTask: string;
    quickAddExpense: string;
    quickAddNote: string;
    minutesShort: string;
    requiredField: string;
  };
  login: {
    title: string;
    subtitle: string;
    feature1Title: string;
    feature1Desc: string;
    feature2Title: string;
    feature2Desc: string;
    feature3Title: string;
    feature3Desc: string;
    googleButton: string;
    signingIn: string;
    securityNote: string;
  };
  taskStatus: Record<TaskStatus, string>;
  taskPriority: Record<TaskPriority, string>;
  taskRecurrence: Record<TaskRecurrence, string>;
  taskCategories: Record<string, string>;
  transactionCategories: Record<TransactionCategory, string>;
  paymentMethods: Record<PaymentMethod, string>;
  transactionRecurrence: Record<TransactionRecurrence, string>;
  noteCategories: Record<string, string>;
  goalPeriods: Record<GoalPeriod, string>;
  goalCategories: Record<string, string>;
  habitFrequencies: Record<HabitFrequency, string>;
  reportPeriods: Record<ReportPeriodType, string>;
  dashboard: {
    todayProgress: string;
    tasksCompletedLabel: string;
    pendingCount: string;
    overdueCount: string;
    todayIncome: string;
    todayExpense: string;
    monthlyBudgetProgress: string;
    budgetExceeded: string;
    budgetWarning: string;
    budgetHealthy: string;
    weeklyProductivity: string;
    monthlySpendingTrend: string;
    expenseBreakdown: string;
    incomeVsExpense: string;
    todaySchedule: string;
    upcomingDeadlines: string;
    dailyGoalsHabits: string;
    recentTransactions: string;
    quickNotes: string;
    exchangeHighlights: string;
    activityTimeline: string;
    noTasksToday: string;
    noDeadlines: string;
    noTransactions: string;
    noNotes: string;
    noHabits: string;
    noActivities: string;
    quickNotePlaceholder: string;
    saveQuickNote: string;
    quickNoteSaved: string;
  };
  tasks: {
    title: string;
    subtitle: string;
    addTask: string;
    editTask: string;
    viewList: string;
    viewKanban: string;
    viewCalendar: string;
    carryForwardBtn: string;
    carryForwardConfirmTitle: string;
    carryForwardConfirmDesc: string;
    carryForwardDone: string;
    searchPlaceholder: string;
    filterCategory: string;
    filterPriority: string;
    filterStatus: string;
    filterDate: string;
    weeklyProgress: string;
    monthlyProgress: string;
    titleLabel: string;
    descLabel: string;
    categoryLabel: string;
    priorityLabel: string;
    statusLabel: string;
    startDateLabel: string;
    deadlineLabel: string;
    recurrenceLabel: string;
    timeBlockLabel: string;
    durationLabel: string;
    reminderLabel: string;
    notesLabel: string;
    subtasksLabel: string;
    addSubtaskPlaceholder: string;
    carriedFrom: string;
    dragHint: string;
    emptyState: string;
    deleteConfirm: string;
  };
  expenses: {
    title: string;
    subtitle: string;
    addTransaction: string;
    editTransaction: string;
    totalIncome: string;
    totalExpense: string;
    netCashFlow: string;
    remainingBudget: string;
    savingsRate: string;
    monthlyBudget: string;
    savingsGoalLabel: string;
    savingsGoalProgress: string;
    income: string;
    expense: string;
    amountLabel: string;
    dateLabel: string;
    categoryLabel: string;
    paymentMethodLabel: string;
    descriptionLabel: string;
    noteLabel: string;
    recurringLabel: string;
    recurringTriggerBtn: string;
    recurringConfirmDesc: string;
    viewList: string;
    viewCalendar: string;
    categoryChart: string;
    monthlyComparisonChart: string;
    searchPlaceholder: string;
    budgetAlertTitle: string;
    emptyState: string;
    deleteConfirm: string;
  };
  notes: {
    title: string;
    subtitle: string;
    newNote: string;
    searchPlaceholder: string;
    allFolders: string;
    archivedTab: string;
    activeTab: string;
    pinnedSection: string;
    titlePlaceholder: string;
    folderLabel: string;
    folderPlaceholder: string;
    categoryLabel: string;
    tagsLabel: string;
    tagsPlaceholder: string;
    linkedTaskLabel: string;
    attachmentsLabel: string;
    attachmentNamePlaceholder: string;
    attachmentUrlPlaceholder: string;
    addAttachment: string;
    invalidUrl: string;
    pinNote: string;
    unpinNote: string;
    archiveNote: string;
    restoreNote: string;
    autosaving: string;
    autosaved: string;
    unsavedChanges: string;
    emptyState: string;
    selectPrompt: string;
  };
  goalsHabits: {
    title: string;
    subtitle: string;
    goalsTab: string;
    habitsTab: string;
    addGoal: string;
    editGoal: string;
    addHabit: string;
    editHabit: string;
    goalTitle: string;
    goalDesc: string;
    goalPeriod: string;
    goalTarget: string;
    goalCurrent: string;
    goalUnit: string;
    goalTargetDate: string;
    habitTitle: string;
    habitFrequency: string;
    habitReminder: string;
    streakDays: string;
    completionGrid: string;
    progressChart: string;
    markTodayDone: string;
    completedToday: string;
    emptyGoals: string;
    emptyHabits: string;
  };
  exchangeRates: {
    title: string;
    subtitle: string;
    manualRefresh: string;
    refreshing: string;
    scheduleBanner: string;
    staleWarning: string;
    unavailableBanner: string;
    effectiveDate: string;
    lastUpdated: string;
    sourceLabel: string;
    conversionDirection: string;
    previousDayRate: string;
    dailyChange: string;
    converterTitle: string;
    amountInput: string;
    fromCurrency: string;
    toCurrency: string;
    convertedResult: string;
    historyTitle: string;
    days7: string;
    days30: string;
    days90: string;
    historyUnavailable: string;
  };
  aiAssistant: {
    title: string;
    subtitle: string;
    welcomeMessage: string;
    placeholder: string;
    send: string;
    thinking: string;
    factBadge: string;
    suggestionBadge: string;
    confirmActionBtn: string;
    actionConfirmed: string;
    clearChat: string;
    prompts: {
      schedule: string;
      spending: string;
      summarizeNotes: string;
      draftTask: string;
      currencyTrend: string;
      dailyReport: string;
    };
  };
  reports: {
    title: string;
    subtitle: string;
    customStart: string;
    customEnd: string;
    generateAI: string;
    generatingAI: string;
    exportPDF: string;
    previewPDF: string;
    savedReportsTitle: string;
    overviewSection: string;
    tasksSection: string;
    financeSection: string;
    goalsHabitsSection: string;
    notesSection: string;
    ratesSection: string;
    aiInsightsSection: string;
    noInsightsYet: string;
  };
  settings: {
    title: string;
    subtitle: string;
    profileSection: string;
    displayNameLabel: string;
    languageLabel: string;
    themeLabel: string;
    themeWarmIvory: string;
    themeSoftBlush: string;
    preferredCurrencyLabel: string;
    notificationsLabel: string;
    workScheduleLabel: string;
    workStart: string;
    workEnd: string;
    budgetSection: string;
    monthlyBudgetLabel: string;
    savingsGoalLabel: string;
    alertThresholdLabel: string;
    saveSettings: string;
    settingsSaved: string;
    demoSection: string;
    loadDemoBtn: string;
    clearDemoBtn: string;
    demoLoaded: string;
    demoCleared: string;
    backupSection: string;
    exportJsonBtn: string;
    restoreJsonBtn: string;
    restoreSuccess: string;
    securitySection: string;
    securityDesc: string;
  };
}

export const TRANSLATIONS: Record<LanguageCode, TranslationDictionary> = {
  vi: {
    brandTagline: 'Không gian quản trị cá nhân tinh tế',
    loadingApp: 'Đang khởi tạo Daily Hub...',
    nav: {
      dashboard: 'Tổng quan',
      tasks: 'Công việc',
      expenses: 'Tài chính',
      notes: 'Ghi chú',
      goalsHabits: 'Mục tiêu & Thói quen',
      exchangeRates: 'Tỷ giá',
      aiAssistant: 'Trợ lý AI',
      reports: 'Báo cáo & PDF',
      settings: 'Cài đặt',
    },
    common: {
      save: 'Lưu lại',
      saving: 'Đang lưu...',
      saved: 'Đã lưu',
      cancel: 'Hủy',
      create: 'Tạo mới',
      edit: 'Chỉnh sửa',
      delete: 'Xóa',
      confirm: 'Xác nhận',
      search: 'Tìm kiếm...',
      all: 'Tất cả',
      today: 'Hôm nay',
      yesterday: 'Hôm qua',
      tomorrow: 'Ngày mai',
      none: 'Không có',
      add: 'Thêm',
      close: 'Đóng',
      refresh: 'Làm mới',
      loading: 'Đang tải...',
      noData: 'Chưa có dữ liệu',
      viewAll: 'Xem tất cả',
      signOut: 'Đăng xuất',
      timezoneNote: 'Múi giờ Asia/Ho_Chi_Minh · VND',
      quickAddTask: 'Thêm việc',
      quickAddExpense: 'Ghi thu chi',
      quickAddNote: 'Ghi chú',
      minutesShort: 'phút',
      requiredField: 'Vui lòng điền đầy đủ thông tin bắt buộc.',
    },
    login: {
      title: 'Daily Hub 2.0',
      subtitle: 'Không gian làm việc tối giản giúp bạn cân bằng công việc, tài chính cá nhân, thói quen bền vững và tỷ giá ngoại tệ mỗi ngày.',
      feature1Title: 'Quản lý công việc & Time-block',
      feature1Desc: 'Bảng Kanban kéo thả, lịch biểu, công việc lặp lại và danh sách việc con trực quan.',
      feature2Title: 'Tài chính & Tỷ giá thực tế',
      feature2Desc: 'Theo dõi dòng tiền, ngân sách tháng, mục tiêu tiết kiệm và tỷ giá cập nhật 06:00 hằng ngày.',
      feature3Title: 'Trợ lý AI & Báo cáo PDF song ngữ',
      feature3Desc: 'Phân tích dữ liệu thực tế bằng Gemini AI và xuất báo cáo PDF chuyên nghiệp.',
      googleButton: 'Đăng nhập bằng Google',
      signingIn: 'Đang kết nối Google...',
      securityNote: 'Dữ liệu cá nhân được bảo vệ riêng tư theo tài khoản trên Cloud Firestore.',
    },
    taskStatus: {
      todo: 'Cần làm',
      in_progress: 'Đang thực hiện',
      completed: 'Hoàn thành',
      on_hold: 'Tạm hoãn',
    },
    taskPriority: {
      low: 'Thấp',
      medium: 'Trung bình',
      high: 'Cao',
      urgent: 'Khẩn cấp',
    },
    taskRecurrence: {
      none: 'Không lặp lại',
      daily: 'Hằng ngày',
      weekly: 'Hằng tuần',
      monthly: 'Hằng tháng',
    },
    taskCategories: {
      Work: 'Công việc',
      Personal: 'Cá nhân',
      Learning: 'Học tập',
      Finance: 'Tài chính',
      Health: 'Sức khỏe',
      Family: 'Gia đình',
      Other: 'Khác',
    },
    transactionCategories: {
      food: 'Ăn uống',
      transportation: 'Di chuyển',
      shopping: 'Mua sắm',
      education: 'Giáo dục',
      bills: 'Hóa đơn',
      entertainment: 'Giải trí',
      health: 'Sức khỏe',
      salary: 'Lương thưởng',
      other: 'Khác',
    },
    paymentMethods: {
      cash: 'Tiền mặt',
      bank_transfer: 'Chuyển khoản',
      e_wallet: 'Ví điện tử',
    },
    transactionRecurrence: {
      none: 'Một lần',
      weekly: 'Hằng tuần',
      monthly: 'Hằng tháng',
    },
    noteCategories: {
      Work: 'Công việc',
      Ideas: 'Ý tưởng',
      Learning: 'Học tập',
      Planning: 'Kế hoạch',
      Finance: 'Tài chính',
      Personal: 'Cá nhân',
    },
    goalPeriods: {
      weekly: 'Mục tiêu tuần',
      monthly: 'Mục tiêu tháng',
      quarterly: 'Mục tiêu quý',
      yearly: 'Mục tiêu năm',
    },
    goalCategories: {
      Productivity: 'Năng suất',
      Finance: 'Tài chính',
      Health: 'Sức khỏe',
      Learning: 'Học tập',
      Personal: 'Cá nhân',
      Other: 'Khác',
    },
    habitFrequencies: {
      daily: 'Hằng ngày',
      weekly: 'Hằng tuần',
    },
    reportPeriods: {
      daily: 'Theo ngày',
      weekly: 'Theo tuần',
      monthly: 'Theo tháng',
      custom: 'Tùy chọn khoảng ngày',
    },
    dashboard: {
      todayProgress: 'Tiến độ hôm nay',
      tasksCompletedLabel: 'Công việc đã hoàn thành',
      pendingCount: 'Đang chờ',
      overdueCount: 'Quá hạn',
      todayIncome: 'Thu nhập hôm nay',
      todayExpense: 'Chi tiêu hôm nay',
      monthlyBudgetProgress: 'Ngân sách tháng',
      budgetExceeded: 'Vượt ngưỡng ngân sách',
      budgetWarning: 'Sắp chạm ngưỡng cảnh báo',
      budgetHealthy: 'Trong ngưỡng an toàn',
      weeklyProductivity: 'Năng suất 7 ngày qua',
      monthlySpendingTrend: 'Xu hướng chi tiêu tháng',
      expenseBreakdown: 'Phân bổ chi tiêu tháng',
      incomeVsExpense: 'Thu nhập & Chi tiêu (6 tháng)',
      todaySchedule: 'Lịch trình & Time-block hôm nay',
      upcomingDeadlines: 'Hạn chót sắp tới',
      dailyGoalsHabits: 'Mục tiêu & Thói quen hôm nay',
      recentTransactions: 'Giao dịch gần đây',
      quickNotes: 'Ghi chú nhanh',
      exchangeHighlights: 'Tỷ giá ngoại tệ nổi bật',
      activityTimeline: 'Dòng thời gian hoạt động',
      noTasksToday: 'Hôm nay chưa có công việc nào được lên lịch.',
      noDeadlines: 'Không có hạn chót sắp tới.',
      noTransactions: 'Chưa có giao dịch nào được ghi nhận.',
      noNotes: 'Chưa có ghi chú nào. Hãy lưu lại ý tưởng đầu tiên.',
      noHabits: 'Chưa có thói quen nào. Tạo thói quen để duy trì chuỗi ngày.',
      noActivities: 'Chưa có hoạt động nào được ghi nhận gần đây.',
      quickNotePlaceholder: 'Viết nhanh một ý tưởng hoặc lời nhắc cho hôm nay...',
      saveQuickNote: 'Lưu ghi chú nhanh',
      quickNoteSaved: 'Đã lưu ghi chú nhanh.',
    },
    tasks: {
      title: 'Quản lý Công việc',
      subtitle: 'Tổ chức công việc theo danh sách, bảng Kanban kéo thả và lịch trình trực quan.',
      addTask: 'Thêm công việc',
      editTask: 'Chỉnh sửa công việc',
      viewList: 'Danh sách',
      viewKanban: 'Kanban',
      viewCalendar: 'Lịch',
      carryForwardBtn: 'Chuyển việc chưa xong sang hôm nay',
      carryForwardConfirmTitle: 'Xác nhận chuyển công việc quá hạn',
      carryForwardConfirmDesc: 'Chuyển các công việc chưa hoàn thành sang hạn hôm nay?',
      carryForwardDone: 'Đã chuyển công việc chưa hoàn thành sang hôm nay.',
      searchPlaceholder: 'Tìm theo tiêu đề, mô tả, ghi chú...',
      filterCategory: 'Danh mục',
      filterPriority: 'Ưu tiên',
      filterStatus: 'Trạng thái',
      filterDate: 'Lọc theo ngày',
      weeklyProgress: 'Tiến độ tuần này',
      monthlyProgress: 'Tiến độ tháng này',
      titleLabel: 'Tiêu đề công việc',
      descLabel: 'Mô tả chi tiết',
      categoryLabel: 'Danh mục',
      priorityLabel: 'Độ ưu tiên',
      statusLabel: 'Trạng thái',
      startDateLabel: 'Ngày bắt đầu',
      deadlineLabel: 'Hạn hoàn thành',
      recurrenceLabel: 'Lặp lại',
      timeBlockLabel: 'Khung giờ (Time-block)',
      durationLabel: 'Thời lượng ước tính (phút)',
      reminderLabel: 'Giờ nhắc nhở',
      notesLabel: 'Ghi chú bổ sung',
      subtasksLabel: 'Công việc con (Checklist)',
      addSubtaskPlaceholder: 'Thêm đầu việc con và nhấn Enter...',
      carriedFrom: 'Chuyển từ',
      dragHint: 'Kéo thả thẻ giữa các cột để cập nhật trạng thái',
      emptyState: 'Chưa có công việc nào khớp bộ lọc hiện tại.',
      deleteConfirm: 'Bạn có chắc chắn muốn xóa công việc này?',
    },
    expenses: {
      title: 'Quản lý Tài chính',
      subtitle: 'Kiểm soát thu chi, dòng tiền ròng, ngân sách và mục tiêu tiết kiệm.',
      addTransaction: 'Ghi giao dịch mới',
      editTransaction: 'Chỉnh sửa giao dịch',
      totalIncome: 'Tổng thu nhập',
      totalExpense: 'Tổng chi tiêu',
      netCashFlow: 'Dòng tiền ròng',
      remainingBudget: 'Ngân sách còn lại',
      savingsRate: 'Tỷ lệ tiết kiệm',
      monthlyBudget: 'Ngân sách tháng',
      savingsGoalLabel: 'Mục tiêu tiết kiệm tháng',
      savingsGoalProgress: 'Tiến độ tiết kiệm',
      income: 'Thu nhập',
      expense: 'Chi tiêu',
      amountLabel: 'Số tiền (VND)',
      dateLabel: 'Ngày giao dịch',
      categoryLabel: 'Danh mục',
      paymentMethodLabel: 'Phương thức thanh toán',
      descriptionLabel: 'Mô tả giao dịch',
      noteLabel: 'Ghi chú',
      recurringLabel: 'Giao dịch định kỳ',
      recurringTriggerBtn: 'Ghi nhận kỳ tiếp theo',
      recurringConfirmDesc: 'Xác nhận tạo bản ghi giao dịch cho kỳ tiếp theo?',
      viewList: 'Danh sách',
      viewCalendar: 'Lịch tài chính',
      categoryChart: 'Cơ cấu chi tiêu theo danh mục',
      monthlyComparisonChart: 'So sánh Thu & Chi theo tháng',
      searchPlaceholder: 'Tìm kiếm giao dịch theo mô tả, ghi chú...',
      budgetAlertTitle: 'Cảnh báo ngân sách',
      emptyState: 'Chưa có giao dịch tài chính nào trong khoảng thời gian này.',
      deleteConfirm: 'Xác nhận xóa bản ghi giao dịch này?',
    },
    notes: {
      title: 'Ghi chú & Tri thức',
      subtitle: 'Soạn thảo ghi chú có cấu trúc, phân loại thư mục, gắn thẻ và tự động lưu.',
      newNote: 'Ghi chú mới',
      searchPlaceholder: 'Tìm kiếm tiêu đề, nội dung, thẻ...',
      allFolders: 'Tất cả thư mục',
      archivedTab: 'Lưu trữ',
      activeTab: 'Đang dùng',
      pinnedSection: 'Đã ghim',
      titlePlaceholder: 'Tiêu đề ghi chú...',
      folderLabel: 'Thư mục',
      folderPlaceholder: 'VD: Dự án Q2, Sổ tay...',
      categoryLabel: 'Danh mục',
      tagsLabel: 'Thẻ (cách nhau bởi dấu phẩy)',
      tagsPlaceholder: 'kế-hoạch, quan-trọng...',
      linkedTaskLabel: 'Liên kết công việc',
      attachmentsLabel: 'Liên kết / Tài liệu đính kèm',
      attachmentNamePlaceholder: 'Tên tài liệu',
      attachmentUrlPlaceholder: 'https://...',
      addAttachment: 'Thêm liên kết',
      invalidUrl: 'URL chỉ hỗ trợ giao thức http:// hoặc https://.',
      pinNote: 'Ghim ghi chú',
      unpinNote: 'Bỏ ghim',
      archiveNote: 'Lưu trữ',
      restoreNote: 'Khôi phục',
      autosaving: 'Đang tự động lưu...',
      autosaved: 'Đã tự động lưu',
      unsavedChanges: 'Có thay đổi chưa lưu',
      emptyState: 'Chưa có ghi chú nào trong mục này.',
      selectPrompt: 'Chọn một ghi chú bên trái hoặc tạo ghi chú mới để bắt đầu viết.',
    },
    goalsHabits: {
      title: 'Mục tiêu & Thói quen',
      subtitle: 'Xây dựng mục tiêu dài hạn và duy trì chuỗi thói quen tích cực mỗi ngày.',
      goalsTab: 'Mục tiêu cá nhân',
      habitsTab: 'Theo dõi thói quen',
      addGoal: 'Thêm mục tiêu',
      editGoal: 'Cập nhật mục tiêu',
      addHabit: 'Thêm thói quen',
      editHabit: 'Chỉnh sửa thói quen',
      goalTitle: 'Tên mục tiêu',
      goalDesc: 'Mô tả & động lực',
      goalPeriod: 'Chu kỳ mục tiêu',
      goalTarget: 'Chỉ tiêu đích',
      goalCurrent: 'Tiến độ hiện tại',
      goalUnit: 'Đơn vị (VD: cuốn, giờ, %)',
      goalTargetDate: 'Ngày hoàn thành dự kiến',
      habitTitle: 'Tên thói quen',
      habitFrequency: 'Tần suất',
      habitReminder: 'Giờ nhắc hằng ngày',
      streakDays: 'ngày liên tiếp',
      completionGrid: 'Lịch sử hoàn thành 14 ngày gần đây',
      progressChart: 'Biểu đồ tiến độ mục tiêu',
      markTodayDone: 'Đánh dấu hôm nay',
      completedToday: 'Đã xong hôm nay',
      emptyGoals: 'Bạn chưa thiết lập mục tiêu nào. Hãy bắt đầu với mục tiêu đầu tiên.',
      emptyHabits: 'Chưa có thói quen nào được theo dõi.',
    },
    exchangeRates: {
      title: 'Trung tâm Tỷ giá Ngoại tệ',
      subtitle: 'Dữ liệu thực tế từ nguồn quốc tế đáng tin cậy, tự động cập nhật lúc 06:00 (Asia/Ho_Chi_Minh).',
      manualRefresh: 'Cập nhật ngay',
      refreshing: 'Đang đồng bộ...',
      scheduleBanner: 'Lịch đồng bộ tự động: 06:00 hằng ngày (Asia/Ho_Chi_Minh)',
      staleWarning: 'Dữ liệu hiện tại là bản lưu gần nhất do nguồn trực tuyến tạm gián đoạn.',
      unavailableBanner: 'Nguồn dữ liệu tỷ giá trực tuyến tạm thời không khả dụng. Hệ thống không tự ước đoán con số thay thế.',
      effectiveDate: 'Ngày hiệu lực',
      lastUpdated: 'Cập nhật lúc',
      sourceLabel: 'Nguồn dữ liệu',
      conversionDirection: 'Chiều quy đổi: 1 Ngoại tệ = VND',
      previousDayRate: 'Hôm qua',
      dailyChange: 'Biến động ngày',
      converterTitle: 'Bộ quy đổi tiền tệ nhanh',
      amountInput: 'Số tiền cần quy đổi',
      fromCurrency: 'Từ tiền tệ',
      toCurrency: 'Sang tiền tệ',
      convertedResult: 'Kết quả quy đổi',
      historyTitle: 'Biểu đồ lịch sử tỷ giá',
      days7: '7 ngày',
      days30: '30 ngày',
      days90: '90 ngày',
      historyUnavailable: 'Chưa tải được chuỗi lịch sử tỷ giá cho tiền tệ này.',
    },
    aiAssistant: {
      title: 'Trợ lý Cá nhân AI (Gemini)',
      subtitle: 'Phân tích công việc, tài chính, ghi chú và tỷ giá thực tế của bạn theo ngôn ngữ tự nhiên.',
      welcomeMessage: 'Xin chào! Tôi là trợ lý AI của Daily Hub. Tôi chỉ sử dụng dữ liệu thực tế từ tài khoản của bạn và phân tách rõ đâu là [Dữ liệu thực tế], đâu là [Gợi ý từ AI]. Bạn muốn kiểm tra lịch trình, chi tiêu hay nháp công việc hôm nay?',
      placeholder: 'Nhập câu hỏi hoặc dán mô tả để chuyển thành công việc nháp...',
      send: 'Gửi',
      thinking: 'Đang phân tích dữ liệu...',
      factBadge: 'Dữ liệu thực tế',
      suggestionBadge: 'Gợi ý từ AI',
      confirmActionBtn: 'Xác nhận thực hiện',
      actionConfirmed: 'Đã xác nhận lưu vào tài khoản',
      clearChat: 'Cuộc trò chuyện mới',
      prompts: {
        schedule: 'Lập lịch làm việc hôm nay theo hạn chót & ưu tiên',
        spending: 'Phân tích chi tiêu bất thường & tiến độ ngân sách tháng',
        summarizeNotes: 'Tóm tắt các ghi chú quan trọng gần đây',
        draftTask: 'Tạo nháp công việc: Hoàn thành báo cáo tài chính trước thứ Sáu (60 phút)',
        currencyTrend: 'Giải thích xu hướng tỷ giá USD/EUR/JPY hiện tại của tôi',
        dailyReport: 'Soạn nhanh bản tóm tắt hiệu suất ngày hôm nay',
      },
    },
    reports: {
      title: 'Báo cáo & Xuất PDF',
      subtitle: 'Tổng hợp năng suất, tài chính, mục tiêu, ghi chú và nhận xét AI với bản in PDF chuẩn Unicode.',
      customStart: 'Từ ngày',
      customEnd: 'Đến ngày',
      generateAI: 'Phân tích AI cho kỳ này',
      generatingAI: 'Đang tạo phân tích...',
      exportPDF: 'Tải xuống PDF',
      previewPDF: 'Xem trước PDF',
      savedReportsTitle: 'Báo cáo AI đã lưu',
      overviewSection: 'Tổng quan hiệu suất & Tài chính',
      tasksSection: 'Chi tiết công việc',
      financeSection: 'Chi tiết thu chi',
      goalsHabitsSection: 'Mục tiêu & Thói quen',
      notesSection: 'Ghi chú quan trọng',
      ratesSection: 'Tỷ giá ngoại tệ tham chiếu',
      aiInsightsSection: 'Nhận xét chuyên sâu từ AI',
      noInsightsYet: 'Nhấn "Phân tích AI cho kỳ này" để tạo nhận xét dựa trên số liệu thực tế.',
    },
    settings: {
      title: 'Cài đặt & Cá nhân hóa',
      subtitle: 'Tùy chỉnh giao diện, ngôn ngữ, ngân sách, lịch làm việc và sao lưu dữ liệu.',
      profileSection: 'Hồ sơ & Ngôn ngữ',
      displayNameLabel: 'Tên hiển thị',
      languageLabel: 'Ngôn ngữ giao diện',
      themeLabel: 'Chủ đề màu sắc',
      themeWarmIvory: 'Warm Ivory (Ngà ấm cổ điển)',
      themeSoftBlush: 'Soft Blush (Hồng phấn dịu nhẹ)',
      preferredCurrencyLabel: 'Ngoại tệ ưu tiên theo dõi',
      notificationsLabel: 'Bật nhắc nhở công việc & thói quen trong ứng dụng',
      workScheduleLabel: 'Khung giờ làm việc hằng ngày',
      workStart: 'Bắt đầu',
      workEnd: 'Kết thúc',
      budgetSection: 'Ngân sách & Tiết kiệm',
      monthlyBudgetLabel: 'Hạn mức chi tiêu tháng (VND)',
      savingsGoalLabel: 'Mục tiêu tiết kiệm tháng (VND)',
      alertThresholdLabel: 'Ngưỡng cảnh báo ngân sách (%)',
      saveSettings: 'Lưu cài đặt',
      settingsSaved: 'Đã lưu cài đặt cá nhân.',
      demoSection: 'Dữ liệu mẫu trải nghiệm',
      loadDemoBtn: 'Nạp dữ liệu mẫu',
      clearDemoBtn: 'Xóa toàn bộ dữ liệu mẫu',
      demoLoaded: 'Đã nạp dữ liệu mẫu vào tài khoản.',
      demoCleared: 'Đã xóa sạch dữ liệu mẫu.',
      backupSection: 'Sao lưu & Khôi phục JSON',
      exportJsonBtn: 'Tải bản sao lưu JSON',
      restoreJsonBtn: 'Khôi phục từ tệp JSON',
      restoreSuccess: 'Đã khôi phục dữ liệu sao lưu thành công.',
      securitySection: 'Bảo mật & Phiên đăng nhập',
      securityDesc: 'Mọi dữ liệu của bạn được lưu tách biệt theo UID trên Cloud Firestore với quy tắc chỉ chủ sở hữu mới có quyền đọc và ghi.',
    },
  },
  en: {
    brandTagline: 'Refined personal productivity & finance workspace',
    loadingApp: 'Initializing Daily Hub...',
    nav: {
      dashboard: 'Dashboard',
      tasks: 'Tasks',
      expenses: 'Finances',
      notes: 'Notes',
      goalsHabits: 'Goals & Habits',
      exchangeRates: 'Exchange Rates',
      aiAssistant: 'AI Workspace',
      reports: 'Reports & PDF',
      settings: 'Settings',
    },
    common: {
      save: 'Save',
      saving: 'Saving...',
      saved: 'Saved',
      cancel: 'Cancel',
      create: 'Create',
      edit: 'Edit',
      delete: 'Delete',
      confirm: 'Confirm',
      search: 'Search...',
      all: 'All',
      today: 'Today',
      yesterday: 'Yesterday',
      tomorrow: 'Tomorrow',
      none: 'None',
      add: 'Add',
      close: 'Close',
      refresh: 'Refresh',
      loading: 'Loading...',
      noData: 'No data available',
      viewAll: 'View all',
      signOut: 'Sign out',
      timezoneNote: 'Timezone Asia/Ho_Chi_Minh · VND',
      quickAddTask: 'Add task',
      quickAddExpense: 'Add entry',
      quickAddNote: 'Add note',
      minutesShort: 'min',
      requiredField: 'Please fill in all required fields.',
    },
    login: {
      title: 'Daily Hub 2.0',
      subtitle: 'A calm, refined personal workspace to align daily tasks, personal finances, lasting habits, and real-time exchange rates.',
      feature1Title: 'Tasks, Kanban & Time-Blocking',
      feature1Desc: 'Drag-and-drop Kanban board, calendar view, subtasks, recurrence, and reminders.',
      feature2Title: 'Personal Finance & 06:00 VN Rates',
      feature2Desc: 'Track cash flow, monthly budgets, savings goals, and live verified VND exchange rates.',
      feature3Title: 'Gemini AI Workspace & PDF Reports',
      feature3Desc: 'Analyze real workspace data in English or Vietnamese and export polished PDF reports.',
      googleButton: 'Continue with Google',
      signingIn: 'Connecting to Google...',
      securityNote: 'Your personal records are isolated and protected per account in Cloud Firestore.',
    },
    taskStatus: {
      todo: 'To Do',
      in_progress: 'In Progress',
      completed: 'Completed',
      on_hold: 'On Hold',
    },
    taskPriority: {
      low: 'Low',
      medium: 'Medium',
      high: 'High',
      urgent: 'Urgent',
    },
    taskRecurrence: {
      none: 'No recurrence',
      daily: 'Daily',
      weekly: 'Weekly',
      monthly: 'Monthly',
    },
    taskCategories: {
      Work: 'Work',
      Personal: 'Personal',
      Learning: 'Learning',
      Finance: 'Finance',
      Health: 'Health',
      Family: 'Family',
      Other: 'Other',
    },
    transactionCategories: {
      food: 'Food & Dining',
      transportation: 'Transportation',
      shopping: 'Shopping',
      education: 'Education',
      bills: 'Bills & Utilities',
      entertainment: 'Entertainment',
      health: 'Health',
      salary: 'Salary & Income',
      other: 'Other',
    },
    paymentMethods: {
      cash: 'Cash',
      bank_transfer: 'Bank Transfer',
      e_wallet: 'E-Wallet',
    },
    transactionRecurrence: {
      none: 'One-time',
      weekly: 'Weekly',
      monthly: 'Monthly',
    },
    noteCategories: {
      Work: 'Work',
      Ideas: 'Ideas',
      Learning: 'Learning',
      Planning: 'Planning',
      Finance: 'Finance',
      Personal: 'Personal',
    },
    goalPeriods: {
      weekly: 'Weekly Goal',
      monthly: 'Monthly Goal',
      quarterly: 'Quarterly Goal',
      yearly: 'Yearly Goal',
    },
    goalCategories: {
      Productivity: 'Productivity',
      Finance: 'Finance',
      Health: 'Health',
      Learning: 'Learning',
      Personal: 'Personal',
      Other: 'Other',
    },
    habitFrequencies: {
      daily: 'Daily',
      weekly: 'Weekly',
    },
    reportPeriods: {
      daily: 'Daily',
      weekly: 'Weekly',
      monthly: 'Monthly',
      custom: 'Custom Date Range',
    },
    dashboard: {
      todayProgress: "Today's Progress",
      tasksCompletedLabel: 'Tasks completed',
      pendingCount: 'Pending',
      overdueCount: 'Overdue',
      todayIncome: "Today's Income",
      todayExpense: "Today's Expenses",
      monthlyBudgetProgress: 'Monthly Budget',
      budgetExceeded: 'Over budget',
      budgetWarning: 'Near alert threshold',
      budgetHealthy: 'Healthy pace',
      weeklyProductivity: '7-Day Productivity',
      monthlySpendingTrend: 'Monthly Spending Trend',
      expenseBreakdown: 'Expense Breakdown',
      incomeVsExpense: 'Income vs Expenses (6 Months)',
      todaySchedule: "Today's Time-Blocks & Schedule",
      upcomingDeadlines: 'Upcoming Deadlines',
      dailyGoalsHabits: 'Daily Goals & Habits',
      recentTransactions: 'Recent Transactions',
      quickNotes: 'Quick Notes',
      exchangeHighlights: 'Exchange Rate Highlights',
      activityTimeline: 'Recent Activity Timeline',
      noTasksToday: 'No tasks scheduled for today yet.',
      noDeadlines: 'No upcoming deadlines.',
      noTransactions: 'No transactions recorded yet.',
      noNotes: 'No notes yet. Capture your first thought.',
      noHabits: 'No habits tracked yet. Add a habit to start a streak.',
      noActivities: 'No recent workspace activity recorded.',
      quickNotePlaceholder: 'Jot down a quick note or reminder for today...',
      saveQuickNote: 'Save quick note',
      quickNoteSaved: 'Quick note saved.',
    },
    tasks: {
      title: 'Task Management',
      subtitle: 'Organize tasks with List, drag-and-drop Kanban board, and Calendar views.',
      addTask: 'New Task',
      editTask: 'Edit Task',
      viewList: 'List',
      viewKanban: 'Kanban',
      viewCalendar: 'Calendar',
      carryForwardBtn: 'Carry forward unfinished tasks',
      carryForwardConfirmTitle: 'Confirm Carry Forward',
      carryForwardConfirmDesc: 'Move overdue unfinished tasks to today?',
      carryForwardDone: 'Unfinished tasks carried forward to today.',
      searchPlaceholder: 'Search by title, description, notes...',
      filterCategory: 'Category',
      filterPriority: 'Priority',
      filterStatus: 'Status',
      filterDate: 'Filter date',
      weeklyProgress: 'Weekly Progress',
      monthlyProgress: 'Monthly Progress',
      titleLabel: 'Task title',
      descLabel: 'Description',
      categoryLabel: 'Category',
      priorityLabel: 'Priority',
      statusLabel: 'Status',
      startDateLabel: 'Start date',
      deadlineLabel: 'Deadline',
      recurrenceLabel: 'Recurrence',
      timeBlockLabel: 'Time-block start',
      durationLabel: 'Estimated duration (min)',
      reminderLabel: 'Reminder time',
      notesLabel: 'Additional notes',
      subtasksLabel: 'Subtasks (Checklist)',
      addSubtaskPlaceholder: 'Add a subtask and press Enter...',
      carriedFrom: 'Carried from',
      dragHint: 'Drag and drop cards across columns to update status',
      emptyState: 'No tasks match your current filters.',
      deleteConfirm: 'Are you sure you want to delete this task?',
    },
    expenses: {
      title: 'Financial Management',
      subtitle: 'Track income, expenses, net cash flow, monthly budget, and savings progress.',
      addTransaction: 'Record Transaction',
      editTransaction: 'Edit Transaction',
      totalIncome: 'Total Income',
      totalExpense: 'Total Expenses',
      netCashFlow: 'Net Cash Flow',
      remainingBudget: 'Remaining Budget',
      savingsRate: 'Savings Rate',
      monthlyBudget: 'Monthly Budget',
      savingsGoalLabel: 'Monthly Savings Goal',
      savingsGoalProgress: 'Savings Progress',
      income: 'Income',
      expense: 'Expense',
      amountLabel: 'Amount (VND)',
      dateLabel: 'Transaction date',
      categoryLabel: 'Category',
      paymentMethodLabel: 'Payment method',
      descriptionLabel: 'Description',
      noteLabel: 'Notes',
      recurringLabel: 'Recurring entry',
      recurringTriggerBtn: 'Record next occurrence',
      recurringConfirmDesc: 'Confirm recording this recurring transaction for the next period?',
      viewList: 'Transactions',
      viewCalendar: 'Financial Calendar',
      categoryChart: 'Expense Breakdown by Category',
      monthlyComparisonChart: 'Monthly Income vs Expenses',
      searchPlaceholder: 'Search transactions by description or note...',
      budgetAlertTitle: 'Budget Alert',
      emptyState: 'No financial transactions recorded for this period yet.',
      deleteConfirm: 'Confirm deleting this transaction?',
    },
    notes: {
      title: 'Notes & Knowledge',
      subtitle: 'Write rich structured notes with folders, tags, task links, and automatic saving.',
      newNote: 'New Note',
      searchPlaceholder: 'Search title, content, tags...',
      allFolders: 'All folders',
      archivedTab: 'Archived',
      activeTab: 'Active',
      pinnedSection: 'Pinned',
      titlePlaceholder: 'Note title...',
      folderLabel: 'Folder',
      folderPlaceholder: 'e.g. Q2 Projects, Reading...',
      categoryLabel: 'Category',
      tagsLabel: 'Tags (comma-separated)',
      tagsPlaceholder: 'planning, priority...',
      linkedTaskLabel: 'Linked task',
      attachmentsLabel: 'Reference Links / Attachments',
      attachmentNamePlaceholder: 'Link label',
      attachmentUrlPlaceholder: 'https://...',
      addAttachment: 'Add link',
      invalidUrl: 'Only http:// and https:// URLs are supported.',
      pinNote: 'Pin note',
      unpinNote: 'Unpin note',
      archiveNote: 'Archive',
      restoreNote: 'Restore',
      autosaving: 'Autosaving...',
      autosaved: 'Autosaved',
      unsavedChanges: 'Unsaved changes',
      emptyState: 'No notes in this view yet.',
      selectPrompt: 'Select a note on the left or create a new note to start writing.',
    },
    goalsHabits: {
      title: 'Goals & Habit Tracker',
      subtitle: 'Set meaningful targets and sustain daily and weekly habits with streak tracking.',
      goalsTab: 'Personal Goals',
      habitsTab: 'Habit Tracker',
      addGoal: 'New Goal',
      editGoal: 'Update Goal',
      addHabit: 'New Habit',
      editHabit: 'Edit Habit',
      goalTitle: 'Goal title',
      goalDesc: 'Description & motivation',
      goalPeriod: 'Goal period',
      goalTarget: 'Target value',
      goalCurrent: 'Current progress',
      goalUnit: 'Unit (e.g. books, hrs, %)',
      goalTargetDate: 'Target date',
      habitTitle: 'Habit title',
      habitFrequency: 'Frequency',
      habitReminder: 'Daily reminder time',
      streakDays: 'day streak',
      completionGrid: '14-Day Completion History',
      progressChart: 'Goal Progress Overview',
      markTodayDone: 'Check in today',
      completedToday: 'Done today',
      emptyGoals: 'No personal goals yet. Create your first goal to track progress.',
      emptyHabits: 'No habits tracked yet.',
    },
    exchangeRates: {
      title: 'Exchange Rate Center',
      subtitle: 'Verified external rates against VND, automatically scheduled daily at 06:00 (Asia/Ho_Chi_Minh).',
      manualRefresh: 'Refresh Now',
      refreshing: 'Refreshing...',
      scheduleBanner: 'Daily Auto-Sync Schedule: 06:00 AM (Asia/Ho_Chi_Minh)',
      staleWarning: 'Showing last saved rates because the live upstream provider is temporarily unreachable.',
      unavailableBanner: 'Live exchange rate providers are temporarily unavailable. No synthetic rates are substituted.',
      effectiveDate: 'Effective Date',
      lastUpdated: 'Last Updated',
      sourceLabel: 'Source',
      conversionDirection: 'Direction: 1 Foreign Unit = VND',
      previousDayRate: 'Previous day',
      dailyChange: '24h Change',
      converterTitle: 'Currency Converter',
      amountInput: 'Amount',
      fromCurrency: 'From',
      toCurrency: 'To',
      convertedResult: 'Converted Amount',
      historyTitle: 'Historical Exchange Rate Trend',
      days7: '7 Days',
      days30: '30 Days',
      days90: '90 Days',
      historyUnavailable: 'Unable to load historical trend data for this currency right now.',
    },
    aiAssistant: {
      title: 'Personal AI Workspace (Gemini)',
      subtitle: 'Analyze your actual tasks, finances, notes, goals, and live exchange rates.',
      welcomeMessage: 'Hello! I am your Daily Hub AI assistant. I rely strictly on your saved workspace records and clearly separate [Actual Data] from [AI Suggestion]. How can I help organize your day?',
      placeholder: 'Ask a question or paste natural text to draft a task...',
      send: 'Send',
      thinking: 'Analyzing workspace...',
      factBadge: 'Actual Data',
      suggestionBadge: 'AI Suggestion',
      confirmActionBtn: 'Confirm & Apply',
      actionConfirmed: 'Saved to your workspace',
      clearChat: 'New conversation',
      prompts: {
        schedule: 'Plan my daily schedule based on deadlines & priorities',
        spending: 'Analyze unusual spending & monthly budget progress',
        summarizeNotes: 'Summarize my recent pinned and key notes',
        draftTask: 'Draft task: Finish monthly finance review by Friday (45 min)',
        currencyTrend: 'Explain current USD/EUR/JPY exchange rate movements',
        dailyReport: 'Draft a concise end-of-day productivity summary',
      },
    },
    reports: {
      title: 'Reports & PDF Export',
      subtitle: 'Comprehensive daily, weekly, monthly, and custom range reports with full Unicode PDF export.',
      customStart: 'Start date',
      customEnd: 'End date',
      generateAI: 'Generate AI Insights',
      generatingAI: 'Generating...',
      exportPDF: 'Download PDF',
      previewPDF: 'Preview PDF',
      savedReportsTitle: 'Saved AI Reports',
      overviewSection: 'Productivity & Financial Overview',
      tasksSection: 'Tasks Summary',
      financeSection: 'Transactions & Budget',
      goalsHabitsSection: 'Goals & Habits Summary',
      notesSection: 'Key Notes',
      ratesSection: 'Reference Exchange Rates',
      aiInsightsSection: 'AI Analyst Commentary',
      noInsightsYet: 'Click "Generate AI Insights" to create analysis grounded in your actual period data.',
    },
    settings: {
      title: 'Settings & Personalization',
      subtitle: 'Customize language, warm theme palette, budget limits, work hours, and backups.',
      profileSection: 'Profile & Preferences',
      displayNameLabel: 'Display name',
      languageLabel: 'Interface language',
      themeLabel: 'Color theme',
      themeWarmIvory: 'Warm Ivory (Classic Cream)',
      themeSoftBlush: 'Soft Blush (Gentle Rose)',
      preferredCurrencyLabel: 'Preferred highlighted currency',
      notificationsLabel: 'Enable in-app task & habit reminders',
      workScheduleLabel: 'Daily work schedule',
      workStart: 'Start time',
      workEnd: 'End time',
      budgetSection: 'Budget & Savings Targets',
      monthlyBudgetLabel: 'Monthly expense budget (VND)',
      savingsGoalLabel: 'Monthly savings goal (VND)',
      alertThresholdLabel: 'Budget warning threshold (%)',
      saveSettings: 'Save Settings',
      settingsSaved: 'Personal settings saved.',
      demoSection: 'Sample Demo Workspace',
      loadDemoBtn: 'Load Sample Data',
      clearDemoBtn: 'Remove Sample Data',
      demoLoaded: 'Sample data loaded into your account.',
      demoCleared: 'All sample data removed.',
      backupSection: 'JSON Backup & Restore',
      exportJsonBtn: 'Export JSON Backup',
      restoreJsonBtn: 'Restore from JSON',
      restoreSuccess: 'Backup restored successfully.',
      securitySection: 'Security & Account',
      securityDesc: 'Your data is stored privately under your authenticated UID in Cloud Firestore with owner-only rules.',
    },
  },
};
