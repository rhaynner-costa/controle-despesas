import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppState,
  AppStateStatus,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {
  Appbar,
  Button,
  Checkbox,
  HelperText,
  Snackbar,
  Surface,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { AuthStackParamList } from '../../navigation/AuthStack';

type LoginScreenProps = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const {
    login,
    loginWithBiometrics,
    rememberedUser,
    biometricAvailable,
    userBiometricEnabled,
  } = useAuth();

  const [username, setUsername] = useState<string>(
    rememberedUser ? rememberedUser.username : ''
  );
  const [password, setPassword] = useState<string>('');
  const [rememberUser, setRememberUser] = useState<boolean>(
    Boolean(rememberedUser)
  );
  const [secureText, setSecureText] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const promptingRef = useRef<boolean>(false);
  const lastPromptClosedAtRef = useRef<number>(0);

  const canUseBiometrics = Boolean(
    rememberedUser && userBiometricEnabled && biometricAvailable
  );

  useEffect(() => {
    if (rememberedUser) {
      setUsername(rememberedUser.username);
      setRememberUser(true);
    } else {
      setUsername('');
      setRememberUser(false);
    }
  }, [rememberedUser]);

  const handleBiometricLogin = useCallback(async (): Promise<void> => {
    if (promptingRef.current) {
      return;
    }
    promptingRef.current = true;
    Keyboard.dismiss();
    setErrorMessage(null);
    setSubmitting(true);
    try {
      await loginWithBiometrics();
    } catch (error) {
      const msg =
        error instanceof Error
          ? error.message
          : 'Erro na autenticação biométrica.';
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
      lastPromptClosedAtRef.current = Date.now();
      promptingRef.current = false;
    }
  }, [loginWithBiometrics]);

  useEffect(() => {
    if (!canUseBiometrics) {
      return;
    }

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const rafId = requestAnimationFrame(() => {
      timeoutId = setTimeout(() => {
        void handleBiometricLogin();
      }, 400);
    });

    return () => {
      cancelAnimationFrame(rafId);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [canUseBiometrics, handleBiometricLogin]);

  useEffect(() => {
    if (!canUseBiometrics) {
      return;
    }

    let appStateRef = AppState.currentState;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const subscription = AppState.addEventListener(
      'change',
      (nextAppState: AppStateStatus) => {
        const returningFromBackground =
          appStateRef === 'background' && nextAppState === 'active';
        appStateRef = nextAppState;

        if (
          returningFromBackground &&
          !promptingRef.current &&
          Date.now() - lastPromptClosedAtRef.current > 1500
        ) {
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          timeoutId = setTimeout(() => {
            void handleBiometricLogin();
          }, 350);
        }
      }
    );

    return () => {
      subscription.remove();
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [canUseBiometrics, handleBiometricLogin]);

  const handleLogin = async (): Promise<void> => {
    Keyboard.dismiss();
    setErrorMessage(null);
    setSubmitting(true);
    try {
      await login(username, password, rememberUser);
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Erro ao realizar login.';
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.background,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      <Appbar.Header elevated>
        <Appbar.Content title="Controle de Despesas" />
      </Appbar.Header>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
          persistentScrollbar
        >
          <Surface style={styles.card} elevation={2}>
            <Text variant="headlineSmall" style={styles.title}>
              Acesso Local
            </Text>
            <Text
              variant="bodyMedium"
              style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}
            >
              Entre com sua conta para gerenciar suas despesas offline.
            </Text>

            <TextInput
              testID="login-input-username"
              mode="outlined"
              label="Usuário"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              left={<TextInput.Icon icon="account-outline" />}
              style={styles.input}
              disabled={submitting}
            />

            <TextInput
              testID="login-input-password"
              mode="outlined"
              label="Senha"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={secureText}
              autoCapitalize="none"
              left={<TextInput.Icon icon="lock-outline" />}
              right={
                <TextInput.Icon
                  testID="login-btn-toggle-password"
                  icon={secureText ? 'eye-outline' : 'eye-off-outline'}
                  onPress={() => setSecureText((prev) => !prev)}
                />
              }
              style={styles.input}
              disabled={submitting}
            />

            <Pressable
              testID="login-pressable-remember-user"
              style={styles.rememberRow}
              onPress={() => setRememberUser((prev) => !prev)}
              disabled={submitting}
            >
              <Checkbox
                status={rememberUser ? 'checked' : 'unchecked'}
                onPress={() => setRememberUser((prev) => !prev)}
                disabled={submitting}
              />
              <Text variant="bodyMedium" style={styles.rememberLabel}>
                Lembrar meu usuário
              </Text>
            </Pressable>

            <HelperText testID="login-status-offline-info" type="info" visible>
              Seus dados permanecem armazenados 100% no seu dispositivo.
            </HelperText>

            <Button
              testID="login-btn-submit"
              mode="contained"
              onPress={handleLogin}
              loading={submitting}
              disabled={submitting}
              style={styles.primaryButton}
              contentStyle={styles.buttonContent}
            >
              Entrar
            </Button>

            {canUseBiometrics && (
              <Button
                testID="login-btn-biometric"
                mode="outlined"
                icon="fingerprint"
                onPress={handleBiometricLogin}
                disabled={submitting}
                style={styles.biometricButton}
                contentStyle={styles.buttonContent}
              >
                Entrar com Biometria ({rememberedUser?.username})
              </Button>
            )}

            <Button
              testID="login-btn-go-register"
              mode="text"
              onPress={() => navigation.navigate('Register')}
              disabled={submitting}
              style={styles.secondaryButton}
            >
              Criar nova conta
            </Button>
          </Surface>
        </ScrollView>
      </KeyboardAvoidingView>

      <Snackbar
        testID="login-snackbar-error"
        visible={Boolean(errorMessage)}
        onDismiss={() => setErrorMessage(null)}
        duration={4000}
        action={{
          label: 'OK',
          onPress: () => setErrorMessage(null),
        }}
      >
        {errorMessage ?? ''}
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    paddingBottom: 48,
  },
  card: {
    padding: 24,
    borderRadius: 16,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    marginBottom: 20,
  },
  input: {
    marginBottom: 12,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: -8,
    marginBottom: 4,
  },
  rememberLabel: {
    flex: 1,
  },
  primaryButton: {
    marginTop: 8,
    borderRadius: 8,
  },
  biometricButton: {
    marginTop: 10,
    borderRadius: 8,
  },
  buttonContent: {
    height: 48,
  },
  secondaryButton: {
    marginTop: 8,
  },
});
