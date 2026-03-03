import { useFocusEffect } from '@react-navigation/native'
import React, { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
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
import { hasStoredAuth, trpc } from '@/api/client'
import type { User } from '../database/database.types'
import { syncService } from '../services/sync.service'
import {
  createUserService,
  getUserService,
  updateUserService,
} from '../services/user.services'
import { colors } from '../theme/colors'

function formatMemberSince(createdAt: string): string {
  try {
    const date = new Date(createdAt)
    const month = date.toLocaleString('default', { month: 'short' })
    const year = date.getFullYear()
    return `Member since ${month} ${year}`
  } catch {
    return 'Member since —'
  }
}

function ProfileScreen() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [username, setUsername] = useState('')
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [email, setEmail] = useState('')
  const [sendingLink, setSendingLink] = useState(false)

  const stats = {
    totalSessions: 0,
    dayStreak: 0,
    totalExercises: 0,
    favoriteWorkout: '—',
  }

  const fetchUser = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true)
      const u = await getUserService()
      setUser(u ?? null)
      if (u) setUsername(u.username)
    } catch {
      setUser(null)
    } finally {
      if (showLoading) setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  useFocusEffect(
    useCallback(() => {
      fetchUser(false)
    }, [fetchUser])
  )

  const handleCreateUser = async () => {
    const trimmed = username.trim()
    if (!trimmed) {
      Toast.show({ type: 'error', text1: 'Username required', text2: 'Please enter a username.' })
      return
    }
    try {
      setSaving(true)
      const created = await createUserService(trimmed)
      setUser(created)
      setUsername(created.username)
      Toast.show({ type: 'success', text1: 'Profile created', text2: 'Welcome!' })
    } catch {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to create profile. Please try again.',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleSave = async () => {
    if (!user) return
    const trimmed = username.trim()
    if (!trimmed) {
      Toast.show({ type: 'error', text1: 'Username required', text2: 'Please enter a username.' })
      return
    }
    try {
      setSaving(true)
      const updated = await updateUserService(trimmed)
      if (updated) {
        setUser(updated)
        setUsername(updated.username)
        Toast.show({ type: 'success', text1: 'Saved', text2: 'Profile updated.' })
      }
    } catch {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to update profile. Please try again.',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleSyncData = async () => {
    if (!(await hasStoredAuth())) {
      setShowEmailModal(true)
      return
    }
    try {
      setSyncing(true)
      const result = await syncService()

      if (result.status === 'sync_failed') {
        Toast.show({
          type: 'error',
          text1: 'Sync failed',
          text2: result.message,
        })
        return
      }

      Toast.show({
        type: 'success',
        text1: 'Sync complete',
        text2: result.message,
      })
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Sync failed',
        text2: 'An unexpected error occurred during sync.',
      })
    } finally {
      setSyncing(false)
    }
  }

  const handleRequestMagicLink = async () => {
    const trimmed = email.trim().toLowerCase()
    if (!trimmed) {
      Toast.show({ type: 'error', text1: 'Email required', text2: 'Please enter your email.' })
      return
    }
    if (!user) return
    try {
      setSendingLink(true)
      await trpc.auth.requestMagicLink.mutate({
        email: trimmed,
        userId: user.id,
        username: user.username,
        isMobile: true,
      })
      await updateUserService(undefined, trimmed)
      setShowEmailModal(false)
      setEmail('')
      Toast.show({ type: 'success', text1: 'Check your email', text2: 'We sent you a sign-in link.' })
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to send link', text2: 'Please try again.' })
    } finally {
      setSendingLink(false)
    }
  }

  if (loading && !user) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  if (!user) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={100}
      >
        <View style={[styles.container, styles.emptyContainer]}>
          <Text style={styles.emptyTitle}>Set up your profile</Text>
          <Text style={styles.emptyText}>Enter a username to get started.</Text>
          <View style={styles.formGroup}>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder="Username"
              placeholderTextColor={colors.placeholder}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={[styles.submitButton, saving && styles.saveButtonDisabled]}
              onPress={handleCreateUser}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color={colors.primaryText} />
              ) : (
                <Text style={styles.submitButtonText}>Create profile</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    )
  }

  const hasChanges = username.trim() !== user.username

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
            <Text style={styles.memberSince}>{formatMemberSince(user.createdAt)}</Text>
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

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Username</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            placeholder="Username"
            placeholderTextColor={colors.placeholder}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={[styles.fieldGroup, styles.fieldGroupTight]}>
          <Text style={styles.label}>Email</Text>
          <View style={styles.readonlyField}>
            <Text style={styles.readonlyFieldText}>{user.email ?? 'Not set'}</Text>
          </View>
        </View>

        {hasChanges && (
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.primaryText} />
            ) : (
              <Text style={styles.saveButtonText}>Save changes</Text>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.saveButton, styles.syncButton, syncing && styles.saveButtonDisabled]}
          onPress={handleSyncData}
          disabled={syncing}
        >
          {syncing ? (
            <ActivityIndicator size="small" color={colors.primaryText} />
          ) : (
            <Text style={styles.saveButtonText}>Sync Data</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={showEmailModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEmailModal(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={styles.emailModalOverlay}
          onPress={() => setShowEmailModal(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()} style={styles.emailModalBox}>
            <Text style={styles.emailModalTitle}>Sign in to sync</Text>
            <Text style={styles.emailModalText}>Enter your email and we’ll send you a sign-in link.</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              placeholderTextColor={colors.placeholder}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={[styles.submitButton, sendingLink && styles.saveButtonDisabled]}
              onPress={handleRequestMagicLink}
              disabled={sendingLink}
            >
              {sendingLink ? (
                <ActivityIndicator size="small" color={colors.primaryText} />
              ) : (
                <Text style={styles.submitButtonText}>Send link</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.emailModalCancel} onPress={() => setShowEmailModal(false)}>
              <Text style={styles.emailModalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
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
    paddingBottom: 24,
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
    lineHeight: 18,
  },
  statRowValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 20,
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
  formGroup: {
    width: '100%',
    maxWidth: 280,
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
    marginBottom: 16,
  },
  submitButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: colors.primaryText,
    fontSize: 16,
    fontWeight: '600',
  },
  fieldGroup: {
    marginBottom: 16,
  },
  fieldGroupTight: {
    marginTop: -4,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  readonlyField: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  readonlyFieldText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  saveButton: {
    backgroundColor: colors.success,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  syncButton: {
    marginTop: 12,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: colors.primaryText,
    fontSize: 16,
    fontWeight: '600',
  },
  emailModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emailModalBox: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 320,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emailModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  emailModalText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  emailModalCancel: {
    marginTop: 12,
    alignItems: 'center',
  },
  emailModalCancelText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
})

export default ProfileScreen
