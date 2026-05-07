import { LayoutDashboard, ClockArrowUp, FileText, ScanEye } from 'lucide-react'
import './Sidebar.css'

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'history', label: 'Riwayat', icon: ClockArrowUp },
  { id: 'reports', label: 'Laporan', icon: FileText },
]

export default function Sidebar({ activePage, onNavigate, open, onClose }) {
  return (
    <>
      {open && <div className="sidebar-overlay" onClick={onClose} />}
      <aside className={`sidebar ${open ? 'sidebar--open' : ''}`}>
        <div className="sidebar-brand">
          <div className="sidebar-logo">
            <ScanEye size={20} />
          </div>
          <div>
            <div className="sidebar-title">EpsonQC</div>
            <div className="sidebar-subtitle">Vision System</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <span className="nav-label">Menu</span>
          {navItems.map(item => (
            <button
              key={item.id}
              className={`nav-btn ${activePage === item.id ? 'nav-btn--active' : ''}`}
              onClick={() => onNavigate(item.id)}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-chip">
            <div className="user-avatar">MH</div>
            <div>
              <div className="user-name">Muhammad Habibi</div>
              <div className="user-role">QC Operator</div>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
