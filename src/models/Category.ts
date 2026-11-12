export interface ICategoryProps {
  id: string;
  userId: string;
  name: string;
  color: string | null;
}

export class Category {
  private readonly _id: string;
  private readonly _userId: string;
  private _name: string;
  private _color: string | null;

  private static readonly HEX_COLOR_REGEX = /^#([0-9A-Fa-f]{6})$/;

  public constructor(props: ICategoryProps) {
    if (!props.id.trim()) {
      throw new Error('O identificador da categoria (UUID) é obrigatório.');
    }
    if (!props.userId.trim()) {
      throw new Error('O identificador do usuário da categoria é obrigatório.');
    }

    const trimmedName = props.name.trim();
    if (!trimmedName) {
      throw new Error('O nome da categoria é obrigatório.');
    }

    const normalizedColor = props.color ? props.color.trim().toUpperCase() : null;
    if (normalizedColor && !Category.HEX_COLOR_REGEX.test(normalizedColor)) {
      throw new Error('A cor da categoria deve estar no formato hexadecimal (#RRGGBB).');
    }

    this._id = props.id.trim();
    this._userId = props.userId.trim();
    this._name = trimmedName;
    this._color = normalizedColor;
  }

  public get id(): string {
    return this._id;
  }

  public get userId(): string {
    return this._userId;
  }

  public get name(): string {
    return this._name;
  }

  public get color(): string | null {
    return this._color;
  }

  public updateDetails(name: string, color: string | null): void {
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new Error('O nome da categoria é obrigatório.');
    }

    const normalizedColor = color ? color.trim().toUpperCase() : null;
    if (normalizedColor && !Category.HEX_COLOR_REGEX.test(normalizedColor)) {
      throw new Error('A cor da categoria deve estar no formato hexadecimal (#RRGGBB).');
    }

    this._name = trimmedName;
    this._color = normalizedColor;
  }
}
