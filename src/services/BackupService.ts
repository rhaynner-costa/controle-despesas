import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as SQLite from 'expo-sqlite';
import { Category } from '../models/Category';
import { Expense } from '../models/Expense';
import { CategoryRepository } from '../repositories/CategoryRepository';
import { ExpenseRepository } from '../repositories/ExpenseRepository';

export interface IBackupCategoryItem {
  id: string;
  name: string;
  color: string | null;
}

export interface IBackupExpenseItem {
  id: string;
  categoryId: string;
  amount: number;
  description: string;
  expenseDate: string;
  createdAt: string;
  notes: string | null;
  isDeleted: boolean;
}

export interface IBackupPayload {
  version: number;
  exportedAt: string;
  categories: IBackupCategoryItem[];
  expenses: IBackupExpenseItem[];
}

export interface IImportResult {
  canceled: boolean;
  categoriesProcessed: number;
  expensesProcessed: number;
}

export class BackupService {
  private readonly db: SQLite.SQLiteDatabase;
  private readonly categoryRepository: CategoryRepository;
  private readonly expenseRepository: ExpenseRepository;
  private readonly onSystemDialogStateChange?: (open: boolean) => void;

  public constructor(
    db: SQLite.SQLiteDatabase,
    categoryRepository: CategoryRepository,
    expenseRepository: ExpenseRepository,
    onSystemDialogStateChange?: (open: boolean) => void
  ) {
    this.db = db;
    this.categoryRepository = categoryRepository;
    this.expenseRepository = expenseRepository;
    this.onSystemDialogStateChange = onSystemDialogStateChange;
  }

  public async exportUserData(userId: string): Promise<void> {
    const categories = await this.categoryRepository.findAllByUser(userId);
    const expenses = await this.expenseRepository.findAllByUser(userId);

    const payload: IBackupPayload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      categories: categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        color: cat.color,
      })),
      expenses: expenses.map((exp) => ({
        id: exp.id,
        categoryId: exp.categoryId,
        amount: exp.amount,
        description: exp.description,
        expenseDate: exp.expenseDate,
        createdAt: exp.createdAt,
        notes: exp.notes,
        isDeleted: exp.isDeleted,
      })),
    };

    const cacheDir = FileSystem.cacheDirectory;
    if (!cacheDir) {
      throw new Error('Diretório temporário do sistema indisponível.');
    }

    const timestamp = this.formatBackupTimestamp(new Date());
    const fileUri = `${cacheDir}backup-despesas-${timestamp}.json`;

    await FileSystem.writeAsStringAsync(
      fileUri,
      JSON.stringify(payload, null, 2),
      { encoding: FileSystem.EncodingType.UTF8 }
    );

    const sharingAvailable = await Sharing.isAvailableAsync();
    if (!sharingAvailable) {
      throw new Error('O compartilhamento nativo não está disponível neste dispositivo.');
    }

    this.onSystemDialogStateChange?.(true);
    try {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: 'Exportar Backup de Despesas (JSON)',
        UTI: 'public.json',
      });
    } finally {
      this.onSystemDialogStateChange?.(false);
    }
  }

  public async importUserData(userId: string): Promise<IImportResult> {
    this.onSystemDialogStateChange?.(true);
    let pickerResult: DocumentPicker.DocumentPickerResult;
    try {
      pickerResult = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/json', '*/*'],
        copyToCacheDirectory: true,
        multiple: false,
      });
    } finally {
      this.onSystemDialogStateChange?.(false);
    }

    if (pickerResult.canceled || !pickerResult.assets || pickerResult.assets.length === 0) {
      return {
        canceled: true,
        categoriesProcessed: 0,
        expensesProcessed: 0,
      };
    }

    const asset = pickerResult.assets[0];
    const rawContent = await FileSystem.readAsStringAsync(asset.uri, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    let parsed: Partial<IBackupPayload>;
    try {
      parsed = JSON.parse(rawContent) as Partial<IBackupPayload>;
    } catch {
      throw new Error('O arquivo selecionado não é um JSON válido.');
    }

    if (!Array.isArray(parsed.categories) || !Array.isArray(parsed.expenses)) {
      throw new Error(
        'Estrutura de backup inválida: listas "categories" e "expenses" são obrigatórias.'
      );
    }

    const categoriesToImport = parsed.categories.map(
      (item) =>
        new Category({
          id: String(item.id ?? ''),
          userId,
          name: String(item.name ?? ''),
          color: item.color ? String(item.color) : null,
        })
    );

    const expensesToImport = parsed.expenses.map(
      (item) =>
        new Expense({
          id: String(item.id ?? ''),
          userId,
          categoryId: String(item.categoryId ?? ''),
          amount: Number(item.amount),
          description: String(item.description ?? ''),
          expenseDate: String(item.expenseDate ?? ''),
          createdAt: String(item.createdAt ?? new Date().toISOString()),
          notes: item.notes ? String(item.notes) : null,
          isDeleted: Boolean(item.isDeleted),
        })
    );

    await this.db.withTransactionAsync(async () => {
      for (const category of categoriesToImport) {
        await this.categoryRepository.insertOrIgnore(category);
      }
      for (const expense of expensesToImport) {
        await this.expenseRepository.insertOrIgnore(expense);
      }
    });

    return {
      canceled: false,
      categoriesProcessed: categoriesToImport.length,
      expensesProcessed: expensesToImport.length,
    };
  }

  public async clearUserData(userId: string): Promise<void> {
    await this.db.withTransactionAsync(async () => {
      await this.expenseRepository.deleteAllByUser(userId);
      await this.categoryRepository.deleteAllByUser(userId);
    });
  }

  private formatBackupTimestamp(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear());
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${day}-${month}-${year}-${hours}-${minutes}`;
  }
}
