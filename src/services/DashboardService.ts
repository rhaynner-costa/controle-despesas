import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import packageJson from '../../package.json';
import { IExpenseWithCategoryDTO } from '../models/Expense';
import { ExpenseRepository } from '../repositories/ExpenseRepository';

export interface ICategorySummaryItem {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  totalAmount: number;
  percentage: number;
  budgetLimit: number | null;
  budgetPercentage: number | null;
}

export interface IPieChartSlice {
  value: number;
  color: string;
  text: string;
  categoryName: string;
}

export interface IDailyMetric {
  date: string;
  formattedDate: string;
  shortDate: string;
  totalAmount: number;
}

export interface ILineChartPoint {
  value: number;
  label: string;
  date: string;
  formattedDate: string;
}

export interface IDashboardSummary {
  yearMonth: string;
  daysInMonth: number;
  totalMonthAmount: number;
  dailyAverage: number;
  minSpendingDay: IDailyMetric | null;
  maxSpendingDay: IDailyMetric | null;
  timelineChartData: ILineChartPoint[];
  categoriesSummary: ICategorySummaryItem[];
  pieChartData: IPieChartSlice[];
}

export class DashboardService {
  private static readonly DEFAULT_COLOR = '#6200EE';
  private readonly expenseRepository: ExpenseRepository;
  private readonly onSystemDialogStateChange?: (open: boolean) => void;

  public constructor(
    expenseRepository: ExpenseRepository,
    onSystemDialogStateChange?: (open: boolean) => void
  ) {
    this.expenseRepository = expenseRepository;
    this.onSystemDialogStateChange = onSystemDialogStateChange;
  }

  public async getMonthlySummary(
    userId: string,
    yearMonth: string
  ): Promise<IDashboardSummary> {
    const activeExpenses = await this.expenseRepository.findActiveByMonth(
      userId,
      yearMonth
    );

    return this.calculateSummary(yearMonth, activeExpenses);
  }

  private calculateSummary(
    yearMonth: string,
    expenses: IExpenseWithCategoryDTO[]
  ): IDashboardSummary {
    const daysInMonth = DashboardService.getDaysInMonth(yearMonth);
    const totalRaw = expenses.reduce((sum, item) => sum + item.amount, 0);
    const totalMonthAmount = Math.round(totalRaw * 100) / 100;

    if (totalMonthAmount === 0) {
      return {
        yearMonth,
        daysInMonth,
        totalMonthAmount: 0,
        dailyAverage: 0,
        minSpendingDay: null,
        maxSpendingDay: null,
        timelineChartData: [],
        categoriesSummary: [],
        pieChartData: [],
      };
    }

    const dailyAverage =
      Math.round((totalMonthAmount / daysInMonth) * 100) / 100;

    const grouped = new Map<
      string,
      {
        name: string;
        color: string;
        sum: number;
        budgetLimit: number | null;
      }
    >();
    const dailyMap = new Map<string, number>();

    for (const expense of expenses) {
      const current = grouped.get(expense.categoryId);
      const color = expense.categoryColor || DashboardService.DEFAULT_COLOR;

      if (current) {
        current.sum = Math.round((current.sum + expense.amount) * 100) / 100;
      } else {
        grouped.set(expense.categoryId, {
          name: expense.categoryName,
          color,
          sum: Math.round(expense.amount * 100) / 100,
          budgetLimit: expense.categoryBudgetLimit,
        });
      }

      const previousDaySum = dailyMap.get(expense.expenseDate) ?? 0;
      dailyMap.set(
        expense.expenseDate,
        Math.round((previousDaySum + expense.amount) * 100) / 100
      );
    }

    const dailyMetrics: IDailyMetric[] = Array.from(dailyMap.entries())
      .map(([date, sum]) => ({
        date,
        formattedDate: DashboardService.formatIsoDatePtBr(date),
        shortDate: DashboardService.formatShortIsoDatePtBr(date),
        totalAmount: sum,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    let minSpendingDay: IDailyMetric | null = null;
    let maxSpendingDay: IDailyMetric | null = null;

    for (const dayItem of dailyMetrics) {
      if (!minSpendingDay || dayItem.totalAmount < minSpendingDay.totalAmount) {
        minSpendingDay = dayItem;
      }
      if (!maxSpendingDay || dayItem.totalAmount > maxSpendingDay.totalAmount) {
        maxSpendingDay = dayItem;
      }
    }

    const timelineChartData: ILineChartPoint[] =
      DashboardService.buildWeeklyTimelineData(yearMonth, daysInMonth, dailyMap);

    const categoriesSummary: ICategorySummaryItem[] = Array.from(
      grouped.entries()
    )
      .map(([categoryId, data]) => {
        const percentage =
          Math.round(((data.sum / totalMonthAmount) * 100) * 10) / 10;
        const budgetLimit =
          data.budgetLimit !== null && data.budgetLimit > 0
            ? data.budgetLimit
            : null;
        const budgetPercentage =
          budgetLimit !== null
            ? Math.round(((data.sum / budgetLimit) * 100) * 10) / 10
            : null;
        return {
          categoryId,
          categoryName: data.name,
          categoryColor: data.color,
          totalAmount: data.sum,
          percentage,
          budgetLimit,
          budgetPercentage,
        };
      })
      .sort((a, b) => b.totalAmount - a.totalAmount);

    const pieChartData: IPieChartSlice[] = categoriesSummary.map((item) => ({
      value: item.totalAmount,
      color: item.categoryColor,
      text: `${item.percentage.toFixed(1).replace('.', ',')}%`,
      categoryName: item.categoryName,
    }));

    return {
      yearMonth,
      daysInMonth,
      totalMonthAmount,
      dailyAverage,
      minSpendingDay,
      maxSpendingDay,
      timelineChartData,
      categoriesSummary,
      pieChartData,
    };
  }

  private static readonly BASE_Y_STEPS: readonly number[] = [0, 25, 100, 250, 500];

  public static getChartYAxisSteps(points: ILineChartPoint[]): number[] {
    const highest = points.reduce((max, pt) => Math.max(max, pt.value), 0);
    if (highest <= 500) {
      return [...DashboardService.BASE_Y_STEPS];
    }
    const rawFactor = highest / 500;
    const niceMultipliers = [1.5, 2, 3, 4, 5, 8, 10, 15, 20, 25, 50, 100];
    const factor =
      niceMultipliers.find((m) => m >= rawFactor) ?? Math.ceil(rawFactor);
    return DashboardService.BASE_Y_STEPS.map((step) =>
      Math.round(step * factor)
    );
  }

  public static normalizeValueToChartScale(
    value: number,
    steps: readonly number[]
  ): number {
    if (value <= 0 || steps.length < 2) {
      return 0;
    }
    const sections = steps.length - 1;
    const maxStep = steps[sections];
    if (value >= maxStep) {
      return maxStep;
    }

    for (let i = 0; i < sections; i += 1) {
      const lower = steps[i];
      const upper = steps[i + 1];
      if (value >= lower && value <= upper) {
        const span = upper - lower;
        const fraction = span > 0 ? (value - lower) / span : 0;
        const sectionSize = maxStep / sections;
        return Math.round((i * sectionSize + fraction * sectionSize) * 100) / 100;
      }
    }

    return maxStep;
  }

  public static formatCompactAmount(value: number): string {
    const rounded = Math.round(value * 100) / 100;
    if (Number.isInteger(rounded)) {
      return String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    }
    return rounded
      .toFixed(2)
      .replace('.', ',')
      .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  private static buildWeeklyTimelineData(
    yearMonth: string,
    daysInMonth: number,
    dailyMap: Map<string, number>
  ): ILineChartPoint[] {
    const weekRanges: Array<{ label: string; startDay: number; endDay: number }> =
      [
        { label: 'Sem 1', startDay: 1, endDay: 7 },
        { label: 'Sem 2', startDay: 8, endDay: 14 },
        { label: 'Sem 3', startDay: 15, endDay: 21 },
        { label: 'Sem 4', startDay: 22, endDay: 28 },
      ];

    if (daysInMonth > 28) {
      weekRanges.push({
        label: 'Sem 5',
        startDay: 29,
        endDay: daysInMonth,
      });
    }

    const [, monthStr = '01'] = yearMonth.split('-');

    return weekRanges.map((range) => {
      let weekSum = 0;
      for (let d = range.startDay; d <= range.endDay; d += 1) {
        const dayKey = `${yearMonth}-${String(d).padStart(2, '0')}`;
        const dayVal = dailyMap.get(dayKey) ?? 0;
        weekSum = Math.round((weekSum + dayVal) * 100) / 100;
      }

      const startPad = String(range.startDay).padStart(2, '0');
      const endPad = String(range.endDay).padStart(2, '0');

      return {
        value: weekSum,
        label: range.label,
        date: `${yearMonth}-${startPad}`,
        formattedDate: `${startPad}/${monthStr} a ${endPad}/${monthStr}`,
      };
    });
  }

  private static getDaysInMonth(yearMonth: string): number {
    const [yearStr, monthStr] = yearMonth.split('-');
    const year = Number(yearStr);
    const month = Number(monthStr);
    if (!year || !month) {
      return 30;
    }
    return new Date(year, month, 0).getDate();
  }

  private static formatIsoDatePtBr(isoDate: string): string {
    const [year, month, day] = isoDate.split('-');
    if (!year || !month || !day) {
      return isoDate;
    }
    return `${day}/${month}/${year}`;
  }

  private static formatShortIsoDatePtBr(isoDate: string): string {
    const [, month, day] = isoDate.split('-');
    if (!month || !day) {
      return isoDate;
    }
    return `${day}/${month}`;
  }

  public async exportMonthlySummaryToPdf(
    summary: IDashboardSummary,
    formattedYearMonth: string,
    username: string
  ): Promise<void> {
    const sharingAvailable = await Sharing.isAvailableAsync();
    if (!sharingAvailable) {
      throw new Error(
        'O compartilhamento nativo não está disponível neste dispositivo.'
      );
    }

    const html = this.buildSummaryHtml(summary, formattedYearMonth, username);
    const { uri: generatedUri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    let shareUri = generatedUri;
    const targetDir = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;
    if (targetDir) {
      const [yearStr, monthStr] = summary.yearMonth.split('-');
      const fileMonthYear =
        yearStr && monthStr ? `${monthStr}-${yearStr}` : summary.yearMonth;
      const customUri = `${targetDir}relatorio-despesas-${fileMonthYear}.pdf`;
      const existingInfo = await FileSystem.getInfoAsync(customUri);
      if (existingInfo.exists) {
        await FileSystem.deleteAsync(customUri, { idempotent: true });
      }
      await FileSystem.copyAsync({
        from: generatedUri,
        to: customUri,
      });
      shareUri = customUri;
    }

    this.onSystemDialogStateChange?.(true);
    try {
      await Sharing.shareAsync(shareUri, {
        mimeType: 'application/pdf',
        dialogTitle: `Exportar Resultados (${formattedYearMonth})`,
        UTI: 'com.adobe.pdf',
      });
    } finally {
      this.onSystemDialogStateChange?.(false);
    }
  }

  private buildSummaryHtml(
    summary: IDashboardSummary,
    formattedYearMonth: string,
    username: string
  ): string {
    const radius = 76.5;
    const circumference = 2 * Math.PI * radius;
    let cumulativeLength = 0;

    const svgCircles = summary.categoriesSummary
      .map((item) => {
        const fraction =
          summary.totalMonthAmount > 0
            ? item.totalAmount / summary.totalMonthAmount
            : 0;
        const segmentLength = fraction * circumference;
        const dashArray = `${segmentLength.toFixed(2)} ${(
          circumference - segmentLength
        ).toFixed(2)}`;
        const dashOffset = (-cumulativeLength).toFixed(2);
        cumulativeLength += segmentLength;

        return `<circle
          cx="110"
          cy="110"
          r="${radius}"
          fill="transparent"
          stroke="${DashboardService.escapeHtml(item.categoryColor)}"
          stroke-width="37"
          stroke-dasharray="${dashArray}"
          stroke-dashoffset="${dashOffset}"
          transform="rotate(-90 110 110)"
        />`;
      })
      .join('\n');

    const metricsCardHtml =
      summary.totalMonthAmount > 0
        ? `
      <div class="metrics-card">
        <div class="metrics-title">Indicadores Diários (${summary.daysInMonth} dias no mês)</div>
        <div class="metrics-grid">
          <div class="metric-box">
            <div class="metric-label">Média por Dia</div>
            <div class="metric-value metric-primary">${DashboardService.formatCurrencyBRL(
              summary.dailyAverage
            )}</div>
            <div class="metric-sub">Total / ${summary.daysInMonth} dias</div>
          </div>
          <div class="metric-box">
            <div class="metric-label">Dia com Menor Gasto</div>
            <div class="metric-value metric-min">${
              summary.minSpendingDay
                ? DashboardService.formatCurrencyBRL(
                    summary.minSpendingDay.totalAmount
                  )
                : 'R$ 0,00'
            }</div>
            <div class="metric-sub">${
              summary.minSpendingDay
                ? DashboardService.escapeHtml(
                    summary.minSpendingDay.formattedDate
                  )
                : '-'
            }</div>
          </div>
          <div class="metric-box">
            <div class="metric-label">Dia com Maior Gasto</div>
            <div class="metric-value metric-max">${
              summary.maxSpendingDay
                ? DashboardService.formatCurrencyBRL(
                    summary.maxSpendingDay.totalAmount
                  )
                : 'R$ 0,00'
            }</div>
            <div class="metric-sub">${
              summary.maxSpendingDay
                ? DashboardService.escapeHtml(
                    summary.maxSpendingDay.formattedDate
                  )
                : '-'
            }</div>
          </div>
        </div>
      </div>
    `
        : '';

    const timelineSvgHtml = this.buildTimelineSvgHtml(summary.timelineChartData);

    const chartSectionHtml =
      summary.categoriesSummary.length > 0
        ? `
      ${timelineSvgHtml}
      <div class="chart-card">
        <svg width="220" height="220" viewBox="0 0 220 220">
          <circle cx="110" cy="110" r="${radius}" fill="transparent" stroke="#EEEEEE" stroke-width="37" />
          ${svgCircles}
          <text x="110" y="103" text-anchor="middle" fill="#666666" font-size="12" font-family="sans-serif">Categorias</text>
          <text x="110" y="125" text-anchor="middle" fill="#1C1B1F" font-size="20" font-weight="bold" font-family="sans-serif">${summary.categoriesSummary.length}</text>
        </svg>
      </div>
      <div class="section-header">Distribuição por Categoria</div>
    `
        : `
      <div class="empty-card">
        Nenhuma despesa ativa registrada em ${DashboardService.escapeHtml(formattedYearMonth)}.
      </div>
    `;

    const categoryRowsHtml = summary.categoriesSummary
      .map((item) => {
        const progressWidth = Math.min(100, Math.max(0, item.percentage)).toFixed(1);
        const formattedPercent = `${item.percentage.toFixed(1).replace('.', ',')}%`;
        const formattedAmount = DashboardService.formatCurrencyBRL(item.totalAmount);

        let budgetHtml = '';
        const hasBudget =
          item.budgetLimit !== null && item.budgetPercentage !== null;
        if (hasBudget) {
          const budgetWidth = Math.min(
            100,
            Math.max(0, item.budgetPercentage!)
          ).toFixed(1);
          const budgetGradient = DashboardService.getBudgetCssGradient(
            item.budgetPercentage!
          );
          const budgetStatusColor = DashboardService.getBudgetStatusHexColor(
            item.budgetPercentage!
          );
          const formattedBudget = DashboardService.formatCurrencyBRL(
            item.budgetLimit!
          );
          const formattedBudgetPercent = `${item.budgetPercentage!
            .toFixed(1)
            .replace('.', ',')}%`;

          budgetHtml = `
            <div class="budget-bar-row">
              <div class="budget-track">
                <div class="budget-fill" style="width: ${budgetWidth}%; background: ${budgetGradient};"></div>
              </div>
              <span class="budget-percent" style="color: ${budgetStatusColor};">${formattedBudgetPercent}</span>
            </div>
            <div class="budget-caption">
              Meta: ${formattedBudget}
            </div>
          `;
        }

        return `
        <div class="category-row">
          <div class="left-dot-wrapper">
            <span class="color-dot" style="background-color: ${DashboardService.escapeHtml(
              item.categoryColor
            )};"></span>
          </div>
          <div class="center-info">
            <div class="category-name">${DashboardService.escapeHtml(
              item.categoryName
            )}</div>
            <div class="progress-track">
              <div class="progress-fill" style="width: ${progressWidth}%; background-color: ${DashboardService.escapeHtml(
          item.categoryColor
        )};"></div>
            </div>
            ${budgetHtml}
          </div>
          <div class="right-values">
            <div class="amount-text">${formattedAmount}</div>
            ${!hasBudget ? `<div class="percent-text">${formattedPercent}</div>` : ''}
          </div>
        </div>
      `;
      })
      .join('\n');

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Resultados - ${DashboardService.escapeHtml(formattedYearMonth)}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 16mm 12mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Roboto", "Segoe UI", sans-serif;
      background-color: #FAFAFA;
      color: #1C1B1F;
    }
    .appbar {
      background-color: #1565C0;
      color: #FFFFFF;
      padding: 16px 20px;
      border-radius: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .appbar-title {
      font-size: 20px;
      font-weight: bold;
    }
    .appbar-subtitle {
      font-size: 12px;
      opacity: 0.9;
      margin-top: 2px;
    }
    .month-bar {
      background-color: #FFFFFF;
      border: 1px solid #E0E0E0;
      border-radius: 12px;
      padding: 12px 16px;
      text-align: center;
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 16px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .total-card {
      background-color: #FFFFFF;
      border: 1px solid #E0E0E0;
      border-radius: 16px;
      padding: 20px;
      text-align: center;
      margin-bottom: 16px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .total-label {
      font-size: 14px;
      color: #49454F;
      font-weight: 500;
    }
    .total-value {
      font-size: 28px;
      font-weight: bold;
      color: #1565C0;
      margin-top: 6px;
    }
    .metrics-card {
      background-color: #FFFFFF;
      border: 1px solid #E0E0E0;
      border-radius: 16px;
      padding: 16px;
      margin-bottom: 16px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .metrics-title {
      font-size: 14px;
      font-weight: bold;
      color: #1C1B1F;
      margin-bottom: 12px;
    }
    .metrics-grid {
      display: flex;
      justify-content: space-between;
      gap: 10px;
    }
    .metric-box {
      flex: 1;
      background-color: #F8F9FA;
      border: 1px solid #EEEEEE;
      border-radius: 12px;
      padding: 10px 8px;
      text-align: center;
    }
    .metric-label {
      font-size: 11px;
      color: #49454F;
      font-weight: 500;
    }
    .metric-value {
      font-size: 14px;
      font-weight: bold;
      margin-top: 4px;
    }
    .metric-primary {
      color: #1565C0;
    }
    .metric-min {
      color: #2E7D32;
    }
    .metric-max {
      color: #C62828;
    }
    .metric-sub {
      font-size: 11px;
      color: #666666;
      margin-top: 2px;
    }
    .timeline-card {
      background-color: #FFFFFF;
      border: 1px solid #E0E0E0;
      border-radius: 16px;
      padding: 16px;
      margin-bottom: 16px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .chart-card {
      background-color: #FFFFFF;
      border: 1px solid #E0E0E0;
      border-radius: 16px;
      padding: 20px;
      display: flex;
      justify-content: center;
      align-items: center;
      margin-bottom: 16px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .empty-card {
      background-color: #FFFFFF;
      border: 1px solid #E0E0E0;
      border-radius: 16px;
      padding: 24px;
      text-align: center;
      color: #49454F;
      margin-bottom: 16px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .section-header {
      font-size: 15px;
      font-weight: bold;
      margin: 8px 0 8px 4px;
      page-break-after: avoid;
      break-after: avoid;
    }
    .list-container {
      width: 100%;
    }
    .category-row {
      display: flex;
      align-items: center;
      padding: 14px 16px;
      background-color: #FFFFFF;
      border-left: 1px solid #E0E0E0;
      border-right: 1px solid #E0E0E0;
      border-bottom: 1.5px solid #BDBDBD;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .category-row:first-child {
      border-top: 1px solid #E0E0E0;
      border-top-left-radius: 12px;
      border-top-right-radius: 12px;
    }
    .category-row:last-child {
      border-bottom: 1px solid #E0E0E0;
      border-bottom-left-radius: 12px;
      border-bottom-right-radius: 12px;
    }
    .left-dot-wrapper {
      padding-right: 14px;
      display: flex;
      align-items: center;
    }
    .color-dot {
      width: 18px;
      height: 18px;
      border-radius: 9px;
      display: inline-block;
    }
    .center-info {
      flex: 1;
      padding-right: 16px;
    }
    .category-name {
      font-size: 15px;
      font-weight: 500;
      color: #1C1B1F;
    }
    .progress-track {
      margin-top: 8px;
      height: 6px;
      border-radius: 3px;
      background-color: #E0E0E0;
      overflow: hidden;
      width: 100%;
    }
    .progress-fill {
      height: 100%;
      border-radius: 3px;
    }
    .budget-bar-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 6px;
      width: 100%;
    }
    .budget-track {
      flex: 1;
      height: 6px;
      border-radius: 3px;
      background-color: #E0E0E0;
      overflow: hidden;
    }
    .budget-fill {
      height: 100%;
      border-radius: 3px;
    }
    .budget-percent {
      font-size: 11px;
      font-weight: bold;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .budget-caption {
      font-size: 11px;
      font-weight: 600;
      color: #49454F;
      margin-top: 3px;
    }
    .right-values {
      text-align: right;
      min-width: 110px;
    }
    .amount-text {
      font-size: 14px;
      font-weight: bold;
      color: #1C1B1F;
    }
    .percent-text {
      font-size: 12px;
      color: #49454F;
      margin-top: 2px;
    }
  </style>
</head>
<body>
  <div class="appbar">
    <div>
      <div class="appbar-title">Resultados</div>
      <div class="appbar-subtitle">Controle de Despesas v${DashboardService.escapeHtml(
        packageJson.version
      )} • Usuário: ${DashboardService.escapeHtml(
        username
      )}</div>
    </div>
    <div class="appbar-subtitle">${DashboardService.escapeHtml(
      formattedYearMonth
    )}</div>
  </div>

  <div class="month-bar">${DashboardService.escapeHtml(formattedYearMonth)}</div>

  <div class="total-card">
    <div class="total-label">Total do Mês</div>
    <div class="total-value">${DashboardService.formatCurrencyBRL(
      summary.totalMonthAmount
    )}</div>
  </div>

  ${metricsCardHtml}

  ${chartSectionHtml}

  ${
    summary.categoriesSummary.length > 0
      ? `<div class="list-container">${categoryRowsHtml}</div>`
      : ''
  }
</body>
</html>`;
  }

  private buildTimelineSvgHtml(points: ILineChartPoint[]): string {
    if (points.length === 0) {
      return '';
    }

    const svgWidth = 520;
    const svgHeight = 160;
    const padLeft = 48;
    const padRight = 24;
    const padTop = 24;
    const padBottom = 32;
    const plotWidth = svgWidth - padLeft - padRight;
    const plotHeight = svgHeight - padTop - padBottom;

    const ySteps = DashboardService.getChartYAxisSteps(points);
    const maxValue = ySteps[ySteps.length - 1];

    const coords = points.map((point, index) => {
      const x =
        points.length === 1
          ? padLeft + plotWidth / 2
          : padLeft + (index / (points.length - 1)) * plotWidth;
      const normalizedVal = DashboardService.normalizeValueToChartScale(
        point.value,
        ySteps
      );
      const y = padTop + plotHeight - (normalizedVal / maxValue) * plotHeight;
      return { x, y, point };
    });

    const polylinePoints = coords
      .map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`)
      .join(' ');

    const areaPoints =
      coords.length > 1
        ? `${coords[0].x.toFixed(1)},${(padTop + plotHeight).toFixed(1)} ${polylinePoints} ${coords[
            coords.length - 1
          ].x.toFixed(1)},${(padTop + plotHeight).toFixed(1)}`
        : '';

    const circlesAndLabels = coords
      .map(
        (c) => `
        <circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="4" fill="#1565C0" />
        <text x="${c.x.toFixed(1)}" y="${(c.y - 8).toFixed(
          1
        )}" text-anchor="middle" fill="#1C1B1F" font-size="9" font-weight="bold" font-family="sans-serif">${DashboardService.escapeHtml(
          DashboardService.formatCompactAmount(c.point.value)
        )}</text>
        <text x="${c.x.toFixed(1)}" y="${(padTop + plotHeight + 18).toFixed(
          1
        )}" text-anchor="middle" fill="#49454F" font-size="10" font-family="sans-serif">${DashboardService.escapeHtml(
          c.point.label
        )}</text>
      `
      )
      .join('\n');

    return `
      <div class="timeline-card">
        <div class="metrics-title">Evolução Semanal dos Gastos no Mês</div>
        <svg width="100%" viewBox="0 0 ${svgWidth} ${svgHeight}">
          <line x1="${padLeft}" y1="${padTop + plotHeight}" x2="${
      svgWidth - padRight
    }" y2="${padTop + plotHeight}" stroke="#E0E0E0" stroke-width="1" />
          ${
            areaPoints
              ? `<polygon points="${areaPoints}" fill="rgba(21, 101, 192, 0.12)" />`
              : ''
          }
          ${
            coords.length > 1
              ? `<polyline fill="none" stroke="#1565C0" stroke-width="2.5" points="${polylinePoints}" />`
              : ''
          }
          ${circlesAndLabels}
        </svg>
      </div>
    `;
  }

  public static getBudgetGradientColors(
    budgetPercentage: number
  ): readonly [string, string, ...string[]] {
    if (budgetPercentage <= 70) {
      return ['#2E7D32', '#43A047'];
    }
    if (budgetPercentage <= 90) {
      return ['#43A047', '#FBC02D'];
    }
    return ['#43A047', '#FBC02D', '#E53935'];
  }

  public static getBudgetStatusHexColor(budgetPercentage: number): string {
    if (budgetPercentage <= 70) {
      return '#2E7D32';
    }
    if (budgetPercentage <= 90) {
      return '#F57F17';
    }
    return '#E53935';
  }

  private static getBudgetCssGradient(budgetPercentage: number): string {
    const colors = DashboardService.getBudgetGradientColors(budgetPercentage);
    return `linear-gradient(90deg, ${colors.join(', ')})`;
  }

  private static formatCurrencyBRL(value: number): string {
    return `R$ ${value
      .toFixed(2)
      .replace('.', ',')
      .replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
  }

  private static escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
