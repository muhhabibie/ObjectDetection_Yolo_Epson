// Mock data for the dashboard — replace with API calls later

export const kpiData = {
  totalInspections: 1247,
  accuracy: 94.2,
  mae: 0.03,
  discrepancies: 23,
}

export const accuracyTrend = [
  { date: '1 Apr', accuracy: 89.2, inspections: 38 },
  { date: '4 Apr', accuracy: 90.5, inspections: 42 },
  { date: '7 Apr', accuracy: 91.0, inspections: 36 },
  { date: '10 Apr', accuracy: 90.8, inspections: 45 },
  { date: '13 Apr', accuracy: 92.3, inspections: 41 },
  { date: '16 Apr', accuracy: 91.7, inspections: 39 },
  { date: '19 Apr', accuracy: 93.1, inspections: 50 },
  { date: '22 Apr', accuracy: 92.8, inspections: 44 },
  { date: '25 Apr', accuracy: 94.0, inspections: 47 },
  { date: '28 Apr', accuracy: 93.5, inspections: 43 },
  { date: '1 Mei', accuracy: 94.2, inspections: 52 },
  { date: '4 Mei', accuracy: 94.8, inspections: 48 },
]

export const resultDistribution = [
  { name: 'Sesuai', value: 1180, color: '#22c55e' },
  { name: 'Kurang', value: 44, color: '#ef4444' },
  { name: 'Lebih', value: 23, color: '#f59e0b' },
]

export const recentInspections = [
  { id: 'INS-1247', time: '14:32', part: 'Spur Gear', expected: 10, detected: 10, confidence: 96.1, status: 'match' },
  { id: 'INS-1246', time: '14:18', part: 'Roller Assy', expected: 8, detected: 8, confidence: 93.4, status: 'match' },
  { id: 'INS-1245', time: '13:55', part: 'Spur Gear', expected: 10, detected: 9, confidence: 88.7, status: 'mismatch' },
  { id: 'INS-1244', time: '13:40', part: 'Spring Clip', expected: 15, detected: 15, confidence: 95.2, status: 'match' },
  { id: 'INS-1243', time: '13:22', part: 'Bushing', expected: 12, detected: 12, confidence: 91.8, status: 'match' },
  { id: 'INS-1242', time: '13:05', part: 'Spur Gear', expected: 10, detected: 11, confidence: 87.3, status: 'mismatch' },
  { id: 'INS-1241', time: '12:48', part: 'Roller Assy', expected: 8, detected: 8, confidence: 94.6, status: 'match' },
  { id: 'INS-1240', time: '12:30', part: 'Spur Gear', expected: 10, detected: 10, confidence: 92.9, status: 'match' },
  { id: 'INS-1239', time: '12:15', part: 'Spring Clip', expected: 15, detected: 14, confidence: 85.1, status: 'mismatch' },
  { id: 'INS-1238', time: '11:58', part: 'Bushing', expected: 12, detected: 12, confidence: 93.7, status: 'match' },
]

export const alerts = [
  { id: 1, title: 'Selisih terdeteksi — INS-1245', desc: 'Spur Gear: expected 10, detected 9', time: '13:55', level: 'warning' },
  { id: 2, title: 'Selisih terdeteksi — INS-1242', desc: 'Spur Gear: expected 10, detected 11', time: '13:05', level: 'warning' },
  { id: 3, title: 'Confidence rendah — INS-1239', desc: 'Spring Clip: confidence 85.1% (di bawah threshold)', time: '12:15', level: 'critical' },
]
