import { useState, useEffect, useRef, useCallback } from 'react'
import { Camera, Zap, ZapOff, Settings, CheckCircle, AlertCircle, Loader, Wifi, Usb, Smartphone, Upload, Trash2, FolderOpen } from 'lucide-react'
import './Capture.css'

const API_BASE = ""

// Status label & warna berdasarkan state
const STATUS = {
  idle:       { label: 'Kamera siap',          color: 'gray',   icon: Camera },
  scanning:   { label: 'Memindai...',           color: 'blue',   icon: Loader },
  detected:   { label: 'Gear terdeteksi!',      color: 'green',  icon: CheckCircle },
  processing: { label: 'Memproses AI...',       color: 'purple', icon: Loader },
  cooldown:   { label: 'Cooldown...',           color: 'orange', icon: Zap },
  error:      { label: 'Gagal memproses',       color: 'red',    icon: AlertCircle },
  no_gear:    { label: 'Tidak ada gear',        color: 'gray',   icon: Camera },
}

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

export default function Capture() {
  const videoRef    = useRef(null)
  const canvasRef   = useRef(null)
  const streamRef   = useRef(null)
  const scanTimerRef = useRef(null)
  const cooldownRef  = useRef(null)

  const [cameraOn,    setCameraOn]    = useState(false)
  const [autoMode,    setAutoMode]    = useState(false)
  const [status,      setStatus]      = useState('idle')
  const [scanResult,  setScanResult]  = useState(null)   // hasil scan-frame
  const [lastResult,  setLastResult]  = useState(null)   // hasil inspeksi terakhir
  const [cooldownSec, setCooldownSec] = useState(0)
  const [showSettings,setShowSettings]= useState(false)
  const [zoomedImage, setZoomedImage] = useState(null)

  // ── Mobile / Desktop Detection ──────────────────────────
  const [isMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    const userAgent = navigator.userAgent || navigator.vendor || window.opera || '';
    const isMobileUA = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
    const isMobileWidth = window.innerWidth <= 1024;
    return isMobileUA || isMobileWidth;
  })
  const [forceDesktopLocal, setForceDesktopLocal] = useState(false)

  // ── Upload Mode States ──────────────────────────────────
  const [activeTab,   setActiveTab]   = useState('camera') // 'camera' | 'upload'
  const [uploadedFile,setUploadedFile]= useState(null)
  const [uploadPreview,setUploadPreview] = useState(null)
  const [dragActive,  setDragActive]  = useState(false)

  // ── Polling data hasil inspeksi terakhir (Khusus Desktop)
  useEffect(() => {
    if (isMobile || forceDesktopLocal) return;

    const fetchLastInspection = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/inspections/?limit=1`)
        if (res.ok) {
          const data = await res.json()
          if (data && data.length > 0) {
            setLastResult(data[0])
          }
        }
      } catch (err) {
        console.error("Gagal polling hasil inspeksi:", err)
      }
    }

    // Ambil pertama kali
    fetchLastInspection()
    const interval = setInterval(fetchLastInspection, 2000)
    return () => clearInterval(interval)
  }, [isMobile, forceDesktopLocal])

  // ── Settings ──────────────────────────────────────────
  const [partName,     setPartName]     = useState('Gear Roller')
  const [expectedQty,  setExpectedQty]  = useState(12)
  const [scanInterval, setScanInterval] = useState(1500)  // ms
  const [minConf,      setMinConf]      = useState(75)    // %
  const [cooldownTime, setCooldownTime] = useState(5)     // detik

  // ── Auto Mode Timer ──────────────────────────────────
  const clearScanTimer = useCallback(() => {
    if (scanTimerRef.current) clearInterval(scanTimerRef.current)
    if (cooldownRef.current)  clearInterval(cooldownRef.current)
  }, [])

  // ── Cooldown Timer ───────────────────────────────────
  const startCooldown = useCallback(() => {
    let remaining = cooldownTime
    setCooldownSec(remaining)
    cooldownRef.current = setInterval(() => {
      remaining -= 1
      setCooldownSec(remaining)
      if (remaining <= 0) {
        clearInterval(cooldownRef.current)
        setStatus('idle')
        setCooldownSec(0)
      }
    }, 1000)
  }, [cooldownTime])

  // ── Nyalakan Kamera ──────────────────────────────────
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
      setCameraOn(true)
      setStatus('idle')
    } catch (err) {
      alert('Tidak bisa akses kamera: ' + err.message)
    }
  }

  // ── Matikan Kamera ───────────────────────────────────
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    setCameraOn(false)
    setAutoMode(false)
    setStatus('idle')
    clearScanTimer()
  }, [clearScanTimer])

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    if (tab === 'upload') {
      stopCamera()
    }
  }

  // ── Ambil Frame dari Video → Blob ────────────────────
  const captureFrame = useCallback((quality = 0.7) => {
    const video  = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return null
    
    const w_vp = video.clientWidth
    const h_vp = video.clientHeight
    const w_vid = video.videoWidth
    const h_vid = video.videoHeight

    if (w_vp > 0 && h_vp > 0 && w_vid > 0 && h_vid > 0) {
      const scale = Math.max(w_vp / w_vid, h_vp / h_vid)
      const w_scaled = w_vid * scale
      const h_scaled = h_vid * scale

      const dx = (w_vp - w_scaled) / 2
      const dy = (h_vp - h_scaled) / 2

      // Bingkai di CSS diset inset: 20% (x1_vp = 20%, y1_vp = 20%, lebar/tinggi = 60%)
      const x1_vp = w_vp * 0.20
      const y1_vp = h_vp * 0.20
      const width_vp = w_vp * 0.60
      const height_vp = h_vp * 0.60

      let x_crop = (x1_vp - dx) / scale
      let y_crop = (y1_vp - dy) / scale
      let w_crop = width_vp / scale
      let h_crop = height_vp / scale

      // Validasi batas koordinat
      if (x_crop < 0) {
        w_crop += x_crop
        x_crop = 0
      }
      if (y_crop < 0) {
        h_crop += y_crop
        y_crop = 0
      }
      if (x_crop + w_crop > w_vid) {
        w_crop = w_vid - x_crop
      }
      if (y_crop + h_crop > h_vid) {
        h_crop = h_vid - y_crop
      }

      canvas.width  = w_crop
      canvas.height = h_crop
      canvas.getContext('2d').drawImage(video, x_crop, y_crop, w_crop, h_crop, 0, 0, w_crop, h_crop)
    } else {
      // Fallback ke full frame jika dimensi client belum siap
      canvas.width  = w_vid
      canvas.height = h_vid
      canvas.getContext('2d').drawImage(video, 0, 0)
    }
    
    return new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality))
  }, [])

  // ── Proses Capture Penuh → Kirim ke AI & DB ──────────
  const processFullCapture = useCallback(async () => {
    setStatus('processing')
    const blob = await captureFrame(0.95)  // kualitas tinggi untuk simpan
    if (!blob) return

    const form = new FormData()
    form.append('file', blob, 'capture.jpg')
    form.append('part_name',    partName || 'Gear Roller')
    form.append('expected_qty', Number(expectedQty) || 12)

    try {
      const res  = await fetch(`${API_BASE}/api/upload-camera/`, { method: 'POST', body: form })
      const data = await res.json()
      setLastResult(data)
      setStatus('cooldown')
      startCooldown()
    } catch {
      setStatus('error')
    }
  }, [captureFrame, partName, expectedQty, startCooldown])

  // ── Scan Frame (cek apakah ada gear) ─────────────────
  const scanFrame = useCallback(async () => {
    if (!videoRef.current || !cameraOn) return
    setStatus('scanning')

    const blob = await captureFrame(0.6)
    if (!blob) return

    const form = new FormData()
    form.append('file', blob, 'frame.jpg')

    try {
      const res  = await fetch(`${API_BASE}/api/scan-frame/`, { method: 'POST', body: form })
      const data = await res.json()
      setScanResult(data)

      if (data.detected && data.confidence >= minConf) {
        setStatus('detected')
        // Trigger capture otomatis!
        await processFullCapture()
      } else {
        setStatus(data.detected ? 'no_gear' : 'no_gear')
      }
    } catch {
      setStatus('error')
    }
  }, [cameraOn, minConf, captureFrame, processFullCapture])

  // ── Drag & Drop / File Upload Handlers ──────────────
  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      if (file.type.startsWith('image/')) {
        setUploadedFile(file)
        setUploadPreview(URL.createObjectURL(file))
        setStatus('idle')
      } else {
        alert('File harus berupa gambar!')
      }
    }
  }

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (file.type.startsWith('image/')) {
        setUploadedFile(file)
        setUploadPreview(URL.createObjectURL(file))
        setStatus('idle')
      } else {
        alert('File harus berupa gambar!')
      }
    }
  }

  const clearUploadedFile = () => {
    setUploadedFile(null)
    if (uploadPreview) {
      URL.revokeObjectURL(uploadPreview)
      setUploadPreview(null)
    }
    setStatus('idle')
  }

  const processUploadedFile = useCallback(async () => {
    if (!uploadedFile) return
    setStatus('processing')

    const form = new FormData()
    form.append('file', uploadedFile)
    form.append('part_name', partName || 'Gear Roller')
    form.append('expected_qty', Number(expectedQty) || 12)

    try {
      const res = await fetch(`${API_BASE}/api/upload-camera/`, { method: 'POST', body: form })
      if (!res.ok) throw new Error('Gagal memproses gambar')
      const data = await res.json()
      setLastResult(data)
      setStatus('cooldown')
      startCooldown()
    } catch {
      setStatus('error')
    }
  }, [uploadedFile, partName, expectedQty, startCooldown])

  useEffect(() => {
    clearScanTimer()
    if (autoMode && cameraOn) {
      scanTimerRef.current = setInterval(() => {
        if (status !== 'processing' && status !== 'cooldown') {
          scanFrame()
        }
      }, Number(scanInterval) || 1500)
    }
    return clearScanTimer
  }, [autoMode, cameraOn, scanInterval, status, scanFrame, clearScanTimer])

  // ── Cleanup saat unmount ─────────────────────────────
  useEffect(() => {
    return () => {
      stopCamera()
      clearScanTimer()
    }
  }, [stopCamera, clearScanTimer])

  // Cleanup object URL preview ketika uploadPreview berubah atau unmount
  useEffect(() => {
    return () => {
      if (uploadPreview) {
        URL.revokeObjectURL(uploadPreview)
      }
    }
  }, [uploadPreview])

  // Sinkronisasi parameter ke backend setiap ada perubahan (dengan debounce 500ms)
  useEffect(() => {
    const syncSettings = async () => {
      try {
        await fetch(`${ACTIVE_SETTINGS_API || (API_BASE + '/api/active-settings')}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ part_name: partName, expected_qty: expectedQty })
        })
      } catch (err) {
        console.error("Gagal sinkronisasi parameter ke backend:", err)
      }
    }
    // define active settings fallback inline
    const ACTIVE_SETTINGS_API = `${API_BASE}/api/active-settings`
    const timer = setTimeout(syncSettings, 500)
    return () => clearTimeout(timer)
  }, [partName, expectedQty])

  // Ambil parameter aktif dari backend saat pertama kali dimuat
  useEffect(() => {
    const fetchActiveSettings = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/active-settings`)
        if (res.ok) {
          const data = await res.json()
          if (data.part_name) setPartName(data.part_name)
          if (data.expected_qty) setExpectedQty(data.expected_qty)
        }
      } catch (err) {
        console.error("Gagal mengambil active settings:", err)
      }
    }
    fetchActiveSettings()
  }, [])

  const s = STATUS[status] || STATUS.idle

  const [interfaces, setInterfaces] = useState([])

  useEffect(() => {
    const fetchLocalIPs = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/network-ips`)
        if (res.ok) {
          const data = await res.json()
          if (data.interfaces && Array.isArray(data.interfaces)) {
            setInterfaces(data.interfaces)
          } else if (data.ips && Array.isArray(data.ips)) {
            setInterfaces(data.ips.map(ip => ({ ip, name: '', description: '' })))
          }
        }
      } catch (err) {
        console.error("Gagal mengambil IP lokal:", err)
      }
    }
    fetchLocalIPs()
    const interval = setInterval(fetchLocalIPs, 3000)
    return () => clearInterval(interval)
  }, [])

  const getRealWifiIP = (ifaces) => {
    // 1. Cari adapter Wi-Fi eksplisit
    const wifi = ifaces.find(iface => 
      iface.name.toLowerCase().includes('wi-fi') || 
      iface.name.toLowerCase().includes('wifi') || 
      iface.description.toLowerCase().includes('wireless') ||
      iface.description.toLowerCase().includes('wi-fi')
    )
    if (wifi) return wifi.ip

    // 2. Saring loopback, VirtualBox, WSL, dan USB tethering
    const candidates = ifaces.filter(iface => {
      const ip = iface.ip
      const name = iface.name.toLowerCase()
      const desc = iface.description.toLowerCase()
      
      if (ip === '127.0.0.1' || ip === 'localhost') return false
      if (ip.startsWith('192.168.56.') || desc.includes('virtualbox')) return false
      if (ip.startsWith('192.168.99.') || desc.includes('docker')) return false
      if (ip.startsWith('192.168.42.') || desc.includes('ndis') || desc.includes('sharing')) return false
      if (ip.startsWith('172.20.10.') || desc.includes('apple mobile')) return false
      if (ip.startsWith('172.17.') || ip.startsWith('172.18.') || ip.startsWith('172.19.')) return false
      if (name.includes('wsl') || desc.includes('hyper-v')) return false
      return true
    })
    return candidates[0]?.ip || window.location.hostname
  }

  const getUsbIP = (ifaces) => {
    const usb = ifaces.find(iface => {
      const ip = iface.ip
      const desc = iface.description.toLowerCase()
      const name = iface.name.toLowerCase()
      
      return (
        ip.startsWith('192.168.42.') || 
        ip.startsWith('172.20.10.') || 
        desc.includes('ndis') || 
        desc.includes('internet sharing') || 
        desc.includes('apple mobile') ||
        name.includes('remote ndis')
      )
    })
    return usb ? usb.ip : null
  }

  const realWifiIP = getRealWifiIP(interfaces)
  const usbIP = getUsbIP(interfaces)

  const portStr = window.location.port ? `:${window.location.port}` : ''
  const wifiURL = `${window.location.protocol}//${realWifiIP}${portStr}/capture`
  const usbURL = usbIP ? `${window.location.protocol}//${usbIP}${portStr}/capture` : ''

  return (
    <div className="capture-page">
      <div className="capture-layout">

        {/* ── Panel Utama (Kiri) ────────────────────────── */}
        <div className="capture-left-col">
          <div className="capture-modes-tabs">
            <button
              className={`tab-btn ${activeTab === 'camera' ? 'active' : ''}`}
              onClick={() => handleTabChange('camera')}
            >
              <Camera size={16} /> Mode Kamera
            </button>
            <button
              className={`tab-btn ${activeTab === 'upload' ? 'active' : ''}`}
              onClick={() => handleTabChange('upload')}
            >
              <Upload size={16} /> Unggah Foto
            </button>
            <button
              className={`tab-btn ${activeTab === 'watcher' ? 'active' : ''}`}
              onClick={() => handleTabChange('watcher')}
            >
              <FolderOpen size={16} /> Folder Watcher
            </button>
          </div>

          {activeTab === 'camera' ? (
            (!isMobile && !forceDesktopLocal) ? (
              <div className="desktop-guide-panel">
                <div className="guide-header">
                  <Smartphone className="guide-phone-icon" size={32} />
                  <div>
                    <h2 className="guide-title">Gunakan HP Sebagai Kamera Pemotretan</h2>
                    <p className="guide-subtitle">Hubungkan kamera HP Anda untuk melakukan pemindaian AI secara dinamis.</p>
                  </div>
                </div>

                <div className="guide-steps-grid">
                  {/* Opsi 1: WiFi */}
                  <div className="guide-step-card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <div className="guide-badge-row">
                      <span className="guide-step-num">Opsi 1</span>
                      <Wifi size={18} className="guide-step-icon" />
                    </div>
                    <h4 className="guide-step-title">Koneksi Via Wi-Fi (Nirkabel)</h4>
                    <ol className="guide-step-list" style={{ flexGrow: 1 }}>
                      <li>Sambungkan HP Anda ke Wi-Fi yang sama dengan Laptop ini.</li>
                      <li>Pindai <b>QR Code</b> di bawah ini menggunakan kamera HP Anda:</li>
                    </ol>
                    <div className="guide-url-box" style={{ fontSize: '0.78rem', wordBreak: 'break-all', margin: '8px 0' }}>
                      {wifiURL}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '10px' }}>
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${encodeURIComponent(wifiURL)}`}
                        alt="QR Code Wi-Fi"
                        style={{ border: '4px solid #fff', borderRadius: '6px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', width: '130px', height: '130px' }}
                      />
                      <span style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px', fontWeight: '500' }}>Pindai untuk membuka (Wi-Fi)</span>
                    </div>
                  </div>

                  {/* Opsi 2: Kabel USB */}
                  <div className="guide-step-card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <div className="guide-badge-row">
                      <span className="guide-step-num">Opsi 2</span>
                      <Usb size={18} className="guide-step-icon" />
                    </div>
                    <h4 className="guide-step-title">Koneksi Via Kabel USB</h4>
                    
                    {usbIP ? (
                      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
                        <ol className="guide-step-list" style={{ flexGrow: 1 }}>
                          <li style={{ color: '#16a34a', fontWeight: '600' }}>✓ Sambungan USB Terdeteksi!</li>
                          <li>Pindai <b>QR Code USB</b> di bawah ini untuk membuka kamera:</li>
                        </ol>
                        <div className="guide-url-box" style={{ fontSize: '0.78rem', wordBreak: 'break-all', margin: '8px 0', borderLeftColor: '#10b981' }}>
                          {usbURL}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '10px' }}>
                          <img 
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${encodeURIComponent(usbURL)}`}
                            alt="QR Code USB"
                            style={{ border: '4px solid #fff', borderRadius: '6px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', width: '130px', height: '130px' }}
                          />
                          <span style={{ fontSize: '0.7rem', color: '#16a34a', marginTop: '4px', fontWeight: '600' }}>Pindai untuk membuka (Kabel USB)</span>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', flexGrow: 1, padding: '10px 0', textAlign: 'center', width: '100%' }}>
                        <ol className="guide-step-list" style={{ textAlign: 'left', width: '100%', marginBottom: '12px' }}>
                          <li>Hubungkan HP ke Laptop dengan kabel USB.</li>
                          <li>Buka Pengaturan HP → Aktifkan <b>USB Tethering (Penambatan USB)</b>.</li>
                        </ol>
                        <div style={{ padding: '16px', background: '#f8fafc', border: '1px dashed #e2e8f0', borderRadius: '8px', width: '100%' }}>
                          <Loader className="guide-step-icon" size={20} style={{ animation: 'spin 2s linear infinite', color: '#64748b', margin: '0 auto 8px' }} />
                          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '500' }}>Menunggu kabel USB terhubung & tethering aktif...</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="guide-footer-info">
                  <div className="live-status-container">
                    <div className="live-status-dot" />
                    <span className="live-status-text">Menunggu pemotretan dari HP... (Layar PC terintegrasi real-time)</span>
                  </div>
                  <button className="btn-force-local" onClick={() => setForceDesktopLocal(true)}>
                    Buka Kamera Lokal Webcam PC
                  </button>
                </div>
              </div>
            ) : (
              <div className="camera-panel">
                <div className={`camera-viewport ${status === 'detected' ? 'viewport--detected' : ''} ${status === 'processing' ? 'viewport--processing' : ''}`}>
                  <video ref={videoRef} autoPlay playsInline muted className="camera-video" />
                  <canvas ref={canvasRef} style={{ display: 'none' }} />

                  {/* Overlay status */}
                  <div className={`cam-overlay cam-overlay--${s.color}`}>
                    <div className="cam-status-dot" />
                    <span>{s.label}</span>
                    {status === 'cooldown' && <span className="cam-cooldown">{cooldownSec}s</span>}
                  </div>

                  {/* Scan result badge */}
                  {scanResult && status !== 'idle' && (
                    <div className="cam-badge">
                      <span>Gear: {scanResult.count}</span>
                      <span className="badge-sep">|</span>
                      <span>Conf: {scanResult.confidence}%</span>
                    </div>
                  )}

                  {/* Frame guide */}
                  <div className="cam-frame-guide">
                    <div className="frame-corner frame-corner--tl" />
                    <div className="frame-corner frame-corner--tr" />
                    <div className="frame-corner frame-corner--bl" />
                    <div className="frame-corner frame-corner--br" />
                  </div>

                  {!cameraOn && (
                    <div className="cam-off-screen">
                      <Camera size={48} strokeWidth={1} />
                      <p>Kamera belum aktif</p>
                    </div>
                  )}
                </div>

                {/* Tombol kamera */}
                <div className="cam-controls">
                  {!cameraOn ? (
                    <button className="btn-cam btn-cam--start" onClick={startCamera}>
                      <Camera size={18} /> Aktifkan Kamera HP
                    </button>
                  ) : (
                    <>
                      <button
                        className={`btn-cam ${autoMode ? 'btn-cam--stop-auto' : 'btn-cam--auto'}`}
                        onClick={() => setAutoMode(!autoMode)}
                      >
                        {autoMode ? <><ZapOff size={18}/> Stop Auto</> : <><Zap size={18}/> Auto Capture</>}
                      </button>
                      <button
                        className="btn-cam btn-cam--manual"
                        onClick={processFullCapture}
                        disabled={status === 'processing' || status === 'cooldown'}
                      >
                        <Camera size={18} /> Foto Manual
                      </button>
                      <button className="btn-cam btn-cam--off" onClick={stopCamera}>
                        Matikan
                      </button>
                    </>
                  )}
                  {forceDesktopLocal && (
                    <button className="btn-cam btn-cam--off" style={{ flex: 'none', width: 'auto' }} onClick={() => setForceDesktopLocal(false)}>
                      Kembali ke Panduan HP
                    </button>
                  )}
                </div>
              </div>
            )
          ) : activeTab === 'upload' ? (
            <div className="upload-panel">
              <div
                className={`camera-viewport ${status === 'processing' ? 'viewport--processing' : ''} ${status === 'detected' ? 'viewport--detected' : ''} ${dragActive ? 'viewport--drag' : ''}`}
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
              >
                {uploadPreview ? (
                  <img src={uploadPreview} alt="Preview" className="camera-video upload-preview-img" style={{ objectFit: 'contain' }} />
                ) : (
                  <label htmlFor="file-upload-input" className="upload-drop-zone">
                    <Upload size={48} strokeWidth={1} className="upload-icon" />
                    <p className="upload-text-main">Tarik & lepas gambar di sini atau <span>klik untuk memilih</span></p>
                    <p className="upload-text-sub">Mendukung format JPEG, JPG, PNG</p>
                  </label>
                )}

                <input
                  id="file-upload-input"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />

                {/* Overlay status */}
                <div className={`cam-overlay cam-overlay--${s.color}`}>
                  <div className="cam-status-dot" />
                  <span>{s.label}</span>
                  {status === 'cooldown' && <span className="cam-cooldown">{cooldownSec}s</span>}
                </div>

                {/* Frame guide corners */}
                {!uploadPreview && (
                  <div className="cam-frame-guide">
                    <div className="frame-corner frame-corner--tl" />
                    <div className="frame-corner frame-corner--tr" />
                    <div className="frame-corner frame-corner--bl" />
                    <div className="frame-corner frame-corner--br" />
                  </div>
                )}
              </div>

              {/* Tombol kontrol upload */}
              <div className="cam-controls">
                {uploadPreview ? (
                  <>
                    <button
                      className="btn-cam btn-cam--manual"
                      onClick={processUploadedFile}
                      disabled={status === 'processing' || status === 'cooldown'}
                    >
                      <CheckCircle size={18} /> Analisis Foto
                    </button>
                    <button
                      className="btn-cam btn-cam--off"
                      onClick={clearUploadedFile}
                      disabled={status === 'processing'}
                    >
                      <Trash2 size={18} /> Hapus / Ganti
                    </button>
                  </>
                ) : (
                  <label htmlFor="file-upload-input" className="btn-cam btn-cam--start" style={{ cursor: 'pointer', textAlign: 'center' }}>
                    <Upload size={18} /> Pilih File Gambar
                  </label>
                )}
              </div>
            </div>
          ) : (
            <div className="watcher-panel">
              <div className="watcher-card">
                <div className="watcher-icon-wrap">
                  <FolderOpen size={48} className="watcher-large-icon" />
                </div>
                <h3 className="watcher-title">Folder Watcher Aktif</h3>
                <p className="watcher-desc">
                  Ambil foto menggunakan kamera bawaan HP Anda dan sinkronisasikan ke folder lokal PC untuk memproses AI secara otomatis tanpa perlu membuka dashboard di HP.
                </p>

                <div className="watcher-path-box">
                  <span className="path-label">Folder Pemantauan:</span>
                  <div className="path-value">capstone/watch_folder</div>
                  <span className="path-hint">Silakan letakkan atau sinkronisasikan foto (.jpg, .png) di sini</span>
                </div>

                <div className="watcher-steps">
                  <h4>Langkah Penyiapan:</h4>
                  <ol>
                    <li>Hubungkan HP Anda ke PC/Laptop (bisa menggunakan kabel USB atau Wi-Fi).</li>
                    <li>Gunakan software sinkronisasi foto otomatis (misal: <b>Link to Windows</b> bawaan Microsoft, <b>Google Drive</b> Desktop, <b>OneDrive</b>, atau <b>Intel Unison</b>).</li>
                    <li>Atur software tersebut agar menyinkronkan foto dari kamera HP Anda ke folder <code>capstone/watch_folder</code> di laptop ini.</li>
                    <li>Ambil foto roda gigi dengan kamera biasa di HP Anda. Hasil deteksi AI akan otomatis muncul di panel sebelah kanan dalam 2 detik!</li>
                  </ol>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Panel Kanan (Form + Hasil) ──────────────── */}
        <div className="control-panel">

          {/* Form pengaturan inspeksi */}
          <div className="cp-card">
            <div className="cp-card-header">
              <h3>Parameter Inspeksi</h3>
              <button className="btn-settings" onClick={() => setShowSettings(!showSettings)}>
                <Settings size={15} />
              </button>
            </div>

            <div className="cp-field">
              <label>Nama Part</label>
              <input value={partName} onChange={e => setPartName(e.target.value)} placeholder="Gear Roller" />
            </div>
            <div className="cp-field">
              <label>Jumlah Expected</label>
              <input type="number" min={1} value={expectedQty} onChange={e => setExpectedQty(e.target.value === '' ? '' : Number(e.target.value))} />
            </div>

            {/* Settings tambahan */}
            {showSettings && (
              <div className="cp-settings">
                <div className="cp-field">
                  <label>Interval Scan (ms)</label>
                  <input type="number" min={500} step={500} value={scanInterval} onChange={e => setScanInterval(e.target.value === '' ? '' : Number(e.target.value))} />
                </div>
                <div className="cp-field">
                  <label>Min. Confidence Trigger (%)</label>
                  <input type="number" min={50} max={100} value={minConf} onChange={e => setMinConf(e.target.value === '' ? '' : Number(e.target.value))} />
                </div>
                <div className="cp-field">
                  <label>Cooldown setelah capture (detik)</label>
                  <input type="number" min={1} max={30} value={cooldownTime} onChange={e => setCooldownTime(e.target.value === '' ? '' : Number(e.target.value))} />
                </div>
              </div>
            )}
          </div>

          {/* Status auto mode */}
          <div className={`auto-status-card ${autoMode ? 'auto-status-card--on' : ''}`}>
            <div className="auto-status-icon">{autoMode ? <Zap size={20}/> : <ZapOff size={20}/>}</div>
            <div>
              <div className="auto-status-label">{autoMode ? 'Auto Mode AKTIF' : 'Auto Mode MATI'}</div>
              <div className="auto-status-sub">
                {autoMode
                  ? `Scan tiap ${scanInterval/1000}s · Trigger >${minConf}% · Cooldown ${cooldownTime}s`
                  : 'Aktifkan untuk foto otomatis saat gear terdeteksi'}
              </div>
            </div>
          </div>

          {/* Hasil inspeksi terakhir */}
          {lastResult && (
            <div className={`result-card ${lastResult.is_match ? 'result-card--match' : 'result-card--mismatch'}`}>
              <div className="result-header">
                {lastResult.is_match
                  ? <><CheckCircle size={18}/> Hasil: SESUAI</>
                  : <><AlertCircle size={18}/> Hasil: SELISIH</>}
                <span className="result-id">{lastResult.inspection_id}</span>
              </div>
              <div className="result-grid">
                <div className="result-item">
                  <span className="result-label">Expected</span>
                  <span className="result-val">{lastResult.expected_qty}</span>
                </div>
                <div className="result-item">
                  <span className="result-label">Detected</span>
                  <span className="result-val">{lastResult.detected_qty}</span>
                </div>
                <div className="result-item">
                  <span className="result-label">Selisih</span>
                  <span className={`result-val ${lastResult.discrepancy !== 0 ? 'val--red' : 'val--green'}`}>
                    {lastResult.discrepancy === 0 ? '—' : (lastResult.discrepancy > 0 ? '+' : '') + lastResult.discrepancy}
                  </span>
                </div>
                <div className="result-item">
                  <span className="result-label">Confidence</span>
                  <span className="result-val">{(lastResult.average_confidence * 100).toFixed(1)}%</span>
                </div>
              </div>

              {/* Preview gambar hasil */}
              {lastResult.image_result_path && (
                <div className="result-imgs">
                  <div 
                    className="result-img-wrap" 
                    style={{ cursor: 'zoom-in' }} 
                    onClick={() => setZoomedImage({ url: `${API_BASE}${lastResult.image_path}`, title: 'Foto Raw (Asli)' })}
                    title="Klik untuk memperbesar"
                  >
                    <div className="result-img-label">Raw</div>
                    <img src={`${API_BASE}${lastResult.image_path}`} alt="raw" />
                  </div>
                  <div 
                    className="result-img-wrap" 
                    style={{ cursor: 'zoom-in' }} 
                    onClick={() => setZoomedImage({ url: `${API_BASE}${lastResult.image_result_path}`, title: 'Hasil Deteksi AI' })}
                    title="Klik untuk memperbesar"
                  >
                    <div className="result-img-label">Deteksi</div>
                    <img src={`${API_BASE}${lastResult.image_result_path}`} alt="result" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <ZoomedImageModal image={zoomedImage} onClose={() => setZoomedImage(null)} />
    </div>
  )
}
