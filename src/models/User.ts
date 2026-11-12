export interface IUserProps {
  id: string;
  username: string;
  passwordHash: string;
  createdAt: string;
}

export class User {
  private readonly _id: string;
  private readonly _username: string;
  private readonly _passwordHash: string;
  private readonly _createdAt: string;

  public constructor(props: IUserProps) {
    const trimmedUsername = props.username.trim();
    if (!props.id.trim()) {
      throw new Error('O identificador do usuário (UUID) é obrigatório.');
    }
    if (!trimmedUsername) {
      throw new Error('O nome de usuário é obrigatório.');
    }
    if (trimmedUsername.length < 3) {
      throw new Error('O nome de usuário deve ter pelo menos 3 caracteres.');
    }
    if (!props.passwordHash.trim()) {
      throw new Error('O hash da senha é obrigatório.');
    }
    if (!props.createdAt.trim()) {
      throw new Error('A data de criação do usuário é obrigatória.');
    }

    this._id = props.id.trim();
    this._username = trimmedUsername;
    this._passwordHash = props.passwordHash.trim();
    this._createdAt = props.createdAt.trim();
  }

  public get id(): string {
    return this._id;
  }

  public get username(): string {
    return this._username;
  }

  public get passwordHash(): string {
    return this._passwordHash;
  }

  public get createdAt(): string {
    return this._createdAt;
  }
}
