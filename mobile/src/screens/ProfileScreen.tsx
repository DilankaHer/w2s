import { useFocusEffect, useNavigation } from '@react-navigation/native'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import Toast from 'react-native-toast-message'
import { clearStoredAuth, trpc } from '../api/client'
import { useAuth } from '../hooks/useAuth'
import { colors } from '../theme/colors'

const USERNAME_CHECK_DEBOUNCE_MS = 400

function ProfileScreen() {
  const { isAuthenticated, serverDown, checkAuth, checkServerOnFocus, isRetrying } = useAuth()
  const navigation = useNavigation()
  const [user, setUser] = useState<{ id: number; username: string; email: string | null } | null>(null)
  const [favoriteWorkout, setFavoriteWorkout] = useState<string>('')
  const [totalSessions, setTotalSessions] = useState<number>(0)
  const [totalExercises, setTotalExercises] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [usernameTaken, setUsernameTaken] = useState<boolean | null>(null)
  const usernameCheckTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevServerDownRef = useRef(serverDown)

  const fetchUser = useCallback(async (showLoading = true) => {
    if (!isAuthenticated) {
      setLoading(false)
      return
    }
    try {
      if (showLoading) setLoading(true)
      const [userData, statsData] = await Promise.all([
        trpc.users.getUser.query(),
        trpc.stats.getStats.query(),
      ])
      if (userData) {
        setUser(userData)
        setUsername(userData.username)
        setEmail(userData.email ?? '')
      }
      if (statsData) {
        if (statsData.favoriteWorkout != null) setFavoriteWorkout(statsData.favoriteWorkout)
        if (typeof statsData.totalSessions === 'number') setTotalSessions(statsData.totalSessions)
        if (typeof statsData.totalExercises === 'number') setTotalExercises(statsData.totalExercises)
      }
    } catch {
      // Don't clear user state on error - preserve cached data
      // This ensures the profile screen maintains its state even when API calls fail
    } finally {
      if (showLoading) setLoading(false)
    }
  }, [isAuthenticated, serverDown])

  useEffect(() => {
    // Don't react to state changes during retry - freeze the screen
    if (isRetrying) return
    // Only fetch if server is not down - preserve cached data when offline
    if (!serverDown) {
      fetchUser()
    } else {
      setLoading(false)
    }
  }, [fetchUser, serverDown, isRetrying])

  useEffect(() => {
    // Don't react to state changes during retry - freeze the screen
    if (isRetrying) return
    if (serverDown) return
    if (prevServerDownRef.current && !serverDown && isAuthenticated && !user) {
      fetchUser()
    }
    prevServerDownRef.current = serverDown
  }, [serverDown, isAuthenticated, user, fetchUser, isRetrying])

  useFocusEffect(
    useCallback(() => {
      // Don't do anything during retry - freeze the screen completely
      if (isRetrying) return
      if (serverDown) return
      checkServerOnFocus()
      // Only fetch user data if server is not down - preserve cached data when offline
      if (isAuthenticated && !serverDown) {
        fetchUser(false)
      }
    }, [checkServerOnFocus, isAuthenticated, serverDown, fetchUser, isRetrying])
  )

  const checkUsername = useCallback(async (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) {
      setUsernameTaken(null)
      return
    }
    if (user && trimmed === user.username) {
      setUsernameTaken(null)
      return
    }
    try {
      const result = await trpc.users.checkUsername.mutate({ username: trimmed })
      setUsernameTaken(result.exists)
    } catch {
      setUsernameTaken(null)
    }
  }, [user])

  useEffect(() => {
    if (usernameCheckTimeoutRef.current) {
      clearTimeout(usernameCheckTimeoutRef.current)
      usernameCheckTimeoutRef.current = null
    }
    const trimmed = username.trim()
    if (!trimmed || (user && trimmed === user.username)) {
      setUsernameTaken(null)
      return
    }
    usernameCheckTimeoutRef.current = setTimeout(() => {
      checkUsername(username)
      usernameCheckTimeoutRef.current = null
    }, USERNAME_CHECK_DEBOUNCE_MS)
    return () => {
      if (usernameCheckTimeoutRef.current) {
        clearTimeout(usernameCheckTimeoutRef.current)
      }
    }
  }, [username, user, checkUsername])

  const handleSave = async () => {
    if (!isAuthenticated || !user) return
    const trimmedUsername = username.trim()
    if (!trimmedUsername) {
      Toast.show({ type: 'error', text1: 'Username required', text2: 'Please enter a username.' })
      return
    }
    if (usernameTaken) {
      Toast.show({ type: 'error', text1: 'Username taken', text2: 'Choose a different username.' })
      return
    }
    try {
      setSaving(true)
      await trpc.users.updateUser.mutate({
        username: trimmedUsername,
        ...(email.trim().includes('@') && { email: email.trim() }),
      })
      setUser((prev) => (prev ? { ...prev, username: trimmedUsername, email: email.trim() || null } : null))
      Toast.show({ type: 'success', text1: 'Saved', text2: 'Profile updated.' })
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to update profile. Please try again.',
      })
    } finally {
      setSaving(false)
    }
  }

  // Show login message only if not authenticated AND server is not down
  // If server is down but user has stored credentials, they're still considered authenticated
  if (!isAuthenticated && !serverDown) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>Profile</Text>
          <Text style={styles.emptyText}>
            Log in to view and edit your profile.
          </Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => navigation.navigate('Login' as never)}
          >
            <Text style={styles.loginButtonText}>Log in</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  // If server is down and authenticated, show profile page (even if user data not loaded)
  // If loading and not serverDown, show loading spinner
  // Don't show loading during retry - freeze the screen
  if (!isRetrying && loading && !serverDown) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  // During retry, freeze the screen - don't react to any state changes
  // Only show black screen conditions when NOT retrying
  if (!isRetrying && loading && serverDown) {
    return <View style={[styles.container, styles.centered, { backgroundColor: colors.screen }]} />
  }

  // If no user data but authenticated and serverDown, show unavailable message
  // But if user data exists (cached), continue to show normal profile page below
  // Don't show this during retry - preserve current state
  if (!isRetrying && !user && serverDown && isAuthenticated) {
    // Show profile page structure with unavailable message when server is down and no cached data
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={100}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.userCard}>
            <View style={styles.userAvatar}>
              <Ionicons name="person" size={32} color={colors.primaryText} />
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>—</Text>
              <Text style={styles.memberSince}>Connection unavailable</Text>
            </View>
          </View>
          <Text style={styles.emptyText}>Profile data unavailable while server is down.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    )
  }
  
  // If user data exists (even if serverDown), show normal profile page with cached data
  // This allows users to see their profile even when server is temporarily down

  // If no user and server is up, show error with retry
  // Don't show this during retry - preserve current state
  if (!isRetrying && !user && !serverDown) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorTitle}>Could not load profile.</Text>
        <Text style={styles.emptyText}>The server may be unavailable. Tap Retry to try again.</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => fetchUser()}
          disabled={loading}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  // TypeScript guard: user must exist at this point (all early returns checked)
  // During retry, preserve state - if user was null, show unavailable message
  if (!user) {
    if (isRetrying && isAuthenticated) {
      // During retry, show unavailable message to preserve state
      return (
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={100}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.userCard}>
              <View style={styles.userAvatar}>
                <Ionicons name="person" size={32} color={colors.primaryText} />
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>—</Text>
                <Text style={styles.memberSince}>Connection unavailable</Text>
              </View>
            </View>
            <Text style={styles.emptyText}>Profile data unavailable while server is down.</Text>
          </ScrollView>
        </KeyboardAvoidingView>
      )
    }
    // This shouldn't happen, but handle it gracefully
    return <View style={styles.container} />
  }

  const hasChanges = username.trim() !== user.username || email.trim() !== (user.email ?? '')

  const stats = {
    totalSessions,
    dayStreak: 3,
    totalExercises,
    favoriteWorkout: favoriteWorkout || '—',
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.userCard}>
          <View style={styles.userAvatar}>
            <Ionicons name="person" size={32} color={colors.primaryText} />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user.username}</Text>
            <Text style={styles.memberSince}>Member since Feb 2026</Text>
          </View>
        </View>

        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>Statistics</Text>
          <View style={styles.statsRow}>
            <View style={[styles.statBox, styles.statBoxPrimary]}>
              <Ionicons name="trending-up" size={20} color={colors.primary} />
              <Text style={styles.statLabel}>Total Sessions</Text>
              <Text style={styles.statValue}>{stats.totalSessions}</Text>
            </View>
            <View style={[styles.statBox, styles.statBoxSuccess]}>
              <Ionicons name="trophy" size={20} color={colors.success} />
              <Text style={[styles.statLabel, styles.statLabelGreen]}>Day Streak</Text>
              <Text style={styles.statValue}>{stats.dayStreak}</Text>
            </View>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statRowLabel}>Total Exercises</Text>
            <Text style={styles.statRowValue}>{stats.totalExercises}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statRowLabel}>Favorite Workout</Text>
            <Text style={styles.statRowValue}>{stats.favoriteWorkout}</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>My profile</Text>
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Username</Text>
          <TextInput
            style={[styles.input, usernameTaken && styles.inputError]}
            value={username}
            onChangeText={setUsername}
            placeholder="Username"
            placeholderTextColor={colors.placeholder}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {usernameTaken !== null && usernameTaken && (
            <Text style={styles.hintError}>Username is already taken</Text>
          )}
          {usernameTaken === false && username.trim() && username.trim() !== user.username && (
            <Text style={styles.hintOk}>Username available</Text>
          )}
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="Email (optional)"
            placeholderTextColor={colors.placeholder}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text style={styles.hint}>Full email logic coming later.</Text>
        </View>

        {hasChanges && (
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving || usernameTaken === true}
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.primaryText} />
            ) : (
              <Text style={styles.saveButtonText}>Save changes</Text>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.logOutButton}
          onPress={async () => {
            await clearStoredAuth()
            await checkAuth()
          }}
        >
          <Text style={styles.logOutButtonText}>Log out</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.screen,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  userAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  memberSince: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  statsCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    borderRadius: 10,
    padding: 12,
  },
  statBoxPrimary: {
    backgroundColor: '#1E3A5F',
  },
  statBoxSuccess: {
    backgroundColor: colors.successBgDark,
  },
  statLabel: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 4,
  },
  statLabelGreen: {
    color: colors.success,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginTop: 4,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statRowLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  statRowValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  retryButtonText: {
    color: colors.primaryText,
    fontSize: 16,
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  loginButtonText: {
    color: colors.primaryText,
    fontSize: 16,
    fontWeight: '600',
  },
  fieldGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.text,
  },
  inputError: {
    borderColor: colors.error,
  },
  hint: {
    fontSize: 12,
    color: colors.placeholder,
    marginTop: 4,
    marginLeft: 2,
  },
  hintError: {
    fontSize: 12,
    color: colors.error,
    marginTop: 4,
    marginLeft: 2,
  },
  hintOk: {
    fontSize: 12,
    color: colors.success,
    marginTop: 4,
    marginLeft: 2,
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: colors.primaryText,
    fontSize: 16,
    fontWeight: '600',
  },
  logOutButton: {
    marginTop: 32,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.error,
    backgroundColor: 'transparent',
  },
  logOutButtonText: {
    color: colors.error,
    fontSize: 16,
    fontWeight: '600',
  },
})

export default ProfileScreen
