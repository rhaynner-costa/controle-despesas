import * as SQLite from 'expo-sqlite';

export class DatabaseConnection {
  private static instance: DatabaseConnection | null = null;
  private readonly db: SQLite.SQLiteDatabase;

  private constructor(db: SQLite.SQLiteDatabase) {
    this.db = db;
  }

  public static async getInstance(): Promise<DatabaseConnection> {
    if (!DatabaseConnection.instance) {
      const db = await SQLite.openDatabaseAsync('controle_despesas.db');
      const connection = new DatabaseConnection(db);
      await connection.initializeSchema();
      DatabaseConnection.instance = connection;
    }
    return DatabaseConnection.instance;
  }

  public getDatabase(): SQLite.SQLiteDatabase {
    return this.db;
  }

  private async initializeSchema(): Promise<void> {
    await this.db.execAsync(`
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY NOT NULL,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        color TEXT,
        budget_limit REAL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        category_id TEXT NOT NULL,
        amount REAL NOT NULL,
        description TEXT NOT NULL,
        expense_date TEXT NOT NULL,
        created_at TEXT NOT NULL,
        notes TEXT,
        is_deleted INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
      );

      CREATE INDEX IF NOT EXISTS idx_categories_user
        ON categories(user_id);

      CREATE INDEX IF NOT EXISTS idx_expenses_user_date_active
        ON expenses(user_id, is_deleted, expense_date);
    `);

    await this.ensureCategoriesBudgetColumn();
  }

  private async ensureCategoriesBudgetColumn(): Promise<void> {
    const columns = await this.db.getAllAsync<{ name: string }>(
      `PRAGMA table_info(categories);`
    );
    const hasBudgetLimit = columns.some((col) => col.name === 'budget_limit');
    if (!hasBudgetLimit) {
      await this.db.execAsync(
        `ALTER TABLE categories ADD COLUMN budget_limit REAL;`
      );
    }
  }
}
