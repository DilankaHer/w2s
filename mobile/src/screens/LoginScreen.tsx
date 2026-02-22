import { RouteProp, useNavigation, useRoute } from '@react-navigation/native'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native'
import Toast from 'react-native-toast-message'
import type { RootStackParamList } from '../../App'
import { trpc } from '../api/client'
import { getApiErrorMessage } from '../api/errorMessage'
import { useAuth } from '../hooks/useAuth'
import { colors } from '../theme/colors'
import type { Session } from '../types'
import { buildSessionUpdatePayload } from '../utils/buildSessionUpdatePayload'

const USERNAME_CHECK_DEBOUNCE_MS = 400

type LoginRouteProp = RouteProp<RootStackParamList, 'Login'>

function LoginScreen() {
  const [isLogin, setIsLogin] = useState(true) // true for login, false for signup
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [usernameTaken, setUsernameTaken] = useState<boolean | null>(null)
  const usernameCheckTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const navigation = useNavigation()
  const route = useRoute<LoginRouteProp>()
  const { checkAuth } = useAuth()

  const checkUsername = useCallback(async (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) {
      setUsernameTaken(null)
      return
    }
    try {
      const result = await trpc.users.checkUsername.mutate({ username: trimmed })
      setUsernameTaken(result.exists)
    } catch {
      setUsernameTaken(null)
    }
  }, [])

  useEffect(() => {
    if (!isLogin) {
      if (usernameCheckTimeoutRef.current) {
        clearTimeout(usernameCheckTimeoutRef.current)
        usernameCheckTimeoutRef.current = null
      }
      const trimmed = username.trim()
      if (!trimmed) {
        setUsernameTaken(null)
        return
      }
      usernameCheckTimeoutRef.current = setTimeout(() => {
        checkUsername(trimmed)
        usernameCheckTimeoutRef.current = null
      }, USERNAME_CHECK_DEBOUNCE_MS)
      return () => {
        if (usernameCheckTimeoutRef.current) {
          clearTimeout(usernameCheckTimeoutRef.current)
        }
      }
    } else {
      setUsernameTaken(null)
    }
  }, [username, isLogin, checkUsername])

  const handleSubmit = async () => {
    if (!username.trim() || !password.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Please enter both username and password',
      })
      return
    }
    if (!isLogin && usernameTaken) {
      Toast.show({
        type: 'error',
        text1: 'Signup Failed',
        text2: 'Username already exists. Please choose another.',
      })
      return
    }

    try {
      setLoading(true)
      const result = isLogin
        ? await trpc.users.login.mutate({
            username: username.trim(),
            password: password,
            isMobile: true,
          })
        : await trpc.users.create.mutate({
            username: username.trim(),
            password: password,
            isMobile: true,
          })

      if (result.success) {
        await checkAuth()

        const sessionToSave = route.params?.session as Session | undefined
        const removedIdsRaw = route.params?.removedSessionExerciseIds
        const removedIds: number[] | undefined = Array.isArray(removedIdsRaw)
          ? removedIdsRaw
              .map((x) => (typeof x === 'number' ? x : parseInt(String(x), 10)))
              .filter((n) => Number.isFinite(n))
          : undefined
        const shouldCreateWorkout = route.params?.createWorkout === true
        const workoutName = route.params?.workoutName || sessionToSave?.name || ''

        if (sessionToSave && route.params?.completeSessionId != null) {
          try {
            const user = await trpc.users.getUser.query()
            // Use the session's completedAt if it exists (for guests who completed locally),
            // otherwise use current time
            const completedAt = sessionToSave.completedAt 
              ? new Date(sessionToSave.completedAt) 
              : new Date()
            const payload = buildSessionUpdatePayload(sessionToSave, completedAt, undefined, removedIds)
            const updatedSession = await trpc.sessions.update.mutate({
              ...payload,
              userId: user?.id,
            })
            await checkAuth()
            
            // If user wanted to create workout, do it now
            if (shouldCreateWorkout && workoutName.trim()) {
              try {
                await trpc.workouts.createBySession.mutate({
                  sessionId: updatedSession.id,
                  name: workoutName.trim(),
                })
                await checkAuth()
                
                // Navigate to Workouts screen
                const nav = navigation as any
                nav.navigate('MainTabs', {
                  screen: 'Workouts',
                })

                Toast.show({
                  type: 'success',
                  text1: 'Success',
                  text2: 'Session saved and workout created!',
                })
                return
              } catch (workoutErr) {
                // Workout creation failed, but session is saved
                // Navigate back and let user retry workout creation
                const nav = navigation as any
                nav.navigate('SessionDetail', {
                  id: updatedSession.id,
                  initialSession: updatedSession,
                })

                Toast.show({
                  type: 'error',
                  text1: 'Workout creation failed',
                  text2: 'Session saved. You can create a workout from the summary.',
                })
                return
              }
            }
            
            // Navigate to Workouts screen
            const nav = navigation as any
            nav.navigate('MainTabs', {
              screen: 'Workouts',
            })

            Toast.show({
              type: 'success',
              text1: 'Success',
              text2: 'Session saved successfully!',
            })
            return
          } catch (err) {
            Toast.show({
              type: 'error',
              text1: 'Error',
              text2: 'Failed to save session. Please try again.',
            })
          }
        }

        navigation.navigate('MainTabs' as never)

        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: isLogin ? 'Logged in successfully!' : 'Account created successfully!',
        })
      }
    } catch (err) {
      const errorMessage = getApiErrorMessage(err, '')
      // Show user-friendly error messages
      if (errorMessage.includes('not found') || errorMessage.includes('User not found')) {
        Toast.show({
          type: 'error',
          text1: 'Login Failed',
          text2: 'Username or password is incorrect.',
        })
      } else if (errorMessage.includes('Invalid password')) {
        Toast.show({
          type: 'error',
          text1: 'Login Failed',
          text2: 'Username or password is incorrect.',
        })
      } else if (errorMessage.includes('already exists') || errorMessage.includes('Username already exists')) {
        Toast.show({
          type: 'error',
          text1: 'Signup Failed',
          text2: 'Username already exists. Please choose another.',
        })
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: isLogin ? 'Failed to log in. Please try again.' : 'Failed to create account. Please try again.',
        })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <Text style={styles.title}>
            {isLogin ? 'Sign In' : 'Create Account'}
          </Text>
          <Text style={styles.subtitle}>
            {isLogin
              ? 'Enter your username and password to sign in'
              : 'Enter your username and password to get started'}
          </Text>

          <View style={styles.form}>
            <TextInput
              style={[styles.input, usernameTaken === true && styles.inputError]}
              placeholder="Username"
              placeholderTextColor={colors.placeholder}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              editable={!loading}
            />
            {!isLogin && usernameTaken === true && (
              <Text style={styles.usernameTakenText}>Username already taken</Text>
            )}
            {!isLogin && username.trim().length > 0 && usernameTaken === false && (
              <Text style={styles.usernameAvailableText}>Username available</Text>
            )}
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={colors.placeholder}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!loading}
            />

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {isLogin ? 'Sign In' : 'Create Account'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toggleButton}
              onPress={() => {
                setIsLogin(!isLogin)
                setUsername('')
                setPassword('')
              }}
              disabled={loading}
            >
              <Text style={styles.toggleText}>
                {isLogin
                  ? "Don't have an account? Sign up"
                  : 'Already have an account? Sign in'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.screen,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  form: {
    width: '100%',
  },
  input: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    color: colors.text,
  },
  inputError: {
    borderColor: colors.error,
  },
  usernameTakenText: {
    color: colors.error,
    fontSize: 14,
    marginTop: -12,
    marginBottom: 16,
  },
  usernameAvailableText: {
    color: colors.success,
    fontSize: 14,
    marginTop: -12,
    marginBottom: 16,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: colors.primaryText,
    fontSize: 16,
    fontWeight: '600',
  },
  toggleButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  toggleText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
})

export default LoginScreen
