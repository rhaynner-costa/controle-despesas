import * as Crypto from 'expo-crypto';
import * as LocalAuthentication from 'expo-local-authentication';
import { User } from '../models/User';
import { UserRepository } from '../repositories/UserRepository';

export class AuthService {
  private readonly userRepository: UserRepository;

  public constructor(userRepository: UserRepository) {
    this.userRepository = userRepository;
  }

  public async register(username: string, plainPassword: string): Promise<User> {
    const trimmedUsername = username.trim();
    if (trimmedUsername.length < 3) {
      throw new Error('O nome de usuário deve ter pelo menos 3 caracteres.');
    }
    if (plainPassword.length < 4) {
      throw new Error('A senha deve ter pelo menos 4 caracteres.');
    }

    const existingUser = await this.userRepository.findByUsername(trimmedUsername);
    if (existingUser) {
      throw new Error('Este nome de usuário já está em uso.');
    }

    const id = Crypto.randomUUID();
    const passwordHash = await this.hashPassword(plainPassword);
    const createdAt = new Date().toISOString();

    const newUser = new User({
      id,
      username: trimmedUsername,
      passwordHash,
      createdAt,
    });

    await this.userRepository.create(newUser);
    return newUser;
  }

  public async login(
    username: string,
    plainPassword: string,
    rememberUser: boolean = false
  ): Promise<User> {
    const trimmedUsername = username.trim();
    if (!trimmedUsername || !plainPassword) {
      throw new Error('Informe o usuário e a senha.');
    }

    const user = await this.userRepository.findByUsername(trimmedUsername);
    if (!user) {
      throw new Error('Usuário ou senha inválidos.');
    }

    const passwordHash = await this.hashPassword(plainPassword);
    if (user.passwordHash !== passwordHash) {
      throw new Error('Usuário ou senha inválidos.');
    }

    if (rememberUser) {
      await this.userRepository.saveRememberedUserId(user.id);
    } else {
      await this.userRepository.clearRememberedUser();
    }

    return user;
  }

  public async getRememberedUser(): Promise<User | null> {
    return this.userRepository.getRememberedUser();
  }

  public async isBiometricAvailable(): Promise<boolean> {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) {
      return false;
    }
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    return isEnrolled;
  }

  public async loginWithBiometrics(): Promise<User | null> {
    const rememberedUser = await this.userRepository.getRememberedUser();
    if (!rememberedUser) {
      throw new Error('Nenhum usuário lembrado para autenticação biométrica.');
    }

    const biometricAvailable = await this.isBiometricAvailable();
    if (!biometricAvailable) {
      throw new Error(
        'Biometria não configurada neste dispositivo Android.'
      );
    }

    let result = await LocalAuthentication.authenticateAsync({
      promptMessage: `Entrar como ${rememberedUser.username}`,
      cancelLabel: 'Usar senha',
      disableDeviceFallback: false,
    });

    if (
      !result.success &&
      (result.error === 'app_cancel' || result.error === 'system_cancel')
    ) {
      await new Promise<void>((resolve) => setTimeout(resolve, 350));
      result = await LocalAuthentication.authenticateAsync({
        promptMessage: `Entrar como ${rememberedUser.username}`,
        cancelLabel: 'Usar senha',
        disableDeviceFallback: false,
      });
    }

    if (result.success) {
      return rememberedUser;
    }

    if (
      result.error === 'user_cancel' ||
      result.error === 'system_cancel' ||
      result.error === 'app_cancel'
    ) {
      return null;
    }

    throw new Error('Não foi possível autenticar via biometria.');
  }

  private async hashPassword(plainPassword: string): Promise<string> {
    return Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      plainPassword
    );
  }
}
