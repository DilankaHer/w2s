import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { trpc } from '../api/client'
import Swal from 'sweetalert2'

interface Template {
  id: number
  name: string
  createdAt: string
}

interface Session {
  id: number
  workoutId: number | null
  createdAt: string
  completedAt: string | null
  sessionTime: string | null
}

function LandingPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [showAllSessions, setShowAllSessions] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingSessionId, setDeletingSessionId] = useState<number | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    fetchTemplates()
    fetchSessions(5)
  }, [])

  const fetchTemplates = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await trpc.workouts.getTemplates.query()
      setTemplates(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Error fetching templates:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchSessions = async (take?: number) => {
    try {
      setSessionsLoading(true)
      const data = await trpc.sessions.getAll.query({ take, skip: 0 })
      const mapped = Array.isArray(data)
        ? data.map((sess: any) => ({
            ...sess,
            sessionTime: typeof sess.sessionTime !== "undefined" ? sess.sessionTime : null,
          }))
        : []

      setSessions(mapped)
    } catch (err) {
      console.error('Error fetching sessions:', err)
    } finally {
      setSessionsLoading(false)
    }
  }

  const handleTemplateClick = (id: number) => {
    navigate(`/template/${id}`)
  }

  const handleSessionClick = (id: number) => {
    navigate(`/session/${id}`)
  }

  const handleViewAllSessions = () => {
    if (showAllSessions) {
      fetchSessions(5)
      setShowAllSessions(false)
    } else {
      fetchSessions()
      setShowAllSessions(true)
    }
  }

  const handleDeleteSession = async (sessionId: number, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent card click

    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'This action cannot be undone!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel',
    })

    if (!result.isConfirmed) {
      return
    }

    try {
      setDeletingSessionId(sessionId)
      await trpc.sessions.delete.mutate({ id: sessionId })
      // Remove the session from the list
      setSessions((prev) => prev.filter((s) => s.id !== sessionId))
      
      // Show success toast
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Session deleted',
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true,
      })
    } catch (err) {
      console.error('Error deleting session:', err)
      await Swal.fire({
        title: 'Error!',
        text: err instanceof Error ? err.message : 'Failed to delete session',
        icon: 'error',
        confirmButtonText: 'OK',
      })
    } finally {
      setDeletingSessionId(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading templates...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">Error: {error}</div>
          <button
            onClick={fetchTemplates}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Workout Templates</h1>
          <button
            onClick={() => navigate('/template/create')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Create Template
          </button>
        </div>
        
        {templates.length === 0 ? (
          <div className="text-center text-gray-600 py-12">
            No templates found
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
            {templates.map((template) => (
              <button
                key={template.id}
                onClick={() => handleTemplateClick(template.id)}
                className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow text-left w-full border border-gray-200 hover:border-blue-500"
              >
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  {template.name}
                </h2>
                <p className="text-sm text-gray-500">
                  Created: {new Date(template.createdAt).toLocaleDateString()}
                </p>
              </button>
            ))}
          </div>
        )}

        <div className="mt-12">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Previous Sessions</h2>
            {sessions.length > 5 && (
              <button
                onClick={handleViewAllSessions}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                {showAllSessions ? 'Show Less' : 'View All'}
              </button>
            )}
          </div>

          {sessionsLoading ? (
            <div className="text-center text-gray-600 py-8">Loading sessions...</div>
          ) : sessions.length === 0 ? (
            <div className="text-center text-gray-600 py-8">No sessions found</div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200 hover:border-green-500 relative"
                >
                  <button
                    onClick={() => handleSessionClick(session.id)}
                    className="w-full text-left pr-8"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-gray-500">
                          {new Date(session.createdAt).toLocaleString()}
                        </p>
                        {session.sessionTime && (
                          <span className="text-sm text-gray-400">•</span>
                        )}
                        {session.sessionTime && (
                          <p className="text-sm text-gray-500">
                            {session.sessionTime}
                          </p>
                        )}
                      </div>
                      {session.completedAt && (
                        <p className="text-sm text-green-600 mt-1">
                          Completed: {new Date(session.completedAt).toLocaleString()}
                        </p>
                      )}
                      {!session.completedAt && (
                        <p className="text-sm text-orange-600 mt-1">In Progress</p>
                      )}
                    </div>
                  </button>
                  <button
                    onClick={(e) => handleDeleteSession(session.id, e)}
                    disabled={deletingSessionId === session.id}
                    className="absolute top-4 right-4 p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Delete session"
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
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default LandingPage
