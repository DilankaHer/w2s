import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import Swal from 'sweetalert2'
import { trpc } from '../api/client'

interface WorkoutSet {
  id: number
  setNumber: number
  targetReps: number
  targetWeight: number
}

interface Exercise {
  id: number
  name: string
}

interface TemplateExercise {
  id: number
  order: number
  exercise: Exercise
  sets: WorkoutSet[]
}

interface Template {
  id: number
  name: string
  createdAt: string
  exercises: TemplateExercise[]
}

interface Session {
  id: number
  templateId: number | null
  createdAt: string
  completedAt: string | null
  template: Template | null
}

function SessionDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const [session, setSession] = useState<Session | null>(
    location.state?.session || null
  )
  const [loading, setLoading] = useState(!location.state?.session)
  const [error, setError] = useState<string | null>(null)
  const [completedSets, setCompletedSets] = useState<Set<number>>(new Set<number>())
  const [completing, setCompleting] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    // If we don't have session data from navigation state, fetch it
    if (!location.state?.session && id) {
      fetchSession(parseInt(id))
    } else if (location.state?.session) {
      setLoading(false)
    }
  }, [id, location.state])

  const fetchSession = async (sessionId: number) => {
    try {
      setLoading(true)
      setError(null)
      const data = await trpc.sessions.getById.query({ id: sessionId })
      if (!data) {
        setError('Session not found')
        return
      }
      setSession(data as Session)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Error fetching session:', err)
    } finally {
      setLoading(false)
    }
  }

  // Timer effect
  useEffect(() => {
    if (!session || session.completedAt) {
      if (session?.completedAt) {
        // Calculate final elapsed time for completed sessions
        const startTime = new Date(session.createdAt).getTime()
        const endTime = new Date(session.completedAt).getTime()
        setElapsedTime(Math.floor((endTime - startTime) / 1000))
      }
      return
    }

    const startTime = new Date(session.createdAt).getTime()
    // Initialize immediately
    const now = Date.now()
    setElapsedTime(Math.floor((now - startTime) / 1000))
    
    const interval = setInterval(() => {
      const now = Date.now()
      setElapsedTime(Math.floor((now - startTime) / 1000))
    }, 1000)

    return () => clearInterval(interval)
  }, [session])

  const toggleSetComplete = (setId: number) => {
    setCompletedSets((prev: Set<number>) => {
      const newSet = new Set(prev)
      if (newSet.has(setId)) {
        newSet.delete(setId)
      } else {
        newSet.add(setId)
      }
      return newSet
    })
  }

  const handleCompleteWorkout = async () => {
    if (!session || !session.template) return

    try {
      setCompleting(true)
      setError(null)

      // Collect all completed sets data
      const logs: Array<{
        sessionId: number
        exerciseId: number
        setNumber: number
        reps: number
        weight: number
      }> = []

      for (const templateExercise of session.template.exercises) {
        for (const set of templateExercise.sets) {
          if (completedSets.has(set.id)) {
            logs.push({
              sessionId: session.id,
              exerciseId: templateExercise.exercise.id,
              setNumber: set.setNumber,
              reps: set.targetReps,
              weight: set.targetWeight,
            })
          }
        }
      }

      // Update session completedAt and create logs
      await Promise.all([
        trpc.sessions.update.mutate({
          id: session.id,
          createdAt: new Date(session.createdAt),
          completedAt: new Date(),
        }),
        logs.length > 0
          ? trpc.logs.createMany.mutate(logs)
          : Promise.resolve(),
      ])

      // Navigate back to templates or show success
      navigate('/')
    } catch (err) {
      console.error('Error completing workout:', err)
      setError(err instanceof Error ? err.message : 'Failed to complete workout')
    } finally {
      setCompleting(false)
    }
  }

  const handleCancelWorkout = async () => {
    if (!session) return

    const result = await Swal.fire({
      title: 'Cancel Workout?',
      text: 'Are you sure you want to cancel this workout? This action cannot be undone!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, cancel it!',
      cancelButtonText: 'No, keep it',
    })

    if (!result.isConfirmed) {
      return
    }

    try {
      setDeleting(true)
      setError(null)
      await trpc.sessions.delete.mutate({ id: session.id })
      navigate('/')
    } catch (err) {
      console.error('Error canceling workout:', err)
      setError(err instanceof Error ? err.message : 'Failed to cancel workout')
    } finally {
      setDeleting(false)
    }
  }


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading session...</div>
      </div>
    )
  }

  if (error && !session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">Error: {error}</div>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Back to Templates
          </button>
        </div>
      </div>
    )
  }

  if (!session || !session.template) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-600 mb-4">Session not found</div>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Back to Templates
          </button>
        </div>
      </div>
    )
  }

  const allSets = session.template.exercises.flatMap((ex) => ex.sets)

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <button
          onClick={() => navigate('/')}
          className="mb-6 text-blue-600 hover:text-blue-800 font-medium"
        >
          ← Back to Templates
        </button>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-start mb-2">
            <h1 className="text-3xl font-bold text-gray-900">
              {session.template.name}
            </h1>
            {!session.completedAt && (
              <div className="text-2xl font-mono font-semibold text-gray-700">
                {formatTime(elapsedTime)}
              </div>
            )}
          </div>
          <p className="text-sm text-gray-500">
            Session started: {new Date(session.createdAt).toLocaleString()}
          </p>
          {session.completedAt && (
            <p className="text-sm text-green-600 mt-1">
              Completed: {new Date(session.completedAt).toLocaleString()}
            </p>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {session.template.exercises.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-6 text-center text-gray-600">
              No exercises in this template
            </div>
          ) : (
            session.template.exercises.map((templateExercise) => (
              <div
                key={templateExercise.id}
                className="bg-white rounded-lg shadow-md p-6"
              >
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  {templateExercise.order + 1}. {templateExercise.exercise.name}
                </h2>

                {templateExercise.sets.length === 0 ? (
                  <p className="text-gray-500 text-sm">No sets configured</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Set
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Weight (kg)
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Reps
                          </th>
                          {!session.completedAt && (
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Complete
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {templateExercise.sets.map((set) => {
                          const isCompleted = completedSets.has(set.id)
                          return (
                            <tr
                              key={set.id}
                              className={isCompleted ? 'bg-green-50' : ''}
                            >
                              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 text-center">
                                {set.setNumber}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-center">
                                {set.targetWeight}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-center">
                                {set.targetReps}
                              </td>
                              {!session.completedAt && (
                                <td className="px-4 py-3 whitespace-nowrap text-center">
                                  <input
                                    type="checkbox"
                                    checked={isCompleted}
                                    onChange={() => toggleSetComplete(set.id)}
                                    className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                                  />
                                </td>
                              )}
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {!session.completedAt && (
          <div className="mt-6 flex justify-center gap-4">
            <button
              onClick={handleCancelWorkout}
              disabled={deleting || completing}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium text-lg"
            >
              {deleting ? 'Canceling...' : 'Cancel Workout'}
            </button>
            <button
              onClick={handleCompleteWorkout}
              disabled={completing || deleting}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium text-lg"
            >
              {completing
                ? 'Completing...'
                : completedSets.size > 0
                  ? `Complete Workout (${completedSets.size} of ${allSets.length} sets)`
                  : 'Complete Workout'}
            </button>
          </div>
        )}

        {session.completedAt && (
          <div className="mt-6 text-center">
            <p className="text-green-600 font-medium">Workout completed!</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default SessionDetail
