import { Menu, Bell } from 'lucide-react'
import './Topbar.css'

export default function Topbar({ title, subtitle, onMenuClick }) {
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
        <select className="topbar-select" defaultValue="month">
          <option value="today">Hari Ini</option>
          <option value="week">7 Hari</option>
          <option value="month">30 Hari</option>
        </select>
      </div>
    </header>
  )
}
