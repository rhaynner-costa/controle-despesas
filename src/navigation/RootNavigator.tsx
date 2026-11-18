import React from 'react';
import { StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { ActivityIndicator, Text, useTheme } from 'react-native-paper';
import { useAuth } from '../context/AuthContext';
import { AuthStack } from './AuthStack';
import { AppTabs } from './AppTabs';

export const RootNavigator: React.FC = () => {
  const theme = useTheme();
  const { isReady, initError, currentUser } = useAuth();

  if (!isReady) {
    return (
      <View
        testID="root-status-loading"
        style={[
          styles.centered,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <ActivityIndicator size="large" />
        <Text variant="bodyMedium" style={styles.loadingText}>
          Inicializando banco de dados local...
        </Text>
      </View>
    );
  }

  if (initError) {
    return (
      <View
        style={[
          styles.centered,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <Text
          variant="titleMedium"
          style={{ color: theme.colors.error, marginBottom: 8 }}
        >
          Erro ao inicializar SQLite
        </Text>
        <Text testID="root-status-init-error" variant="bodyMedium">
          {initError}
        </Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      {currentUser ? <AppTabs /> : <AuthStack />}
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
  },
});
