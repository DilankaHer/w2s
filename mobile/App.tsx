import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { NavigationContainer, useNavigation } from '@react-navigation/native'
import { CardStyleInterpolators, createStackNavigator } from '@react-navigation/stack'
import { StatusBar } from 'expo-status-bar'
import React from 'react'
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context'
import Toast from 'react-native-toast-message'
import { ProtectedRoute } from './src/components/ProtectedRoute'
import { AuthProvider, useAuth } from './src/contexts/AuthContext'
import CreateTemplateScreen from './src/screens/CreateTemplateScreen'
import HistoryScreen from './src/screens/HistoryScreen'
import LoginScreen from './src/screens/LoginScreen'
import ProfileScreen from './src/screens/ProfileScreen'
import SessionDetailScreen from './src/screens/SessionDetailScreen'
import TemplateDetailScreen from './src/screens/TemplateDetailScreen'
import TemplatesScreen from './src/screens/TemplatesScreen'

export type RootStackParamList = {
  Login: { completeSessionId?: number; sessionCreatedAt?: string; session?: unknown; removedSessionExerciseIds?: number[]; createTemplate?: boolean; templateName?: string } | undefined
  MainTabs: { screen?: keyof TabParamList } | undefined
  TemplateDetail: { id: number }
  SessionDetail: { id: number; initialSession?: unknown; initialCreatedAt?: string }
  CreateTemplate: undefined
}

export type TabParamList = {
  Templates: undefined
  Create: undefined
  History: undefined
  Profile: undefined
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
  const { isAuthenticated } = useAuth()

  const handlePress = () => {
    const parentNavigation = navigation.getParent()
    if (!parentNavigation) return
    if (!isAuthenticated) {
      Alert.alert(
        'Login required',
        'You need to log in to create a template.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => parentNavigation.navigate('Login' as never) },
        ]
      )
      return
    }
    parentNavigation.navigate('CreateTemplate' as never)
  }

  return (
    <TouchableOpacity
      {...props}
      style={[props.style, styles.addButtonWrapper]}
      onPress={handlePress}
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
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 20 }}>👤</Text>
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

const stackScreenOptions = {
  headerStyle: {
    backgroundColor: '#2563EB',
  },
  headerTintColor: '#fff',
  headerTitleStyle: {
    fontWeight: 'bold' as const,
  },
  cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
  transitionSpec: {
    open: { animation: 'timing' as const, config: { duration: 300 } },
    close: { animation: 'timing' as const, config: { duration: 300 } },
  },
}

function SplashScreen() {
  return (
    <View style={splashStyles.container}>
      <Text style={splashStyles.title}>W2S</Text>
      <Text style={splashStyles.subtitle}>Workout to Session</Text>
      <ActivityIndicator size="large" color="#2563EB" style={splashStyles.spinner} />
    </View>
  )
}

const splashStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 32,
  },
  spinner: {
    marginTop: 16,
  },
})

function ServerDownScreen() {
  const { retryServer, isLoading } = useAuth()
  return (
    <View style={serverDownStyles.container}>
      <Text style={serverDownStyles.title}>Server is down</Text>
      <Text style={serverDownStyles.subtitle}>Please try again later.</Text>
      <TouchableOpacity
        style={[serverDownStyles.retryButton, isLoading && serverDownStyles.buttonDisabled]}
        onPress={() => retryServer()}
        disabled={isLoading}
      >
        <Text style={serverDownStyles.retryButtonText}>
          {isLoading ? 'Connecting…' : 'Retry'}
        </Text>
      </TouchableOpacity>
    </View>
  )
}

const serverDownStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
  },
  retryButton: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
})

function ServerDownOverlay() {
  const insets = useSafeAreaInsets()
  const { retryServer, isLoading } = useAuth()
  return (
    <View style={overlayStyles.backdrop} pointerEvents="auto">
      <View style={[overlayStyles.toast, { marginTop: insets.top + 8 }]}>
        <Text style={overlayStyles.toastText}>Server is down</Text>
        <TouchableOpacity
          style={[overlayStyles.retryButton, isLoading && overlayStyles.buttonDisabled]}
          onPress={() => retryServer()}
          disabled={isLoading}
        >
          <Text style={overlayStyles.retryButtonText}>
            {isLoading ? 'Connecting…' : 'Retry'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const overlayStyles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 24,
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  toastText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  retryButton: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
})

function RootNavigator() {
  const { isLoading, isAuthenticated, serverDown, hasEnteredApp } = useAuth()

  if (serverDown && !hasEnteredApp) {
    return <ServerDownScreen />
  }

  // Always show splash screen during initial auth check (before we know auth state).
  if (isLoading && isAuthenticated === null) {
    return <SplashScreen />
  }

  return (
    <View style={{ flex: 1 }}>
    <Stack.Navigator
      initialRouteName="MainTabs"
      screenOptions={stackScreenOptions}
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
        {() => <MainTabs />}
      </Stack.Screen>
      <Stack.Screen
        name="TemplateDetail"
        options={{ title: 'Template Details' }}
      >
        {() => <TemplateDetailScreen />}
      </Stack.Screen>
      <Stack.Screen
        name="SessionDetail"
        options={{ title: 'Workout Session' }}
      >
        {() => <SessionDetailScreen />}
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
    {serverDown && hasEnteredApp && <ServerDownOverlay />}
    </View>
  )
}

function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <StatusBar style="auto" />
          <RootNavigator />
        </NavigationContainer>
        <Toast visibilityTime={3000} />
      </AuthProvider>
    </SafeAreaProvider>
  )
}

export default App
