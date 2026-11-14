import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
  Appbar,
  Avatar,
  Button,
  Dialog,
  Divider,
  List,
  Portal,
  Snackbar,
  Surface,
  Switch,
  Text,
  useTheme,
} from 'react-native-paper';
import packageJson from '../../../package.json';
import { useAuth } from '../../context/AuthContext';

export const DataProfileScreen: React.FC = () => {
  const theme = useTheme();
  const {
    currentUser,
    services,
    userBiometricEnabled,
    toggleUserBiometrics,
    logout,
    notifyDataChanged,
  } = useAuth();

  const [busy, setBusy] = useState<boolean>(false);
  const [clearStep, setClearStep] = useState<0 | 1 | 2>(0);
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);

  const handleToggleBiometrics = async (nextValue: boolean): Promise<void> => {
    if (!currentUser || !services) {
      return;
    }
    setBusy(true);
    try {
      await toggleUserBiometrics(nextValue);
      setSnackbarMessage(
        nextValue
          ? 'Login com biometria habilitado para este usuário.'
          : 'Login com biometria desabilitado para este usuário.'
      );
    } catch (error) {
      const msg =
        error instanceof Error
          ? error.message
          : 'Erro ao atualizar configuração de biometria.';
      setSnackbarMessage(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleExport = async (): Promise<void> => {
    if (!currentUser || !services) {
      return;
    }
    setBusy(true);
    try {
      await services.backupService.exportUserData(currentUser.id);
      setSnackbarMessage('Backup JSON gerado com sucesso.');
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Erro ao exportar dados.';
      setSnackbarMessage(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleImport = async (): Promise<void> => {
    if (!currentUser || !services) {
      return;
    }
    setBusy(true);
    try {
      const result = await services.backupService.importUserData(currentUser.id);
      if (!result.canceled) {
        notifyDataChanged();
        setSnackbarMessage(
          `Importação concluída: ${result.categoriesProcessed} categorias e ${result.expensesProcessed} despesas processadas.`
        );
      }
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Erro ao importar arquivo JSON.';
      setSnackbarMessage(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleClearDataConfirmed = async (): Promise<void> => {
    if (!currentUser || !services) {
      return;
    }
    setBusy(true);
    try {
      await services.backupService.clearUserData(currentUser.id);
      setClearStep(0);
      notifyDataChanged();
      setSnackbarMessage('Todos os dados da sua conta foram removidos.');
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Erro ao limpar dados locais.';
      setSnackbarMessage(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header elevated>
        <Appbar.Content title="Dados e Perfil" />
      </Appbar.Header>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator
        persistentScrollbar
      >
        <Surface style={styles.userCard} elevation={1}>
          <Avatar.Icon size={48} icon="account" />
          <View style={styles.userInfo}>
            <Text variant="titleMedium" style={styles.boldText}>
              {currentUser?.username}
            </Text>
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              UUID: {currentUser?.id}
            </Text>
            <Text
              variant="labelSmall"
              style={{ color: theme.colors.primary, marginTop: 4 }}
            >
              Versão {packageJson.version}
            </Text>
          </View>
        </Surface>

        <List.Section>
          <List.Subheader>Manutenção de Dados (Offline-First)</List.Subheader>

          <List.Item
            title="Exportar Backup (JSON)"
            description="Gera arquivo .json das suas categorias e despesas e abre o compartilhamento do Android"
            left={(props) => <List.Icon {...props} icon="export-variant" />}
            onPress={handleExport}
            disabled={busy}
          />
          <Divider
            style={[
              styles.divider,
              { backgroundColor: theme.colors.outlineVariant },
            ]}
          />

          <List.Item
            title="Importar Backup (JSON)"
            description="Lê arquivo .json do aparelho usando INSERT OR IGNORE (sem duplicar UUIDs)"
            left={(props) => <List.Icon {...props} icon="import" />}
            onPress={handleImport}
            disabled={busy}
          />
          <Divider
            style={[
              styles.divider,
              { backgroundColor: theme.colors.outlineVariant },
            ]}
          />

          <List.Item
            title="Limpar Dados"
            titleStyle={{ color: theme.colors.error }}
            description="Remove todas as categorias e despesas vinculadas ao seu usuário"
            left={(props) => (
              <List.Icon
                {...props}
                icon="delete-forever-outline"
                color={theme.colors.error}
              />
            )}
            onPress={() => setClearStep(1)}
            disabled={busy}
          />
          <Divider
            style={[
              styles.divider,
              { backgroundColor: theme.colors.outlineVariant },
            ]}
          />
        </List.Section>

        <List.Section>
          <List.Subheader>Sessão</List.Subheader>
          <List.Item
            title="Login com Biometria"
            description="Habilitar autenticação biométrica do Android para este usuário"
            left={(props) => <List.Icon {...props} icon="fingerprint" />}
            right={() => (
              <Switch
                value={userBiometricEnabled}
                onValueChange={(value) => {
                  void handleToggleBiometrics(value);
                }}
                disabled={busy}
              />
            )}
            onPress={() => {
              void handleToggleBiometrics(!userBiometricEnabled);
            }}
            disabled={busy}
          />
          <Divider
            style={[
              styles.divider,
              { backgroundColor: theme.colors.outlineVariant },
            ]}
          />
          <List.Item
            title="Sair (Logout)"
            description="Encerrar sessão atual neste dispositivo"
            left={(props) => <List.Icon {...props} icon="logout" />}
            onPress={logout}
            disabled={busy}
          />
          <Divider
            style={[
              styles.divider,
              { backgroundColor: theme.colors.outlineVariant },
            ]}
          />
        </List.Section>
      </ScrollView>

      <Portal>
        <Dialog
          visible={clearStep === 1}
          dismissable={false}
          dismissableBackButton={false}
        >
          <Dialog.Title>Limpar Dados (1/2)</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              Deseja iniciar a limpeza de todas as categorias e despesas do
              usuário <Text style={styles.boldText}>{currentUser?.username}</Text>?
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setClearStep(0)} disabled={busy}>
              Cancelar
            </Button>
            <Button
              mode="contained"
              onPress={() => setClearStep(2)}
              disabled={busy}
            >
              Continuar
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog
          visible={clearStep === 2}
          dismissable={false}
          dismissableBackButton={false}
        >
          <Dialog.Title>Confirmação Final (2/2)</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              Esta ação é irreversível e apagará permanentemente todas as suas
              despesas e categorias salvas no banco local. Confirmar exclusão?
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setClearStep(0)} disabled={busy}>
              Cancelar
            </Button>
            <Button
              mode="contained"
              buttonColor={theme.colors.error}
              textColor={theme.colors.onError}
              onPress={handleClearDataConfirmed}
              loading={busy}
              disabled={busy}
            >
              Sim, Apagar Tudo
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar
        visible={Boolean(snackbarMessage)}
        onDismiss={() => setSnackbarMessage(null)}
        duration={4000}
      >
        {snackbarMessage ?? ''}
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 24,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    padding: 16,
    borderRadius: 16,
  },
  userInfo: {
    marginLeft: 16,
    flex: 1,
  },
  boldText: {
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
  },
});
