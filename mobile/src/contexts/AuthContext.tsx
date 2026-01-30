import { TRPCClientError } from '@trpc/client'
import React, { createContext, useContext, useEffect, useState } from 'react'
import { trpc } from '../api/client'
import type { WorkoutInfo } from '../types'

interface AuthContextValue {
  isAuthenticated: boolean | null
  isLoading: boolean
  workoutInfo: WorkoutInfo | null
  error: Error | null
  checkAuth: (options?: { silent?: boolean }) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [workoutInfo, setWorkoutInfo] = useState<WorkoutInfo | null>(null)
  const [error, setError] = useState<Error | null>(null)

  const checkAuth = async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false
    try {
      if (!silent) setIsLoading(true)
      setError(null)
      const result = await trpc.users.getWorkoutInfo.mutate()

      if (result) {
        setWorkoutInfo(result)
        setIsAuthenticated(true)
      } else {
        setIsAuthenticated(true)
        setWorkoutInfo(null)
      }
    } catch (err) {
      setIsAuthenticated(false)
      setWorkoutInfo(null)

      if (err instanceof TRPCClientError) {
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
      if (!silent) setIsLoading(false)
    }
  }

  useEffect(() => {
    checkAuth()
  }, [])

  const value: AuthContextValue = {
    isAuthenticated,
    isLoading,
    workoutInfo,
    error,
    checkAuth,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
