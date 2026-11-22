import React, { useEffect, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import {
  Appbar,
  Button,
  Dialog,
  HelperText,
  Portal,
  RadioButton,
  Snackbar,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { Category } from '../../models/Category';
import { Expense, IExpenseWithCategoryDTO } from '../../models/Expense';

export interface IExpenseFormModalProps {
  visible: boolean;
  editingExpense?: IExpenseWithCategoryDTO | null;
  onClose: () => void;
  onSuccess: () => void;
}

function toISODateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseISODateString(isoDate: string): Date {
  const [yearStr, monthStr, dayStr] = isoDate.split('-');
  const year = Number(yearStr);
  const monthIndex = Number(monthStr) - 1;
  const day = Number(dayStr);
  return new Date(year, monthIndex, day);
}

function formatDateBR(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}

export const ExpenseFormModal: React.FC<IExpenseFormModalProps> = ({
  visible,
  editingExpense = null,
  onClose,
  onSuccess,
}) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { currentUser, services, dataVersion, notifyDataChanged } = useAuth();

  const [categories, setCategories] = useState<Category[]>([]);
  const [amountInput, setAmountInput] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [expenseDate, setExpenseDate] = useState<Date>(new Date());
  const [notes, setNotes] = useState<string>('');

  const [categoryDialogVisible, setCategoryDialogVisible] =
    useState<boolean>(false);
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCategories(): Promise<void> {
      if (!visible || !currentUser || !services) {
        return;
      }
      const list = await services.categoryService.listCategoriesByUser(
        currentUser.id
      );
      setCategories(list);
    }

    void fetchCategories();
  }, [visible, currentUser, services, dataVersion]);

  useEffect(() => {
    if (visible) {
      if (editingExpense) {
        const centsStr = String(Math.round(editingExpense.amount * 100));
        setAmountInput(Expense.formatCurrencyInput(centsStr));
        setDescription(editingExpense.description);
        setSelectedCategoryId(editingExpense.categoryId);
        setExpenseDate(parseISODateString(editingExpense.expenseDate));
        setNotes(editingExpense.notes ?? '');
      } else {
        setAmountInput('');
        setDescription('');
        setSelectedCategoryId('');
        setExpenseDate(new Date());
        setNotes('');
      }
      setErrorMessage(null);
    }
  }, [visible, editingExpense]);

  const selectedCategory = categories.find(
    (c) => c.id === selectedCategoryId
  );

  const handleAmountChange = (rawText: string): void => {
    setAmountInput(Expense.formatCurrencyInput(rawText));
  };

  const handleDateChange = (
    event: DateTimePickerEvent,
    selected?: Date
  ): void => {
    setShowDatePicker(false);
    if (event.type === 'set' && selected) {
      setExpenseDate(selected);
    }
  };

  const openCategorySelector = (): void => {
    if (submitting) {
      return;
    }
    Keyboard.dismiss();
    setCategoryDialogVisible(true);
  };

  const openDateSelector = (): void => {
    if (submitting) {
      return;
    }
    Keyboard.dismiss();
    setShowDatePicker(true);
  };

  const handleSave = async (): Promise<void> => {
    Keyboard.dismiss();

    if (!currentUser || !services) {
      return;
    }

    setErrorMessage(null);
    const normalizedAmount = Expense.parseCurrencyInput(amountInput);

    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      setErrorMessage('Informe um valor válido maior que zero.');
      return;
    }

    if (!description.trim()) {
      setErrorMessage('Informe a descrição da despesa.');
      return;
    }

    if (!selectedCategoryId) {
      setErrorMessage(
        'Selecione uma categoria (cadastre uma na aba Categorias caso ainda não exista).'
      );
      return;
    }

    setSubmitting(true);
    try {
      if (editingExpense) {
        await services.expenseService.updateExpense({
          id: editingExpense.id,
          userId: currentUser.id,
          categoryId: selectedCategoryId,
          amount: normalizedAmount,
          description,
          expenseDate: toISODateString(expenseDate),
          notes: notes.trim() || null,
        });
      } else {
        await services.expenseService.createExpense({
          userId: currentUser.id,
          categoryId: selectedCategoryId,
          amount: normalizedAmount,
          description,
          expenseDate: toISODateString(expenseDate),
          notes: notes.trim() || null,
        });
      }

      notifyDataChanged();
      onSuccess();
      onClose();
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Erro ao salvar despesa.';
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      testID="expense-form-modal"
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="fullScreen"
    >
      <Portal.Host>
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
            <Appbar.Action
              testID="expense-form-btn-close"
              icon="close"
              onPress={onClose}
              disabled={submitting}
            />
            <Appbar.Content
              title={editingExpense ? 'Editar Despesa' : 'Nova Despesa'}
            />
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
              <TextInput
                testID="expense-form-input-amount"
                mode="outlined"
                placeholder="R$0,00"
                value={amountInput}
                onChangeText={handleAmountChange}
                keyboardType="number-pad"
                maxLength={15}
                disabled={submitting}
              />

              <TextInput
                testID="expense-form-input-description"
                mode="outlined"
                label="Descrição *"
                placeholder="Ex.: Supermercado, Combustível..."
                value={description}
                onChangeText={setDescription}
                left={<TextInput.Icon icon="text-short" />}
                disabled={submitting}
              />

              <View>
                <Pressable
                  testID="expense-form-pressable-category"
                  onPress={openCategorySelector}
                  disabled={submitting}
                >
                  <View pointerEvents="box-only">
                    <TextInput
                      testID="expense-form-input-category"
                      mode="outlined"
                      label="Categoria (1:1) *"
                      placeholder="Selecione uma categoria"
                      value={selectedCategory ? selectedCategory.name : ''}
                      editable={false}
                      left={<TextInput.Icon icon="tag-outline" />}
                      right={<TextInput.Icon icon="menu-down" />}
                    />
                  </View>
                </Pressable>
                {categories.length === 0 && (
                  <HelperText
                    testID="expense-form-text-no-categories"
                    type="error"
                    visible
                  >
                    Você ainda não possui categorias. Crie uma na aba Categorias primeiro.
                  </HelperText>
                )}
              </View>

              <Pressable
                testID="expense-form-pressable-date"
                onPress={openDateSelector}
                disabled={submitting}
              >
                <View pointerEvents="box-only">
                  <TextInput
                    testID="expense-form-input-date"
                    mode="outlined"
                    label="Data da Despesa *"
                    value={formatDateBR(toISODateString(expenseDate))}
                    editable={false}
                    left={<TextInput.Icon icon="calendar" />}
                  />
                </View>
              </Pressable>

              {showDatePicker && (
                <DateTimePicker
                  value={expenseDate}
                  mode="date"
                  display="default"
                  maximumDate={new Date()}
                  onChange={handleDateChange}
                />
              )}

              <TextInput
                testID="expense-form-input-notes"
                mode="outlined"
                label="Observações (OBS - Opcional)"
                placeholder="Informações adicionais sobre o lançamento..."
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
                left={<TextInput.Icon icon="note-text-outline" />}
                disabled={submitting}
              />

              <Button
                testID="expense-form-btn-save"
                mode="contained"
                icon="content-save-outline"
                onPress={handleSave}
                loading={submitting}
                disabled={submitting}
                style={styles.saveButton}
                contentStyle={styles.saveButtonContent}
              >
                Salvar Despesa
              </Button>
            </ScrollView>
          </KeyboardAvoidingView>

          <Portal>
            <Dialog
              testID="expense-form-dialog-category"
              visible={categoryDialogVisible}
              dismissable={false}
              dismissableBackButton={false}
            >
              <Dialog.Title>Selecionar Categoria</Dialog.Title>
              <Dialog.ScrollArea style={styles.dialogScrollArea}>
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator
                  persistentScrollbar
                >
                  {categories.length === 0 ? (
                    <Text style={styles.emptyCategoryText}>
                      Nenhuma categoria encontrada.
                    </Text>
                  ) : (
                    <RadioButton.Group
                      onValueChange={(value) => {
                        setSelectedCategoryId(value);
                        setCategoryDialogVisible(false);
                      }}
                      value={selectedCategoryId}
                    >
                      {categories.map((cat) => (
                        <RadioButton.Item
                          key={cat.id}
                          testID={`expense-form-radio-category-${cat.id}`}
                          label={cat.name}
                          value={cat.id}
                        />
                      ))}
                    </RadioButton.Group>
                  )}
                </ScrollView>
              </Dialog.ScrollArea>
              <Dialog.Actions>
                <Button
                  testID="expense-form-btn-close-category-dialog"
                  onPress={() => setCategoryDialogVisible(false)}
                >
                  Fechar
                </Button>
              </Dialog.Actions>
            </Dialog>
          </Portal>

          <Snackbar
            testID="expense-form-snackbar-error"
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
      </Portal.Host>
    </Modal>
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
    padding: 16,
    paddingBottom: 140,
    gap: 16,
  },
  saveButton: {
    borderRadius: 8,
  },
  saveButtonContent: {
    height: 48,
  },
  dialogScrollArea: {
    maxHeight: 320,
    paddingHorizontal: 0,
  },
  emptyCategoryText: {
    padding: 16,
  },
});
