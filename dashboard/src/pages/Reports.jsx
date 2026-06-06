import { useState, useEffect } from 'react'
import { Download } from 'lucide-react'
import './Reports.css'

const API_BASE = ""

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
        const res = await fetch(`${API_BASE}/api/inspections/`)
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
    const header = 'NO.;ID INSPEKSI;WAKTU;NAMA PART;BATCH ID;TARGET (EXPECTED);TERDETEKSI (DETECTED);SELISIH;STATUS;CONFIDENCE AI;FOTO ASLI;FOTO DETEKSI\n'
    const rows = filtered.map((r, index) => {
      const timeStr = new Date(r.created_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
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
    a.download = `laporan_inspeksi_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportPDF = () => {
    const pdfWindow = window.open('', '_blank')
    if (!pdfWindow) {
      alert("Popup blocker menghalangi pembukaan laporan. Silakan izinkan popup untuk situs ini.")
      return
    }

    pdfWindow.document.write(`
      <html>
        <head>
          <title>Mempersiapkan Laporan...</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              background-color: #f8fafc;
              margin: 0;
              color: #475569;
            }
            .spinner {
              border: 4px solid #e2e8f0;
              width: 40px;
              height: 40px;
              border-radius: 50%;
              border-left-color: #6366f1;
              animation: spin 1s linear infinite;
              margin-bottom: 16px;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            p {
              font-size: 0.95rem;
              font-weight: 500;
            }
          </style>
        </head>
        <body>
          <div class="spinner"></div>
          <p>Mempersiapkan laporan PDF... Silakan tunggu beberapa saat.</p>
        </body>
      </html>
    `)
    pdfWindow.document.close()

    const datePrinted = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
    const periodStr = startDate || endDate
      ? `${startDate ? startDate : 'Awal'} s.d. ${endDate ? endDate : 'Sekarang'}`
      : 'Semua Periode'
    const partFilterStr = partFilter === 'all' ? 'Semua Part' : partFilter
    const statusFilterStr = statusFilter === 'all' ? 'Semua Status' : (statusFilter === 'match' ? 'Sesuai' : 'Selisih')
    const accuracy = filtered.length > 0 ? ((matchCount / filtered.length) * 100).toFixed(1) : '0'

    const tableRowsHtml = filtered.map((r, index) => {
      const timeStr = new Date(r.created_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
      const statusBadgeText = r.is_match ? 'Sesuai' : 'Selisih'
      
      const imgUrl = r.image_result_path ? `${API_BASE}${r.image_result_path}` : ''
      const imgHtml = imgUrl
        ? `<img class="pdf-thumbnail" src="${imgUrl}" crossorigin="anonymous" alt="Deteksi" style="width: 80px; height: 60px; object-fit: cover; border-radius: 4px; border: 1px solid #e2e8f0; display: block; margin: 0 auto;" />`
        : '<span style="color: #9ca3af; font-size: 0.7rem; display: block; text-align: center;">—</span>'

      return `
        <tr style="page-break-inside: avoid;">
          <td style="border: 1px solid #e2e8f0; padding: 6px 10px; text-align: center;">${index + 1}</td>
          <td style="border: 1px solid #e2e8f0; padding: 6px 10px; font-family: monospace; font-size: 0.82rem; color: #475569; text-align: center;">${r.inspection_id}</td>
          <td style="border: 1px solid #e2e8f0; padding: 6px 10px; text-align: center;">${timeStr}</td>
          <td style="border: 1px solid #e2e8f0; padding: 6px 10px;">${r.part_name}</td>
          <td style="border: 1px solid #e2e8f0; padding: 6px 10px; text-align: center;">${r.expected_qty}</td>
          <td style="border: 1px solid #e2e8f0; padding: 6px 10px; text-align: center;">${r.detected_qty}</td>
          <td style="border: 1px solid #e2e8f0; padding: 6px 10px; text-align: center; ${r.discrepancy !== 0 ? 'color: #dc2626; font-weight: 600;' : ''}">${r.discrepancy === 0 ? '—' : (r.discrepancy > 0 ? '+' : '') + r.discrepancy}</td>
          <td style="border: 1px solid #e2e8f0; padding: 6px 10px; text-align: center;">
            <span style="display: inline-block; padding: 2px 6px; font-size: 0.7rem; font-weight: 600; border-radius: 9999px; ${r.is_match ? 'background-color: #d1fae5; color: #065f46;' : 'background-color: #fee2e2; color: #991b1b;'}">${statusBadgeText}</span>
          </td>
          <td style="border: 1px solid #e2e8f0; padding: 6px 10px; text-align: center;">${(r.average_confidence * 100).toFixed(1)}%</td>
          <td style="border: 1px solid #e2e8f0; padding: 6px 10px; text-align: center;">${imgHtml}</td>
        </tr>
      `
    }).join('')

    const iframe = document.createElement('iframe')
    iframe.style.position = 'fixed'
    iframe.style.left = '-9999px'
    iframe.style.top = '0'
    iframe.style.width = '1200px'
    iframe.style.height = '1200px'
    iframe.style.border = 'none'
    document.body.appendChild(iframe)

    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document
    iframeDoc.open()
    iframeDoc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Laporan Inspeksi - ${new Date().toISOString().slice(0, 10)}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
          
          *, *:before, *:after {
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            color: #334155;
            padding: 24px;
            line-height: 1.5;
            background-color: #ffffff;
            font-size: 14px;
            margin: 0;
          }
          
          .header {
            border-bottom: 3px solid #3b82f6;
            padding-bottom: 14px;
            margin-bottom: 20px;
          }
          
          .header h1 {
            font-size: 1.6rem;
            margin: 0;
            color: #0f172a;
            font-weight: 700;
            letter-spacing: -0.025em;
          }
          
          .header p {
            margin: 4px 0 0 0;
            font-size: 0.85rem;
            color: #64748b;
          }
          
          .summary-grid {
            width: 100%;
            margin-bottom: 25px;
            overflow: hidden;
            display: block;
          }
          
          .summary-card {
            float: left;
            width: 23.5%;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 12px;
            text-align: center;
            background: #ffffff;
            margin-right: 2%;
          }
          
          .summary-card:last-child {
            margin-right: 0;
          }
          
          .summary-val {
            font-size: 1.5rem;
            font-weight: 700;
            color: #0f172a;
            display: block;
            margin-bottom: 2px;
          }
          
          .summary-val.green { color: #16a34a; }
          .summary-val.red { color: #dc2626; }
          
          .summary-lbl {
            font-size: 0.72rem;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            font-weight: 600;
            display: block;
          }
          
          table.data-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            font-size: 0.82rem;
            clear: both;
          }
          
          table.data-table th, table.data-table td {
            border: 1px solid #e2e8f0;
            padding: 6px 10px;
            text-align: left;
          }
          
          table.data-table th {
            background-color: #f8fafc;
            color: #475569;
            font-weight: 600;
            border-bottom: 2px solid #e2e8f0;
          }
          
          tr {
            page-break-inside: avoid;
          }
          
          .td-mono {
            font-family: monospace;
            font-size: 0.8rem;
            color: #4b5563;
          }
          
          .text-red {
            color: #dc2626;
            font-weight: 600;
          }
          
          .badge {
            display: inline-block;
            padding: 2px 6px;
            font-size: 0.7rem;
            font-weight: 600;
            border-radius: 9999px;
          }
          
          .badge-green {
            background-color: #d1fae5;
            color: #065f46;
          }
          
          .badge-red {
            background-color: #fee2e2;
            color: #991b1b;
          }
          
          .img-thumbnail {
            width: 60px;
            height: 45px;
            object-fit: cover;
            border-radius: 4px;
            border: 1px solid #e5e7eb;
            display: block;
          }
          
          .no-img {
            color: #9ca3af;
            font-size: 0.7rem;
          }
          
          .footer {
            text-align: center;
            font-size: 0.7rem;
            color: #9ca3af;
            margin-top: 30px;
            border-top: 1px solid #e5e7eb;
            padding-top: 12px;
            clear: both;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>LAPORAN HASIL INSPEKSI DETEKSI OBJEK (YOLO)</h1>
          <p>Sistem Pengawasan dan Deteksi Kuantitas Part Printer Epson</p>
        </div>
        
        <table style="width: 100%; border-collapse: separate; border-spacing: 0; margin-bottom: 20px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.85rem; color: #475569; font-family: 'Inter', sans-serif;">
          <tr>
            <td style="border: none; padding: 12px 18px; font-weight: 400;">Periode Laporan: <span style="font-weight: 600; color: #0f172a;">${periodStr}</span></td>
            <td style="border: none; padding: 12px 18px; font-weight: 400; text-align: right;">Tanggal Cetak: <span style="font-weight: 600; color: #0f172a;">${datePrinted}</span></td>
          </tr>
          <tr>
            <td style="border: none; padding: 12px 18px; font-weight: 400;">Filter Part: <span style="font-weight: 600; color: #0f172a;">${partFilterStr}</span></td>
            <td style="border: none; padding: 12px 18px; font-weight: 400; text-align: right;">Filter Status: <span style="font-weight: 600; color: #0f172a;">${statusFilterStr}</span></td>
          </tr>
        </table>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; border: none; background: transparent;">
          <tr>
            <td style="width: 23.5%; padding: 0; border: none; vertical-align: top;">
              <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 12px; text-align: center; background: #ffffff; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
                <span class="summary-val">${filtered.length}</span>
                <span class="summary-lbl">Total Data</span>
              </div>
            </td>
            <td style="width: 2%; border: none;"></td>
            <td style="width: 23.5%; padding: 0; border: none; vertical-align: top;">
              <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 12px; text-align: center; background: #ffffff; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
                <span class="summary-val green">${matchCount}</span>
                <span class="summary-lbl">Sesuai</span>
              </div>
            </td>
            <td style="width: 2%; border: none;"></td>
            <td style="width: 23.5%; padding: 0; border: none; vertical-align: top;">
              <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 12px; text-align: center; background: #ffffff; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
                <span class="summary-val red">${mismatchCount}</span>
                <span class="summary-lbl">Selisih</span>
              </div>
            </td>
            <td style="width: 2%; border: none;"></td>
            <td style="width: 23.5%; padding: 0; border: none; vertical-align: top;">
              <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 12px; text-align: center; background: #ffffff; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
                <span class="summary-val">${accuracy}%</span>
                <span class="summary-lbl">Akurasi Rata-rata</span>
              </div>
            </td>
          </tr>
        </table>
        
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 50px; text-align: center;">No.</th>
              <th style="width: 120px; text-align: center;">ID Inspeksi</th>
              <th style="width: 160px; text-align: center;">Waktu</th>
              <th>Nama Part</th>
              <th style="width: 85px; text-align: center;">Expected</th>
              <th style="width: 85px; text-align: center;">Detected</th>
              <th style="width: 75px; text-align: center;">Selisih</th>
              <th style="width: 90px; text-align: center;">Status</th>
              <th style="width: 100px; text-align: center;">Confidence</th>
              <th style="width: 110px; text-align: center;">Foto Hasil</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml ? tableRowsHtml : '<tr><td colspan="10" style="text-align: center; color: #9ca3af; border: 1px solid #e5e7eb; padding: 15px;">Tidak ada data ditemukan</td></tr>'}
          </tbody>
        </table>
        
        <div class="footer">
          <p>Laporan ini dihasilkan secara otomatis oleh Sistem Deteksi Objek Capstone Epson.</p>
        </div>
      </body>
      </html>
    `)
    iframeDoc.close()

    const images = Array.from(iframeDoc.querySelectorAll('img.pdf-thumbnail'))
    
    const onAllLoaded = () => {
      setTimeout(() => {
        import('html2pdf.js').then((html2pdfModule) => {
          const html2pdf = html2pdfModule.default
          const opt = {
            margin: 10,
            filename: `laporan_inspeksi_${new Date().toISOString().slice(0, 10)}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, logging: false },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
            pagebreak: { mode: ['css', 'legacy'] }
          }
          
          html2pdf().set(opt).from(iframeDoc.body).output('blob').then((pdfBlob) => {
            const fileURL = URL.createObjectURL(pdfBlob)
            pdfWindow.location.href = fileURL
            document.body.removeChild(iframe)
          }).catch((err) => {
            console.error("Gagal menyimpan PDF:", err)
            pdfWindow.close()
            document.body.removeChild(iframe)
          })
        }).catch((err) => {
          console.error("Gagal mengimpor html2pdf.js:", err)
          pdfWindow.close()
          document.body.removeChild(iframe)
        })
      }, 300)
    }

    if (images.length === 0) {
      onAllLoaded()
    } else {
      let loadedCount = 0
      images.forEach(img => {
        if (img.complete) {
          loadedCount++
          if (loadedCount === images.length) onAllLoaded()
        } else {
          img.onload = () => {
            loadedCount++
            if (loadedCount === images.length) onAllLoaded()
          }
          img.onerror = () => {
            loadedCount++
            if (loadedCount === images.length) onAllLoaded()
          }
        }
      })
    }
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
          <button className="export-btn" onClick={exportPDF}>
            <div className="export-icon export-icon--pdf">PDF</div>
            <div className="export-info">
              <span className="export-name">Export PDF</span>
              <span className="export-desc">Cetak laporan atau simpan sebagai dokumen PDF</span>
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
