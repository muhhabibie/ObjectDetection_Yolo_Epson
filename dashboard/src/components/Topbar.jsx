import { useState, useEffect } from 'react'
import { Menu, Sun, Moon } from 'lucide-react'
import './Topbar.css'

export default function Topbar({ title, subtitle, onMenuClick }) {
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('theme') === 'dark' || document.body.classList.contains('dark-theme')
  })

  useEffect(() => {
    if (isDark) {
      document.body.classList.add('dark-theme')
      localStorage.setItem('theme', 'dark')
    } else {
      document.body.classList.remove('dark-theme')
      localStorage.setItem('theme', 'light')
    }
  }, [isDark])

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="topbar-menu" onClick={onMenuClick}>
          <Menu size={20} />
        </button>
        <div>
          <h1 className="topbar-title">{title}</h1>
          <p className="topbar-subtitle">{subtitle}</p>
        </div>
      </div>
      <div className="topbar-right">
        <button 
          className="theme-toggle-btn" 
          onClick={() => setIsDark(!isDark)} 
          title={isDark ? "Aktifkan Mode Terang" : "Aktifkan Mode Malam"}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--gray-500)',
            cursor: 'pointer',
            padding: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            transition: 'background-color 0.2s',
            marginRight: '8px'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--gray-100)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        <select className="topbar-select" defaultValue="month">
          <option value="today">Hari Ini</option>
          <option value="week">7 Hari</option>
          <option value="month">30 Hari</option>
        </select>
      </div>
    </header>
  )
}
