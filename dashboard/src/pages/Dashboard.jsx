import { Eye, CheckCircle, TrendingDown, AlertTriangle } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { kpiData, accuracyTrend, resultDistribution, recentInspections, alerts } from '../data/mockData'
import './Dashboard.css'

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
  return (
    <div className="dashboard">
      {/* KPI Row */}
      <section className="kpi-row">
        <KpiCard label="Total Inspeksi" value={kpiData.totalInspections.toLocaleString()} icon={Eye} trend="+12.5% dari bulan lalu" color="blue" />
        <KpiCard label="Akurasi Deteksi" value={`${kpiData.accuracy}%`} icon={CheckCircle} trend="Target ≥ 90% ✓" color="green" />
        <KpiCard label="MAE" value={kpiData.mae} icon={TrendingDown} trend="Target ≤ 0.05 ✓" color="gray" />
        <KpiCard label="Discrepancy" value={kpiData.discrepancies} icon={AlertTriangle} trend={`${((kpiData.discrepancies / kpiData.totalInspections) * 100).toFixed(1)}% dari total`} color="red" />
      </section>

      {/* Charts */}
      <section className="charts-row">
        <div className="card chart-card chart-card--wide">
          <h3 className="card-title">Tren Akurasi</h3>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={accuracyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis domain={[85, 100]} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
                  formatter={(val) => [`${val}%`, 'Akurasi']}
                />
                <Line type="monotone" dataKey="accuracy" stroke="#111827" strokeWidth={2} dot={{ r: 3, fill: '#111827' }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card chart-card">
          <h3 className="card-title">Distribusi Hasil</h3>
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
                <Tooltip
                  contentStyle={{ border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12 }}
                />
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

      {/* Table + Alerts */}
      <section className="bottom-row">
        <div className="card table-card">
          <div className="card-header">
            <h3 className="card-title">Inspeksi Terbaru</h3>
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
                  <th>Status</th>
                  <th>Confidence</th>
                </tr>
              </thead>
              <tbody>
                {recentInspections.map((row) => (
                  <tr key={row.id}>
                    <td className="td-mono">{row.id}</td>
                    <td>{row.time}</td>
                    <td>{row.part}</td>
                    <td>{row.expected}</td>
                    <td>{row.detected}</td>
                    <td><StatusBadge status={row.status} /></td>
                    <td>{row.confidence}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card alerts-card">
          <div className="card-header">
            <h3 className="card-title">Notifikasi</h3>
            <span className="alert-count">{alerts.length}</span>
          </div>
          <div className="alerts-list">
            {alerts.map((a) => (
              <div key={a.id} className={`alert-item alert-item--${a.level}`}>
                <div className="alert-body">
                  <p className="alert-title">{a.title}</p>
                  <p className="alert-desc">{a.desc}</p>
                </div>
                <span className="alert-time">{a.time}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
