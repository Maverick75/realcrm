import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import AgentOnboardingScreen from '../screens/AgentOnboardingScreen';
import InventoryScreen from '../screens/InventoryScreen';
import PropertyFormScreen from '../screens/PropertyFormScreen';
import AgentProfileScreen from '../screens/AgentProfileScreen';
import RequirementsScreen from '../screens/RequirementsScreen';
import RequirementFormScreen from '../screens/RequirementFormScreen';
import RequirementDetailScreen from '../screens/RequirementDetailScreen';
import AgentsDirectoryScreen from '../screens/AgentsDirectoryScreen';
import AgentDetailScreen from '../screens/AgentDetailScreen';
import DashboardScreen from '../screens/DashboardScreen';
import CustomerFormScreen from '../screens/CustomerFormScreen';
import CustomerDetailScreen from '../screens/CustomerDetailScreen';
import OwnerListingsScreen from '../screens/OwnerListingsScreen';
import OwnerListingFormScreen from '../screens/OwnerListingFormScreen';
import OwnerProfileScreen from '../screens/OwnerProfileScreen';
import { colors } from '../constants/theme';

const AuthStackNav = createNativeStackNavigator();
const AgentStackNav = createNativeStackNavigator();
const AdminStackNav = createNativeStackNavigator();
const OwnerStackNav = createNativeStackNavigator();
const OnboardingStackNav = createNativeStackNavigator();
const AgentTab = createBottomTabNavigator();
const AdminTab = createBottomTabNavigator();
const OwnerTab = createBottomTabNavigator();

const tabScreenOptions = {
  headerShown: false,
  tabBarActiveTintColor: colors.primary,
  tabBarInactiveTintColor: colors.textMuted,
  tabBarLabelStyle: { fontSize: 12, fontWeight: '700', marginBottom: 4 },
  tabBarStyle: { height: 56, paddingTop: 4 },
  tabBarIcon: () => null,
};

function AuthStack() {
  return (
    <AuthStackNav.Navigator screenOptions={{ headerShown: false }}>
      <AuthStackNav.Screen name="Login" component={LoginScreen} />
      <AuthStackNav.Screen name="Register" component={RegisterScreen} />
    </AuthStackNav.Navigator>
  );
}

function AgentTabs() {
  return (
    <AgentTab.Navigator screenOptions={tabScreenOptions}>
      <AgentTab.Screen
        name="InventoryTab"
        component={InventoryScreen}
        options={{ title: 'Inventory', tabBarLabel: 'Inventory' }}
      />
      <AgentTab.Screen
        name="AssignedReqs"
        component={RequirementsScreen}
        options={{ title: 'Leads', tabBarLabel: 'Leads' }}
      />
      <AgentTab.Screen
        name="ProfileTab"
        component={AgentProfileScreen}
        options={{ title: 'Profile', tabBarLabel: 'Profile' }}
      />
    </AgentTab.Navigator>
  );
}

function AdminTabs() {
  return (
    <AdminTab.Navigator screenOptions={tabScreenOptions}>
      <AdminTab.Screen
        name="RequirementsTab"
        component={RequirementsScreen}
        options={{ title: 'Match', tabBarLabel: 'Match' }}
      />
      <AdminTab.Screen
        name="AgentsTab"
        component={AgentsDirectoryScreen}
        options={{ title: 'Agents', tabBarLabel: 'Agents' }}
      />
      <AdminTab.Screen
        name="CustomersTab"
        component={DashboardScreen}
        options={{ title: 'Buyers', tabBarLabel: 'Buyers' }}
      />
    </AdminTab.Navigator>
  );
}

function OwnerTabs() {
  return (
    <OwnerTab.Navigator screenOptions={tabScreenOptions}>
      <OwnerTab.Screen
        name="OwnerListingsTab"
        component={OwnerListingsScreen}
        options={{ title: 'My Listings', tabBarLabel: 'Listings' }}
      />
      <OwnerTab.Screen
        name="OwnerProfileTab"
        component={OwnerProfileScreen}
        options={{ title: 'Profile', tabBarLabel: 'Profile' }}
      />
    </OwnerTab.Navigator>
  );
}

function AgentStack() {
  return (
    <AgentStackNav.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <AgentStackNav.Screen
        name="AgentHome"
        component={AgentTabs}
        options={{ headerShown: false }}
      />
      <AgentStackNav.Screen
        name="PropertyForm"
        component={PropertyFormScreen}
        options={({ route }) => ({
          title: route.params?.mode === 'edit' ? 'Edit property' : 'Add property',
        })}
      />
      <AgentStackNav.Screen
        name="RequirementForm"
        component={RequirementFormScreen}
        options={{ title: 'New lead' }}
      />
      <AgentStackNav.Screen
        name="RequirementDetail"
        component={RequirementDetailScreen}
        options={{ title: 'Lead detail' }}
      />
    </AgentStackNav.Navigator>
  );
}

function AdminStack() {
  return (
    <AdminStackNav.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <AdminStackNav.Screen
        name="AdminHome"
        component={AdminTabs}
        options={{ headerShown: false }}
      />
      <AdminStackNav.Screen
        name="RequirementForm"
        component={RequirementFormScreen}
        options={{ title: 'New requirement' }}
      />
      <AdminStackNav.Screen
        name="RequirementDetail"
        component={RequirementDetailScreen}
        options={{ title: 'Matches' }}
      />
      <AdminStackNav.Screen
        name="AgentDetail"
        component={AgentDetailScreen}
        options={{ title: 'Agent' }}
      />
      <AdminStackNav.Screen
        name="CustomerForm"
        component={CustomerFormScreen}
        options={({ route }) => ({
          title: route.params?.mode === 'edit' ? 'Edit buyer' : 'Add buyer',
        })}
      />
      <AdminStackNav.Screen
        name="CustomerDetail"
        component={CustomerDetailScreen}
        options={{ title: 'Buyer' }}
      />
    </AdminStackNav.Navigator>
  );
}

function OwnerStack() {
  return (
    <OwnerStackNav.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <OwnerStackNav.Screen
        name="OwnerHome"
        component={OwnerTabs}
        options={{ headerShown: false }}
      />
      <OwnerStackNav.Screen
        name="OwnerListingForm"
        component={OwnerListingFormScreen}
        options={({ route }) => ({
          title: route.params?.mode === 'edit' ? 'Edit listing' : 'New listing',
        })}
      />
    </OwnerStackNav.Navigator>
  );
}

function OnboardingStack() {
  return (
    <OnboardingStackNav.Navigator screenOptions={{ headerShown: false }}>
      <OnboardingStackNav.Screen name="Onboarding" component={AgentOnboardingScreen} />
    </OnboardingStackNav.Navigator>
  );
}

function resolveRole(role) {
  if (role === 'sales') return 'agent';
  return role;
}

export default function AppNavigator() {
  const { isAuthenticated, booting, role, needsOnboarding } = useAuth();
  const normalizedRole = resolveRole(role);

  if (booting) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  let body = <AuthStack />;
  if (isAuthenticated) {
    if (normalizedRole === 'agent' && needsOnboarding) {
      body = <OnboardingStack />;
    } else if (normalizedRole === 'admin') {
      body = <AdminStack />;
    } else if (normalizedRole === 'owner') {
      body = <OwnerStack />;
    } else {
      body = <AgentStack />;
    }
  }

  return <NavigationContainer>{body}</NavigationContainer>;
}
