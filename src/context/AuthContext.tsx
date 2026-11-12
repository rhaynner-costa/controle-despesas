import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { DatabaseConnection } from '../database/DatabaseConnection';
import { User } from '../models/User';
import { CategoryRepository } from '../repositories/CategoryRepository';
import { ExpenseRepository } from '../repositories/ExpenseRepository';
import { UserRepository } from '../repositories/UserRepository';
import { AuthService } from '../services/AuthService';
import { BackupService } from '../services/BackupService';
import { CategoryService } from '../services/CategoryService';
import { DashboardService } from '../services/DashboardService';
import { ExpenseService } from '../services/ExpenseService';

export interface IAppServices {
  authService: AuthService;
  categoryService: CategoryService;
  expenseService: ExpenseService;
  dashboardService: DashboardService;
  backupService: BackupService;
}

export interface IAuthContextData {
  isReady: boolean;
  initError: string | null;
  currentUser: User | null;
  rememberedUser: User | null;
  biometricAvailable: boolean;
  selectedYearMonth: string;
  formattedYearMonth: string;
  dataVersion: number;
  services: IAppServices | null;
  login: (
    username: string,
    password: string,
    rememberUser?: boolean
  ) => Promise<void>;
  loginWithBiometrics: () => Promise<boolean>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
  previousMonth: () => void;
  nextMonth: () => void;
  notifyDataChanged: () => void;
}

const MONTH_NAMES_PT = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

function getCurrentYearMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function shiftYearMonth(yearMonth: string, deltaMonths: number): string {
  const [yearStr, monthStr] = yearMonth.split('-');
  const year = Number(yearStr);
  const monthIndex = Number(monthStr) - 1;
  const date = new Date(year, monthIndex + deltaMonths, 1);
  const nextYear = date.getFullYear();
  const nextMonth = String(date.getMonth() + 1).padStart(2, '0');
  return `${nextYear}-${nextMonth}`;
}

function formatYearMonthPt(yearMonth: string): string {
  const [yearStr, monthStr] = yearMonth.split('-');
  const monthIndex = Number(monthStr) - 1;
  const monthName = MONTH_NAMES_PT[monthIndex] ?? monthStr;
  return `${monthName} de ${yearStr}`;
}

const AuthContext = createContext<IAuthContextData | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isReady, setIsReady] = useState<boolean>(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [services, setServices] = useState<IAppServices | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [rememberedUser, setRememberedUser] = useState<User | null>(null);
  const [biometricAvailable, setBiometricAvailable] = useState<boolean>(false);
  const [selectedYearMonth, setSelectedYearMonth] = useState<string>(
    getCurrentYearMonth()
  );
  const [dataVersion, setDataVersion] = useState<number>(0);
  const isSystemDialogOpenRef = useRef<boolean>(false);

  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      (nextAppState: AppStateStatus) => {
        if (nextAppState === 'background' && !isSystemDialogOpenRef.current) {
          setCurrentUser(null);
        }
      }
    );

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function bootstrapDatabase(): Promise<void> {
      try {
        const connection = await DatabaseConnection.getInstance();
        const db = connection.getDatabase();

        const userRepository = new UserRepository(db);
        const categoryRepository = new CategoryRepository(db);
        const expenseRepository = new ExpenseRepository(db);

        const authService = new AuthService(userRepository);
        const appServices: IAppServices = {
          authService,
          categoryService: new CategoryService(categoryRepository),
          expenseService: new ExpenseService(
            expenseRepository,
            categoryRepository
          ),
          dashboardService: new DashboardService(expenseRepository),
          backupService: new BackupService(
            db,
            categoryRepository,
            expenseRepository,
            (open: boolean) => {
              isSystemDialogOpenRef.current = open;
            }
          ),
        };

        const [savedUser, hasBiometrics] = await Promise.all([
          authService.getRememberedUser(),
          authService.isBiometricAvailable(),
        ]);

        if (isMounted) {
          setServices(appServices);
          setRememberedUser(savedUser);
          setBiometricAvailable(hasBiometrics);
          setIsReady(true);
        }
      } catch (error) {
        if (isMounted) {
          const message =
            error instanceof Error
              ? error.message
              : 'Falha ao inicializar banco SQLite.';
          setInitError(message);
          setIsReady(true);
        }
      }
    }

    void bootstrapDatabase();

    return () => {
      isMounted = false;
    };
  }, []);

  const notifyDataChanged = useCallback((): void => {
    setDataVersion((prev) => prev + 1);
  }, []);

  const login = useCallback(
    async (
      username: string,
      password: string,
      rememberUser: boolean = false
    ): Promise<void> => {
      if (!services) {
        throw new Error('Serviços do banco de dados ainda não estão prontos.');
      }
      const authenticatedUser = await services.authService.login(
        username,
        password,
        rememberUser
      );
      const hasBiometrics = await services.authService.isBiometricAvailable();
      setRememberedUser(rememberUser ? authenticatedUser : null);
      setBiometricAvailable(hasBiometrics);
      setCurrentUser(authenticatedUser);
      setSelectedYearMonth(getCurrentYearMonth());
    },
    [services]
  );

  const loginWithBiometrics = useCallback(async (): Promise<boolean> => {
    if (!services) {
      throw new Error('Serviços do banco de dados ainda não estão prontos.');
    }
    isSystemDialogOpenRef.current = true;
    try {
      const authenticatedUser = await services.authService.loginWithBiometrics();
      if (!authenticatedUser) {
        return false;
      }
      setCurrentUser(authenticatedUser);
      setSelectedYearMonth(getCurrentYearMonth());
      return true;
    } finally {
      isSystemDialogOpenRef.current = false;
    }
  }, [services]);

  const register = useCallback(
    async (username: string, password: string): Promise<void> => {
      if (!services) {
        throw new Error('Serviços do banco de dados ainda não estão prontos.');
      }
      const newUser = await services.authService.register(username, password);
      setCurrentUser(newUser);
      setSelectedYearMonth(getCurrentYearMonth());
    },
    [services]
  );

  const logout = useCallback((): void => {
    setCurrentUser(null);
  }, []);

  const previousMonth = useCallback((): void => {
    setSelectedYearMonth((prev) => shiftYearMonth(prev, -1));
  }, []);

  const nextMonth = useCallback((): void => {
    setSelectedYearMonth((prev) => shiftYearMonth(prev, 1));
  }, []);

  const formattedYearMonth = useMemo(
    () => formatYearMonthPt(selectedYearMonth),
    [selectedYearMonth]
  );

  const contextValue = useMemo<IAuthContextData>(
    () => ({
      isReady,
      initError,
      currentUser,
      rememberedUser,
      biometricAvailable,
      selectedYearMonth,
      formattedYearMonth,
      dataVersion,
      services,
      login,
      loginWithBiometrics,
      register,
      logout,
      previousMonth,
      nextMonth,
      notifyDataChanged,
    }),
    [
      isReady,
      initError,
      currentUser,
      rememberedUser,
      biometricAvailable,
      selectedYearMonth,
      formattedYearMonth,
      dataVersion,
      services,
      login,
      loginWithBiometrics,
      register,
      logout,
      previousMonth,
      nextMonth,
      notifyDataChanged,
    ]
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};

export function useAuth(): IAuthContextData {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider.');
  }
  return context;
}
