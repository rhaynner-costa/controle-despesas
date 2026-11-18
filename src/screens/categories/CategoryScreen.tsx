import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {
  Appbar,
  Button,
  Dialog,
  Divider,
  FAB,
  IconButton,
  List,
  Portal,
  Snackbar,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { Category } from '../../models/Category';

const MATERIAL_COLORS: string[] = [
  '#E53935',
  '#D81B60',
  '#8E24AA',
  '#5E35B1',
  '#3949AB',
  '#1E88E5',
  '#00897B',
  '#43A047',
  '#FB8C00',
  '#F4511E',
  '#6D4C41',
  '#546E7A',
];

export const CategoryScreen: React.FC = () => {
  const theme = useTheme();
  const { currentUser, services, dataVersion, notifyDataChanged } = useAuth();

  const [categories, setCategories] = useState<Category[]>([]);
  const [dialogVisible, setDialogVisible] = useState<boolean>(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [name, setName] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>(MATERIAL_COLORS[0]);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);

  const loadCategories = useCallback(async (): Promise<void> => {
    if (!currentUser || !services) {
      return;
    }
    const result = await services.categoryService.listCategoriesByUser(
      currentUser.id
    );
    setCategories(result);
  }, [currentUser, services]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories, dataVersion]);

  const openCreateDialog = (): void => {
    setEditingCategory(null);
    setName('');
    setSelectedColor(MATERIAL_COLORS[0]);
    setDialogVisible(true);
  };

  const openEditDialog = (category: Category): void => {
    setEditingCategory(category);
    setName(category.name);
    setSelectedColor(category.color ?? MATERIAL_COLORS[0]);
    setDialogVisible(true);
  };

  const handleCancelDialog = (): void => {
    Keyboard.dismiss();
    setDialogVisible(false);
  };

  const handleSaveCategory = async (): Promise<void> => {
    Keyboard.dismiss();
    if (!currentUser || !services) {
      return;
    }
    setSubmitting(true);
    try {
      if (editingCategory) {
        await services.categoryService.updateCategory(
          editingCategory.id,
          currentUser.id,
          name,
          selectedColor
        );
        setSnackbarMessage('Categoria atualizada com sucesso.');
      } else {
        await services.categoryService.createCategory(
          currentUser.id,
          name,
          selectedColor
        );
        setSnackbarMessage('Categoria criada com sucesso.');
      }
      setDialogVisible(false);
      notifyDataChanged();
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Erro ao salvar categoria.';
      setSnackbarMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header elevated>
        <Appbar.Content title="Categorias" />
      </Appbar.Header>

      <FlatList
        testID="categories-list-items"
        data={categories}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator
        persistentScrollbar
        contentContainerStyle={
          categories.length === 0 ? styles.emptyContainer : styles.listContent
        }
        ListEmptyComponent={
          <View style={styles.emptyView}>
            <Text
              testID="categories-text-empty"
              variant="bodyLarge"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              Nenhuma categoria cadastrada. Toque no botão + para criar.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.itemRow}>
            <List.Item
              testID={`categories-item-${item.id}`}
              title={item.name}
              description={item.color ?? '#6200EE'}
              onPress={() => openEditDialog(item)}
              left={() => (
                <View style={styles.leftWrapper}>
                  <View
                    style={[
                      styles.colorCircle,
                      { backgroundColor: item.color ?? '#6200EE' },
                    ]}
                  />
                </View>
              )}
              right={() => (
                <IconButton
                  testID={`categories-btn-edit-${item.id}`}
                  icon="pencil-outline"
                  onPress={() => openEditDialog(item)}
                  accessibilityLabel={`Editar categoria ${item.name}`}
                />
              )}
            />
          </View>
        )}
      />

      <FAB
        testID="categories-fab-new"
        icon="plus"
        style={styles.fab}
        onPress={openCreateDialog}
        label="Nova Categoria"
      />

      <Portal>
        <Dialog
          testID="categories-dialog-form"
          visible={dialogVisible}
          dismissable={false}
          dismissableBackButton={false}
        >
          <Dialog.Title>
            {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
          </Dialog.Title>
          <Dialog.ScrollArea style={styles.dialogScrollArea}>
            <ScrollView
              contentContainerStyle={styles.dialogScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
              persistentScrollbar
            >
              <TextInput
                testID="categories-input-name"
                mode="outlined"
                label="Nome da Categoria"
                value={name}
                onChangeText={setName}
                style={styles.dialogInput}
                disabled={submitting}
              />

              <Text variant="labelLarge" style={styles.paletteLabel}>
                Cor no Gráfico (Material Design)
              </Text>
              <View style={styles.colorGrid}>
                {MATERIAL_COLORS.map((hex) => {
                  const isSelected = selectedColor === hex;
                  return (
                    <Pressable
                      key={hex}
                      testID={`categories-pressable-color-${hex
                        .replace('#', '')
                        .toLowerCase()}`}
                      onPress={() => setSelectedColor(hex)}
                      style={[
                        styles.colorSwatch,
                        { backgroundColor: hex },
                        isSelected && styles.selectedSwatch,
                      ]}
                    >
                      {isSelected && (
                        <MaterialCommunityIcons
                          name="check"
                          size={18}
                          color="#FFFFFF"
                        />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button
              testID="categories-btn-cancel"
              onPress={handleCancelDialog}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              testID="categories-btn-save"
              mode="contained"
              onPress={handleSaveCategory}
              loading={submitting}
              disabled={submitting}
            >
              Salvar
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar
        testID="categories-snackbar-feedback"
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
  leftWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 8,
  },
  colorCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
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
  dialogScrollArea: {
    maxHeight: 320,
    paddingHorizontal: 0,
  },
  dialogScrollContent: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  dialogInput: {
    marginBottom: 16,
  },
  paletteLabel: {
    marginBottom: 8,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedSwatch: {
    borderWidth: 2,
    borderColor: '#000000',
  },
});
