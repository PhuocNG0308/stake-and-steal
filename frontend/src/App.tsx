import { Routes, Route } from 'react-router-dom'
import GameLayout from './components/GameLayout'
import Dashboard from './pages/Dashboard'
import Farm from './pages/Farm'
import Raid from './pages/Raid'
import Stats from './pages/Stats'
import Settings from './pages/Settings'
import TesterSettingsModal from './components/TesterSettingsModal'

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<GameLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="farm" element={<Farm />} />
          <Route path="raid" element={<Raid />} />
          <Route path="stats" element={<Stats />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
      <TesterSettingsModal />
    </>
  )
}

export default App
