import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  CURRENCY_NAMES,
  TARGET_CURRENCIES,
  type ExchangeRateSnapshot,
  type Goal,
  type Habit,
  type LanguageCode,
  type Note,
  type ReportPeriodType,
  type Task,
  type Transaction,
} from '../types';
import { TRANSLATIONS } from '../i18n/translations';
import {
  calculateHabitStreak,
  formatDateTime,
  formatRateVND,
  formatShortDate,
  formatVND,
  getTodayVN,
} from '../utils/date';

let cachedRegularFontBase64: string | null = null;
let cachedBoldFontBase64: string | null = null;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

async function loadUnicodeFonts(doc: jsPDF): Promise<string> {
  try {
    if (!cachedRegularFontBase64) {
      const regRes = await fetch('/fonts/DejaVuSans.ttf');
      if (regRes.ok) {
        cachedRegularFontBase64 = arrayBufferToBase64(await regRes.arrayBuffer());
      }
    }
    if (!cachedBoldFontBase64) {
      const boldRes = await fetch('/fonts/DejaVuSans-Bold.ttf');
      if (boldRes.ok) {
        cachedBoldFontBase64 = arrayBufferToBase64(await boldRes.arrayBuffer());
      }
    }

    if (cachedRegularFontBase64) {
      doc.addFileToVFS('DejaVuSans.ttf', cachedRegularFontBase64);
      doc.addFont('DejaVuSans.ttf', 'DejaVuSans', 'normal');
      if (cachedBoldFontBase64) {
        doc.addFileToVFS('DejaVuSans-Bold.ttf', cachedBoldFontBase64);
        doc.addFont('DejaVuSans-Bold.ttf', 'DejaVuSans', 'bold');
      }
      doc.setFont('DejaVuSans', 'normal');
      return 'DejaVuSans';
    }
  } catch (err) {
    console.warn('Could not load Unicode TTF font for PDF, falling back:', err);
  }
  return 'helvetica';
}

export interface ReportPdfInput {
  language: LanguageCode;
  periodType: ReportPeriodType;
  periodLabel: string;
  userName: string;
  tasks: Task[];
  completedTasks: Task[];
  pendingTasks: Task[];
  progressPercent: number;
  transactions: Transaction[];
  totalIncome: number;
  totalExpense: number;
  monthlyBudget: number;
  expenseByCategory: Array<{ category: string; label: string; amount: number }>;
  goals: Goal[];
  habits: Habit[];
  importantNotes: Note[];
  latestRates: ExchangeRateSnapshot | null;
  aiInsights: string;
}

export async function generateReportPdfDoc(input: ReportPdfInput): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const fontName = await loadUnicodeFonts(doc);
  const lang = input.language;
  const dict = TRANSLATIONS[lang];
  const today = getTodayVN();

  const periodTitleMap: Record<ReportPeriodType, string> =
    lang === 'en'
      ? {
          daily: 'DAILY REPORT',
          weekly: 'WEEKLY REPORT',
          monthly: 'MONTHLY REPORT',
          custom: 'CUSTOM PERIOD REPORT',
        }
      : {
          daily: 'BÁO CÁO NGÀY',
          weekly: 'BÁO CÁO TUẦN',
          monthly: 'BÁO CÁO THÁNG',
          custom: 'BÁO CÁO TÙY CHỌN',
        };

  // Warm Coffee Brown header band with Blush Pink accent rule
  doc.setFillColor(85, 68, 63); // #55443F
  doc.rect(0, 0, 210, 33, 'F');
  doc.setFillColor(235, 207, 208); // #EBCFD0
  doc.rect(0, 33, 210, 2, 'F');

  doc.setTextColor(248, 245, 240);
  doc.setFont(fontName, 'bold');
  doc.setFontSize(16);
  doc.text(`DAILY HUB — ${periodTitleMap[input.periodType]}`, 14, 14);
  doc.setFont(fontName, 'normal');
  doc.setFontSize(9.5);
  doc.text(
    lang === 'en' ? `Period: ${input.periodLabel}` : `Kỳ báo cáo: ${input.periodLabel}`,
    14,
    21
  );
  doc.text(
    lang === 'en'
      ? `Prepared for: ${input.userName}  ·  Exported: ${formatDateTime(new Date().toISOString(), lang)}`
      : `Người dùng: ${input.userName}  ·  Xuất lúc: ${formatDateTime(new Date().toISOString(), lang)}`,
    14,
    27.5
  );

  let cursorY = 43;
  doc.setTextColor(85, 68, 63);

  // 1. Overview KPI Summary Table
  doc.setFont(fontName, 'bold');
  doc.setFontSize(11.5);
  doc.text(
    lang === 'en' ? '1. PRODUCTIVITY & FINANCIAL OVERVIEW' : '1. TỔNG QUAN HIỆU SUẤT & TÀI CHÍNH',
    14,
    cursorY
  );
  cursorY += 3;

  const netFlow = input.totalIncome - input.totalExpense;
  const remainingBudget = Math.max(0, input.monthlyBudget - input.totalExpense);

  autoTable(doc, {
    startY: cursorY,
    styles: { font: fontName, fontSize: 9, cellPadding: 2.8, textColor: [85, 68, 63] },
    headStyles: { fillColor: [167, 124, 120], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 245, 240] },
    head: [
      lang === 'en'
        ? ['Metric', 'Value', 'Metric', 'Value']
        : ['Chỉ số', 'Giá trị', 'Chỉ số', 'Giá trị'],
    ],
    body: [
      [
        lang === 'en' ? 'Total Tasks' : 'Tổng công việc',
        String(input.tasks.length),
        lang === 'en' ? 'Total Income' : 'Tổng thu nhập',
        formatVND(input.totalIncome, lang),
      ],
      [
        lang === 'en' ? 'Completed' : 'Đã hoàn thành',
        `${input.completedTasks.length} (${input.progressPercent}%)`,
        lang === 'en' ? 'Total Expenses' : 'Tổng chi tiêu',
        formatVND(input.totalExpense, lang),
      ],
      [
        lang === 'en' ? 'Pending / Open' : 'Đang chờ / Chưa xong',
        String(input.pendingTasks.length),
        lang === 'en' ? 'Net Cash Flow' : 'Dòng tiền ròng',
        formatVND(netFlow, lang),
      ],
      [
        lang === 'en' ? 'Active Goals' : 'Mục tiêu theo dõi',
        String(input.goals.length),
        lang === 'en' ? 'Remaining Budget' : 'Ngân sách còn lại',
        formatVND(remainingBudget, lang),
      ],
    ],
  });

  cursorY = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? cursorY + 32) + 8;

  // 2. Tasks Table
  doc.setFont(fontName, 'bold');
  doc.setFontSize(11.5);
  doc.text(lang === 'en' ? '2. TASK DETAILS' : '2. CHI TIẾT CÔNG VIỆC', 14, cursorY);
  cursorY += 3;

  autoTable(doc, {
    startY: cursorY,
    styles: { font: fontName, fontSize: 8.5, cellPadding: 2.4, textColor: [85, 68, 63] },
    headStyles: { fillColor: [85, 68, 63], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 245, 240] },
    head: [
      lang === 'en'
        ? ['Title', 'Category', 'Priority', 'Deadline', 'Status']
        : ['Tiêu đề', 'Danh mục', 'Ưu tiên', 'Hạn chót', 'Trạng thái'],
    ],
    body:
      input.tasks.length > 0
        ? input.tasks.map((t) => [
            t.title,
            dict.taskCategories[t.category] || t.category,
            dict.taskPriority[t.priority],
            formatShortDate(t.deadline, lang),
            dict.taskStatus[t.status],
          ])
        : [[lang === 'en' ? 'No tasks in this period.' : 'Không có công việc nào trong kỳ báo cáo này.', '', '', '', '']],
  });

  cursorY = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? cursorY + 25) + 8;

  // 3. Expense Breakdown Table
  if (cursorY > 235) {
    doc.addPage();
    cursorY = 18;
  }
  doc.setFont(fontName, 'bold');
  doc.setFontSize(11.5);
  doc.text(lang === 'en' ? '3. EXPENSE BREAKDOWN' : '3. PHÂN BỔ CHI TIÊU THEO DANH MỤC', 14, cursorY);
  cursorY += 3;

  autoTable(doc, {
    startY: cursorY,
    styles: { font: fontName, fontSize: 8.8, cellPadding: 2.4, textColor: [85, 68, 63] },
    headStyles: { fillColor: [85, 68, 63], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 245, 240] },
    head: [lang === 'en' ? ['Category', 'Amount (VND)', 'Share'] : ['Danh mục', 'Số tiền (VND)', 'Tỷ trọng']],
    body:
      input.expenseByCategory.length > 0
        ? input.expenseByCategory.map((row) => [
            row.label,
            formatVND(row.amount, lang),
            input.totalExpense > 0 ? `${Math.round((row.amount / input.totalExpense) * 100)}%` : '0%',
          ])
        : [[lang === 'en' ? 'No expenses recorded in this period.' : 'Chưa có chi tiêu trong kỳ này.', formatVND(0, lang), '0%']],
  });

  cursorY = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? cursorY + 25) + 8;

  // 4. Goals & Habits Summary
  if (input.goals.length > 0 || input.habits.length > 0) {
    if (cursorY > 235) {
      doc.addPage();
      cursorY = 18;
    }
    doc.setFont(fontName, 'bold');
    doc.setFontSize(11.5);
    doc.text(lang === 'en' ? '4. GOALS & HABITS' : '4. MỤC TIÊU & THÓI QUEN', 14, cursorY);
    cursorY += 3;

    const rows: string[][] = [
      ...input.goals.slice(0, 8).map((g) => [
        lang === 'en' ? 'Goal' : 'Mục tiêu',
        g.title,
        `${g.currentValue}/${g.targetValue} ${g.unit} (${Math.min(100, Math.round((g.currentValue / Math.max(1, g.targetValue)) * 100))}%)`,
      ]),
      ...input.habits.slice(0, 8).map((h) => [
        lang === 'en' ? 'Habit' : 'Thói quen',
        h.title,
        `${calculateHabitStreak(h.completedDates || [], today)} ${dict.goalsHabits.streakDays}`,
      ]),
    ];

    autoTable(doc, {
      startY: cursorY,
      styles: { font: fontName, fontSize: 8.5, cellPadding: 2.4, textColor: [85, 68, 63] },
      headStyles: { fillColor: [85, 68, 63], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 245, 240] },
      head: [lang === 'en' ? ['Type', 'Title', 'Progress / Streak'] : ['Loại', 'Tên mục tiêu / thói quen', 'Tiến độ / Chuỗi']],
      body: rows,
    });

    cursorY = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? cursorY + 25) + 8;
  }

  // 5. Recent Transactions
  if (input.transactions.length > 0) {
    if (cursorY > 230) {
      doc.addPage();
      cursorY = 18;
    }
    doc.setFont(fontName, 'bold');
    doc.setFontSize(11.5);
    doc.text(lang === 'en' ? '5. TRANSACTION LOG' : '5. DANH SÁCH GIAO DỊCH', 14, cursorY);
    cursorY += 3;

    autoTable(doc, {
      startY: cursorY,
      styles: { font: fontName, fontSize: 8.3, cellPadding: 2.3, textColor: [85, 68, 63] },
      headStyles: { fillColor: [85, 68, 63], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 245, 240] },
      head: [lang === 'en' ? ['Date', 'Type', 'Category', 'Description', 'Amount'] : ['Ngày', 'Loại', 'Danh mục', 'Mô tả', 'Số tiền']],
      body: input.transactions.slice(0, 25).map((tx) => [
        formatShortDate(tx.date, lang),
        tx.type === 'income' ? dict.expenses.income : dict.expenses.expense,
        dict.transactionCategories[tx.category],
        tx.description,
        formatVND(tx.amount, lang),
      ]),
    });

    cursorY = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? cursorY + 25) + 8;
  }

  // 6. Important Notes
  if (cursorY > 235) {
    doc.addPage();
    cursorY = 18;
  }
  doc.setFont(fontName, 'bold');
  doc.setFontSize(11.5);
  doc.text(lang === 'en' ? '6. KEY NOTES' : '6. GHI CHÚ QUAN TRỌNG', 14, cursorY);
  cursorY += 3;

  autoTable(doc, {
    startY: cursorY,
    styles: { font: fontName, fontSize: 8.5, cellPadding: 2.4, textColor: [85, 68, 63] },
    headStyles: { fillColor: [85, 68, 63], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 245, 240] },
    head: [lang === 'en' ? ['Title', 'Category', 'Summary'] : ['Tiêu đề', 'Danh mục', 'Nội dung tóm tắt']],
    body:
      input.importantNotes.length > 0
        ? input.importantNotes.slice(0, 10).map((n) => [
            n.title,
            dict.noteCategories[n.category] || n.category,
            n.content.replace(/[#*`]/g, '').slice(0, 180),
          ])
        : [[lang === 'en' ? 'No pinned or active notes.' : 'Chưa có ghi chú nổi bật.', '', '']],
  });

  cursorY = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? cursorY + 25) + 8;

  // 7. Exchange Rates Summary
  if (cursorY > 230) {
    doc.addPage();
    cursorY = 18;
  }
  doc.setFont(fontName, 'bold');
  doc.setFontSize(11.5);
  doc.text(
    lang === 'en' ? '7. REFERENCE EXCHANGE RATES (VS VND)' : '7. TÓM TẮT TỶ GIÁ NGOẠI TỆ (SO VỚI VND)',
    14,
    cursorY
  );
  cursorY += 3;

  if (input.latestRates) {
    autoTable(doc, {
      startY: cursorY,
      styles: { font: fontName, fontSize: 8.3, cellPadding: 2.1, textColor: [85, 68, 63] },
      headStyles: { fillColor: [85, 68, 63], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 245, 240] },
      head: [
        lang === 'en'
          ? ['Code', 'Currency', 'Rate (1 Unit = VND)', 'Effective Date']
          : ['Mã', 'Tên ngoại tệ', 'Tỷ giá (1 Ngoại tệ = VND)', 'Ngày hiệu lực'],
      ],
      body: TARGET_CURRENCIES.map((code) => [
        code,
        CURRENCY_NAMES[code][lang],
        typeof input.latestRates?.rates[code] === 'number'
          ? formatRateVND(input.latestRates.rates[code], lang)
          : dict.common.noData,
        formatShortDate(input.latestRates?.date || '', lang),
      ]),
    });
    cursorY = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? cursorY + 30) + 8;
  } else {
    doc.setFont(fontName, 'normal');
    doc.setFontSize(9.2);
    doc.text(
      lang === 'en' ? 'No exchange rate snapshot stored yet.' : 'Chưa có dữ liệu tỷ giá được lưu.',
      14,
      cursorY + 5
    );
    cursorY += 12;
  }

  // 8. AI Insights
  if (input.aiInsights.trim()) {
    if (cursorY > 230) {
      doc.addPage();
      cursorY = 18;
    }
    doc.setFont(fontName, 'bold');
    doc.setFontSize(11.5);
    doc.text(
      lang === 'en' ? '8. AI ANALYST COMMENTARY' : '8. PHÂN TÍCH & GỢI Ý TỪ TRỢ LÝ AI',
      14,
      cursorY
    );
    cursorY += 6;
    doc.setFont(fontName, 'normal');
    doc.setFontSize(9.2);
    const cleanInsights = input.aiInsights.replace(/\*\*/g, '').replace(/^#+\s*/gm, '');
    const lines = doc.splitTextToSize(cleanInsights, 182) as string[];
    for (const line of lines) {
      if (cursorY > 280) {
        doc.addPage();
        cursorY = 18;
      }
      doc.text(line, 14, cursorY);
      cursorY += 4.8;
    }
  }

  return doc;
}
