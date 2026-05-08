import { useState, useEffect } from 'react'
import { Download, FileText, Calendar } from 'lucide-react'
import './Reports.css'

export default function Reports() {
  const [inspections, setInspections] = useState([])
  const [loading, setLoading] = useState(true)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [partFilter, setPartFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    const fetchReportsData = async () => {
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
    
    fetchReportsData()
  }, [])

  // Mendapatkan daftar nama part unik untuk dropdown filter
  const uniqueParts = [...new Set(inspections.map(item => item.part_name))]

  const filtered = inspections.filter(row => {
    const matchPart = partFilter === 'all' || row.part_name === partFilter
    
    const statusStr = row.is_match ? 'match' : 'mismatch'
    const matchStatus = statusFilter === 'all' || statusStr === statusFilter
    
    let matchDate = true
    if (startDate || endDate) {
      const rowDate = new Date(row.created_at).setHours(0,0,0,0)
      const start = startDate ? new Date(startDate).setHours(0,0,0,0) : -Infinity
      const end = endDate ? new Date(endDate).setHours(23,59,59,999) : Infinity
      matchDate = rowDate >= start && rowDate <= end
    }

    return matchPart && matchStatus && matchDate
  })

  const matchCount = filtered.filter(r => r.is_match).length
  const mismatchCount = filtered.filter(r => !r.is_match).length

  const exportCSV = () => {
    const header = 'ID,Waktu,Part,Expected,Detected,Selisih,Status,Confidence\n'
    const rows = filtered.map(r => {
      const timeStr = new Date(r.created_at).toLocaleString('id-ID')
      const statusStr = r.is_match ? 'Sesuai' : 'Selisih'
      return `${r.inspection_id},"${timeStr}",${r.part_name},${r.expected_qty},${r.detected_qty},${r.discrepancy},${statusStr},${(r.average_confidence * 100).toFixed(1)}%`
    }).join('\n')
    
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `laporan_inspeksi_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportJSON = () => {
    const data = filtered.map(r => ({
      id: r.inspection_id,
      waktu: new Date(r.created_at).toISOString(),
      part: r.part_name,
      expected: r.expected_qty,
      detected: r.detected_qty,
      selisih: r.discrepancy,
      status: r.is_match ? 'Sesuai' : 'Selisih',
      confidence: (r.average_confidence * 100).toFixed(1) + '%',
    }))
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `laporan_inspeksi_${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return <div style={{ padding: '2rem' }}>Memuat data laporan dari server...</div>
  }

  return (
    <div className="reports">
      {/* Filter Section */}
      <div className="card filter-card">
        <h3 className="card-title">Filter Laporan</h3>
        <div className="filter-grid">
          <div className="form-field">
            <label>Tanggal Mulai</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div className="form-field">
            <label>Tanggal Akhir</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
          <div className="form-field">
            <label>Jenis Part</label>
            <select value={partFilter} onChange={e => setPartFilter(e.target.value)}>
              <option value="all">Semua Part</option>
              {uniqueParts.map((part, idx) => (
                <option key={idx} value={part}>{part}</option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label>Status</label>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="all">Semua</option>
              <option value="match">Sesuai</option>
              <option value="mismatch">Selisih</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="report-summary">
        <div className="summary-item">
          <span className="summary-val">{filtered.length}</span>
          <span className="summary-lbl">Total Data</span>
        </div>
        <div className="summary-item">
          <span className="summary-val summary-val--green">{matchCount}</span>
          <span className="summary-lbl">Sesuai</span>
        </div>
        <div className="summary-item">
          <span className="summary-val summary-val--red">{mismatchCount}</span>
          <span className="summary-lbl">Selisih</span>
        </div>
        <div className="summary-item">
          <span className="summary-val">
            {filtered.length > 0 ? ((matchCount / filtered.length) * 100).toFixed(1) : 0}%
          </span>
          <span className="summary-lbl">Akurasi</span>
        </div>
      </div>

      {/* Export Actions */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Export Laporan</h3>
        </div>
        <div className="export-grid">
          <button className="export-btn" onClick={exportCSV}>
            <div className="export-icon export-icon--csv">CSV</div>
            <div className="export-info">
              <span className="export-name">Export CSV</span>
              <span className="export-desc">Format spreadsheet, bisa dibuka di Excel</span>
            </div>
            <Download size={16} className="export-dl" />
          </button>
          <button className="export-btn" onClick={exportJSON}>
            <div className="export-icon export-icon--json">JSON</div>
            <div className="export-info">
              <span className="export-name">Export JSON</span>
              <span className="export-desc">Format data terstruktur untuk integrasi sistem</span>
            </div>
            <Download size={16} className="export-dl" />
          </button>
        </div>
        <p className="export-note">
          * Data yang di-export sesuai dengan filter yang dipilih ({filtered.length} record)
        </p>
      </div>

      {/* Preview Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Preview Data</h3>
          <span className="data-count">{filtered.length} record</span>
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
                <tr><td colSpan={8} className="td-empty">Tidak ada data</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
