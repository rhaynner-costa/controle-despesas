import * as SQLite from 'expo-sqlite';
import { Category } from '../models/Category';

interface ICategoryRow {
  id: string;
  user_id: string;
  name: string;
  color: string | null;
  budget_limit: number | null;
}

export class CategoryRepository {
  private readonly db: SQLite.SQLiteDatabase;

  public constructor(db: SQLite.SQLiteDatabase) {
    this.db = db;
  }

  public async create(category: Category): Promise<void> {
    await this.db.runAsync(
      `INSERT INTO categories (id, user_id, name, color, budget_limit) VALUES (?, ?, ?, ?, ?);`,
      [
        category.id,
        category.userId,
        category.name,
        category.color,
        category.budgetLimit,
      ]
    );
  }

  public async insertOrIgnore(category: Category): Promise<void> {
    await this.db.runAsync(
      `INSERT OR IGNORE INTO categories (id, user_id, name, color, budget_limit) VALUES (?, ?, ?, ?, ?);`,
      [
        category.id,
        category.userId,
        category.name,
        category.color,
        category.budgetLimit,
      ]
    );
  }

  public async update(category: Category): Promise<void> {
    await this.db.runAsync(
      `UPDATE categories SET name = ?, color = ?, budget_limit = ? WHERE id = ? AND user_id = ?;`,
      [
        category.name,
        category.color,
        category.budgetLimit,
        category.id,
        category.userId,
      ]
    );
  }

  public async findAllByUser(userId: string): Promise<Category[]> {
    const rows = await this.db.getAllAsync<ICategoryRow>(
      `SELECT id, user_id, name, color, budget_limit FROM categories WHERE user_id = ? ORDER BY name COLLATE NOCASE ASC;`,
      [userId]
    );

    return rows.map(
      (row) =>
        new Category({
          id: row.id,
          userId: row.user_id,
          name: row.name,
          color: row.color,
          budgetLimit: row.budget_limit,
        })
    );
  }

  public async findById(id: string, userId: string): Promise<Category | null> {
    const row = await this.db.getFirstAsync<ICategoryRow>(
      `SELECT id, user_id, name, color, budget_limit FROM categories WHERE id = ? AND user_id = ? LIMIT 1;`,
      [id, userId]
    );

    if (!row) {
      return null;
    }

    return new Category({
      id: row.id,
      userId: row.user_id,
      name: row.name,
      color: row.color,
      budgetLimit: row.budget_limit,
    });
  }

  public async deleteAllByUser(userId: string): Promise<void> {
    await this.db.runAsync(`DELETE FROM categories WHERE user_id = ?;`, [userId]);
  }
}
