import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { NavigationContainer, useNavigation } from '@react-navigation/native'
import { CardStyleInterpolators, createStackNavigator } from '@react-navigation/stack'
import Ionicons from '@expo/vector-icons/Ionicons'
import { StatusBar } from 'expo-status-bar'
import React, { useEffect, useState } from 'react'
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context'
import Toast from 'react-native-toast-message'
import { ProtectedRoute } from './src/components/ProtectedRoute'
import { AuthProvider, useAuth } from './src/contexts/AuthContext'
import CreateTemplateScreen from './src/screens/CreateTemplateScreen'
import ExercisePickerScreen from './src/screens/ExercisePickerScreen'
import ExercisesScreen from './src/screens/ExercisesScreen'
import HistoryScreen from './src/screens/HistoryScreen'
import LoginScreen from './src/screens/LoginScreen'
import ProfileScreen from './src/screens/ProfileScreen'
import SessionDetailScreen from './src/screens/SessionDetailScreen'
import TemplateDetailScreen from './src/screens/TemplateDetailScreen'
import TemplatesScreen from './src/screens/TemplatesScreen'
import { colors } from './src/theme/colors'
import { db } from '@/database/database'
import migrations from 'drizzle/migrations'
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator'
import { seed } from '@/database/seed'

export type ExercisePickerResult = { id: number; name: string }

export type RootStackParamList = {
  Login: { completeSessionId?: number; sessionCreatedAt?: string; session?: unknown; removedSessionExerciseIds?: number[]; createTemplate?: boolean; templateName?: string } | undefined
  MainTabs: { screen?: keyof TabParamList } | undefined
  TemplateDetail: { id: string }
  SessionDetail: { id: number; initialSession?: unknown; initialCreatedAt?: string; initialCompletedAt?: string; selectedExercise?: ExercisePickerResult }
  CreateTemplate: { selectedExercise?: ExercisePickerResult; replacingExerciseId?: number } | undefined
  ExercisePicker: { pickerFor: 'createTemplate' | 'session'; sessionId?: number; replacingExerciseId?: number }
}

export type TabParamList = {
  Templates: undefined
  Create: undefined
  History: undefined
  Exercises: undefined
  Profile: undefined
}

const Stack = createStackNavigator<RootStackParamList>()
const Tab = createBottomTabNavigator<TabParamList>()

// Placeholder component for the Create tab (never actually rendered)
function CreatePlaceholder() {
  return null
}

// Create tab button: inline with other tabs (no floating circle) so it fits the bar
function AddButtonTab(props: any) {
  const navigation = useNavigation()
  const { isAuthenticated } = useAuth()

  const handlePress = () => {
    // Resolve root navigator (stack); custom tab bar can run in a context where getParent() is null
    let rootNav: any = navigation
    while (rootNav?.getParent?.()) {
      rootNav = rootNav.getParent()
    }
    if (!rootNav) return
    if (!isAuthenticated) {
      Alert.alert(
        'Login required',
        'You need to log in to create a workout.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => rootNav.navigate('Login' as never) },
        ]
      )
      return
    }
    rootNav.navigate('CreateTemplate' as never)
  }

  return (
    <TouchableOpacity
      style={[props.style, styles.addButtonWrapper]}
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel="Create"
    >
      <View style={styles.addButtonContent}>
        <View style={styles.addButtonIconWrap}>
          <Ionicons name="add" size={28} color={colors.tabInactive} />
        </View>
        <Text style={styles.addButtonLabel} numberOfLines={1}>Create</Text>
      </View>
    </TouchableOpacity>
  )
}

function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets()

  return (
    <View
      style={[
        customTabBarStyles.container,
        {
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 8,
          height: 52 + Math.max(insets.bottom, 8),
        },
      ]}
    >
      <View style={customTabBarStyles.row}>
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key]
          const isFocused = state.index === index
          const label = options.tabBarLabel ?? options.title ?? route.name
          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            })
            if (!event.defaultPrevented) {
              navigation.navigate(route.name)
            }
          }
          if (route.name === 'Create' && options.tabBarButton) {
            const TabButton = options.tabBarButton
            return <TabButton key={route.key} to={undefined} href={undefined} onPress={onPress} onLongPress={() => { }} accessibilityRole="button" accessibilityState={{ selected: isFocused }} accessibilityLabel={typeof label === 'string' ? label : undefined} testID={undefined} style={customTabBarStyles.fabSlot} />
          }
          const iconName = options.tabBarIcon
            ? (() => {
              const result = options.tabBarIcon({
                focused: isFocused,
                color: isFocused ? colors.tabActive : colors.tabInactive,
                size: 24,
              })
              return result
            })()
            : null
          const tint = isFocused ? colors.tabActive : colors.tabInactive
          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={customTabBarStyles.tab}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityState={{ selected: isFocused }}
              accessibilityLabel={typeof label === 'string' ? label : undefined}
            >
              <View style={customTabBarStyles.iconWrap}>{iconName}</View>
              <Text style={[customTabBarStyles.label, { color: tint }]} numberOfLines={1}>
                {label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}

const customTabBarStyles = StyleSheet.create({
  container: {
    backgroundColor: colors.tabBar,
    borderTopWidth: 1,
    borderTopColor: colors.tabBarBorder,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 6,
  },
  fabSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    marginBottom: 2,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
  },
})

function MainTabs() {
  const insets = useSafeAreaInsets()

  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: colors.header,
        },
        headerTintColor: colors.headerText,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        tabBarActiveTintColor: colors.tabActive,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarStyle: { display: 'none' },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="Templates"
        component={TemplatesScreen}
        options={{
          title: 'Workouts',
          tabBarLabel: 'Workouts',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'list' : 'list-outline'} size={size ?? 24} color={color} />
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
          title: 'Sessions',
          tabBarLabel: 'Sessions',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'time' : 'time-outline'} size={size ?? 24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Exercises"
        component={ExercisesScreen}
        options={{
          title: 'Exercises',
          tabBarLabel: 'Exercises',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'barbell' : 'barbell-outline'} size={size ?? 24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={size ?? 24} color={color} />
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
  },
  addButtonContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 6,
  },
  addButtonIconWrap: {
    marginBottom: 2,
  },
  addButtonLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.tabInactive,
  },
})

const stackScreenOptions = {
  headerStyle: {
    backgroundColor: colors.header,
  },
  headerTintColor: colors.headerText,
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
      <Text style={splashStyles.subtitle}>Weak To Strong</Text>
      <ActivityIndicator size="large" color={colors.primary} style={splashStyles.spinner} />
    </View>
  )
}

const splashStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: colors.primaryText,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.primaryText,
    opacity: 0.9,
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
    backgroundColor: colors.screen,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  retryButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryButtonText: {
    color: colors.primaryText,
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
    backgroundColor: colors.overlay,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
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
    color: colors.text,
    flex: 1,
  },
  retryButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  retryButtonText: {
    color: colors.primaryText,
    fontSize: 14,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
})

function RootNavigator() {
  console.log('RootNavigator');
  const { success, error } = useMigrations(db, migrations);
  console.log('success', success);
  console.log('error', error);
  const [isDbReady, setIsDbReady] = useState(false);
  useEffect(() => {
    if (success) {
      async function afterMigration() {
        await db.run("PRAGMA foreign_keys = ON");
        const existing = await db.query.exercises.findFirst();
        console.log('existing', existing);
        if (!existing) {
          await seed();
        }
        console.log('setIsDbReady true');
        setIsDbReady(true);
      }
      afterMigration();
    }
  }, [success]);
  // const { isLoading, isAuthenticated, serverDown, hasEnteredApp } = useAuth()

  // if (serverDown && !hasEnteredApp) {
  //   return <ServerDownScreen />
  // }

  // Always show splash screen during initial auth check (before we know auth state).
  if (!success || !isDbReady) {
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
          options={{ headerShown: false, cardStyle: { backgroundColor: colors.screen } }}
        />
        <Stack.Screen
          name="MainTabs"
          options={{ headerShown: false }}
        >
          {() => <MainTabs />}
        </Stack.Screen>
        <Stack.Screen
          name="TemplateDetail"
          component={TemplateDetailScreen}
          options={{
            title: 'Workout Details',
            headerStyle: { backgroundColor: colors.header },
            headerTintColor: colors.headerText,
            headerBackTitleVisible: false,
          }}
        />
        <Stack.Screen
          name="SessionDetail"
          options={{ title: 'Workout Session' }}
        >
          {() => <SessionDetailScreen />}
        </Stack.Screen>
        <Stack.Screen
          name="CreateTemplate"
          options={{ title: 'Create Workout' }}
        >
          {() => (
            <ProtectedRoute>
              <CreateTemplateScreen />
            </ProtectedRoute>
          )}
        </Stack.Screen>
        <Stack.Screen
          name="ExercisePicker"
          component={ExercisePickerScreen}
          options={{ title: 'Select Exercise' }}
        />
      </Stack.Navigator>
      {/* {serverDown && hasEnteredApp && <ServerDownOverlay />} */}
    </View>
  )
}

function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <NavigationContainer>
            <StatusBar style="light" />
            <RootNavigator />
          </NavigationContainer>
          <Toast visibilityTime={3000} />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

export default App
