import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { trpc } from '../api/client'
import { useAuth } from '../hooks/useAuth'
import Swal from 'sweetalert2'

interface Workout {
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
  const { workoutInfo, isLoading } = useAuth()
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [showAllSessions, setShowAllSessions] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [deletingSessionId, setDeletingSessionId] = useState<number | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    // Only use workoutInfo from getWorkoutInfo - no fallback to other endpoints
    if (!isLoading) {
      if (workoutInfo) {
        // Use workout and session info from the hook
        setWorkouts(workoutInfo.workouts || [])
        setSessions(workoutInfo.sessions || [])
        setLoading(false)
        setSessionsLoading(false)
      } else {
        // If workoutInfo is null but user is authenticated, they have no workouts/sessions yet
        setWorkouts([])
        setSessions([])
        setLoading(false)
        setSessionsLoading(false)
      }
    }
  }, [workoutInfo, isLoading])

  const handleWorkoutClick = (id: number) => {
    navigate(`/workout/${id}`)
  }

  const handleSessionClick = (id: number) => {
    navigate(`/session/${id}`)
  }

  const handleViewAllSessions = () => {
    // Toggle showing all sessions vs limited view
    setShowAllSessions(!showAllSessions)
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

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    )
  }


  // Show message if user has no workout info
  const hasNoWorkoutInfo = workoutInfo && (!workoutInfo.workouts || workoutInfo.workouts.length === 0) && (!workoutInfo.sessions || workoutInfo.sessions.length === 0)

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {hasNoWorkoutInfo && (
          <div className="mb-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-blue-800">
                  Get Started
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>You don't have any workout workouts or sessions yet. Create your first workout to get started!</p>
                </div>
                <div className="mt-4">
                  <button
                    onClick={() => navigate('/workout/create')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                  >
                    Create Your First Workout
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Workouts</h1>
          <button
            onClick={() => navigate('/workout/create')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Create Workout
          </button>
        </div>
        
        {workouts.length === 0 ? (
          <div className="text-center text-gray-600 py-12">
            No workouts found
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
            {workouts.map((workout) => (
              <button
                key={workout.id}
                onClick={() => handleWorkoutClick(workout.id)}
                className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow text-left w-full border border-gray-200 hover:border-blue-500"
              >
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  {workout.name}
                </h2>
                <p className="text-sm text-gray-500">
                  Created: {new Date(workout.createdAt).toLocaleDateString()}
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
              {(showAllSessions ? sessions : sessions.slice(0, 5)).map((session) => (
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
