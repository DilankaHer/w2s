import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import Swal from 'sweetalert2'
import { trpc } from '../api/client'

interface Exercise {
  id: number
  name: string
}

interface SessionSet {
  id: number
  setNumber: number
  reps: number | null
  weight: number | null
  isCompleted: boolean
}

interface SessionExercise {
  id: number
  order: number
  exercise: Exercise
  sets: SessionSet[]
}

interface Session {
  id: number
  name: string
  createdAt: string
  completedAt: string | null
  sessionExercises: SessionExercise[]
  workoutId?: number | null
}

// Helper function to map session data
const mapSessionData = (sessionData: any): Session | null => {
  if (!sessionData) return null
  try {
    return {
      id: sessionData.id,
      name: sessionData.name,
      createdAt: sessionData.createdAt,
      completedAt: sessionData.completedAt,
      workoutId: sessionData.workoutId ?? undefined,
      sessionExercises: (sessionData.sessionExercises || []).map((se: any) => ({
        id: se.id,
        order: se.order,
        exercise: se.exercise,
        sets: (se.sessionSets || se.sets || []).map((set: any) => ({
          id: set.id,
          setNumber: set.setNumber,
          reps: set.reps ?? set.targetReps ?? 0,
          weight: set.weight ?? set.targetWeight ?? 0,
          isCompleted: set.isCompleted ?? false,
        })),
      })),
    }
  } catch (err) {
    return null
  }
}

function SessionDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const [session, setSession] = useState<Session | null>(
    mapSessionData(location.state?.session)
  )
  const [loading, setLoading] = useState(!location.state?.session)
  const [error, setError] = useState<string | null>(null)
  const [completing, setCompleting] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [deleting, setDeleting] = useState(false)
  const [startingNew, setStartingNew] = useState(false)
  const [editingSets, setEditingSets] = useState<Map<number, { reps: number; weight: number }>>(new Map())
  const [showCompletionSummary, setShowCompletionSummary] = useState(false)
  const [workoutError, setWorkoutError] = useState<string | null>(null)
  const [workoutLoading, setWorkoutLoading] = useState(false)
  const [workoutSuccess, setWorkoutSuccess] = useState(false)
  const [showCreateWorkoutModal, setShowCreateWorkoutModal] = useState(false)
  const [newWorkoutName, setNewWorkoutName] = useState('')

  useEffect(() => {
    const sessionId = id ? parseInt(id) : null
    
    // If we have session data from navigation state
    if (location.state?.session) {
      const mappedSession = mapSessionData(location.state.session)
      // Update if session is different (new navigation) or if we don't have a session yet
      if (mappedSession && (!session || session.id !== mappedSession.id)) {
        setSession(mappedSession)
        setLoading(false)
        setError(null)
      } else if (!mappedSession) {
        setError('Failed to load session data')
        setLoading(false)
      } else {
        setLoading(false)
      }
    } else if (sessionId && (!session || session.id !== sessionId)) {
      // No state data, fetch by ID (and only if ID changed)
      fetchSession(sessionId)
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
      // Map sessionSets to sets to match the interface
      const mappedSession = mapSessionData(data)
      if (mappedSession) {
        setSession(mappedSession)
      } else {
        setError('Failed to process session data')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
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

  const toggleSetComplete = async (set: SessionSet) => {
    const newIsCompleted = !set.isCompleted
    try {
      await trpc.sessions.updateSessionSets.mutate({
        setId: set.id,
        setNumber: set.setNumber,
        isCompleted: newIsCompleted,
      })

      // Update local session state
      setSession((prev) => {
        if (!prev) return null
        return {
          ...prev,
          sessionExercises: prev.sessionExercises.map((se) => ({
            ...se,
            sets: se.sets.map((s) =>
              s.id === set.id
                ? { ...s, isCompleted: newIsCompleted }
                : s
            ),
          })),
        }
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update set completion')
    }
  }

  const initializeEditingSet = (set: SessionSet) => {
    setEditingSets((prev) => {
      if (!prev.has(set.id)) {
        const newMap = new Map(prev)
        newMap.set(set.id, {
          reps: set.reps ?? 0,
          weight: set.weight ?? 0,
        })
        return newMap
      }
      return prev
    })
  }

  const updateSetValue = (setId: number, field: 'reps' | 'weight', value: number) => {
    setEditingSets((prev) => {
      const newMap = new Map(prev)
      const current = newMap.get(setId)
      if (!current) {
        // This shouldn't happen if we initialize properly, but fallback to set values
        const set = session?.sessionExercises
          .flatMap(se => se.sets)
          .find(s => s.id === setId)
        newMap.set(setId, {
          reps: set?.reps ?? 0,
          weight: set?.weight ?? 0,
          [field]: value,
        })
      } else {
        newMap.set(setId, { ...current, [field]: value })
      }
      return newMap
    })
  }

  const saveSetUpdate = async (set: SessionSet) => {
    const edited = editingSets.get(set.id)
    if (!edited) return

    try {
      await trpc.sessions.updateSessionSets.mutate({
        setId: set.id,
        setNumber: set.setNumber,
        reps: edited.reps,
        weight: edited.weight,
        isCompleted: set.isCompleted,
      })

      // Update local session state
      setSession((prev) => {
        if (!prev) return null
        return {
          ...prev,
          sessionExercises: prev.sessionExercises.map((se) => ({
            ...se,
            sets: se.sets.map((s) =>
              s.id === set.id
                ? {
                    ...s,
                    reps: edited.reps,
                    weight: edited.weight,
                  }
                : s
            ),
          })),
        }
      })

      // Remove from editing map
      setEditingSets((prev) => {
        const newMap = new Map(prev)
        newMap.delete(set.id)
        return newMap
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update set')
    }
  }

  const showToast = (type: 'success' | 'error', text1: string, text2: string) => {
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: type,
      title: text1,
      text: text2,
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
    })
  }

  const handleCompleteWorkout = async () => {
    if (!session) return

    try {
      setCompleting(true)
      setError(null)

      const updatedSession = await trpc.sessions.update.mutate({
        id: session.id,
        createdAt: new Date(session.createdAt),
        completedAt: new Date(),
      })

      const mapped = mapSessionData(updatedSession)
      if (mapped) {
        setSession(mapped)
      }
      setShowCompletionSummary(true)
      showToast('success', 'Success', 'Workout completed and saved.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete workout')
      showToast('error', 'Error', 'Failed to complete workout. Please try again.')
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
      setError(err instanceof Error ? err.message : 'Failed to cancel workout')
    } finally {
      setDeleting(false)
    }
  }

  const handleStartNewWorkout = async () => {
    if (!session) return

    try {
      setStartingNew(true)
      setError(null)

      // Create a new session from the current session
      const newSession = await trpc.sessions.create.mutate({ sessionId: session.id })

      // Navigate to the new session with session data (similar to WorkoutDetail)
      navigate(`/session/${newSession.id}`, { state: { session: newSession } })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start new workout')
    } finally {
      setStartingNew(false)
    }
  }

  const handleUpdateWorkout = async () => {
    if (!session || session.workoutId == null) return
    try {
      setWorkoutLoading(true)
      setWorkoutError(null)
      await trpc.workouts.updateBySession.mutate({
        sessionId: session.id,
        workoutId: session.workoutId,
      })
      setWorkoutSuccess(true)
      showToast('success', 'Success', 'Workout updated.')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update workout'
      setWorkoutError(msg)
      showToast('error', 'Error', 'Failed to update workout. Please try again.')
    } finally {
      setWorkoutLoading(false)
    }
  }

  const handleCreateWorkout = async (name: string) => {
    if (!session || !name.trim()) return
    try {
      setWorkoutLoading(true)
      setWorkoutError(null)
      await trpc.workouts.createBySession.mutate({
        sessionId: session.id,
        name: name.trim(),
      })
      setWorkoutSuccess(true)
      setShowCreateWorkoutModal(false)
      setNewWorkoutName('')
      showToast('success', 'Success', 'Workout created.')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create workout'
      setWorkoutError(msg)
      showToast('error', 'Error', 'Failed to create workout. Please try again.')
    } finally {
      setWorkoutLoading(false)
    }
  }

  const openCreateWorkoutModal = () => {
    setWorkoutError(null)
    setWorkoutSuccess(false)
    setShowCreateWorkoutModal(true)
  }

  const handleCreateWorkoutConfirm = () => {
    const name = newWorkoutName.trim()
    if (!name) return
    handleCreateWorkout(name)
  }

  const handleGoToWorkouts = () => {
    navigate('/')
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
            Back to Workouts
          </button>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-600 mb-4">Session not found</div>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Back to Workouts
          </button>
        </div>
      </div>
    )
  }

  const allSets = session.sessionExercises.flatMap((ex) => ex.sets)

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleNumberKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, allowDecimal: boolean = false) => {
    // Allow: backspace, delete, tab, escape, enter, and decimal point (if allowed)
    if (
      [8, 9, 27, 13, 46, 110, 190].indexOf(e.keyCode) !== -1 ||
      // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
      (e.keyCode === 65 && e.ctrlKey === true) ||
      (e.keyCode === 67 && e.ctrlKey === true) ||
      (e.keyCode === 86 && e.ctrlKey === true) ||
      (e.keyCode === 88 && e.ctrlKey === true) ||
      // Allow: home, end, left, right, down, up
      (e.keyCode >= 35 && e.keyCode <= 40)
    ) {
      return
    }
    // Ensure that it is a number and stop the keypress
    if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
      // Allow decimal point if allowed
      if (allowDecimal && (e.keyCode === 190 || e.keyCode === 110)) {
        return
      }
      e.preventDefault()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <style>{`
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type="number"] {
          -moz-appearance: textfield;
        }
      `}</style>
      <div className="max-w-4xl mx-auto px-4">
        <button
          onClick={() => navigate('/')}
          className="mb-6 text-blue-600 hover:text-blue-800 font-medium"
        >
          ← Back to Workouts
        </button>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-start mb-2">
            <h1 className="text-3xl font-bold text-gray-900">
              {session.name}
            </h1>
            <div className="flex items-center gap-4">
              {!session.completedAt && (
                <div className="text-2xl font-mono font-semibold text-gray-700">
                  {formatTime(elapsedTime)}
                </div>
              )}
              {session.completedAt && (
                <button
                  onClick={handleStartNewWorkout}
                  disabled={startingNew}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
                >
                  {startingNew ? 'Starting...' : 'Perform Again'}
                </button>
              )}
            </div>
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
          {session.sessionExercises.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-6 text-center text-gray-600">
              No exercises in this workout
            </div>
          ) : (
            session.sessionExercises.map((sessionExercise) => {
              return (
                <div
                  key={sessionExercise.id}
                  className="bg-white rounded-lg shadow-md p-6"
                >
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    {sessionExercise.order + 1}. {sessionExercise.exercise.name}
                  </h2>

                  {sessionExercise.sets.length === 0 ? (
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
                          {sessionExercise.sets.map((set) => {
                            const edited = editingSets.get(set.id)
                            const displayWeight = edited?.weight ?? set.weight ?? 0
                            const displayReps = edited?.reps ?? set.reps ?? 0

                            return (
                              <tr
                                key={set.id}
                                className={set.isCompleted ? 'bg-green-50' : ''}
                              >
                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 text-center">
                                  {set.setNumber}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-center">
                                  {!session.completedAt ? (
                                    <input
                                      type="number"
                                      value={displayWeight === 0 ? '' : displayWeight}
                                      onFocus={(e) => {
                                        initializeEditingSet(set)
                                        e.target.select()
                                      }}
                                      onChange={(e) => {
                                        const val = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0
                                        updateSetValue(set.id, 'weight', val)
                                      }}
                                      onKeyDown={(e) => handleNumberKeyDown(e, true)}
                                      onBlur={() => {
                                        const edited = editingSets.get(set.id)
                                        if (edited) {
                                          saveSetUpdate(set)
                                        }
                                      }}
                                      className="w-20 px-2 py-1 text-center border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                                      min="0"
                                      step="0.5"
                                    />
                                  ) : (
                                    set.weight ?? 0
                                  )}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-center">
                                  {!session.completedAt ? (
                                    <input
                                      type="number"
                                      value={displayReps === 0 ? '' : displayReps}
                                      onFocus={(e) => {
                                        initializeEditingSet(set)
                                        e.target.select()
                                      }}
                                      onChange={(e) => {
                                        const val = e.target.value === '' ? 0 : parseInt(e.target.value) || 0
                                        updateSetValue(set.id, 'reps', val)
                                      }}
                                      onKeyDown={(e) => handleNumberKeyDown(e, false)}
                                      onBlur={() => {
                                        const edited = editingSets.get(set.id)
                                        if (edited) {
                                          saveSetUpdate(set)
                                        }
                                      }}
                                      className="w-20 px-2 py-1 text-center border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                                      min="0"
                                    />
                                  ) : (
                                    set.reps ?? 0
                                  )}
                                </td>
                                {!session.completedAt && (
                                  <td className="px-4 py-3 whitespace-nowrap text-center">
                                    <input
                                      type="checkbox"
                                      checked={set.isCompleted}
                                      onChange={() => toggleSetComplete(set)}
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
              )
            })
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
                : (() => {
                    const completedCount = allSets.filter(s => s.isCompleted).length
                    return completedCount > 0
                      ? `Complete Workout (${completedCount} of ${allSets.length} sets)`
                      : 'Complete Workout'
                  })()}
            </button>
          </div>
        )}

        {session.completedAt && showCompletionSummary && (
          <div className="mt-6 bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Session summary</h2>
            <p className="text-gray-700 font-medium">{session.name}</p>
            <p className="text-sm text-gray-500 mt-1">
              Duration: {formatTime(elapsedTime)}
            </p>
            <p className="text-sm text-gray-500">
              {session.sessionExercises.length} exercise(s), {allSets.filter((s) => s.isCompleted).length} set(s) completed
            </p>

            <div className="mt-6 flex flex-wrap gap-3 items-center">
              {workoutSuccess ? (
                <p className="text-green-600 font-medium">
                  {session.workoutId != null ? 'Workout updated.' : 'Workout created.'}
                </p>
              ) : workoutError ? (
                <>
                  <p className="text-red-600 text-sm">{workoutError}</p>
                  <button
                    onClick={() =>
                      session.workoutId != null
                        ? handleUpdateWorkout()
                        : openCreateWorkoutModal()
                    }
                    className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 font-medium text-sm"
                  >
                    Retry
                  </button>
                </>
              ) : (
                <>
                  {session.workoutId != null ? (
                    <button
                      onClick={handleUpdateWorkout}
                      disabled={workoutLoading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
                    >
                      {workoutLoading ? 'Updating...' : 'Update Workout'}
                    </button>
                  ) : (
                    <button
                      onClick={openCreateWorkoutModal}
                      disabled={workoutLoading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
                    >
                      {workoutLoading ? 'Creating...' : 'Create Workout'}
                    </button>
                  )}
                </>
              )}
              <button
                onClick={handleGoToWorkouts}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium"
              >
                Go to Workouts
              </button>
            </div>
          </div>
        )}

        {session.completedAt && !showCompletionSummary && (
          <div className="mt-6 text-center">
            <p className="text-green-600 font-medium">Workout completed!</p>
          </div>
        )}

        {showCreateWorkoutModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Create Workout</h3>
              <p className="text-sm text-gray-500 mb-4">Enter a name for the new workout.</p>
              <input
                type="text"
                value={newWorkoutName}
                onChange={(e) => setNewWorkoutName(e.target.value)}
                placeholder="Workout name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 mb-4"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowCreateWorkoutModal(false)
                    setNewWorkoutName('')
                    setWorkoutError(null)
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateWorkoutConfirm}
                  disabled={workoutLoading || !newWorkoutName.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
                >
                  {workoutLoading ? 'Creating...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default SessionDetail
