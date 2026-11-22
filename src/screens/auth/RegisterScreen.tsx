import React, { useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {
  Appbar,
  Button,
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

type RegisterScreenProps = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export const RegisterScreen: React.FC<RegisterScreenProps> = ({ navigation }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { register } = useAuth();

  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [secureText, setSecureText] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const passwordsMismatch =
    confirmPassword.length > 0 && password !== confirmPassword;

  const handleRegister = async (): Promise<void> => {
    Keyboard.dismiss();
    setErrorMessage(null);
    if (password !== confirmPassword) {
      setErrorMessage('A confirmação de senha não confere.');
      return;
    }

    setSubmitting(true);
    try {
      await register(username, password);
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Erro ao cadastrar usuário.';
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
        <Appbar.BackAction
          testID="register-btn-back"
          onPress={() => navigation.goBack()}
        />
        <Appbar.Content title="Novo Usuário" />
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
            <Text variant="titleLarge" style={styles.title}>
              Criar Conta Local
            </Text>
            <Text
              variant="bodyMedium"
              style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}
            >
              Cada usuário possui suas próprias categorias e despesas isoladas.
            </Text>

            <TextInput
              testID="register-input-username"
              mode="outlined"
              label="Usuário"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              left={<TextInput.Icon icon="account-plus-outline" />}
              style={styles.input}
              disabled={submitting}
            />
            <HelperText testID="register-text-username-helper" type="info" visible>
              Mínimo de 3 caracteres.
            </HelperText>

            <TextInput
              testID="register-input-password"
              mode="outlined"
              label="Senha"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={secureText}
              autoCapitalize="none"
              left={<TextInput.Icon icon="lock-outline" />}
              right={
                <TextInput.Icon
                  testID="register-btn-toggle-password"
                  icon={secureText ? 'eye-outline' : 'eye-off-outline'}
                  onPress={() => setSecureText((prev) => !prev)}
                />
              }
              style={styles.input}
              disabled={submitting}
            />
            <HelperText testID="register-text-password-helper" type="info" visible>
              Mínimo de 4 caracteres (armazenada com hash SHA-256).
            </HelperText>

            <TextInput
              testID="register-input-confirm-password"
              mode="outlined"
              label="Confirmar Senha"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={secureText}
              autoCapitalize="none"
              error={passwordsMismatch}
              left={<TextInput.Icon icon="lock-check-outline" />}
              style={styles.input}
              disabled={submitting}
            />
            <HelperText
              testID="register-text-password-mismatch"
              type="error"
              visible={passwordsMismatch}
            >
              As senhas digitadas não coincidem.
            </HelperText>

            <Button
              testID="register-btn-submit"
              mode="contained"
              onPress={handleRegister}
              loading={submitting}
              disabled={submitting || passwordsMismatch}
              style={styles.primaryButton}
              contentStyle={styles.buttonContent}
            >
              Cadastrar
            </Button>
          </Surface>
        </ScrollView>
      </KeyboardAvoidingView>

      <Snackbar
        testID="register-snackbar-error"
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
    marginBottom: 16,
  },
  input: {
    marginTop: 4,
  },
  primaryButton: {
    marginTop: 12,
    borderRadius: 8,
  },
  buttonContent: {
    height: 48,
  },
});
