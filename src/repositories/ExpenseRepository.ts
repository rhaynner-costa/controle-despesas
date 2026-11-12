import * as SQLite from 'expo-sqlite';
import { Expense, IExpenseWithCategoryDTO } from '../models/Expense';

interface IExpenseRow {
  id: string;
  user_id: string;
  category_id: string;
  amount: number;
  description: string;
  expense_date: string;
  created_at: string;
  notes: string | null;
  is_deleted: number;
}

interface IExpenseWithCategoryRow extends IExpenseRow {
  category_name: string;
  category_color: string | null;
}

export class ExpenseRepository {
  private readonly db: SQLite.SQLiteDatabase;

  public constructor(db: SQLite.SQLiteDatabase) {
    this.db = db;
  }

  public async create(expense: Expense): Promise<void> {
    await this.db.runAsync(
      `INSERT INTO expenses (
        id, user_id, category_id, amount, description, expense_date, created_at, notes, is_deleted
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        expense.id,
        expense.userId,
        expense.categoryId,
        expense.amount,
        expense.description,
        expense.expenseDate,
        expense.createdAt,
        expense.notes,
        expense.isDeleted ? 1 : 0,
      ]
    );
  }

  public async insertOrIgnore(expense: Expense): Promise<void> {
    await this.db.runAsync(
      `INSERT OR IGNORE INTO expenses (
        id, user_id, category_id, amount, description, expense_date, created_at, notes, is_deleted
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        expense.id,
        expense.userId,
        expense.categoryId,
        expense.amount,
        expense.description,
        expense.expenseDate,
        expense.createdAt,
        expense.notes,
        expense.isDeleted ? 1 : 0,
      ]
    );
  }

  public async findById(id: string, userId: string): Promise<Expense | null> {
    const row = await this.db.getFirstAsync<IExpenseRow>(
      `SELECT
        id, user_id, category_id, amount, description, expense_date, created_at, notes, is_deleted
      FROM expenses
      WHERE id = ? AND user_id = ? AND is_deleted = 0;`,
      [id, userId]
    );

    if (!row) {
      return null;
    }

    return new Expense({
      id: row.id,
      userId: row.user_id,
      categoryId: row.category_id,
      amount: row.amount,
      description: row.description,
      expenseDate: row.expense_date,
      createdAt: row.created_at,
      notes: row.notes,
      isDeleted: row.is_deleted === 1,
    });
  }

  public async update(expense: Expense): Promise<void> {
    await this.db.runAsync(
      `UPDATE expenses
       SET category_id = ?, amount = ?, description = ?, expense_date = ?, notes = ?
       WHERE id = ? AND user_id = ? AND is_deleted = 0;`,
      [
        expense.categoryId,
        expense.amount,
        expense.description,
        expense.expenseDate,
        expense.notes,
        expense.id,
        expense.userId,
      ]
    );
  }

  public async softDelete(id: string, userId: string): Promise<void> {
    await this.db.runAsync(
      `UPDATE expenses SET is_deleted = 1 WHERE id = ? AND user_id = ?;`,
      [id, userId]
    );
  }

  public async findActiveByMonth(
    userId: string,
    yearMonth: string
  ): Promise<IExpenseWithCategoryDTO[]> {
    const rows = await this.db.getAllAsync<IExpenseWithCategoryRow>(
      `SELECT
        e.id,
        e.user_id,
        e.category_id,
        c.name AS category_name,
        c.color AS category_color,
        e.amount,
        e.description,
        e.expense_date,
        e.created_at,
        e.notes,
        e.is_deleted
      FROM expenses e
      INNER JOIN categories c ON c.id = e.category_id AND c.user_id = e.user_id
      WHERE e.user_id = ?
        AND e.is_deleted = 0
        AND strftime('%Y-%m', e.expense_date) = ?
      ORDER BY e.expense_date DESC, e.created_at DESC;`,
      [userId, yearMonth]
    );

    return rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      categoryId: row.category_id,
      categoryName: row.category_name,
      categoryColor: row.category_color,
      amount: row.amount,
      description: row.description,
      expenseDate: row.expense_date,
      createdAt: row.created_at,
      notes: row.notes,
      isDeleted: row.is_deleted === 1,
    }));
  }

  public async findAllByUser(userId: string): Promise<Expense[]> {
    const rows = await this.db.getAllAsync<IExpenseRow>(
      `SELECT
        id, user_id, category_id, amount, description, expense_date, created_at, notes, is_deleted
      FROM expenses
      WHERE user_id = ?
      ORDER BY expense_date DESC, created_at DESC;`,
      [userId]
    );

    return rows.map(
      (row) =>
        new Expense({
          id: row.id,
          userId: row.user_id,
          categoryId: row.category_id,
          amount: row.amount,
          description: row.description,
          expenseDate: row.expense_date,
          createdAt: row.created_at,
          notes: row.notes,
          isDeleted: row.is_deleted === 1,
        })
    );
  }

  public async deleteAllByUser(userId: string): Promise<void> {
    await this.db.runAsync(`DELETE FROM expenses WHERE user_id = ?;`, [userId]);
  }
}
