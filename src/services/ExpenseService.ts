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
}
