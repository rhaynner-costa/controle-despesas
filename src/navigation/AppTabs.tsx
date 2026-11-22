import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DashboardScreen } from '../screens/dashboard/DashboardScreen';
import { ExpenseListScreen } from '../screens/expenses/ExpenseListScreen';
import { CategoryScreen } from '../screens/categories/CategoryScreen';
import { DataProfileScreen } from '../screens/profile/DataProfileScreen';

export type AppTabsParamList = {
  Dashboard: undefined;
  Expenses: undefined;
  Categories: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<AppTabsParamList>();

export const AppTabs: React.FC = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      initialRouteName="Dashboard"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: theme.colors.elevation.level2,
          borderTopColor: theme.colors.outlineVariant,
          height: 64 + insets.bottom,
          paddingBottom: 8 + insets.bottom,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: 'Resultados',
          tabBarButtonTestID: 'tab-btn-dashboard',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="chart-donut"
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Expenses"
        component={ExpenseListScreen}
        options={{
          title: 'Despesas',
          tabBarButtonTestID: 'tab-btn-expenses',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="format-list-bulleted"
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Categories"
        component={CategoryScreen}
        options={{
          title: 'Categorias',
          tabBarButtonTestID: 'tab-btn-categories',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="tag-multiple-outline"
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={DataProfileScreen}
        options={{
          title: 'Dados/Perfil',
          tabBarButtonTestID: 'tab-btn-profile',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="database-cog-outline"
              color={color}
              size={size}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
};
