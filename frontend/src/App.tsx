import { Routes, Route } from 'react-router-dom'
import UnifiedPage from './pages/UnifiedPage'

function App() {
  return (
    <div className="app">
      <main className="app-main">
        <Routes>
          <Route path="/" element={<UnifiedPage />} />
          <Route path="/setup" element={<UnifiedPage />} />
          <Route path="/review" element={<UnifiedPage />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
