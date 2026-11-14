import * as Crypto from 'expo-crypto';
import { Expense, IExpenseWithCategoryDTO } from '../models/Expense';
import { CategoryRepository } from '../repositories/CategoryRepository';
import { ExpenseRepository } from '../repositories/ExpenseRepository';

export interface ICreateExpenseInput {
  userId: string;
  categoryId: string;
  amount: number;
  description: string;
  expenseDate: string;
  notes?: string | null;
}

export interface IUpdateExpenseInput {
  id: string;
  userId: string;
  categoryId: string;
  amount: number;
  description: string;
  expenseDate: string;
  notes?: string | null;
}

export class ExpenseService {
  private readonly expenseRepository: ExpenseRepository;
  private readonly categoryRepository: CategoryRepository;

  public constructor(
    expenseRepository: ExpenseRepository,
    categoryRepository: CategoryRepository
  ) {
    this.expenseRepository = expenseRepository;
    this.categoryRepository = categoryRepository;
  }

  public async createExpense(input: ICreateExpenseInput): Promise<Expense> {
    const category = await this.categoryRepository.findById(
      input.categoryId,
      input.userId
    );
    if (!category) {
      throw new Error('A categoria selecionada não pertence ao usuário autenticado.');
    }

    const expense = new Expense({
      id: Crypto.randomUUID(),
      userId: input.userId,
      categoryId: input.categoryId,
      amount: input.amount,
      description: input.description,
      expenseDate: input.expenseDate,
      createdAt: new Date().toISOString(),
      notes: input.notes ?? null,
      isDeleted: false,
    });

    await this.expenseRepository.create(expense);
    return expense;
  }

  public async updateExpense(input: IUpdateExpenseInput): Promise<Expense> {
    const existingExpense = await this.expenseRepository.findById(
      input.id,
      input.userId
    );
    if (!existingExpense) {
      throw new Error('Despesa não encontrada para o usuário autenticado.');
    }

    const category = await this.categoryRepository.findById(
      input.categoryId,
      input.userId
    );
    if (!category) {
      throw new Error('A categoria selecionada não pertence ao usuário autenticado.');
    }

    const updatedExpense = new Expense({
      id: existingExpense.id,
      userId: existingExpense.userId,
      categoryId: input.categoryId,
      amount: input.amount,
      description: input.description,
      expenseDate: input.expenseDate,
      createdAt: existingExpense.createdAt,
      notes: input.notes ?? null,
      isDeleted: false,
    });

    await this.expenseRepository.update(updatedExpense);
    return updatedExpense;
  }

  public async listActiveExpensesByMonth(
    userId: string,
    yearMonth: string
  ): Promise<IExpenseWithCategoryDTO[]> {
    return this.expenseRepository.findActiveByMonth(userId, yearMonth);
  }

  public async softDeleteExpense(id: string, userId: string): Promise<void> {
    if (!id.trim() || !userId.trim()) {
      throw new Error('Identificador da despesa e do usuário são obrigatórios.');
    }
    await this.expenseRepository.softDelete(id, userId);
  }

  public filterExpenses(
    expenses: IExpenseWithCategoryDTO[],
    rawQuery: string
  ): IExpenseWithCategoryDTO[] {
    const trimmed = rawQuery.trim();
    if (!trimmed) {
      return expenses;
    }

    const dayOnlyMatch = /^(?:dia\s*)?(\d{1,2})$/i.exec(trimmed);
    if (dayOnlyMatch) {
      const dayNumber = Number(dayOnlyMatch[1]);
      if (dayNumber >= 1 && dayNumber <= 31) {
        const targetDay = String(dayNumber).padStart(2, '0');
        return expenses.filter((expense) => {
          const [, , expenseDay] = expense.expenseDate.split('-');
          return expenseDay === targetDay;
        });
      }
    }

    const dateMatch = /^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/.exec(trimmed);
    if (dateMatch) {
      const targetDay = String(Number(dateMatch[1])).padStart(2, '0');
      const targetMonth = String(Number(dateMatch[2])).padStart(2, '0');
      const targetYear = dateMatch[3] ?? null;

      return expenses.filter((expense) => {
        const [expYear, expMonth, expDay] = expense.expenseDate.split('-');
        if (expDay !== targetDay || expMonth !== targetMonth) {
          return false;
        }
        if (targetYear) {
          return expYear.endsWith(targetYear);
        }
        return true;
      });
    }

    const normalizedQuery = ExpenseService.normalizeSearchText(trimmed);

    return expenses.filter((expense) => {
      const descriptionMatch = ExpenseService.normalizeSearchText(
        expense.description
      ).includes(normalizedQuery);

      const categoryMatch = ExpenseService.normalizeSearchText(
        expense.categoryName
      ).includes(normalizedQuery);

      const notesMatch = expense.notes
        ? ExpenseService.normalizeSearchText(expense.notes).includes(
            normalizedQuery
          )
        : false;

      const [year, month, day] = expense.expenseDate.split('-');
      const formattedDate = `${day}/${month}/${year}`;
      const dateTextMatch = formattedDate.includes(normalizedQuery);

      return descriptionMatch || categoryMatch || notesMatch || dateTextMatch;
    });
  }

  private static normalizeSearchText(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }
}
