import { useState } from 'react'
import { Download, FileText, Calendar } from 'lucide-react'
import { recentInspections } from '../data/mockData'
import './Reports.css'

export default function Reports() {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [partFilter, setPartFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const filtered = recentInspections.filter(row => {
    const matchPart = partFilter === 'all' || row.part === partFilter
    const matchStatus = statusFilter === 'all' || row.status === statusFilter
    return matchPart && matchStatus
  })

  const matchCount = filtered.filter(r => r.status === 'match').length
  const mismatchCount = filtered.filter(r => r.status === 'mismatch').length

  const exportCSV = () => {
    const header = 'ID,Waktu,Part,Expected,Detected,Selisih,Status,Confidence\n'
    const rows = filtered.map(r =>
      `${r.id},${r.time},${r.part},${r.expected},${r.detected},${r.detected - r.expected},${r.status === 'match' ? 'Sesuai' : 'Selisih'},${r.confidence}%`
    ).join('\n')
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
      id: r.id,
      waktu: r.time,
      part: r.part,
      expected: r.expected,
      detected: r.detected,
      selisih: r.detected - r.expected,
      status: r.status === 'match' ? 'Sesuai' : 'Selisih',
      confidence: r.confidence,
    }))
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `laporan_inspeksi_${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
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
              <option value="Spur Gear">Spur Gear</option>
              <option value="Roller Assy">Roller Assy</option>
              <option value="Spring Clip">Spring Clip</option>
              <option value="Bushing">Bushing</option>
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
              {filtered.map(row => {
                const diff = row.detected - row.expected
                return (
                  <tr key={row.id}>
                    <td className="td-mono">{row.id}</td>
                    <td>{row.time}</td>
                    <td>{row.part}</td>
                    <td>{row.expected}</td>
                    <td>{row.detected}</td>
                    <td className={diff !== 0 ? 'td-red' : ''}>
                      {diff === 0 ? '—' : (diff > 0 ? '+' : '') + diff}
                    </td>
                    <td>
                      <span className={`badge ${row.status === 'match' ? 'badge--green' : 'badge--red'}`}>
                        {row.status === 'match' ? 'Sesuai' : 'Selisih'}
                      </span>
                    </td>
                    <td>{row.confidence}%</td>
                  </tr>
                )
              })}
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
