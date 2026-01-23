import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import TemplateDetail from './pages/TemplateDetail'
import SessionDetail from './pages/SessionDetail'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/template/:id" element={<TemplateDetail />} />
        <Route path="/session/:id" element={<SessionDetail />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
