import { useState, useEffect } from 'react'
import { Download, Search, X, ZoomIn, Trash2 } from 'lucide-react'
import './History.css'

const API_BASE = ""

// ─── Modal Before/After ────────────────────────────────────────────────────
function ZoomedImageModal({ image, onClose }) {
  if (!image) return null

  return (
    <div 
      className="zoomed-image-overlay" 
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        cursor: 'zoom-out',
        animation: 'fadeIn 0.2s ease'
      }}
    >
      <div 
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          color: '#ffffff',
          background: 'rgba(255,255,255,0.1)',
          border: 'none',
          borderRadius: '50%',
          width: '40px',
          height: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          fontSize: '24px',
        }}
        onClick={onClose}
      >
        &times;
      </div>
      <div 
        style={{
          color: '#ffffff',
          fontSize: '1.1rem',
          fontWeight: 600,
          marginBottom: '16px',
          background: 'rgba(15, 23, 42, 0.6)',
          padding: '6px 16px',
          borderRadius: '20px',
          border: '1px solid rgba(255,255,255,0.1)'
        }}
      >
        {image.title}
      </div>
      <img 
        src={image.url} 
        alt={image.title} 
        style={{
          maxWidth: '90%',
          maxHeight: '80vh',
          objectFit: 'contain',
          borderRadius: '8px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          border: '2px solid rgba(255,255,255,0.1)',
          cursor: 'default'
        }}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  )
}

// ─── Modal Before/After ────────────────────────────────────────────────────
function ImageModal({ inspection, onClose, onZoomImage }) {
  if (!inspection) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Detail Inspeksi</h2>
            <span className="modal-subtitle">
              {inspection.inspection_id} &nbsp;·&nbsp; {inspection.part_name} &nbsp;·&nbsp;
              {new Date(inspection.created_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}
            </span>
          </div>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-images">
          {/* Gambar RAW */}
          <div className="modal-img-panel">
            <div className="modal-img-label modal-img-label--raw">Gambar Raw (Asli)</div>
            {inspection.image_path ? (
              <img
                src={`${API_BASE}${inspection.image_path}`}
                alt="Raw"
                className="modal-img"
                style={{ cursor: 'zoom-in' }}
                onClick={() => onZoomImage({ url: `${API_BASE}${inspection.image_path}`, title: 'Foto Raw (Asli)' })}
                onError={(e) => { e.target.src = ''; e.target.style.display = 'none' }}
              />
            ) : (
              <div className="modal-img-placeholder">Tidak ada gambar</div>
            )}
          </div>

          {/* Gambar Hasil Deteksi */}
          <div className="modal-img-panel">
            <div className="modal-img-label modal-img-label--result">Hasil Deteksi AI</div>
            {inspection.image_result_path ? (
              <img
                src={`${API_BASE}${inspection.image_result_path}`}
                alt="Hasil Deteksi"
                className="modal-img"
                style={{ cursor: 'zoom-in' }}
                onClick={() => onZoomImage({ url: `${API_BASE}${inspection.image_result_path}`, title: 'Hasil Deteksi AI' })}
                onError={(e) => { e.target.src = ''; e.target.style.display = 'none' }}
              />
            ) : (
              <div className="modal-img-placeholder">Tidak ada gambar</div>
            )}
          </div>
        </div>

        {/* Info deteksi */}
        <div className="modal-info-row">
          <div className="modal-info-item">
            <span className="modal-info-label">Expected</span>
            <span className="modal-info-val">{inspection.expected_qty}</span>
          </div>
          <div className="modal-info-item">
            <span className="modal-info-label">Detected</span>
            <span className="modal-info-val">{inspection.detected_qty}</span>
          </div>
          <div className="modal-info-item">
            <span className="modal-info-label">Selisih</span>
            <span className={`modal-info-val ${inspection.discrepancy !== 0 ? 'val--red' : 'val--green'}`}>
              {inspection.discrepancy === 0 ? '—' : (inspection.discrepancy > 0 ? '+' : '') + inspection.discrepancy}
            </span>
          </div>
          <div className="modal-info-item">
            <span className="modal-info-label">Confidence</span>
            <span className="modal-info-val">{(inspection.average_confidence * 100).toFixed(1)}%</span>
          </div>
          <div className="modal-info-item">
            <span className="modal-info-label">Status</span>
            <span className={`badge ${inspection.is_match ? 'badge--green' : 'badge--red'}`}>
              {inspection.is_match ? 'Sesuai' : 'Selisih'}
            </span>
          </div>
          {inspection.processing_time_sec && (
            <div className="modal-info-item">
              <span className="modal-info-label">Waktu Proses</span>
              <span className="modal-info-val">{inspection.processing_time_sec}s</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Halaman History ────────────────────────────────────────────────────────
export default function History() {
  const [inspections, setInspections] = useState([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [selectedInspection, setSelectedInspection] = useState(null)
  const [zoomedImage, setZoomedImage] = useState(null)

  const handleDeleteInspection = async (id) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus data inspeksi ini?")) return
    try {
      const res = await fetch(`${API_BASE}/api/inspections/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setInspections(prev => prev.filter(item => item.id !== id))
      } else {
        alert("Gagal menghapus data")
      }
    } catch (err) {
      console.error(err)
      alert("Error saat menghapus data")
    }
  }

  const handleClearAll = async () => {
    if (!window.confirm("PERINGATAN! Apakah Anda yakin ingin menghapus SELURUH riwayat inspeksi dari database? Tindakan ini tidak dapat dibatalkan.")) return
    try {
      const res = await fetch(`${API_BASE}/api/inspections/`, { method: 'DELETE' })
      if (res.ok) {
        setInspections([])
      } else {
        alert("Gagal menghapus seluruh riwayat")
      }
    } catch (err) {
      console.error(err)
      alert("Error saat menghapus riwayat")
    }
  }

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/inspections/`)
        const data = await res.json()
        setInspections(data)
        setLoading(false)
      } catch (error) {
        console.error("Gagal mengambil data dari API:", error)
        setLoading(false)
      }
    }

    fetchHistory()
    const interval = setInterval(fetchHistory, 5000)
    return () => clearInterval(interval)
  }, [])

  const filtered = inspections.filter(row => {
    const searchString = search.toLowerCase()
    const matchSearch =
      row.part_name.toLowerCase().includes(searchString) ||
      row.inspection_id.toLowerCase().includes(searchString)
    const statusStr = row.is_match ? 'match' : 'mismatch'
    const matchFilter = filter === 'all' || statusStr === filter
    return matchSearch && matchFilter
  })

  const exportCSV = () => {
    const header = 'ID Inspeksi;Waktu;Nama Part;Expected;Detected;Selisih;Status;Confidence;Link Foto Asli;Link Foto Deteksi\n'
    const rows = filtered.map(r => {
      const timeStr = new Date(r.created_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
      const statusStr = r.is_match ? 'Sesuai' : 'Selisih'
      const rawPhotoLink = r.image_path ? `=HYPERLINK("http://${window.location.hostname}:8000${r.image_path}")` : ''
      const resultPhotoLink = r.image_result_path ? `=HYPERLINK("http://${window.location.hostname}:8000${r.image_result_path}")` : ''
      const partNameEscaped = r.part_name.replace(/"/g, '""')
      return `"${r.inspection_id}";"${timeStr}";"${partNameEscaped}";${r.expected_qty};${r.detected_qty};${r.discrepancy};"${statusStr}";"${(r.average_confidence * 100).toFixed(1)}%";${rawPhotoLink};${resultPhotoLink}`
    }).join('\n')

    const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `inspeksi_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return <div style={{ padding: '2rem' }}>Memuat data riwayat dari server...</div>
  }

  return (
    <div className="history">
      {/* Modal gambar */}
      <ImageModal
        inspection={selectedInspection}
        onClose={() => setSelectedInspection(null)}
        onZoomImage={setZoomedImage}
      />

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
            <button className="btn-clear-all" onClick={handleClearAll}>
              <Trash2 size={14} />
              Hapus Semua
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
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, index) => (
                <tr key={row.id}>
                  <td style={{ color: '#6b7280' }}>{index + 1}</td>
                  <td className="td-mono">{row.inspection_id}</td>
                  <td>{new Date(row.created_at).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' })}</td>
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
                  <td>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      {(row.image_path || row.image_result_path) ? (
                        <button
                          className="btn-view-img"
                          onClick={() => setSelectedInspection(row)}
                          title="Lihat gambar"
                        >
                          <ZoomIn size={14} />
                          Lihat
                        </button>
                      ) : (
                        <span className="td-no-img">—</span>
                      )}
                      <button
                        className="btn-delete-item"
                        onClick={() => handleDeleteInspection(row.id)}
                        title="Hapus riwayat"
                      >
                        <Trash2 size={14} />
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="td-empty">Tidak ada data ditemukan</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="table-footer">
          <span className="table-info">
            Menampilkan {filtered.length} dari {inspections.length} total data di Database
          </span>
        </div>
      </div>
      <ZoomedImageModal image={zoomedImage} onClose={() => setZoomedImage(null)} />
    </div>
  )
}
