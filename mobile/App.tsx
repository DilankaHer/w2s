import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { NavigationContainer, useNavigation } from '@react-navigation/native'
import { createStackNavigator } from '@react-navigation/stack'
import Ionicons from '@expo/vector-icons/Ionicons'
import { StatusBar } from 'expo-status-bar'
import React, { useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import Toast from 'react-native-toast-message'
import { AuthProvider } from './src/contexts/AuthContext'
import CreateWorkoutScreen from './src/screens/CreateWorkoutScreen'
import CreateExerciseScreen from '@/screens/CreateExerciseScreen'
import ExercisePickerScreen from './src/screens/ExercisePickerScreen'
import ExercisesScreen from './src/screens/ExercisesScreen'
import SessionScreen from '@/screens/SessionScreen'
import LoginScreen from './src/screens/LoginScreen'
import ProfileScreen from './src/screens/ProfileScreen'
import SessionDetailScreen from '@/screens/SessionDetailScreen'
import WorkoutDetailScreen from './src/screens/WorkoutDetailScreen'
import WorkoutsScreen from './src/screens/WorkoutsScreen'
import { colors } from './src/theme/colors'
import { db } from '@/database/database'
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator'
import { seed } from '@/database/seed'
import migrations from './drizzle/migrations'

export type ExercisePickerResult = { id: string; name: string }

export type RootStackParamList = {
  Login: { completeSessionId?: string; sessionCreatedAt?: string; session?: unknown; removedSessionExerciseIds?: string[]; createWorkout?: boolean; workoutName?: string } | undefined
  MainTabs: { screen?: keyof TabParamList } | undefined
  WorkoutDetail: { id: string; selectedExercise?: ExercisePickerResult; replacingWorkoutExerciseId?: string }
  SessionDetail: { id: string; initialSession?: unknown; initialCreatedAt?: string; initialCompletedAt?: string; selectedExercise?: ExercisePickerResult; replacingSessionExerciseId?: string }
  CreateWorkout: { selectedExercise?: ExercisePickerResult; replacingExerciseId?: string } | undefined
  ExercisePicker: { pickerFor: 'createWorkout' | 'session' | 'workoutDetail'; sessionId?: string; replacingExerciseId?: string; replacingWorkoutExerciseId?: string; replacingSessionExerciseId?: string; returnToRouteKey?: string }
  CreateExercise:
  | {
    pickerFor?: 'createWorkout' | 'session' | 'workoutDetail'
    sessionId?: string
    returnToRouteKey?: string
    replacingExerciseId?: string
    replacingWorkoutExerciseId?: string
    replacingSessionExerciseId?: string
    exerciseId?: string
  }
  | undefined
}

export type TabParamList = {
  Workouts: undefined
  Create: undefined
  Session: undefined
  Exercises: undefined
  Profile: undefined
}

const Stack = createStackNavigator<RootStackParamList>()
const Tab = createBottomTabNavigator<TabParamList>()

function CreatePlaceholder() {
  return null
}

function AddButtonTab(props: any) {
  const navigation = useNavigation()

  const handlePress = () => {
    let rootNav: any = navigation
    while (rootNav?.getParent?.()) {
      rootNav = rootNav.getParent()
    }
    if (!rootNav) return
    rootNav.navigate('CreateWorkout' as never)
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
  return (
    <SafeAreaView
      edges={['bottom']}
      style={{ backgroundColor: colors.tabBar }}
    >
      <View style={customTabBarStyles.container}>
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
    </SafeAreaView>
  )
}

const customTabBarStyles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    borderTopColor: colors.tabBarBorder,
  },
  row: {
    // height: 56,
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
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.header },
        headerTintColor: colors.headerText,
        headerTitleStyle: { fontWeight: 'bold' },
        tabBarActiveTintColor: colors.tabActive,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="Workouts"
        component={WorkoutsScreen}
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
        name="Session"
        component={SessionScreen}
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
  animation: 'slide_from_right' as const,
  headerStyle: {
    backgroundColor: colors.header,
  },
  headerTintColor: colors.headerText,
  headerTitleStyle: {
    fontWeight: 'bold' as const,
  },
  contentStyle: { backgroundColor: colors.screen, padding: 16, paddingBottom: 30 },
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

function RootNavigator() {
  const { success, error } = useMigrations(db, migrations);
  const [isDbReady, setIsDbReady] = useState(false);
  useEffect(() => {
    if (success) {
      async function afterMigration() {
        await db.run("PRAGMA foreign_keys = ON");
        const existing = await db.query.exercises.findFirst();
        if (!existing) {
          await seed();
        }
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
        name="WorkoutDetail"
        component={WorkoutDetailScreen}
        options={{
          title: 'Workout Details',
        }}
      />
      <Stack.Screen
        name="SessionDetail"
        options={{ title: 'Workout Session' }}
      >
        {() => <SessionDetailScreen />}
      </Stack.Screen>
      <Stack.Screen
        name="CreateWorkout"
        options={{ title: 'Create Workout' }}
      >
        {() => <CreateWorkoutScreen />}
      </Stack.Screen>
      <Stack.Screen
        name="ExercisePicker"
        component={ExercisePickerScreen}
        options={{ title: 'Select Exercise' }}
      />
      <Stack.Screen
        name="CreateExercise"
        component={CreateExerciseScreen}
      // options={{ title: 'Add Exercise' }}
      />
    </Stack.Navigator>
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
