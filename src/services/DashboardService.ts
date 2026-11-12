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

  public constructor(expenseRepository: ExpenseRepository) {
    this.expenseRepository = expenseRepository;
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
}
