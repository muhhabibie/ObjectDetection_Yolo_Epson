import { useState, useEffect, useRef, useCallback } from 'react'
import { Camera, Zap, ZapOff, Settings, CheckCircle, AlertCircle, AlertTriangle, RefreshCw, Loader, Wifi, Usb, Smartphone, Upload, Trash2, Printer } from 'lucide-react'
import './Capture.css'

const API_BASE = ""

// Status label & warna berdasarkan state
const STATUS = {
  idle: { label: 'Kamera siap', color: 'gray', icon: Camera },
  scanning: { label: 'Memindai...', color: 'blue', icon: Loader },
  detected: { label: 'Gear terdeteksi!', color: 'green', icon: CheckCircle },
  processing: { label: 'Memproses AI...', color: 'purple', icon: Loader },
  cooldown: { label: 'Cooldown...', color: 'orange', icon: Zap },
  error: { label: 'Gagal memproses', color: 'red', icon: AlertCircle },
  no_gear: { label: 'Tidak ada gear', color: 'gray', icon: Camera },
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

export default function Capture({ user }) {
  const isStorage = user?.role === 'storage_epson'
  const cooldownRef = useRef(null)
  const localVideoRef = useRef(null)
  const [localStream, setLocalStream] = useState(null)

  const [autoMode, setAutoMode] = useState(false)
  const [status, setStatus] = useState('idle')
  const [lastResult, setLastResult] = useState(null)   // hasil inspeksi terakhir
  const [cooldownSec, setCooldownSec] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const [zoomedImage, setZoomedImage] = useState(null)
  const [autoNoGearDetected, setAutoNoGearDetected] = useState(false)

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
  const [activeTab, setActiveTab] = useState('camera') // 'camera' | 'upload'
  const [uploadedFile, setUploadedFile] = useState(null)
  const [uploadPreview, setUploadPreview] = useState(null)
  const [dragActive, setDragActive] = useState(false)

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



  const [liveStreamFrame, setLiveStreamFrame] = useState(null)

  // ── WebSocket Live Stream Connection (Khusus Desktop) ───────────────────
  useEffect(() => {
    if (isMobile) return;

    const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    const wsUrl = `${wsProto}//${host}/ws/stream/laptop`
    
    let ws = null;
    let objectUrl = null;

    const connectWS = () => {
      console.log("Menghubungkan live stream laptop ke: " + wsUrl);
      ws = new WebSocket(wsUrl);
      ws.binaryType = 'blob';
      
      ws.onmessage = (event) => {
        if (event.data instanceof Blob) {
          if (objectUrl) {
            URL.revokeObjectURL(objectUrl);
          }
          objectUrl = URL.createObjectURL(event.data);
          setLiveStreamFrame(objectUrl);
          
          // OTO: Jika menerima stream dari HP, otomatis pindah ke tab kamera HP!
          setActiveTab('camera');
          setForceDesktopLocal(false);
        }
      };
      
      ws.onclose = () => {
        console.log("Koneksi live stream laptop terputus, mencoba lagi...");
        setTimeout(connectWS, 2000);
      };
    };

    connectWS();

    return () => {
      if (ws) ws.close();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [isMobile]);

  // ── Local Webcam Stream Management (Khusus HP / Force Desktop) ──────────
  useEffect(() => {
    let active = true;
    let stream = null;

    const startLocalWebcam = async () => {
      if (activeTab === 'camera' && (isMobile || forceDesktopLocal)) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
          });
          if (active) {
            setLocalStream(stream);
          } else {
            stream.getTracks().forEach(track => track.stop());
          }
        } catch (err) {
          console.error("Gagal membuka webcam lokal:", err);
        }
      }
    };

    startLocalWebcam();

    return () => {
      active = false;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      setLocalStream(null);
    };
  }, [activeTab, isMobile, forceDesktopLocal]);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch(e => console.log("Gagal memutar webcam lokal:", e));
    }
  }, [localStream, status, forceDesktopLocal, activeTab]);


  // ── Settings ──────────────────────────────────────────
  const [partName, setPartName] = useState(() => localStorage.getItem('partName') || 'Gear Roller')
  const [expectedQty, setExpectedQty] = useState(() => {
    const saved = localStorage.getItem('expectedQty')
    return saved !== null ? Number(saved) : 12
  })
  const [scanInterval, setScanInterval] = useState(() => {
    const saved = localStorage.getItem('scanInterval')
    return saved !== null ? Number(saved) : 1500
  })
  const [triggerMode, setTriggerMode] = useState(() => {
    const saved = localStorage.getItem('triggerMode')
    return saved !== null ? saved : 'gear_detection'
  })
  const [cooldownTime, setCooldownTime] = useState(() => {
    const saved = localStorage.getItem('cooldownTime')
    return saved !== null ? Number(saved) : 5
  })
  const [confThreshold, setConfThreshold] = useState(() => {
    const saved = localStorage.getItem('confThreshold')
    return saved !== null ? Number(saved) : 0.50
  })

  // ── LocalStorage Sync effects ────────────────────────
  useEffect(() => {
    localStorage.setItem('partName', partName)
  }, [partName])

  useEffect(() => {
    localStorage.setItem('expectedQty', expectedQty)
  }, [expectedQty])

  useEffect(() => {
    localStorage.setItem('scanInterval', scanInterval)
  }, [scanInterval])

  useEffect(() => {
    localStorage.setItem('triggerMode', triggerMode)
  }, [triggerMode])

  useEffect(() => {
    localStorage.setItem('cooldownTime', cooldownTime)
  }, [cooldownTime])

  useEffect(() => {
    localStorage.setItem('confThreshold', confThreshold)
  }, [confThreshold])

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

  const triggerSingleShot = useCallback(async () => {
    setAutoNoGearDetected(false);
    setStatus('processing');
    try {
      let videoEl = localVideoRef.current;
      let activeStream = localStream;
      let temporaryStream = null;

      // Jika kita sedang menggunakan preview kamera lokal aktif
      if (!videoEl || !activeStream) {
        temporaryStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        const tempVideo = document.createElement('video');
        tempVideo.srcObject = temporaryStream;
        tempVideo.setAttribute('playsinline', 'true');
        tempVideo.muted = true;
        await tempVideo.play();
        videoEl = tempVideo;
        // Tunggu 800ms untuk autofocus jika streaming baru dibuat
        await new Promise(resolve => setTimeout(resolve, 800));
      }

      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 640;
      const ctx = canvas.getContext('2d');

      if (videoEl.videoWidth && videoEl.videoHeight && videoEl.parentElement) {
        const W_vid = videoEl.videoWidth;
        const H_vid = videoEl.videoHeight;
        const W_cont = videoEl.parentElement.clientWidth || 800;
        const H_cont = videoEl.parentElement.clientHeight || 500;

        const R_cont = W_cont / H_cont;
        const R_vid = W_vid / H_vid;

        let S;
        if (R_cont > R_vid) {
          S = W_cont / W_vid;
        } else {
          S = H_cont / H_vid;
        }
        const W_scaled = W_vid * S;
        const H_scaled = H_vid * S;

        const dx = (W_cont - W_scaled) / 2;
        const dy = (H_cont - H_scaled) / 2;

        // Inset 20% di CSS (.cam-frame-guide { inset: 20% })
        const X_box = 0.20 * W_cont;
        const Y_box = 0.20 * H_cont;
        const W_box = 0.60 * W_cont;
        const H_box = 0.60 * H_cont;

        const sx = (X_box - dx) / S;
        const sy = (Y_box - dy) / S;
        const sw = W_box / S;
        const sh = H_box / S;

        ctx.drawImage(videoEl, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      } else {
        canvas.width = videoEl.videoWidth || 1280;
        canvas.height = videoEl.videoHeight || 720;
        ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
      }

      if (temporaryStream) {
        temporaryStream.getTracks().forEach(track => track.stop());
      }

      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.8));
      if (!blob) {
        throw new Error("Gagal mengambil gambar dari sensor");
      }

      const form = new FormData();
      form.append('file', blob, 'trigger_shot.jpg');
      form.append('part_name', partName);
      form.append('expected_qty', Number(expectedQty) || 12);

      const res = await fetch(`${API_BASE}/api/upload-camera/`, {
        method: 'POST',
        body: form
      });

      if (!res.ok) throw new Error('Gagal memproses gambar');
      const data = await res.json();
      setLastResult(data);
      setStatus('cooldown');
      startCooldown();
    } catch (err) {
      console.error(err);
      alert('Gagal mengambil foto: ' + err.message);
      setStatus('error');
    }
  }, [partName, expectedQty, startCooldown, localStream])

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    if (tab !== 'camera') {
      setAutoMode(false)
    }
  }

  const handlePrintLabel = useCallback(() => {
    if (!lastResult) return

    const qrData = `ID: ${lastResult.inspection_id}\nPart: ${lastResult.part_name}\nQty: ${lastResult.detected_qty}/${lastResult.expected_qty}\nStatus: ${lastResult.is_match ? 'PASSED' : 'FAILED'}\nOperator: ${user?.username || 'QC Operator'}\nDate: ${new Date(lastResult.created_at || Date.now()).toLocaleString('id-ID')}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}`;

    const printWindow = window.open('', '_blank', 'width=600,height=400');
    if (!printWindow) {
      alert('Silakan aktifkan pop-up browser untuk mencetak label.');
      return;
    }
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Cetak Label - ${lastResult.inspection_id}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
            body { 
              font-family: 'Inter', sans-serif; 
              padding: 20px; 
              margin: 0;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              background: #fff;
            }
            .label-card { 
              border: 3px solid #000; 
              padding: 20px; 
              border-radius: 12px; 
              display: flex; 
              align-items: center; 
              gap: 20px; 
              max-width: 480px; 
              width: 100%;
              box-sizing: border-box;
            }
            .label-info { 
              text-align: left; 
              display: flex;
              flex-direction: column;
              gap: 4px;
            }
            .label-info h3 { 
              margin: 0 0 6px 0; 
              font-size: 1.15rem; 
              font-weight: 800;
              letter-spacing: 0.5px;
              color: #000;
            }
            .label-info p { 
              margin: 0; 
              font-size: 0.85rem; 
              color: #334155; 
              line-height: 1.4;
            }
            .status-badge { 
              display: inline-block; 
              padding: 4px 10px; 
              border-radius: 6px; 
              font-weight: 700; 
              font-size: 0.75rem; 
              margin-top: 6px; 
              align-self: flex-start;
              text-transform: uppercase;
              border: 1px solid currentColor;
            }
            .status--passed { background: #d1fae5; color: #065f46; border-color: #a7f3d0; }
            .status--failed { background: #fee2e2; color: #991b1b; border-color: #fecaca; }
            @media print {
              body { padding: 0; }
              .label-card { border-width: 2px; }
            }
          </style>
        </head>
        <body>
          <div class="label-card">
            <img src="${qrUrl}" alt="QR" width="130" height="130" style="display: block; flex-shrink: 0;" />
            <div class="label-info">
              <h3>EPSON QC PASS</h3>
              <p><b>ID Inspeksi:</b> ${lastResult.inspection_id}</p>
              <p><b>Nama Part:</b> ${lastResult.part_name}</p>
              <p><b>Kuantitas:</b> ${lastResult.detected_qty} / ${lastResult.expected_qty} PCS</p>
              <p><b>Operator:</b> ${user?.username || 'QC Operator'}</p>
              <p><b>Waktu:</b> ${new Date(lastResult.created_at || Date.now()).toLocaleString('id-ID')}</p>
              <span class="status-badge ${lastResult.is_match ? 'status--passed' : 'status--failed'}">
                ${lastResult.is_match ? 'PASSED (SESUAI)' : 'FAILED (SELISIH)'}
              </span>
            </div>
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.close();
              }, 300);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }, [lastResult, user])

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

  const triggerAutoModeStep = useCallback(async () => {
    if (status === 'processing' || status === 'cooldown' || status === 'scanning') return;

    if (triggerMode === 'interval') {
      // Langsung jepret foto
      triggerSingleShot();
    } else if (triggerMode === 'gear_detection') {
      if (isMobile) {
        // Mode deteksi HP dilakukan oleh HP itu sendiri via camera.html
        return;
      }

      const videoEl = localVideoRef.current;
      if (!videoEl || !localStream) return;

      setStatus('scanning');
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 640;
        const ctx = canvas.getContext('2d');

        if (videoEl.videoWidth && videoEl.videoHeight && videoEl.parentElement) {
          const W_vid = videoEl.videoWidth;
          const H_vid = videoEl.videoHeight;
          const W_cont = videoEl.parentElement.clientWidth || 800;
          const H_cont = videoEl.parentElement.clientHeight || 500;

          const R_cont = W_cont / H_cont;
          const R_vid = W_vid / H_vid;

          let S;
          if (R_cont > R_vid) {
            S = W_cont / W_vid;
          } else {
            S = H_cont / H_vid;
          }
          const W_scaled = W_vid * S;
          const H_scaled = H_vid * S;

          const dx = (W_cont - W_scaled) / 2;
          const dy = (H_cont - H_scaled) / 2;

          const X_box = 0.20 * W_cont;
          const Y_box = 0.20 * H_cont;
          const W_box = 0.60 * W_cont;
          const H_box = 0.60 * H_cont;

          const sx = (X_box - dx) / S;
          const sy = (Y_box - dy) / S;
          const sw = W_box / S;
          const sh = H_box / S;

          ctx.drawImage(videoEl, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
        } else {
          canvas.width = videoEl.videoWidth || 1280;
          canvas.height = videoEl.videoHeight || 720;
          ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
        }

        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.8));
        if (!blob) {
          setStatus('idle');
          return;
        }

        const form = new FormData();
        form.append('file', blob, 'scan_frame.jpg');

        const res = await fetch(`${API_BASE}/api/scan-frame/`, {
          method: 'POST',
          body: form
        });

        if (!res.ok) throw new Error("Gagal melakukan scan frame");
        const data = await res.json();

        if (data.detected) {
          setAutoNoGearDetected(false);
          setStatus('detected');
          await new Promise(r => setTimeout(r, 400));
          await triggerSingleShot();
        } else {
          setAutoNoGearDetected(true);
          setStatus('idle');
        }
      } catch (err) {
        console.error("Error auto trigger scan:", err);
        setAutoNoGearDetected(true);
        setStatus('idle');
      }
    }
  }, [triggerMode, isMobile, forceDesktopLocal, localStream, status, triggerSingleShot])

  // ── Auto Trigger Loop ────────────────────────────────
  useEffect(() => {
    if (autoMode) {
      const intervalId = setInterval(() => {
        if (status !== 'processing' && status !== 'cooldown' && status !== 'scanning') {
          triggerAutoModeStep()
        }
      }, Number(scanInterval) || 1500)
      return () => clearInterval(intervalId)
    }
  }, [autoMode, status, triggerAutoModeStep, scanInterval])

  useEffect(() => {
    if (!autoMode) {
      setAutoNoGearDetected(false)
    }
  }, [autoMode])

  // ── Cleanup saat unmount ─────────────────────────────
  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current)
    }
  }, [])

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
    let active = true
    const syncSettings = async () => {
      try {
        await fetch(`${API_BASE}/api/active-settings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ part_name: partName, expected_qty: expectedQty, conf_threshold: confThreshold })
        })
      } catch (err) {
        console.error("Gagal sinkronisasi parameter ke backend:", err)
      }
    }
    const timer = setTimeout(syncSettings, 500)
    return () => {
      clearTimeout(timer)
      if (active) {
        fetch(`${API_BASE}/api/active-settings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ part_name: partName, expected_qty: expectedQty, conf_threshold: confThreshold }),
          keepalive: true
        }).catch(() => { })
      }
    }
  }, [partName, expectedQty, confThreshold])

  // Ambil parameter aktif dari backend saat pertama kali dimuat
  useEffect(() => {
    const fetchActiveSettings = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/active-settings`)
        if (res.ok) {
          const data = await res.json()
          if (data.part_name) {
            setPartName(data.part_name)
            localStorage.setItem('partName', data.part_name)
          }
          if (data.expected_qty) {
            setExpectedQty(data.expected_qty)
            localStorage.setItem('expectedQty', data.expected_qty)
          }
          if (data.conf_threshold !== undefined) {
            setConfThreshold(data.conf_threshold)
            localStorage.setItem('confThreshold', data.conf_threshold)
          }
        }
      } catch (err) {
        console.error("Gagal mengambil active settings:", err)
      }
    }
    fetchActiveSettings()
  }, [])

  const s = { ...(STATUS[status] || STATUS.idle) }
  if (status === 'idle' && autoMode) {
    s.label = "Standby (Mencari gear...)"
    s.color = "blue"
  }

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
          {isStorage ? (
            <div className="watcher-panel">
              <div className="watcher-card">
                <div className="watcher-icon-wrap" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Settings size={48} />
                </div>
                <h3 className="watcher-title">Manajemen Parameter Aktif</h3>
                <p className="watcher-desc">
                  Sebagai role <strong>Storage Epson</strong>, Anda diizinkan untuk mengubah nama part dan jumlah expected untuk disinkronisasikan ke sistem deteksi otomatis.
                </p>
                <p className="watcher-desc" style={{ marginTop: '10px', color: '#64748b' }}>
                  Fitur pemindaian kamera langsung dan upload file dinonaktifkan untuk role Anda dan hanya dapat diakses oleh QC Epson.
                </p>
              </div>
            </div>
          ) : (
            <>
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
                      {status === 'cooldown' && lastResult ? (
                        <img
                          src={`${API_BASE}${lastResult.image_result_path || lastResult.image_path}`}
                          alt="Hasil deteksi terbaru"
                          className="camera-video"
                          style={{ objectFit: 'contain', background: '#090d16' }}
                        />
                      ) : (isMobile || forceDesktopLocal) ? (
                        <video
                          ref={localVideoRef}
                          autoPlay
                          playsInline
                          muted
                          className="camera-video"
                          style={{ objectFit: 'cover', background: '#090d16', width: '100%', height: '100%' }}
                        />
                      ) : liveStreamFrame ? (
                        <img
                          src={liveStreamFrame}
                          alt="Live Stream Kamera HP"
                          className="camera-video"
                          style={{ objectFit: 'cover', background: '#090d16' }}
                        />
                      ) : lastResult ? (
                        <img
                          src={`${API_BASE}${lastResult.image_result_path || lastResult.image_path}`}
                          alt="Hasil deteksi terbaru"
                          className="camera-video"
                          style={{ objectFit: 'contain', background: '#090d16' }}
                        />
                      ) : (
                        <div className="cam-off-screen" style={{ flexDirection: 'column' }}>
                          <Camera size={48} strokeWidth={1} style={{ color: '#64748b' }} />
                          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Kamera standby / Menunggu trigger</p>
                        </div>
                      )}

                      {/* Framing Guide Corners */}
                      {status !== 'cooldown' && (
                        <div className="cam-frame-guide">
                          <div className="frame-corner frame-corner--tl" />
                          <div className="frame-corner frame-corner--tr" />
                          <div className="frame-corner frame-corner--bl" />
                          <div className="frame-corner frame-corner--br" />
                        </div>
                      )}

                      {/* Status overlay */}
                      <div className={`cam-overlay cam-overlay--${s.color}`}>
                        <div className="cam-status-dot" />
                        <span>{s.label}</span>
                        {status === 'cooldown' && <span className="cam-cooldown">{cooldownSec}s</span>}
                      </div>

                      {/* Notifikasi Part Tidak Terdeteksi di Viewport */}
                      {((lastResult && lastResult.detected_qty === 0 && (status === 'cooldown' || status === 'idle')) || autoNoGearDetected) && (
                        <div className="viewport-warning-banner" style={{
                          position: 'absolute',
                          bottom: '16px',
                          left: '16px',
                          right: '16px',
                          background: 'rgba(239, 68, 68, 0.95)',
                          backdropFilter: 'blur(8px)',
                          color: '#ffffff',
                          padding: '12px 16px',
                          borderRadius: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          fontSize: '0.85rem',
                          fontWeight: '600',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
                          zIndex: 20
                        }}>
                          <AlertTriangle size={18} style={{ color: '#ffffff', flexShrink: 0 }} />
                          <span>Peringatan: Roda gigi tidak terdeteksi! Pastikan part berada di dalam kotak pembingkai.</span>
                        </div>
                      )}

                      {/* Processing loading state overlay */}
                      {status === 'processing' && (
                        <div style={{
                          position: 'absolute',
                          inset: 0,
                          backgroundColor: 'rgba(15, 23, 42, 0.7)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          zIndex: 10,
                          color: '#ffffff',
                          gap: '12px'
                        }}>
                          <Loader size={36} style={{ animation: 'spin 1.5s linear infinite', color: '#8b5cf6' }} />
                          <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Memproses AI...</span>
                        </div>
                      )}
                    </div>

                    {/* Tombol kamera */}
                    <div className="cam-controls" style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#f8fafc', padding: '8px 16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>Toggle Trigger</span>
                        <button
                          type="button"
                          className={`btn-cam-toggle ${autoMode ? 'active' : ''}`}
                          onClick={() => setAutoMode(!autoMode)}
                          style={{
                            width: '46px',
                            height: '24px',
                            borderRadius: '12px',
                            background: autoMode ? '#10b981' : '#cbd5e1',
                            border: 'none',
                            position: 'relative',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s ease',
                            padding: 0
                          }}
                        >
                          <div style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            background: '#ffffff',
                            position: 'absolute',
                            top: '3px',
                            left: autoMode ? '25px' : '3px',
                            transition: 'left 0.2s ease',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                          }} />
                        </button>
                      </div>

                      <button
                        className="btn-cam btn-cam--manual"
                        onClick={triggerSingleShot}
                        disabled={autoMode || status === 'processing' || status === 'cooldown'}
                        style={{
                          background: autoMode ? '#cbd5e1' : '#6366f1',
                          color: autoMode ? '#64748b' : '#ffffff',
                          cursor: autoMode ? 'not-allowed' : 'pointer'
                        }}
                      >
                        <Camera size={18} /> Foto Manual
                      </button>

                      {forceDesktopLocal && (
                        <button className="btn-cam btn-cam--off" style={{ flex: 'none', width: 'auto' }} onClick={() => setForceDesktopLocal(false)}>
                          Kembali ke Panduan HP
                        </button>
                      )}
                    </div>
                  </div>
                )
              ) : (
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

                    {/* Notifikasi Part Tidak Terdeteksi di Viewport */}
                    {((lastResult && lastResult.detected_qty === 0 && (status === 'cooldown' || status === 'idle')) || autoNoGearDetected) && (
                      <div className="viewport-warning-banner" style={{
                        position: 'absolute',
                        bottom: '16px',
                        left: '16px',
                        right: '16px',
                        background: 'rgba(239, 68, 68, 0.95)',
                        backdropFilter: 'blur(8px)',
                        color: '#ffffff',
                        padding: '12px 16px',
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
                        zIndex: 20
                      }}>
                        <AlertTriangle size={18} style={{ color: '#ffffff', flexShrink: 0 }} />
                        <span>Peringatan: Roda gigi tidak terdeteksi! Pastikan part berada di dalam kotak pembingkai.</span>
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
              )}
            </>
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
              <select value={partName} onChange={e => setPartName(e.target.value)}>
                <option value="Gear Roller">Gear Roller</option>
                <option value="Gear Flange">Gear Flange</option>
                <option value="Pinion Gear">Pinion Gear</option>
                <option value="Spur Gear">Spur Gear</option>
              </select>
            </div>
            <div className="cp-field">
              <label>Jumlah Expected</label>
              <input type="number" min={1} value={expectedQty} onChange={e => setExpectedQty(e.target.value === '' ? '' : Number(e.target.value))} />
            </div>
            <div className="cp-field">
              <label>Mode Trigger Auto</label>
              <select value={triggerMode} onChange={e => setTriggerMode(e.target.value)}>
                <option value="gear_detection">Auto: Deteksi Gear</option>
                <option value="interval">Auto: Jeda Waktu</option>
              </select>
            </div>

            {/* Settings tambahan */}
            {showSettings && (
              <div className="cp-settings">
                <div className="cp-field">
                  <label>Interval Scan (ms)</label>
                  <input type="number" min={500} step={500} value={scanInterval} onChange={e => setScanInterval(e.target.value === '' ? '' : Number(e.target.value))} />
                </div>
                <div className="cp-field">
                  <label>Cooldown setelah capture (detik)</label>
                  <input type="number" min={1} max={30} value={cooldownTime} onChange={e => setCooldownTime(e.target.value === '' ? '' : Number(e.target.value))} />
                </div>
                <div className="cp-field">
                  <label>Ambang Batas Keyakinan AI ({(confThreshold * 100).toFixed(0)}%)</label>
                  <input 
                    type="range" 
                    min="0.10" 
                    max="0.95" 
                    step="0.05" 
                    value={confThreshold} 
                    onChange={e => setConfThreshold(Number(e.target.value))} 
                    className="threshold-slider"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Status auto mode */}
          <div className={`auto-status-card ${autoMode ? 'auto-status-card--on' : ''}`}>
            <div className="auto-status-icon">{autoMode ? <Zap size={20} /> : <ZapOff size={20} />}</div>
            <div>
              <div className="auto-status-label">{autoMode ? 'Auto Mode AKTIF' : 'Auto Mode MATI'}</div>
              <div className="auto-status-sub">
                {autoMode
                  ? `Mode: ${triggerMode === 'gear_detection' ? 'Deteksi Gear' : 'Jeda Waktu'} · Scan tiap ${scanInterval / 1000}s · Cooldown ${cooldownTime}s`
                  : 'Aktifkan untuk foto otomatis saat gear terdeteksi'}
              </div>
            </div>
          </div>



          {/* Hasil inspeksi terakhir */}
          {lastResult && (
            <div className={`result-card ${lastResult.is_match ? 'result-card--match' : 'result-card--mismatch'}`}>
              <div className="result-header">
                {lastResult.is_match
                  ? <><CheckCircle size={18} /> Hasil: SESUAI</>
                  : <><AlertCircle size={18} /> Hasil: SELISIH</>}
                <span className="result-id">{lastResult.inspection_id}</span>
              </div>

              {/* Notifikasi Part Tidak Terdeteksi di Hasil Inspeksi */}
              {lastResult.detected_qty === 0 && (
                <div className="warning-banner" style={{
                  background: '#fef3c7',
                  borderBottom: '1px solid #fde68a',
                  color: '#92400e',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '0.85rem',
                  fontWeight: '600'
                }}>
                  <AlertTriangle size={18} style={{ color: '#d97706', flexShrink: 0 }} />
                  <span>Peringatan: Roda gigi tidak terdeteksi! Pastikan part berada di dalam kotak pembingkai.</span>
                </div>
              )}

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

              {/* Tombol Cetak Label QR */}
              <div style={{ padding: '12px', borderTop: '1px solid var(--gray-200)', background: 'var(--gray-50)', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={handlePrintLabel}
                  className="btn-cam"
                  style={{
                    background: '#10b981',
                    color: '#ffffff',
                    padding: '8px 16px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: 'auto',
                    minWidth: 'auto'
                  }}
                >
                  <Printer size={15} /> Cetak Label QR
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <ZoomedImageModal image={zoomedImage} onClose={() => setZoomedImage(null)} />
    </div>
  )
}
