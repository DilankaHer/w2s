import React from 'react'
import { NavigationContainer, useNavigation } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack'
import { StatusBar } from 'expo-status-bar'
import { Text, Platform, TouchableOpacity, View, StyleSheet } from 'react-native'
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context'
import Toast from 'react-native-toast-message'
import LoginScreen from './src/screens/LoginScreen'
import TemplatesScreen from './src/screens/TemplatesScreen'
import HistoryScreen from './src/screens/HistoryScreen'
import TemplateDetailScreen from './src/screens/TemplateDetailScreen'
import SessionDetailScreen from './src/screens/SessionDetailScreen'
import CreateTemplateScreen from './src/screens/CreateTemplateScreen'
import { ProtectedRoute } from './src/components/ProtectedRoute'

export type RootStackParamList = {
  Login: undefined
  MainTabs: undefined
  TemplateDetail: { id: number }
  SessionDetail: { id: number }
  CreateTemplate: undefined
}

export type TabParamList = {
  Templates: undefined
  Create: undefined
  History: undefined
}

const Stack = createStackNavigator<RootStackParamList>()
const Tab = createBottomTabNavigator<TabParamList>()

// Placeholder component for the Create tab (never actually rendered)
function CreatePlaceholder() {
  return null
}

// Custom Add Button component for the tab bar
function AddButtonTab(props: any) {
  const navigation = useNavigation()
  
  return (
    <TouchableOpacity
      {...props}
      style={[props.style, styles.addButtonWrapper]}
      onPress={() => {
        const parentNavigation = navigation.getParent()
        if (parentNavigation) {
          parentNavigation.navigate('CreateTemplate' as never)
        }
      }}
    >
      <View style={styles.addButtonContainer}>
        <View style={styles.addButton}>
          <Text style={styles.addButtonText}>+</Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}

function MainTabs() {
  const insets = useSafeAreaInsets()
  
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#2563EB',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: '#6B7280',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 2,
          borderTopColor: '#D1D5DB',
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 8,
          height: 60 + Math.max(insets.bottom - 8, 0),
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="Templates"
        component={TemplatesScreen}
        options={{
          title: 'Templates',
          tabBarLabel: 'Templates',
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 20 }}>📋</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Create"
        component={CreatePlaceholder}
        options={{
          title: '',
          tabBarLabel: '',
          tabBarButton: (props) => <AddButtonTab {...props} />,
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{
          title: 'History',
          tabBarLabel: 'History',
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 20 }}>📊</Text>
          ),
        }}
      />
    </Tab.Navigator>
  )
}

const styles = StyleSheet.create({
  addButtonWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    top: -12, // Slightly raise the button
  },
  addButtonContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '400',
    lineHeight: 22,
  },
})

function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="auto" />
        <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#2563EB',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          // Smooth slide-in-from-right transition
          cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
          transitionSpec: {
            open: {
              animation: 'timing',
              config: {
                duration: 300,
              },
            },
            close: {
              animation: 'timing',
              config: {
                duration: 300,
              },
            },
          },
        }}
      >
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="MainTabs"
          options={{ headerShown: false }}
        >
          {() => (
            <ProtectedRoute>
              <MainTabs />
            </ProtectedRoute>
          )}
        </Stack.Screen>
        <Stack.Screen
          name="TemplateDetail"
          options={{ title: 'Template Details' }}
        >
          {() => (
            <ProtectedRoute>
              <TemplateDetailScreen />
            </ProtectedRoute>
          )}
        </Stack.Screen>
        <Stack.Screen
          name="SessionDetail"
          options={{ title: 'Workout Session' }}
        >
          {() => (
            <ProtectedRoute>
              <SessionDetailScreen />
            </ProtectedRoute>
          )}
        </Stack.Screen>
        <Stack.Screen
          name="CreateTemplate"
          options={{ title: 'Create Template' }}
        >
          {() => (
            <ProtectedRoute>
              <CreateTemplateScreen />
            </ProtectedRoute>
          )}
        </Stack.Screen>
      </Stack.Navigator>
      </NavigationContainer>
      <Toast />
    </SafeAreaProvider>
  )
}

export default App
