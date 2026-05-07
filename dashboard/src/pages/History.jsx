import { useState } from 'react'
import { Download, Search } from 'lucide-react'
import { recentInspections } from '../data/mockData'
import './History.css'

export default function History() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  const filtered = recentInspections.filter(row => {
    const matchSearch = row.part.toLowerCase().includes(search.toLowerCase()) || row.id.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' || row.status === filter
    return matchSearch && matchFilter
  })

  const exportCSV = () => {
    const header = 'ID,Waktu,Part,Expected,Detected,Status,Confidence\n'
    const rows = filtered.map(r => `${r.id},${r.time},${r.part},${r.expected},${r.detected},${r.status},${r.confidence}`).join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `inspeksi_${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="history">
      <div className="card">
        <div className="history-toolbar">
          <div className="search-box">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Cari ID atau nama part..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="toolbar-right">
            <select value={filter} onChange={(e) => setFilter(e.target.value)} className="filter-select">
              <option value="all">Semua</option>
              <option value="match">Sesuai</option>
              <option value="mismatch">Selisih</option>
            </select>
            <button className="btn-export" onClick={exportCSV}>
              <Download size={14} />
              Export CSV
            </button>
          </div>
        </div>

        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Waktu</th>
                <th>Part</th>
                <th>Expected</th>
                <th>Detected</th>
                <th>Selisih</th>
                <th>Status</th>
                <th>Confidence</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id}>
                  <td className="td-mono">{row.id}</td>
                  <td>{row.time}</td>
                  <td>{row.part}</td>
                  <td>{row.expected}</td>
                  <td>{row.detected}</td>
                  <td className={row.expected !== row.detected ? 'td-red' : ''}>
                    {row.detected - row.expected === 0 ? '—' : (row.detected - row.expected > 0 ? '+' : '') + (row.detected - row.expected)}
                  </td>
                  <td>
                    <span className={`badge ${row.status === 'match' ? 'badge--green' : 'badge--red'}`}>
                      {row.status === 'match' ? 'Sesuai' : 'Selisih'}
                    </span>
                  </td>
                  <td>{row.confidence}%</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="td-empty">Tidak ada data ditemukan</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="table-footer">
          <span className="table-info">Menampilkan {filtered.length} dari {recentInspections.length} data</span>
        </div>
      </div>
    </div>
  )
}
