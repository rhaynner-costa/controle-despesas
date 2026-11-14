import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { IExpenseWithCategoryDTO } from '../models/Expense';
import { ExpenseRepository } from '../repositories/ExpenseRepository';

export interface ICategorySummaryItem {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  totalAmount: number;
  percentage: number;
}

export interface IPieChartSlice {
  value: number;
  color: string;
  text: string;
  categoryName: string;
}

export interface IDashboardSummary {
  yearMonth: string;
  totalMonthAmount: number;
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
    const totalRaw = expenses.reduce((sum, item) => sum + item.amount, 0);
    const totalMonthAmount = Math.round(totalRaw * 100) / 100;

    if (totalMonthAmount === 0) {
      return {
        yearMonth,
        totalMonthAmount: 0,
        categoriesSummary: [],
        pieChartData: [],
      };
    }

    const grouped = new Map<
      string,
      { name: string; color: string; sum: number }
    >();

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
        });
      }
    }

    const categoriesSummary: ICategorySummaryItem[] = Array.from(
      grouped.entries()
    )
      .map(([categoryId, data]) => {
        const percentage =
          Math.round(((data.sum / totalMonthAmount) * 100) * 10) / 10;
        return {
          categoryId,
          categoryName: data.name,
          categoryColor: data.color,
          totalAmount: data.sum,
          percentage,
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
      totalMonthAmount,
      categoriesSummary,
      pieChartData,
    };
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
    const cacheDir = FileSystem.cacheDirectory;
    if (cacheDir) {
      const customUri = `${cacheDir}resultados-${summary.yearMonth}.pdf`;
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

    const chartSectionHtml =
      summary.categoriesSummary.length > 0
        ? `
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
          </div>
          <div class="right-values">
            <div class="amount-text">${formattedAmount}</div>
            <div class="percent-text">${formattedPercent}</div>
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
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Roboto", "Segoe UI", sans-serif;
      background-color: #FAFAFA;
      color: #1C1B1F;
      padding: 24px;
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
    }
    .total-card {
      background-color: #FFFFFF;
      border: 1px solid #E0E0E0;
      border-radius: 16px;
      padding: 20px;
      text-align: center;
      margin-bottom: 16px;
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
    .chart-card {
      background-color: #FFFFFF;
      border: 1px solid #E0E0E0;
      border-radius: 16px;
      padding: 20px;
      display: flex;
      justify-content: center;
      align-items: center;
      margin-bottom: 16px;
    }
    .empty-card {
      background-color: #FFFFFF;
      border: 1px solid #E0E0E0;
      border-radius: 16px;
      padding: 24px;
      text-align: center;
      color: #49454F;
      margin-bottom: 16px;
    }
    .section-header {
      font-size: 15px;
      font-weight: bold;
      margin: 8px 0 8px 4px;
    }
    .list-container {
      background-color: #FFFFFF;
      border-radius: 12px;
      border: 1px solid #E0E0E0;
      overflow: hidden;
    }
    .category-row {
      display: flex;
      align-items: center;
      padding: 14px 16px;
      border-bottom: 1.5px solid #BDBDBD;
    }
    .category-row:last-child {
      border-bottom: none;
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
      <div class="appbar-subtitle">Controle de Despesas v1.1.0 • Usuário: ${DashboardService.escapeHtml(
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

  ${chartSectionHtml}

  ${
    summary.categoriesSummary.length > 0
      ? `<div class="list-container">${categoryRowsHtml}</div>`
      : ''
  }
</body>
</html>`;
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
