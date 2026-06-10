import { useState, useEffect } from 'react'
import { Download, Search, X, ZoomIn, Trash2, Edit, AlertTriangle } from 'lucide-react'
import './History.css'
import { parseUTCDate } from '../utils/date'

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
              {parseUTCDate(inspection.created_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}
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

// ─── Modal Edit Inspeksi (Khusus QC & Storage) ─────────────────────────────
function EditInspectionModal({ inspection, onClose, onSave }) {
  const [partName, setPartName] = useState('')
  const [expectedQty, setExpectedQty] = useState(12)
  const [batchId, setBatchId] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (inspection) {
      setPartName(inspection.part_name || '')
      setExpectedQty(inspection.expected_qty || 12)
      setBatchId(inspection.batch_id || '')
    }
  }, [inspection])

  if (!inspection) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onSave(inspection.id, {
        part_name: partName,
        expected_qty: Number(expectedQty),
        batch_id: batchId || null
      })
      onClose()
    } catch (err) {
      alert("Gagal mengupdate data")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 999 }}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
        <div className="modal-header">
          <h2 className="modal-title">Edit Data Inspeksi</h2>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>Nama Part</label>
            <select
              value={partName}
              onChange={e => setPartName(e.target.value)}
              required
              style={{
                padding: '8px 32px 8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.9rem',
                backgroundColor: '#ffffff',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23475569' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19.5 8.25l-7.5 7.5-7.5-7.5'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 12px center',
                backgroundSize: '16px',
                appearance: 'none',
                WebkitAppearance: 'none',
                MozAppearance: 'none',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="Gear Roller">Gear Roller</option>
              <option value="Gear Flange">Gear Flange</option>
              <option value="Pinion Gear">Pinion Gear</option>
              <option value="Spur Gear">Spur Gear</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>Target Qty (Expected)</label>
            <input
              type="number"
              value={expectedQty}
              onChange={e => setExpectedQty(e.target.value)}
              required
              min={1}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.9rem'
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>Batch ID</label>
            <input
              type="text"
              value={batchId}
              onChange={e => setBatchId(e.target.value)}
              placeholder="Tidak ada batch"
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.9rem'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1',
                background: '#f8fafc', color: '#475569', fontWeight: 600, cursor: 'pointer'
              }}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1, padding: '10px', borderRadius: '8px', border: 'none',
                background: '#3b82f6', color: '#fff', fontWeight: 600, cursor: 'pointer'
              }}
            >
              {loading ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Modal Konfirmasi Hapus (React Custom) ──────────────────────────────────
function DeleteConfirmModal({ target, onClose, onConfirm }) {
  if (!target) return null

  const isAll = target.type === 'all'

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div
        className="modal-box"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '450px',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
        }}
      >
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{
            background: '#fee2e2',
            color: '#ef4444',
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px'
          }}>
            <AlertTriangle size={24} />
          </div>

          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>
            {isAll ? 'Hapus Semua Riwayat?' : 'Hapus Riwayat Inspeksi?'}
          </h3>

          <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5, marginBottom: '24px' }}>
            {isAll
              ? 'PERINGATAN! Tindakan ini akan menghapus SELURUH data inspeksi dari database secara permanen. Tindakan ini tidak dapat dibatalkan.'
              : `Apakah Anda yakin ingin menghapus data inspeksi ${target.label}? Tindakan ini tidak dapat dibatalkan.`}
          </p>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1, padding: '10px 16px', borderRadius: '8px', border: '1px solid #cbd5e1',
                background: '#ffffff', color: '#475569', fontWeight: 600, cursor: 'pointer',
                fontSize: '0.875rem'
              }}
            >
              Batal
            </button>
            <button
              type="button"
              onClick={onConfirm}
              style={{
                flex: 1, padding: '10px 16px', borderRadius: '8px', border: 'none',
                background: '#ef4444', color: '#ffffff', fontWeight: 600, cursor: 'pointer',
                fontSize: '0.875rem'
              }}
            >
              Ya, Hapus
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Halaman History ────────────────────────────────────────────────────────
export default function History({ user }) {
  const [inspections, setInspections] = useState([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedInspection, setSelectedInspection] = useState(null)
  const [editingInspection, setEditingInspection] = useState(null)
  const [zoomedImage, setZoomedImage] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const canEdit = user?.role === 'qc_epson' || user?.role === 'storage_epson'
  const canDelete = user?.role === 'qc_epson'

  const executeDelete = async () => {
    if (!deleteTarget) return

    if (deleteTarget.type === 'single') {
      const id = deleteTarget.id
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
    } else if (deleteTarget.type === 'all') {
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
    setDeleteTarget(null)
  }

  const handleSaveInspection = async (id, updatedData) => {
    try {
      const res = await fetch(`${API_BASE}/api/inspections/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData)
      })
      if (res.ok) {
        const updatedObj = await res.json()
        setInspections(prev => prev.map(insp => insp.id === id ? updatedObj : insp))
      } else {
        alert("Gagal memperbarui data")
      }
    } catch (err) {
      console.error(err)
      alert("Error saat menyimpan perubahan")
    }
  }

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/inspections/`)
        if (res.ok) {
          const data = await res.json()
          setInspections(data)
        }
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

    let matchDate = true
    if (startDate || endDate) {
      const rowDate = parseUTCDate(row.created_at).setHours(0,0,0,0)
      const start = startDate ? new Date(startDate).setHours(0,0,0,0) : -Infinity
      const end = endDate ? new Date(endDate).setHours(23,59,59,999) : Infinity
      matchDate = rowDate >= start && rowDate <= end
    }

    return matchSearch && matchFilter && matchDate
  })

  const exportCSV = () => {
    const header = 'NO.;ID INSPEKSI;WAKTU;NAMA PART;BATCH ID;TARGET (EXPECTED);TERDETEKSI (DETECTED);SELISIH;STATUS;CONFIDENCE AI;FOTO ASLI;FOTO DETEKSI\n'
    const rows = filtered.map((r, index) => {
      const timeStr = parseUTCDate(r.created_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
      const statusStr = r.is_match ? 'Sesuai' : 'Selisih'
      const confidenceStr = (r.average_confidence * 100).toFixed(1) + '%'

      const batchIdStr = r.batch_id ? r.batch_id.replace(/"/g, '""') : '—'
      const partNameEscaped = r.part_name.replace(/"/g, '""')

      const rawLink = r.image_path
        ? `=HYPERLINK(""http://${window.location.hostname}:8000${r.image_path}"";""Buka Foto Asli"")`
        : '—'
      const resLink = r.image_result_path
        ? `=HYPERLINK(""http://${window.location.hostname}:8000${r.image_result_path}"";""Buka Foto Deteksi"")`
        : '—'

      return `"${index + 1}";"${r.inspection_id}";"${timeStr}";"${partNameEscaped}";"${batchIdStr}";${r.expected_qty};${r.detected_qty};${r.discrepancy > 0 ? '+' : ''}${r.discrepancy};"${statusStr}";"${confidenceStr}";"${rawLink}";"${resLink}"`
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
      {/* Modal detail gambar */}
      <ImageModal
        inspection={selectedInspection}
        onClose={() => setSelectedInspection(null)}
        onZoomImage={setZoomedImage}
      />

      {/* Modal edit data */}
      <EditInspectionModal
        inspection={editingInspection}
        onClose={() => setEditingInspection(null)}
        onSave={handleSaveInspection}
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
          
          <div className="date-filter-row" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#ffffff', border: '1px solid var(--gray-200)', borderRadius: '6px', padding: '6px 10px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--gray-500)' }}>Dari:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{ border: 'none', background: 'transparent', fontSize: '0.8rem', color: 'var(--gray-700)', outline: 'none', cursor: 'pointer' }}
              />
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>s/d</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#ffffff', border: '1px solid var(--gray-200)', borderRadius: '6px', padding: '6px 10px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--gray-500)' }}>Sampai:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{ border: 'none', background: 'transparent', fontSize: '0.8rem', color: 'var(--gray-700)', outline: 'none', cursor: 'pointer' }}
              />
            </div>
            {(startDate || endDate) && (
              <button
                onClick={() => { setStartDate(''); setEndDate('') }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ef4444',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  transition: 'background 0.2s'
                }}
                onMouseOver={(e) => e.target.style.background = '#fef2f2'}
                onMouseOut={(e) => e.target.style.background = 'none'}
              >
                Reset
              </button>
            )}
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
            {canDelete && (
              <button className="btn-clear-all" onClick={() => setDeleteTarget({ type: 'all' })}>
                <Trash2 size={14} />
                Hapus Semua
              </button>
            )}
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
                  <td>{parseUTCDate(row.created_at).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' })}</td>
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

                      {canEdit && (
                        <button
                          className="btn-view-img"
                          style={{ borderColor: '#e2e8f0', color: '#475569' }}
                          onClick={() => setEditingInspection(row)}
                          title="Edit data"
                        >
                          <Edit size={14} />
                          Edit
                        </button>
                      )}

                      {canDelete && (
                        <button
                          className="btn-delete-item"
                          onClick={() => setDeleteTarget({ type: 'single', id: row.id, label: row.inspection_id })}
                          title="Hapus riwayat"
                        >
                          <Trash2 size={14} />
                          Hapus
                        </button>
                      )}
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
      <DeleteConfirmModal target={deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={executeDelete} />
    </div>
  )
}
