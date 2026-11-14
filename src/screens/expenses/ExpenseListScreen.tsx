import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Appbar,
  Button,
  Dialog,
  FAB,
  IconButton,
  List,
  Portal,
  Searchbar,
  Snackbar,
  Surface,
  Text,
  useTheme,
} from 'react-native-paper';
import { useAuth } from '../../context/AuthContext';
import { IExpenseWithCategoryDTO } from '../../models/Expense';
import { ExpenseFormModal } from './ExpenseFormModal';

function formatCurrencyBRL(value: number): string {
  return `R$ ${value
    .toFixed(2)
    .replace('.', ',')
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
}

function formatDateBR(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}

export const ExpenseListScreen: React.FC = () => {
  const theme = useTheme();
  const {
    currentUser,
    services,
    selectedYearMonth,
    formattedYearMonth,
    previousMonth,
    nextMonth,
    dataVersion,
    notifyDataChanged,
  } = useAuth();

  const [loading, setLoading] = useState<boolean>(true);
  const [expenses, setExpenses] = useState<IExpenseWithCategoryDTO[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [formVisible, setFormVisible] = useState<boolean>(false);
  const [editingExpense, setEditingExpense] =
    useState<IExpenseWithCategoryDTO | null>(null);
  const [expenseToDelete, setExpenseToDelete] =
    useState<IExpenseWithCategoryDTO | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);

  const openCreateModal = (): void => {
    setEditingExpense(null);
    setFormVisible(true);
  };

  const openEditModal = (expense: IExpenseWithCategoryDTO): void => {
    setEditingExpense(expense);
    setFormVisible(true);
  };

  const loadExpenses = useCallback(async (): Promise<void> => {
    if (!currentUser || !services) {
      return;
    }
    setLoading(true);
    try {
      const list = await services.expenseService.listActiveExpensesByMonth(
        currentUser.id,
        selectedYearMonth
      );
      setExpenses(list);
    } finally {
      setLoading(false);
    }
  }, [currentUser, services, selectedYearMonth]);

  useEffect(() => {
    void loadExpenses();
  }, [loadExpenses, dataVersion]);

  const filteredExpenses = useMemo<IExpenseWithCategoryDTO[]>(() => {
    if (!services) {
      return expenses;
    }
    return services.expenseService.filterExpenses(expenses, searchQuery);
  }, [expenses, searchQuery, services]);

  const handleConfirmSoftDelete = async (): Promise<void> => {
    if (!currentUser || !services || !expenseToDelete) {
      return;
    }
    setDeleting(true);
    try {
      await services.expenseService.softDeleteExpense(
        expenseToDelete.id,
        currentUser.id
      );
      setExpenseToDelete(null);
      notifyDataChanged();
      setSnackbarMessage('Despesa excluída com sucesso.');
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Erro ao excluir despesa.';
      setSnackbarMessage(msg);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header elevated>
        <Appbar.Content title="Despesas" />
      </Appbar.Header>

      <Surface style={styles.monthSelectorBar} elevation={1}>
        <IconButton
          icon="chevron-left"
          size={26}
          onPress={previousMonth}
          accessibilityLabel="Mês anterior"
        />
        <Text variant="titleMedium" style={styles.monthTitle}>
          {formattedYearMonth}
        </Text>
        <IconButton
          icon="chevron-right"
          size={26}
          onPress={nextMonth}
          accessibilityLabel="Próximo mês"
        />
      </Surface>

      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Buscar descrição, categoria ou dia (ex: 15)"
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
          inputStyle={styles.searchInput}
          elevation={1}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <FlatList
          data={filteredExpenses}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator
          persistentScrollbar
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={
            filteredExpenses.length === 0
              ? styles.emptyContainer
              : styles.listContent
          }
          ListEmptyComponent={
            <View style={styles.emptyView}>
              <Text
                variant="bodyLarge"
                style={[
                  styles.emptyText,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                {searchQuery.trim()
                  ? `Nenhuma despesa encontrada para "${searchQuery.trim()}" em ${formattedYearMonth}.`
                  : `Nenhuma despesa ativa em ${formattedYearMonth}.`}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const subtitleLines = [
              `${item.categoryName} • ${formatDateBR(item.expenseDate)}`,
              item.notes ? `OBS: ${item.notes}` : null,
            ]
              .filter(Boolean)
              .join('\n');

            return (
              <View style={styles.itemRow}>
                <List.Item
                  title={item.description}
                  description={subtitleLines}
                  descriptionNumberOfLines={3}
                  onPress={() => openEditModal(item)}
                  left={() => (
                    <View style={styles.leftIndicator}>
                      <View
                        style={[
                          styles.categoryDot,
                          {
                            backgroundColor: item.categoryColor ?? '#6200EE',
                          },
                        ]}
                      />
                    </View>
                  )}
                  right={() => (
                    <View style={styles.rightActions}>
                      <Text variant="titleSmall" style={styles.amountText}>
                        {formatCurrencyBRL(item.amount)}
                      </Text>
                      <IconButton
                        icon="pencil-outline"
                        size={20}
                        onPress={() => openEditModal(item)}
                        accessibilityLabel={`Editar despesa ${item.description}`}
                      />
                      <IconButton
                        icon="delete-outline"
                        iconColor={theme.colors.error}
                        size={20}
                        onPress={() => setExpenseToDelete(item)}
                        accessibilityLabel={`Excluir despesa ${item.description}`}
                      />
                    </View>
                  )}
                />
              </View>
            );
          }}
        />
      )}

      <FAB
        icon="plus"
        label="Nova Despesa"
        style={styles.fab}
        onPress={openCreateModal}
      />

      <ExpenseFormModal
        visible={formVisible}
        editingExpense={editingExpense}
        onClose={() => {
          setFormVisible(false);
          setEditingExpense(null);
        }}
        onSuccess={() =>
          setSnackbarMessage(
            editingExpense
              ? 'Despesa atualizada com sucesso.'
              : 'Despesa registrada com sucesso.'
          )
        }
      />

      <Portal>
        <Dialog
          visible={Boolean(expenseToDelete)}
          dismissable={false}
          dismissableBackButton={false}
        >
          <Dialog.Title>Excluir Despesa</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              Deseja realmente excluir a despesa{' '}
              <Text style={styles.boldText}>
                {expenseToDelete?.description}
              </Text>{' '}
              no valor de{' '}
              <Text style={styles.boldText}>
                {expenseToDelete
                  ? formatCurrencyBRL(expenseToDelete.amount)
                  : ''}
              </Text>
              ?
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => setExpenseToDelete(null)}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button
              mode="contained"
              buttonColor={theme.colors.error}
              textColor={theme.colors.onError}
              onPress={handleConfirmSoftDelete}
              loading={deleting}
              disabled={deleting}
            >
              Excluir
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar
        visible={Boolean(snackbarMessage)}
        onDismiss={() => setSnackbarMessage(null)}
        duration={3500}
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
  monthSelectorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  monthTitle: {
    fontWeight: 'bold',
  },
  searchContainer: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 6,
  },
  searchbar: {
    borderRadius: 12,
    height: 48,
  },
  searchInput: {
    minHeight: 0,
    fontSize: 14,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: 96,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyView: {
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
  },
  leftIndicator: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 8,
  },
  categoryDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  amountText: {
    fontWeight: 'bold',
  },
  boldText: {
    fontWeight: 'bold',
  },
  itemRow: {
    borderBottomWidth: 1.5,
    borderBottomColor: '#BDBDBD',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
});
