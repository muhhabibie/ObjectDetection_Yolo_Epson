import { useState, useEffect } from 'react'
import { Search, RefreshCw } from 'lucide-react'
import './AuditLogs.css'

const API_BASE = ""

export default function AuditLogs() {
  const [logs, setLogs] = useState([])
  const [search, setSearch] = useState('')
  const [filterAction, setFilterAction] = useState('all')
  const [loading, setLoading] = useState(true)

  const fetchLogs = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/audit-logs`)
      if (res.ok) {
        const data = await res.json()
        setLogs(data)
      }
      setLoading(false)
    } catch (err) {
      console.error("Gagal memuat log audit:", err)
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
    const interval = setInterval(fetchLogs, 5000)
    return () => clearInterval(interval)
  }, [])

  const filteredLogs = logs.filter(log => {
    const searchStr = search.toLowerCase()
    const matchSearch = 
      (log.username || '').toLowerCase().includes(searchStr) ||
      (log.details || '').toLowerCase().includes(searchStr) ||
      (log.action || '').toLowerCase().includes(searchStr)
      
    const matchAction = filterAction === 'all' || log.action === filterAction
    return matchSearch && matchAction
  })

  const uniqueActions = Array.from(new Set(logs.map(l => l.action)))

  const formatRole = (role) => {
    const map = {
      qc_epson: 'QC Epson',
      storage_epson: 'Storage Epson',
      vendor: 'Vendor'
    }
    return map[role] || role || 'System'
  }

  const getActionClass = (action) => {
    const map = {
      LOGIN: 'log-action--login',
      CAPTURE_IMAGE: 'log-action--capture',
      UPDATE_SETTINGS: 'log-action--settings',
      EDIT_INSPECTION: 'log-action--edit',
      DELETE_INSPECTION: 'log-action--delete',
      CLEAR_HISTORY: 'log-action--clear'
    }
    return map[action] || 'log-action--default'
  }

  if (loading) {
    return <div style={{ padding: '2rem' }}>Memuat log audit trail...</div>
  }

  return (
    <div className="audit-logs-page">
      <div className="card">
        <div className="history-toolbar">
          <div className="search-box">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Cari log berdasarkan pengguna, detail, atau aksi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="toolbar-right">
            <select 
              value={filterAction} 
              onChange={(e) => setFilterAction(e.target.value)} 
              className="filter-select"
            >
              <option value="all">Semua Aksi</option>
              {uniqueActions.map(action => (
                <option key={action} value={action}>{action}</option>
              ))}
            </select>
            <button className="btn-export" style={{ background: '#f8fafc', color: '#475569', borderColor: '#e2e8f0' }} onClick={fetchLogs}>
              <RefreshCw size={14} style={{ marginRight: '6px' }} />
              Refresh
            </button>
          </div>
        </div>

        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>No.</th>
                <th style={{ width: '180px' }}>Waktu</th>
                <th style={{ width: '150px' }}>Pengguna</th>
                <th style={{ width: '150px' }}>Role</th>
                <th style={{ width: '180px' }}>Aktivitas</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log, index) => (
                <tr key={log.id}>
                  <td style={{ color: '#6b7280' }}>{index + 1}</td>
                  <td>{new Date(log.created_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}</td>
                  <td style={{ fontWeight: 600, color: '#334155' }}>{log.username || 'System'}</td>
                  <td>
                    <span className={`role-badge role-badge--${log.role}`}>
                      {formatRole(log.role)}
                    </span>
                  </td>
                  <td>
                    <span className={`log-action-badge ${getActionClass(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
                  <td style={{ color: '#475569', fontSize: '0.875rem' }}>{log.details}</td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="td-empty">Tidak ada log aktivitas ditemukan</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="table-footer">
          <span className="table-info">
            Menampilkan {filteredLogs.length} dari {logs.length} total log aktivitas di Database
          </span>
        </div>
      </div>
    </div>
  )
}
