import { useState, useEffect } from 'react'
import Login from './pages/Login'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import Dashboard from './pages/Dashboard'
import Capture from './pages/Capture'
import History from './pages/History'
import Reports from './pages/Reports'
import AuditLogs from './pages/AuditLogs'
import './App.css'

function decodeToken(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (err) {
    return null;
  }
}

// Global fetch wrapper to inject token and handle 401s
const originalFetch = window.fetch;
window.fetch = async function (url, options = {}) {
  const token = localStorage.getItem("token");
  if (token) {
    options.headers = {
      ...options.headers,
      Authorization: `Bearer ${token}`
    };
  }
  const response = await originalFetch(url, options);
  if (response.status === 401 && !url.includes('/api/login')) {
    localStorage.removeItem("token");
    window.location.reload();
  }
  return response;
};

function App() {
  const [token, setToken] = useState(() => localStorage.getItem("token"))
  const [user, setUser] = useState(() => {
    const t = localStorage.getItem("token")
    return t ? decodeToken(t) : null
  })
  
  const [activePage, setActivePage] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Redirect if visiting /login explicitly
  useEffect(() => {
    if (window.location.pathname === '/login') {
      localStorage.removeItem("token");
      setToken(null);
      setUser(null);
    }
  }, []);

  const handleLogin = () => {
    const t = localStorage.getItem("token")
    setToken(t)
    setUser(decodeToken(t))
    setActivePage('dashboard')
  }

  const handleLogout = () => {
    localStorage.removeItem("token")
    setToken(null)
    setUser(null)
    window.location.reload()
  }

  if (!token || !user) {
    return (
      <Login
        onLogin={handleLogin}
      />
    );
  }

  // Redirection mapping based on role restrictions
  let displayPage = activePage;
  if (activePage === 'capture' && user.role === 'vendor') {
    displayPage = 'dashboard';
  }
  if (activePage === 'audit' && user.role === 'vendor') {
    displayPage = 'dashboard';
  }

  const pages = {
    dashboard: <Dashboard user={user} />,
    capture:   <Capture user={user} />,
    history:   <History user={user} />,
    reports:   <Reports user={user} />,
    audit:     <AuditLogs user={user} />,
  }

  const titles = {
    dashboard: { title: 'Dashboard',        subtitle: 'Ringkasan performa verifikasi kuantitas part' },
    capture:   { title: 'Capture',          subtitle: 'Ambil foto dari kamera HP & proses AI otomatis' },
    history:   { title: 'Riwayat Inspeksi', subtitle: 'Log seluruh hasil verifikasi' },
    reports:   { title: 'Laporan',          subtitle: 'Export data inspeksi untuk klaim vendor' },
    audit:     { title: 'Audit Trail',      subtitle: 'Log aktivitas pengguna dan perubahan sistem' },
  }

  return (
    <div className="app-layout">
      <Sidebar
        activePage={displayPage}
        onNavigate={(page) => { setActivePage(page); setSidebarOpen(false) }}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={user}
        onLogout={handleLogout}
      />
      <main className="main-area">
        <Topbar
          title={titles[displayPage]?.title}
          subtitle={titles[displayPage]?.subtitle}
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
        />
        <div className="page-container">
          {pages[displayPage]}
        </div>
      </main>
    </div>
  )
}

export default App
