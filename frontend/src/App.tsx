import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import TemplateDetail from './pages/TemplateDetail'
import SessionDetail from './pages/SessionDetail'
import CreateTemplate from './pages/CreateTemplate'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/template/:id" element={<TemplateDetail />} />
        <Route path="/template/create" element={<CreateTemplate />} />
        <Route path="/session/:id" element={<SessionDetail />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
