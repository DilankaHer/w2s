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
import Toast from 'react-native-toast-message'
import { clearStoredAuth, trpc } from '../api/client'
import { useAuth } from '../hooks/useAuth'

const USERNAME_CHECK_DEBOUNCE_MS = 400

function ProfileScreen() {
  const { isAuthenticated, serverDown, checkAuth, checkServerOnFocus } = useAuth()
  const navigation = useNavigation()
  const [user, setUser] = useState<{ id: number; username: string; email: string | null } | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [usernameTaken, setUsernameTaken] = useState<boolean | null>(null)
  const usernameCheckTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevServerDownRef = useRef(serverDown)

  const fetchUser = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      const data = await trpc.users.getUser.query()
      if (data) {
        setUser(data)
        setUsername(data.username)
        setEmail(data.email ?? '')
      }
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  useEffect(() => {
    if (prevServerDownRef.current && !serverDown && isAuthenticated && !user) {
      fetchUser()
    }
    prevServerDownRef.current = serverDown
  }, [serverDown, isAuthenticated, user, fetchUser])

  useFocusEffect(
    useCallback(() => {
      checkServerOnFocus()
    }, [checkServerOnFocus])
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

  if (!isAuthenticated) {
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

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    )
  }

  if (!user) {
    if (serverDown) {
      return <View style={[styles.container, styles.centered, { backgroundColor: '#fff' }]} />
    }
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

  const hasChanges = username.trim() !== user.username || email.trim() !== (user.email ?? '')

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
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Username</Text>
          <TextInput
            style={[styles.input, usernameTaken && styles.inputError]}
            value={username}
            onChangeText={setUsername}
            placeholder="Username"
            placeholderTextColor="#9CA3AF"
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
            placeholderTextColor="#9CA3AF"
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
              <ActivityIndicator size="small" color="#fff" />
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
    backgroundColor: '#F9FAFB',
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  retryButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  fieldGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111827',
  },
  inputError: {
    borderColor: '#DC2626',
  },
  hint: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
    marginLeft: 2,
  },
  hintError: {
    fontSize: 12,
    color: '#DC2626',
    marginTop: 4,
    marginLeft: 2,
  },
  hintOk: {
    fontSize: 12,
    color: '#059669',
    marginTop: 4,
    marginLeft: 2,
  },
  saveButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  logOutButton: {
    marginTop: 32,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DC2626',
    backgroundColor: 'transparent',
  },
  logOutButtonText: {
    color: '#DC2626',
    fontSize: 16,
    fontWeight: '600',
  },
})

export default ProfileScreen
