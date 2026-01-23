import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { trpc } from '../api/client'

interface Template {
  id: number
  name: string
  createdAt: string
}

function LandingPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await trpc.listTemplates.query()
      setTemplates(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Error fetching templates:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleTemplateClick = (id: number) => {
    navigate(`/template/${id}`)
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
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Workout Templates</h1>
        
        {templates.length === 0 ? (
          <div className="text-center text-gray-600 py-12">
            No templates found
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
      </div>
    </div>
  )
}

export default LandingPage
