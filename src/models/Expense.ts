export interface IExpenseProps {
  id: string;
  userId: string;
  categoryId: string;
  amount: number;
  description: string;
  expenseDate: string;
  createdAt: string;
  notes?: string | null;
  isDeleted?: boolean;
}

export interface IExpenseWithCategoryDTO {
  id: string;
  userId: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string | null;
  categoryBudgetLimit: number | null;
  amount: number;
  description: string;
  expenseDate: string;
  createdAt: string;
  notes: string | null;
  isDeleted: boolean;
}

export class Expense {
  private readonly _id: string;
  private readonly _userId: string;
  private readonly _categoryId: string;
  private readonly _amount: number;
  private readonly _description: string;
  private readonly _expenseDate: string;
  private readonly _createdAt: string;
  private readonly _notes: string | null;
  private _isDeleted: boolean;

  private static readonly DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
  public static readonly MAX_CENTS_DIGITS = 10;
  public static readonly MAX_AMOUNT = 99999999.99;

  public static formatCurrencyInput(rawInput: string): string {
    const digitsOnly = rawInput.replace(/\D/g, '').replace(/^0+/, '');
    if (!digitsOnly) {
      return '';
    }

    const cappedDigits = digitsOnly.slice(0, Expense.MAX_CENTS_DIGITS);
    const cents = Number(cappedDigits);
    if (!Number.isFinite(cents) || cents <= 0) {
      return '';
    }

    const amount = cents / 100;
    const formattedNumber = amount
      .toFixed(2)
      .replace('.', ',')
      .replace(/\B(?=(\d{3})+(?!\d))/g, '.');

    return `R$${formattedNumber}`;
  }

  public static parseCurrencyInput(formattedInput: string): number {
    const digitsOnly = formattedInput.replace(/\D/g, '').replace(/^0+/, '');
    if (!digitsOnly) {
      return 0;
    }

    const cappedDigits = digitsOnly.slice(0, Expense.MAX_CENTS_DIGITS);
    const cents = Number(cappedDigits);
    if (!Number.isFinite(cents) || cents <= 0) {
      return 0;
    }

    return Math.round(cents) / 100;
  }

  public constructor(props: IExpenseProps) {
    if (!props.id.trim()) {
      throw new Error('O identificador da despesa (UUID) é obrigatório.');
    }
    if (!props.userId.trim()) {
      throw new Error('O identificador do usuário é obrigatório.');
    }
    if (!props.categoryId.trim()) {
      throw new Error('A categoria da despesa é obrigatória.');
    }
    if (!Number.isFinite(props.amount) || props.amount <= 0) {
      throw new Error('O valor da despesa deve ser maior que zero.');
    }
    if (props.amount > Expense.MAX_AMOUNT) {
      throw new Error('O valor da despesa excede o limite máximo permitido (R$99.999.999,99).');
    }

    const trimmedDescription = props.description.trim();
    if (!trimmedDescription) {
      throw new Error('A descrição da despesa é obrigatória.');
    }

    const trimmedExpenseDate = props.expenseDate.trim();
    if (!Expense.DATE_REGEX.test(trimmedExpenseDate)) {
      throw new Error('A data da despesa deve estar no formato YYYY-MM-DD.');
    }

    if (!props.createdAt.trim()) {
      throw new Error('A data de registro (created_at) é obrigatória.');
    }

    this._id = props.id.trim();
    this._userId = props.userId.trim();
    this._categoryId = props.categoryId.trim();
    this._amount = Math.round(props.amount * 100) / 100;
    this._description = trimmedDescription;
    this._expenseDate = trimmedExpenseDate;
    this._createdAt = props.createdAt.trim();
    this._notes = props.notes && props.notes.trim().length > 0 ? props.notes.trim() : null;
    this._isDeleted = Boolean(props.isDeleted);
  }

  public get id(): string {
    return this._id;
  }

  public get userId(): string {
    return this._userId;
  }

  public get categoryId(): string {
    return this._categoryId;
  }

  public get amount(): number {
    return this._amount;
  }

  public get description(): string {
    return this._description;
  }

  public get expenseDate(): string {
    return this._expenseDate;
  }

  public get createdAt(): string {
    return this._createdAt;
  }

  public get notes(): string | null {
    return this._notes;
  }

  public get isDeleted(): boolean {
    return this._isDeleted;
  }

  public markAsDeleted(): void {
    this._isDeleted = true;
  }
}
