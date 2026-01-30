import { useNavigation } from '@react-navigation/native'
import React, { useEffect, useState } from 'react'
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { trpc } from '../api/client'
import { useAuth } from '../hooks/useAuth'
import type { Template } from '../types'

function TemplatesScreen() {
  const { workoutInfo, isLoading, checkAuth, isAuthenticated } = useAuth()
  const [refreshing, setRefreshing] = useState(false)
  const [defaultTemplates, setDefaultTemplates] = useState<Template[]>([])
  const [defaultTemplatesLoading, setDefaultTemplatesLoading] = useState(true)
  const [defaultTemplatesFetched, setDefaultTemplatesFetched] = useState(false)
  const navigation = useNavigation()

  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      setDefaultTemplatesFetched(false)
      setDefaultTemplatesLoading(true)
      trpc.workouts.getTemplates
        .query({ isDefaultTemplate: true })
        .then((data) => {
          setDefaultTemplates(Array.isArray(data) ? data : [])
        })
        .catch(() => setDefaultTemplates([]))
        .finally(() => {
          setDefaultTemplatesFetched(true)
          setDefaultTemplatesLoading(false)
        })
    } else {
      if (isAuthenticated) setDefaultTemplatesFetched(false)
      setDefaultTemplatesLoading(false)
    }
  }, [isAuthenticated, isLoading])

  const onRefresh = async () => {
    setRefreshing(true)
    if (isAuthenticated) {
      await checkAuth()
    } else {
      try {
        const data = await trpc.workouts.getTemplates.query({ isDefaultTemplate: true })
        setDefaultTemplates(Array.isArray(data) ? data : [])
      } catch {
        setDefaultTemplates([])
      }
    }
    setRefreshing(false)
  }

  const handleTemplateClick = (id: number) => {
    navigation.navigate('TemplateDetail' as never, { id } as never)
  }

  const displayTemplates = isAuthenticated
    ? (!isLoading && workoutInfo ? (workoutInfo.workouts ?? []) : [])
    : defaultTemplates
  const effectiveDefaultLoading =
    !isAuthenticated && (!defaultTemplatesFetched || defaultTemplatesLoading)
  const hasNoTemplates = isAuthenticated
    ? !isLoading && workoutInfo !== null && displayTemplates.length === 0
    : defaultTemplatesFetched && !defaultTemplatesLoading && displayTemplates.length === 0

  if (isLoading && isAuthenticated) {
    return <View style={styles.container} />
  }

  if (effectiveDefaultLoading) {
    return <View style={styles.container} />
  }

  return (
    <View style={styles.container}>
      {hasNoTemplates ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>
            {isAuthenticated ? 'No Templates Yet' : 'No Default Templates'}
          </Text>
          <Text style={styles.emptyText}>
            {isAuthenticated
              ? 'Create your first workout template to get started!'
              : 'Default templates will appear here.'}
          </Text>
          {isAuthenticated && (
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => navigation.navigate('CreateTemplate' as never)}
            >
              <Text style={styles.createButtonText}>Create Template</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {displayTemplates.map((template) => (
            <TouchableOpacity
              key={template.id}
              style={styles.templateCard}
              onPress={() => handleTemplateClick(template.id)}
            >
              <Text style={styles.templateName}>{template.name}</Text>
              <Text style={styles.templateDate}>
                Created: {new Date(template.createdAt).toLocaleDateString()}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
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
    marginBottom: 24,
  },
  createButton: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  templateCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  templateName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  templateDate: {
    fontSize: 14,
    color: '#6B7280',
  },
})

export default TemplatesScreen
