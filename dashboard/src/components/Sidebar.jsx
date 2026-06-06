import { LayoutDashboard, ClockArrowUp, FileText, Camera, LogOut, ClipboardList } from 'lucide-react'
import './Sidebar.css'

const navItems = [
  { id: 'dashboard', label: 'Dashboard',  icon: LayoutDashboard },
  { id: 'capture',   label: 'Capture',    icon: Camera, restricted: true },
  { id: 'history',   label: 'Riwayat',    icon: ClockArrowUp },
  { id: 'reports',   label: 'Laporan',    icon: FileText },
  { id: 'audit',     label: 'Audit Log',  icon: ClipboardList, restrictedTo: ['qc_epson', 'storage_epson'] }
]

export default function Sidebar({ activePage, onNavigate, open, onClose, user, onLogout }) {
  const roleLabelMap = {
    qc_epson: 'QC Operator',
    storage_epson: 'Storage Operator',
    vendor: 'External Vendor'
  }
  const displayNameMap = {
    qc_epson: 'QC Epson',
    storage_epson: 'Storage Epson',
    vendor: 'Vendor'
  }
  const initialsMap = {
    qc_epson: 'QE',
    storage_epson: 'SE',
    vendor: 'VE'
  }
  
  const roleLabel = roleLabelMap[user?.role] || 'Operator'
  const displayName = displayNameMap[user?.role] || user?.username || 'User'
  const initials = initialsMap[user?.role] || (user?.username ? user.username.substring(0, 2).toUpperCase() : 'OP')

  // Filter items: hide restricted menus (like Capture) for non-qc roles
  const filteredNav = navItems.filter(item => {
    if (item.restricted && user?.role !== 'qc_epson' && user?.role !== 'storage_epson') return false
    if (item.restrictedTo && !item.restrictedTo.includes(user?.role)) return false
    return true
  })

  return (
    <>
      {open && <div className="sidebar-overlay" onClick={onClose} />}
      <aside className={`sidebar ${open ? 'sidebar--open' : ''}`}>
        <div style={{ paddingTop: '20px' }}></div>

        <nav className="sidebar-nav">
          <span className="nav-label">Menu</span>
          {filteredNav.map(item => (
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

        <div className="sidebar-footer" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div className="user-chip">
            <div className="user-avatar">{initials}</div>
            <div>
              <div className="user-name">{displayName}</div>
              <div className="user-role">{roleLabel}</div>
            </div>
          </div>
          
          <button 
            onClick={onLogout}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.08)',
              color: '#ef4444',
              border: 'none',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'background 0.2s'
            }}
          >
            <LogOut size={13} />
            <span>Log Out</span>
          </button>
        </div>
      </aside>
    </>
  )
}
