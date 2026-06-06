import { useState, useEffect } from 'react'
import { Eye, CheckCircle, TrendingDown, AlertTriangle } from 'lucide-react'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts'
import './Dashboard.css'

const API_BASE = ""

function KpiCard({ label, value, icon: Icon, trend, color }) {
  return (
    <div className="kpi-card">
      <div className="kpi-top">
        <span className="kpi-label">{label}</span>
        <div className={`kpi-icon kpi-icon--${color}`}>
          <Icon size={16} />
        </div>
      </div>
      <div className="kpi-value">{value}</div>
      <p className="kpi-trend">{trend}</p>
    </div>
  )
}

function StatusBadge({ status }) {
  const map = {
    match: { label: 'Sesuai', cls: 'badge--green' },
    mismatch: { label: 'Selisih', cls: 'badge--red' },
  }
  const s = map[status] || map.match
  return <span className={`badge ${s.cls}`}>{s.label}</span>
}

export default function Dashboard() {
  const [kpi, setKpi] = useState({ total_inspections: 0, accuracy: 0, mae: 0, discrepancies: 0 })
  const [recentInspections, setRecentInspections] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch KPI Stats
        const kpiRes = await fetch(`${API_BASE}/api/dashboard/stats`)
        const kpiData = await kpiRes.json()
        setKpi(kpiData)

        // Fetch Recent Inspections (limit 7)
        const inspRes = await fetch(`${API_BASE}/api/inspections/?limit=7`)
        const inspData = await inspRes.json()
        setRecentInspections(inspData)
        
        setLoading(false)
      } catch (error) {
        console.error("Gagal mengambil data dari API:", error)
        setLoading(false)
      }
    }

    fetchDashboardData()
    // Auto refresh tiap 5 detik
    const interval = setInterval(fetchDashboardData, 5000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return <div style={{ padding: '2rem' }}>Memuat data dari server...</div>
  }

  // Data untuk Pie Chart
  const matches = kpi.total_inspections - kpi.discrepancies
  const resultDistribution = [
    { name: 'Sesuai', value: matches, color: '#10b981' },
    { name: 'Tidak Sesuai', value: kpi.discrepancies, color: '#ef4444' }
  ]

  return (
    <div className="dashboard">
      {/* KPI Row */}
      <section className="kpi-row">
        <KpiCard 
          label="Total Inspeksi" 
          value={kpi.total_inspections.toLocaleString()} 
          icon={Eye} 
          trend="Total part terdeteksi" 
          color="blue" 
        />
        <KpiCard 
          label="Akurasi Deteksi" 
          value={`${kpi.accuracy}%`} 
          icon={CheckCircle} 
          trend="Berdasarkan selisih kuantitas" 
          color="green" 
        />
        <KpiCard 
          label="MAE" 
          value={kpi.mae} 
          icon={TrendingDown} 
          trend="Rata-rata error (Mean Absolute Error)" 
          color="gray" 
        />
        <KpiCard 
          label="Discrepancy" 
          value={kpi.discrepancies} 
          icon={AlertTriangle} 
          trend={`${kpi.total_inspections > 0 ? ((kpi.discrepancies / kpi.total_inspections) * 100).toFixed(1) : 0}% dari total`} 
          color="red" 
        />
      </section>

      {/* Charts */}
      <section className="charts-row">
        <div className="card chart-card">
          <h3 className="card-title">Distribusi Hasil Inspeksi</h3>
          <div className="chart-wrap chart-wrap--pie">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={resultDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  dataKey="value"
                  stroke="none"
                >
                  {resultDistribution.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pie-legend">
              {resultDistribution.map((item) => (
                <div key={item.name} className="pie-legend-item">
                  <span className="pie-dot" style={{ background: item.color }} />
                  <span>{item.name}</span>
                  <span className="pie-val">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Table */}
      <section className="bottom-row">
        <div className="card table-card" style={{ width: '100%' }}>
          <div className="card-header">
            <h3 className="card-title">Inspeksi Terbaru</h3>
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
                  <th>Status</th>
                  <th>Confidence</th>
                </tr>
              </thead>
              <tbody>
                {recentInspections.map((row, index) => (
                  <tr key={row.id}>
                    <td style={{ color: '#6b7280' }}>{index + 1}</td>
                    <td className="td-mono">{row.inspection_id}</td>
                    <td>{new Date(row.created_at).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' })}</td>
                    <td>{row.part_name}</td>
                    <td>{row.expected_qty}</td>
                    <td>{row.detected_qty}</td>
                    <td><StatusBadge status={row.is_match ? 'match' : 'mismatch'} /></td>
                    <td>{(row.average_confidence * 100).toFixed(1)}%</td>
                  </tr>
                ))}
                {recentInspections.length === 0 && (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>Belum ada data inspeksi</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  )
}
