import { useState, useEffect } from 'react'
import { trpc } from '../api/client'
import { TRPCClientError } from '@trpc/client'

interface WorkoutInfo {
  username: string
  workouts: any[]
  sessions: any[]
}

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [workoutInfo, setWorkoutInfo] = useState<WorkoutInfo | null>(null)
  const [error, setError] = useState<Error | null>(null)

  const checkAuth = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const result = await trpc.users.getWorkoutInfo.mutate()
      // getWorkoutInfo returns a single object with username, workouts, and sessions
      
      if (result) {
        setWorkoutInfo(result)
        setIsAuthenticated(true)
      } else {
        setIsAuthenticated(true) // User is authenticated but has no workout info yet
        setWorkoutInfo(null)
      }
    } catch (err) {
      setIsAuthenticated(false)
      setWorkoutInfo(null)
      
      // Check if it's an UNAUTHORIZED error (401)
      if (err instanceof TRPCClientError) {
        // tRPC errors have data.code property for error codes
        const errorCode = (err.data as any)?.code || err.data?.httpStatus
        if (errorCode === 'UNAUTHORIZED' || errorCode === 401 || err.message?.includes('UNAUTHORIZED')) {
          setError(new Error('UNAUTHORIZED'))
        } else {
          setError(err as Error)
        }
      } else {
        setError(err as Error)
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    checkAuth()
  }, [])

  return {
    isAuthenticated,
    isLoading,
    workoutInfo,
    error,
    checkAuth,
  }
}
