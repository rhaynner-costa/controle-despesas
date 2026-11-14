import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Appbar,
  Card,
  IconButton,
  List,
  ProgressBar,
  Snackbar,
  Surface,
  Text,
  useTheme,
} from 'react-native-paper';
import { PieChart } from 'react-native-gifted-charts';
import { useAuth } from '../../context/AuthContext';
import {
  ICategorySummaryItem,
  IDashboardSummary,
} from '../../services/DashboardService';

function formatCurrencyBRL(value: number): string {
  return `R$ ${value
    .toFixed(2)
    .replace('.', ',')
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
}

export const DashboardScreen: React.FC = () => {
  const theme = useTheme();
  const {
    currentUser,
    services,
    selectedYearMonth,
    formattedYearMonth,
    previousMonth,
    nextMonth,
    dataVersion,
  } = useAuth();

  const [loading, setLoading] = useState<boolean>(true);
  const [exportingPdf, setExportingPdf] = useState<boolean>(false);
  const [summary, setSummary] = useState<IDashboardSummary | null>(null);
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);

  const loadDashboard = useCallback(async (): Promise<void> => {
    if (!currentUser || !services) {
      return;
    }
    setLoading(true);
    try {
      const result = await services.dashboardService.getMonthlySummary(
        currentUser.id,
        selectedYearMonth
      );
      setSummary(result);
    } finally {
      setLoading(false);
    }
  }, [currentUser, services, selectedYearMonth]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard, dataVersion]);

  const handleExportPdf = async (): Promise<void> => {
    if (!currentUser || !services || !summary || exportingPdf) {
      return;
    }
    setExportingPdf(true);
    try {
      await services.dashboardService.exportMonthlySummaryToPdf(
        summary,
        formattedYearMonth,
        currentUser.username
      );
    } catch (error) {
      const msg =
        error instanceof Error
          ? error.message
          : 'Erro ao exportar resultados em PDF.';
      setSnackbarMessage(msg);
    } finally {
      setExportingPdf(false);
    }
  };

  const renderCategoryItem = ({ item }: { item: ICategorySummaryItem }) => (
    <View style={styles.itemRow}>
      <List.Item
        title={item.categoryName}
        description={() => (
          <View style={styles.progressContainer}>
            <ProgressBar
              progress={Math.min(1, item.percentage / 100)}
              color={item.categoryColor}
              style={styles.progressBar}
            />
          </View>
        )}
        left={() => (
          <View style={styles.leftIndicatorWrapper}>
            <View
              style={[
                styles.colorDot,
                { backgroundColor: item.categoryColor },
              ]}
            />
          </View>
        )}
        right={() => (
          <View style={styles.rightValues}>
            <Text variant="titleSmall" style={styles.amountText}>
              {formatCurrencyBRL(item.totalAmount)}
            </Text>
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              {item.percentage.toFixed(1).replace('.', ',')}%
            </Text>
          </View>
        )}
      />
    </View>
  );

  const totalAmount = summary?.totalMonthAmount ?? 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header elevated>
        <Appbar.Content title="Resultados" />
        <Appbar.Action
          icon="file-pdf-box"
          disabled={loading || exportingPdf || !summary}
          onPress={handleExportPdf}
          accessibilityLabel="Exportar resultados em PDF"
        />
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

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <FlatList
          data={summary?.categoriesSummary ?? []}
          keyExtractor={(item) => item.categoryId}
          renderItem={renderCategoryItem}
          showsVerticalScrollIndicator
          persistentScrollbar
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View style={styles.headerSection}>
              <Card mode="elevated" style={styles.totalCard}>
                <Card.Content style={styles.totalCardContent}>
                  <Text
                    variant="labelLarge"
                    style={{ color: theme.colors.onSurfaceVariant }}
                  >
                    Total do Mês
                  </Text>
                  <Text
                    variant="headlineMedium"
                    style={[styles.totalValue, { color: theme.colors.primary }]}
                  >
                    {formatCurrencyBRL(totalAmount)}
                  </Text>
                </Card.Content>
              </Card>

              {summary && summary.pieChartData.length > 0 ? (
                <Surface style={styles.chartContainer} elevation={1}>
                  <PieChart
                    data={summary.pieChartData}
                    donut
                    radius={95}
                    innerRadius={58}
                    innerCircleColor={theme.colors.surface}
                    showText={false}
                    centerLabelComponent={() => (
                      <View style={styles.centerLabel}>
                        <Text
                          variant="labelSmall"
                          style={{ color: theme.colors.onSurfaceVariant }}
                        >
                          Categorias
                        </Text>
                        <Text variant="titleMedium" style={styles.boldText}>
                          {summary.categoriesSummary.length}
                        </Text>
                      </View>
                    )}
                  />
                </Surface>
              ) : (
                <Surface style={styles.emptyCard} elevation={1}>
                  <Text
                    variant="bodyMedium"
                    style={{ color: theme.colors.onSurfaceVariant }}
                  >
                    Nenhuma despesa ativa registrada em {formattedYearMonth}.
                  </Text>
                </Surface>
              )}

              {summary && summary.categoriesSummary.length > 0 && (
                <Text variant="titleSmall" style={styles.sectionHeader}>
                  Distribuição por Categoria
                </Text>
              )}
            </View>
          }
        />
      )}

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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: 24,
  },
  headerSection: {
    padding: 16,
  },
  totalCard: {
    marginBottom: 16,
    borderRadius: 16,
  },
  totalCardContent: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  totalValue: {
    fontWeight: 'bold',
    marginTop: 4,
  },
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  centerLabel: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  boldText: {
    fontWeight: 'bold',
  },
  emptyCard: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  sectionHeader: {
    fontWeight: 'bold',
    marginTop: 4,
    marginBottom: 4,
  },
  leftIndicatorWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 8,
  },
  colorDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  progressContainer: {
    marginTop: 8,
    paddingRight: 12,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
  },
  rightValues: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 4,
  },
  amountText: {
    fontWeight: 'bold',
  },
  itemRow: {
    borderBottomWidth: 1.5,
    borderBottomColor: '#BDBDBD',
  },
});
