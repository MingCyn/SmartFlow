import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import WaterOutagePage from './pages/WaterOutagePage'
import ReportPage from './pages/ReportPage'
import AdvicePage from './pages/AdvicePage'
import StatusPage from './pages/StatusPage'
import OpsPage from './pages/OpsPage'
import SettingsPage from './pages/SettingsPage'
import ChatPage from './pages/ChatPage'

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/report" replace />} />
        <Route path="/outage" element={<WaterOutagePage />} />
        <Route path="report" element={<ReportPage />} />
        <Route path="advice" element={<AdvicePage />} />
        <Route path="status" element={<StatusPage />} />
        <Route path="ops" element={<OpsPage />} />
        <Route path="chat" element={<ChatPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/report" replace />} />
      </Route>
    </Routes>
  )
}
