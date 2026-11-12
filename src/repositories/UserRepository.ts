import * as SQLite from 'expo-sqlite';
import { User } from '../models/User';

interface IUserRow {
  id: string;
  username: string;
  password: string;
  created_at: string;
}

interface ISettingRow {
  key: string;
  value: string;
}

export class UserRepository {
  private static readonly REMEMBERED_USER_KEY = 'remembered_user_id';
  private readonly db: SQLite.SQLiteDatabase;

  public constructor(db: SQLite.SQLiteDatabase) {
    this.db = db;
  }

  public async create(user: User): Promise<void> {
    await this.db.runAsync(
      `INSERT INTO users (id, username, password, created_at) VALUES (?, ?, ?, ?);`,
      [user.id, user.username, user.passwordHash, user.createdAt]
    );
  }

  public async findByUsername(username: string): Promise<User | null> {
    const row = await this.db.getFirstAsync<IUserRow>(
      `SELECT id, username, password, created_at FROM users WHERE username = ? LIMIT 1;`,
      [username.trim()]
    );

    if (!row) {
      return null;
    }

    return new User({
      id: row.id,
      username: row.username,
      passwordHash: row.password,
      createdAt: row.created_at,
    });
  }

  public async findById(id: string): Promise<User | null> {
    const row = await this.db.getFirstAsync<IUserRow>(
      `SELECT id, username, password, created_at FROM users WHERE id = ? LIMIT 1;`,
      [id.trim()]
    );

    if (!row) {
      return null;
    }

    return new User({
      id: row.id,
      username: row.username,
      passwordHash: row.password,
      createdAt: row.created_at,
    });
  }

  public async saveRememberedUserId(userId: string): Promise<void> {
    await this.db.runAsync(
      `INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?);`,
      [UserRepository.REMEMBERED_USER_KEY, userId.trim()]
    );
  }

  public async getRememberedUser(): Promise<User | null> {
    const setting = await this.db.getFirstAsync<ISettingRow>(
      `SELECT key, value FROM app_settings WHERE key = ? LIMIT 1;`,
      [UserRepository.REMEMBERED_USER_KEY]
    );

    if (!setting || !setting.value) {
      return null;
    }

    return this.findById(setting.value);
  }

  public async clearRememberedUser(): Promise<void> {
    await this.db.runAsync(
      `DELETE FROM app_settings WHERE key = ?;`,
      [UserRepository.REMEMBERED_USER_KEY]
    );
  }
}
