import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { trpc } from '../api/client'

interface Exercise {
  id: number
  name: string
}

interface Set {
  setNumber: number
  targetReps: number
  targetWeight: number
}

interface WorkoutExercise {
  id: number
  order: number
  sets: Set[]
}

function CreateWorkout() {
  const navigate = useNavigate()
  const [workoutName, setWorkoutName] = useState('')
  const [workoutExercises, setWorkoutExercises] = useState<WorkoutExercise[]>([])
  const [showExerciseList, setShowExerciseList] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [exercisesLoading, setExercisesLoading] = useState(true)

  useEffect(() => {
    fetchExercises()
  }, [])

  const fetchExercises = async () => {
    try {
      setExercisesLoading(true)
      const data = await trpc.exercises.list.query()
      setExercises(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load exercises')
    } finally {
      setExercisesLoading(false)
    }
  }

  const addExercise = (exercise: Exercise) => {
    const newOrder = workoutExercises.length
    const newExercise: WorkoutExercise = {
      id: exercise.id,
      order: newOrder,
      sets: [
        {
          setNumber: 1,
          targetReps: 0,
          targetWeight: 0,
        },
      ],
    }
    setWorkoutExercises([...workoutExercises, newExercise])
    setShowExerciseList(false)
  }

  const removeExercise = (exerciseId: number) => {
    const updated = workoutExercises
      .filter((ex) => ex.id !== exerciseId)
      .map((ex, index) => ({ ...ex, order: index }))
    setWorkoutExercises(updated)
  }

  const addSet = (exerciseId: number) => {
    setWorkoutExercises(
      workoutExercises.map((ex) => {
        if (ex.id === exerciseId) {
          const newSetNumber = ex.sets.length + 1
          return {
            ...ex,
            sets: [
              ...ex.sets,
              {
                setNumber: newSetNumber,
                targetReps: 0,
                targetWeight: 0,
              },
            ],
          }
        }
        return ex
      })
    )
  }

  const removeSet = (exerciseId: number, setNumber: number) => {
    setWorkoutExercises(
      workoutExercises.map((ex) => {
        if (ex.id === exerciseId && ex.sets.length > 1) {
          const updatedSets = ex.sets
            .filter((set) => set.setNumber !== setNumber)
            .map((set, index) => ({
              ...set,
              setNumber: index + 1,
            }))
          return { ...ex, sets: updatedSets }
        }
        return ex
      })
    )
  }

  const updateSet = (
    exerciseId: number,
    setNumber: number,
    field: 'targetReps' | 'targetWeight',
    value: number
  ) => {
    setWorkoutExercises(
      workoutExercises.map((ex) => {
        if (ex.id === exerciseId) {
          return {
            ...ex,
            sets: ex.sets.map((set) =>
              set.setNumber === setNumber
                ? { ...set, [field]: value }
                : set
            ),
          }
        }
        return ex
      })
    )
  }

  const handleSubmit = async () => {
    if (!workoutName.trim()) {
      setError('Workout name is required')
      return
    }

    if (workoutExercises.length === 0) {
      setError('At least one exercise is required')
      return
    }

    try {
      setSubmitting(true)
      setError(null)

      await trpc.workouts.create.mutate({
        workout: {
          name: workoutName.trim(),
          workoutExercises: workoutExercises.map((ex) => ({
            id: ex.id,
            order: ex.order,
            sets: ex.sets,
          })),
        },
      })

      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create workout')
    } finally {
      setSubmitting(false)
    }
  }

  const getExerciseName = (exerciseId: number) => {
    return exercises?.find((e) => e.id === exerciseId)?.name || 'Unknown'
  }

  const areAllSetsFilled = () => {
    if (workoutExercises.length === 0) return false
    // At least one set with both reps and weight filled is enough
    return workoutExercises.some((ex) =>
      ex.sets.some((set) => set.targetReps > 0 && set.targetWeight > 0)
    )
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
          <div className="mb-4">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Create Workout</h1>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Workout Name
            </label>
            <input
              type="text"
              value={workoutName}
              onChange={(e) => setWorkoutName(e.target.value)}
              placeholder="Enter workout name"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
        </div>

        <div className="space-y-4">
          {workoutExercises.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <p className="text-gray-600 mb-4">No exercises added. Click "Add Exercise" to get started.</p>
              <div className="flex justify-center">
                <div className="relative">
                  <button
                    onClick={() => setShowExerciseList(!showExerciseList)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                  >
                    Add Exercise
                  </button>
                  {showExerciseList && (
                    <div className="absolute left-1/2 transform -translate-x-1/2 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-10 max-h-96 overflow-y-auto">
                      {exercisesLoading ? (
                        <div className="p-4 text-center text-gray-500">Loading...</div>
                      ) : exercises && exercises.length > 0 ? (
                        exercises
                          .filter(
                            (ex) => !workoutExercises.some((we) => we.id === ex.id)
                          )
                          .map((exercise) => (
                            <button
                              key={exercise.id}
                              onClick={() => addExercise(exercise)}
                              className="w-full text-left px-4 py-2 hover:bg-gray-100 border-b border-gray-200 last:border-b-0"
                            >
                              {exercise.name}
                            </button>
                          ))
                      ) : (
                        <div className="p-4 text-center text-gray-500">
                          No exercises available
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <>
              {workoutExercises.map((workoutExercise) => (
              <div
                key={workoutExercise.id}
                className="bg-white rounded-lg shadow-md p-6"
              >
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {workoutExercise.order + 1}. {getExerciseName(workoutExercise.id)}
                  </h2>
                  <button
                    onClick={() => removeExercise(workoutExercise.id)}
                    className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Remove Exercise
                  </button>
                </div>

                {workoutExercise.sets.length === 0 ? (
                  <p className="text-gray-500 text-sm">No sets configured</p>
                ) : (
                  <>
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
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {workoutExercise.sets.map((set) => (
                            <tr key={set.setNumber}>
                              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 text-center">
                                {set.setNumber}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-center">
                                <input
                                  type="number"
                                  value={set.targetWeight === 0 ? '' : set.targetWeight}
                                  onChange={(e) =>
                                    updateSet(
                                      workoutExercise.id,
                                      set.setNumber,
                                      'targetWeight',
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                  onKeyDown={(e) => handleNumberKeyDown(e, true)}
                                  onFocus={(e) => e.target.select()}
                                  className="w-20 px-2 py-1 text-center border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                                  min="0"
                                  step="0.5"
                                />
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-center">
                                <input
                                  type="number"
                                  value={set.targetReps === 0 ? '' : set.targetReps}
                                  onChange={(e) =>
                                    updateSet(
                                      workoutExercise.id,
                                      set.setNumber,
                                      'targetReps',
                                      parseInt(e.target.value) || 0
                                    )
                                  }
                                  onKeyDown={(e) => handleNumberKeyDown(e, false)}
                                  onFocus={(e) => e.target.select()}
                                  className="w-20 px-2 py-1 text-center border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                                  min="0"
                                />
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-center">
                                <button
                                  onClick={() => removeSet(workoutExercise.id, set.setNumber)}
                                  disabled={workoutExercise.sets.length === 1}
                                  className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors disabled:text-gray-300 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                                  title={workoutExercise.sets.length === 1 ? 'Cannot remove the last set' : 'Remove set'}
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-5 w-5"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                    />
                                  </svg>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-4">
                      <button
                        onClick={() => addSet(workoutExercise.id)}
                        className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Add Set
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
              
            <div className="flex justify-center my-6">
                <div className="relative">
                  <button
                    onClick={() => setShowExerciseList(!showExerciseList)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                  >
                    Add Exercise
                  </button>
                  {showExerciseList && (
                    <div className="absolute left-1/2 transform -translate-x-1/2 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-10 max-h-96 overflow-y-auto">
                      {exercisesLoading ? (
                        <div className="p-4 text-center text-gray-500">Loading...</div>
                      ) : exercises && exercises.length > 0 ? (
                        exercises
                          .filter(
                            (ex) => !workoutExercises.some((we) => we.id === ex.id)
                          )
                          .map((exercise) => (
                            <button
                              key={exercise.id}
                              onClick={() => addExercise(exercise)}
                              className="w-full text-left px-4 py-2 hover:bg-gray-100 border-b border-gray-200 last:border-b-0"
                            >
                              {exercise.name}
                            </button>
                          ))
                      ) : (
                        <div className="p-4 text-center text-gray-500">
                          No exercises available
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="mt-6 flex justify-center">
          <button
            onClick={handleSubmit}
            disabled={submitting || workoutExercises.length === 0 || !areAllSetsFilled()}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
          >
            {submitting ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default CreateWorkout
