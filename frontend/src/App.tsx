import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import TemplateDetail from './pages/TemplateDetail'
import SessionDetail from './pages/SessionDetail'
import CreateTemplate from './pages/CreateTemplate'
import LoginPage from './pages/LoginPage'
import { ProtectedRoute } from './components/ProtectedRoute'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <LandingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/template/:id"
          element={
            <ProtectedRoute>
              <TemplateDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/template/create"
          element={
            <ProtectedRoute>
              <CreateTemplate />
            </ProtectedRoute>
          }
        />
        <Route
          path="/session/:id"
          element={
            <ProtectedRoute>
              <SessionDetail />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
