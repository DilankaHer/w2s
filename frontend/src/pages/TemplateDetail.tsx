import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { trpc } from '../api/client'

interface Set {
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
  sets: Set[]
}

interface Template {
  id: number
  name: string
  createdAt: string
  exercises: TemplateExercise[]
}

function TemplateDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [template, setTemplate] = useState<Template | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creatingSession, setCreatingSession] = useState(false)

  useEffect(() => {
    if (id) {
      fetchTemplate(parseInt(id))
    }
  }, [id])

  const fetchTemplate = async (templateId: number) => {
    try {
      setLoading(true)
      setError(null)
      const data = await trpc.templates.getById.query({ id: templateId })
      setTemplate(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Error fetching template:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSetUpdate = async (
    setId: number,
    field: 'targetWeight' | 'targetReps',
    value: number
  ) => {
    if (!template) return

    // Find the set in the template
    let targetSet: Set | null = null
    for (const templateExercise of template.exercises) {
      const foundSet = templateExercise.sets.find((s) => s.id === setId)
      if (foundSet) {
        targetSet = foundSet
        break
      }
    }

    if (!targetSet) return

    // Prepare update data
    const updateData = {
      setId,
      targetWeight: field === 'targetWeight' ? value : targetSet.targetWeight,
      targetReps: field === 'targetReps' ? value : targetSet.targetReps,
    }

    try {
      // Update via API
      await trpc.sets.update.mutate(updateData)

      // Update local state
      setTemplate((prev) => {
        if (!prev) return null
        return {
          ...prev,
          exercises: prev.exercises.map((templateExercise) => ({
            ...templateExercise,
            sets: templateExercise.sets.map((set) =>
              set.id === setId
                ? {
                    ...set,
                    [field]: value,
                  }
                : set
            ),
          })),
        }
      })
    } catch (err) {
      console.error('Error updating set:', err)
      setError(err instanceof Error ? err.message : 'Failed to update set')
    }
  }

  const handleCreateSession = async () => {
    if (!template) return

    try {
      setCreatingSession(true)
      setError(null)
      const session = await trpc.sessions.create.mutate({
        templateId: template.id,
      })
      // Navigate to session page with session data
      navigate(`/session/${session.id}`, { state: { session } })
    } catch (err) {
      console.error('Error creating session:', err)
      setError(err instanceof Error ? err.message : 'Failed to create session')
    } finally {
      setCreatingSession(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading template...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">Error: {error}</div>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 mr-2"
          >
            Back to Templates
          </button>
          <button
            onClick={() => id && fetchTemplate(parseInt(id))}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!template) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-600 mb-4">Template not found</div>
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
          ← Back to Templates
        </button>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{template.name}</h1>
              <p className="text-sm text-gray-500">
                Created: {new Date(template.createdAt).toLocaleDateString()}
              </p>
            </div>
            <button
              onClick={handleCreateSession}
              disabled={creatingSession}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
            >
              {creatingSession ? 'Creating...' : 'Start Session'}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {template.exercises.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-6 text-center text-gray-600">
              No exercises in this template
            </div>
          ) : (
            template.exercises.map((templateExercise) => (
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
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {templateExercise.sets.map((set) => (
                          <tr key={set.id}>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 text-center">
                              {set.setNumber}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-center">
                              <input
                                type="number"
                                value={set.targetWeight}
                                onChange={(e) =>
                                  handleSetUpdate(
                                    set.id,
                                    'targetWeight',
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                className="w-20 px-2 py-1 text-center border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-center">
                              <input
                                type="number"
                                value={set.targetReps}
                                onChange={(e) =>
                                  handleSetUpdate(
                                    set.id,
                                    'targetReps',
                                    parseInt(e.target.value) || 0
                                  )
                                }
                                className="w-20 px-2 py-1 text-center border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default TemplateDetail
