import { useState } from 'react'
import Login from './pages/Login'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import Dashboard from './pages/Dashboard'
import Capture from './pages/Capture'
import History from './pages/History'
import Reports from './pages/Reports'
import './App.css'

function App() {
  const [activePage, setActivePage] = useState(() => {
    const p = window.location.pathname.replace(/\//g, '')
    return p || 'dashboard'
  })
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    // If user explicitly navigated to /login, show the login page even when a token exists
    if (window.location.pathname === '/login') return false
    return !!localStorage.getItem("token")
  });

  if (!isLoggedIn) {
    return (
      <Login
        onLogin={() => setIsLoggedIn(true)}
      />
    );
  }

  const pages = {
    dashboard: <Dashboard />,
    capture:   <Capture />,
    history:   <History />,
    reports:   <Reports />,
  }

  const titles = {
    dashboard: { title: 'Dashboard',        subtitle: 'Ringkasan performa verifikasi kuantitas part' },
    capture:   { title: 'Capture',          subtitle: 'Ambil foto dari kamera HP & proses AI otomatis' },
    history:   { title: 'Riwayat Inspeksi', subtitle: 'Log seluruh hasil verifikasi' },
    reports:   { title: 'Laporan',          subtitle: 'Export data inspeksi untuk klaim vendor' },
  }

  return (
    <div className="app-layout">
      <Sidebar
        activePage={activePage}
        onNavigate={(page) => { setActivePage(page); setSidebarOpen(false) }}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <main className="main-area">
        <Topbar
          title={titles[activePage]?.title}
          subtitle={titles[activePage]?.subtitle}
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
        />
        <div className="page-container">
          {pages[activePage]}
        </div>
      </main>
    </div>
  )
}

export default App
