import React, { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { trpc } from '../api/client'
import { useAuth } from '../hooks/useAuth'
import type { Template } from '../types'

function TemplatesScreen() {
  const { workoutInfo, isLoading, checkAuth } = useAuth()
  const [refreshing, setRefreshing] = useState(false)
  const navigation = useNavigation()

  const onRefresh = async () => {
    setRefreshing(true)
    await checkAuth()
    setRefreshing(false)
  }

  const handleTemplateClick = (id: number) => {
    navigation.navigate('TemplateDetail' as never, { id } as never)
  }

  // Only derive list and show empty state after API has finished (isLoading is false)
  const displayTemplates = !isLoading && workoutInfo ? (workoutInfo.workouts ?? []) : []
  const hasNoTemplates = !isLoading && workoutInfo !== null && displayTemplates.length === 0

  // Don't render empty state or list until API call is done (avoids flash)
  if (isLoading) {
    return <View style={styles.container} />
  }

  return (
    <View style={styles.container}>
      {hasNoTemplates ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No Templates Yet</Text>
          <Text style={styles.emptyText}>
            Create your first workout template to get started!
          </Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => navigation.navigate('CreateTemplate' as never)}
          >
            <Text style={styles.createButtonText}>Create Template</Text>
          </TouchableOpacity>
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
