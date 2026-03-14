import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Navbar } from '@/components/layout/Navbar'
import { Dashboard } from '@/pages/Dashboard'
import { Queues } from '@/pages/Queues'
import { Topics } from '@/pages/Topics'
import { Messages } from '@/pages/Messages'
import { Connections } from '@/pages/Connections'
import { Network } from '@/pages/Network'
import { Scheduled } from '@/pages/Scheduled'
import { Toaster } from '@/components/ui/toaster'
import { useTheme } from '@/hooks/useTheme'

function App() {
  const { theme, toggleTheme } = useTheme()

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background text-foreground">
        <Navbar theme={theme} toggleTheme={toggleTheme} />
        <main>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/queues" element={<Queues />} />
            <Route path="/queues/:name/messages" element={<Messages />} />
            <Route path="/topics" element={<Topics />} />
            <Route path="/connections" element={<Connections />} />
            <Route path="/network" element={<Network />} />
            <Route path="/scheduled" element={<Scheduled />} />
          </Routes>
        </main>
        <Toaster />
      </div>
    </BrowserRouter>
  )
}

export default App
