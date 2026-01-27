import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { trpc } from '../api/client'
import Swal from 'sweetalert2'

function LoginPage() {
  const [isLogin, setIsLogin] = useState(true) // true for login, false for signup
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!username.trim() || !password.trim()) {
      await Swal.fire({
        title: 'Validation Error',
        text: 'Please enter both username and password',
        icon: 'warning',
        confirmButtonText: 'OK',
      })
      return
    }

    try {
      setLoading(true)
      const result = isLogin
        ? await trpc.users.login.mutate({
            username: username.trim(),
            password: password,
          })
        : await trpc.users.create.mutate({
            username: username.trim(),
            password: password,
          })

      if (result.success) {
        // Navigate immediately after receiving response
        navigate('/')
        
        // Show toast after navigation (non-blocking)
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: isLogin ? 'Logged in successfully!' : 'Account created successfully!',
          showConfirmButton: false,
          timer: 2000,
          timerProgressBar: true,
        })
      }
    } catch (err) {
      console.error(`Error ${isLogin ? 'logging in' : 'creating account'}:`, err)
      await Swal.fire({
        title: 'Error!',
        text: err instanceof Error ? err.message : `Failed to ${isLogin ? 'log in' : 'create account'}`,
        icon: 'error',
        confirmButtonText: 'OK',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {isLogin ? 'Sign In' : 'Create Account'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {isLogin
              ? 'Enter your username and password to sign in'
              : 'Enter your username and password to get started'}
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="username" className="sr-only">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? isLogin
                  ? 'Signing in...'
                  : 'Creating Account...'
                : isLogin
                ? 'Sign In'
                : 'Create Account'}
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin)
                setUsername('')
                setPassword('')
              }}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              {isLogin
                ? "Don't have an account? Sign up"
                : 'Already have an account? Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default LoginPage
