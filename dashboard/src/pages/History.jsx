import { useState, useEffect } from 'react'
import { Download, Search } from 'lucide-react'
import './History.css'

export default function History() {
  const [inspections, setInspections] = useState([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/inspections/')
        const data = await res.json()
        setInspections(data)
        setLoading(false)
      } catch (error) {
        console.error("Gagal mengambil data dari API:", error)
        setLoading(false)
      }
    }
    
    fetchHistory()
    // Refresh otomatis setiap 5 detik
    const interval = setInterval(fetchHistory, 5000)
    return () => clearInterval(interval)
  }, [])

  const filtered = inspections.filter(row => {
    const searchString = search.toLowerCase()
    const matchSearch = row.part_name.toLowerCase().includes(searchString) || row.inspection_id.toLowerCase().includes(searchString)
    
    // Konversi boolean is_match dari DB ke string filter
    const statusStr = row.is_match ? 'match' : 'mismatch'
    const matchFilter = filter === 'all' || statusStr === filter
    
    return matchSearch && matchFilter
  })

  const exportCSV = () => {
    const header = 'ID,Waktu,Part,Expected,Detected,Status,Confidence\n'
    const rows = filtered.map(r => {
      const timeStr = new Date(r.created_at).toLocaleString('id-ID')
      const statusStr = r.is_match ? 'Sesuai' : 'Selisih'
      return `${r.inspection_id},"${timeStr}",${r.part_name},${r.expected_qty},${r.detected_qty},${statusStr},${(r.average_confidence * 100).toFixed(1)}%`
    }).join('\n')
    
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `inspeksi_${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return <div style={{ padding: '2rem' }}>Memuat data riwayat dari server...</div>
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
                <th>No.</th>
                <th>ID Inspeksi</th>
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
              {filtered.map((row, index) => (
                <tr key={row.id}>
                  <td style={{ color: '#6b7280' }}>{index + 1}</td>
                  <td className="td-mono">{row.inspection_id}</td>
                  <td>{new Date(row.created_at).toLocaleTimeString('id-ID')}</td>
                  <td>{row.part_name}</td>
                  <td>{row.expected_qty}</td>
                  <td>{row.detected_qty}</td>
                  <td className={row.discrepancy !== 0 ? 'td-red' : ''}>
                    {row.discrepancy === 0 ? '—' : (row.discrepancy > 0 ? '+' : '') + row.discrepancy}
                  </td>
                  <td>
                    <span className={`badge ${row.is_match ? 'badge--green' : 'badge--red'}`}>
                      {row.is_match ? 'Sesuai' : 'Selisih'}
                    </span>
                  </td>
                  <td>{(row.average_confidence * 100).toFixed(1)}%</td>
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
          <span className="table-info">Menampilkan {filtered.length} dari {inspections.length} total data di Database</span>
        </div>
      </div>
    </div>
  )
}
