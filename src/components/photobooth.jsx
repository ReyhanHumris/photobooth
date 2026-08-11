import React, { useState, useRef, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import { toPng } from 'html-to-image';
import confetti from 'canvas-confetti';
import Peer from 'peerjs';

// ================= KOLEKSI BINGKAI / FRAME =================
const FRAMES = [
  { id: 'koran', name: 'Koran Classic', bg: 'bg-[#F4F1EA]', text: 'text-[#171b2b]', border: 'border-[#2c3041]', headerText: 'DAILY NEWS • DUAL EDITION' },
  { id: 'y2k', name: 'Y2K Cyber', bg: 'bg-gradient-to-br from-[#a5ecea] via-[#f3f2ff] to-[#c8f6aa]', text: 'text-[#171b2b]', border: 'border-[#2c3041]', headerText: 'Y2K ★ DUAL MATRIX' },
  { id: 'kawaii', name: 'Kawaii Pastel', bg: 'bg-[#ffb3c6]', text: 'text-[#171b2b]', border: 'border-[#2c3041]', headerText: 'BESTIES MOMENTS ♡' },
  { id: 'minimal', name: 'Minimal Dark', bg: 'bg-[#2c3041]', text: 'text-white', border: 'border-white', headerText: 'STUDIO ESSENTIALS' },
  { id: 'arcade', name: 'Arcade Gamer', bg: 'bg-[#ffe893]', text: 'text-[#171b2b]', border: 'border-[#2c3041]', headerText: 'PLAYER 1 & PLAYER 2' },
  { id: 'daisy', name: 'Pastel Daisy', bg: 'bg-[#a5ecea]', text: 'text-[#171b2b]', border: 'border-[#2c3041]', headerText: 'BLOOM & SHINE 🌼' },
];

// ================= PILIHAN FILTER =================
const FILTERS = [
  { id: 'none', name: 'Normal', class: '' },
  { id: 'bw', name: 'Retro B&W', class: 'grayscale contrast-125' },
  { id: 'warm', name: 'Warm Vintage', class: 'sepia contrast-110 saturate-150' },
  { id: 'pastel', name: 'Soft Pastel', class: 'brightness-105 contrast-90 saturate-125' },
  { id: 'cyber', name: 'Cyberpunk', class: 'hue-rotate-90 contrast-125 saturate-200' },
  { id: 'glow', name: 'Soft Blur Glow', class: 'brightness-110 blur-[0.3px] contrast-95' },
  { id: 'film', name: 'Film Grain', class: 'contrast-120 saturate-90 brightness-95' },
];

export default function App() {
  const [currentPage, setCurrentPage] = useState('beranda');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // References
  const webcamRef = useRef(null);
  const friendVideoRef = useRef(null);
  const stripRef = useRef(null);

  // Photo States (3 Foto Milik Sendiri & 3 Foto Milik Teman)
  const [myPhotos, setMyPhotos] = useState([]);
  const [friendPhotos, setFriendPhotos] = useState([]);

  const [countdown, setCountdown] = useState(null);
  const [selectedFrame, setSelectedFrame] = useState(FRAMES[0]);
  const [selectedFilter, setSelectedFilter] = useState(FILTERS[0]);
  const [timerDelay, setTimerDelay] = useState(3);
  const [isCapturing, setIsCapturing] = useState(false);

  // Multi-Device Room States
  const [username, setUsername] = useState('');
  const [targetRoomCode, setTargetRoomCode] = useState('');
  const [myPeerId, setMyPeerId] = useState('');
  const [connectedFriend, setConnectedFriend] = useState(null);
  const [peerInstance, setPeerInstance] = useState(null);
  const [dataConn, setDataConn] = useState(null);

  // Inisialisasi PeerJS Server
  const initPeer = (customUsername) => {
    if (!customUsername.trim()) return alert('Masukkan username Anda terlebih dahulu!');
    
    const generatedId = `snappop-${customUsername.toLowerCase().replace(/\s+/g, '-')}-${Math.floor(1000 + Math.random() * 9000)}`;
    const peer = new Peer(generatedId);

    peer.on('open', (id) => {
      setMyPeerId(id);
      setPeerInstance(peer);
    });

    // Menerima Koneksi Data
    peer.on('connection', (conn) => {
      setDataConn(conn);
      listenDataEvents(conn);
    });

    // Menerima Panggilan Video Stream
    peer.on('call', (call) => {
      if (webcamRef.current && webcamRef.current.stream) {
        call.answer(webcamRef.current.stream);
        call.on('stream', (remoteStream) => {
          setConnectedFriend({ name: call.peer.split('-')[1] || 'Teman', stream: remoteStream });
        });
      }
    });
  };

  // Panggil / Gabung ke Room Teman
  const connectToFriend = (e) => {
    e.preventDefault();
    if (!peerInstance) return alert('Silakan buat username dulu!');
    if (!targetRoomCode.trim()) return alert('Masukkan ID Room Teman!');

    // Koneksi Channel Data
    const conn = peerInstance.connect(targetRoomCode);
    setDataConn(conn);
    listenDataEvents(conn);

    // Panggilan Media Stream Video
    if (webcamRef.current && webcamRef.current.stream) {
      const call = peerInstance.call(targetRoomCode, webcamRef.current.stream);
      call.on('stream', (remoteStream) => {
        setConnectedFriend({ name: targetRoomCode.split('-')[1] || 'Teman', stream: remoteStream });
      });
    }
  };

  // Menerima Event / Instruksi Real-time dari Device Teman
  const listenDataEvents = (conn) => {
    conn.on('data', (data) => {
      if (data.type === 'START_SESSION') {
        runCaptureSequence(data.timer);
      } else if (data.type === 'PHOTO_SHOT') {
        setFriendPhotos((prev) => [...prev, data.image]);
      } else if (data.type === 'RESET_PHOTOS') {
        setMyPhotos([]);
        setFriendPhotos([]);
      }
    });
  };

  // Hubungkan Stream Teman ke Elemen Video HTML
  useEffect(() => {
    if (connectedFriend && friendVideoRef.current) {
      friendVideoRef.current.srcObject = connectedFriend.stream;
    }
  }, [connectedFriend]);

  // Ambil Foto dari Kamera Sendiri
  const captureLocalPhoto = () => {
    if (webcamRef.current) {
      const imgSrc = webcamRef.current.getScreenshot();
      setMyPhotos((prev) => [...prev, imgSrc]);

      // Kirim hasil jepretan ke device teman
      if (dataConn) {
        dataConn.send({ type: 'PHOTO_SHOT', image: imgSrc });
      }
    }
  };

  // Sesi Pengambilan 3 Foto Berturut-turut (Sync di 2 Device)
  const runCaptureSequence = (delay) => {
    setIsCapturing(true);
    let currentShot = 0;

    const takeShotCycle = () => {
      let count = delay;
      setCountdown(count);

      const interval = setInterval(() => {
        count -= 1;
        if (count > 0) {
          setCountdown(count);
        } else {
          clearInterval(interval);
          setCountdown(null);
          captureLocalPhoto();

          currentShot += 1;
          if (currentShot < 3) {
            setTimeout(takeShotCycle, 1000);
          } else {
            setIsCapturing(false);
          }
        }
      }, 1000);
    };

    takeShotCycle();
  };

  // Pemicu Pengambilan Foto Bersama dari Tombol Utama
  const handleStartBothSession = () => {
    if (myPhotos.length >= 3 || isCapturing) return;

    if (dataConn) {
      dataConn.send({ type: 'START_SESSION', timer: timerDelay });
    }
    runCaptureSequence(timerDelay);
  };

  // Reset Sesi Foto Bersama
  const handleResetBoth = () => {
    setMyPhotos([]);
    setFriendPhotos([]);
    if (dataConn) {
      dataConn.send({ type: 'RESET_PHOTOS' });
    }
  };

  // Unduh Hasil Foto Strip 6-Grid
  const downloadStrip = async () => {
    if (!stripRef.current) return;
    try {
      const dataUrl = await toPng(stripRef.current, { pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = `snappop-dual-strip-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.7 } });
    } catch (err) {
      console.error('Gagal mengunduh gambar:', err);
    }
  };

  return (
    <div className="bg-background text-on-surface font-body-md min-h-screen flex flex-col justify-between">
      
      {/* ================= HEADER NAVBAR RESPONSIVE ================= */}
      <header className="fixed top-0 left-0 right-0 w-full z-50 bg-background border-b-2 border-inverse-surface">
        <div className="max-w-7xl h-20 w-full px-4 sm:px-6 lg:px-8 flex items-center justify-between mx-auto">
          
          <div 
            className="flex items-center gap-2 cursor-pointer shrink-0"
            onClick={() => { setCurrentPage('beranda'); setIsMobileMenuOpen(false); }}
          >
            <div className="bg-surface-container-high border-2 border-inverse-surface p-1.5 rounded-xl sticker-shadow-sm flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                photo_camera
              </span>
            </div>
            <span className="font-extrabold text-xl sm:text-2xl text-on-surface tracking-tight whitespace-nowrap">
              SnapPop Studio
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-6 lg:gap-8">
            {[
              { id: 'beranda', label: 'Beranda' },
              { id: 'galeri', label: 'Galeri' },
              { id: 'frame', label: 'Frame' },
              { id: 'cara-kerja', label: 'Cara Kerja' },
            ].map((nav) => (
              <button
                key={nav.id}
                onClick={() => setCurrentPage(nav.id)}
                className={`font-bold text-sm lg:text-base transition-all whitespace-nowrap ${
                  currentPage === nav.id
                    ? 'text-primary underline decoration-2 underline-offset-8 font-extrabold'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {nav.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              onClick={() => setCurrentPage('booth')}
              className="hidden sm:flex items-center gap-2 bg-primary-container text-on-primary-container px-4 py-2 rounded-xl border-2 border-inverse-surface sticker-shadow active-sticker-shadow transition-all font-bold text-xs lg:text-sm whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-[18px]">stars</span>
              {currentPage === 'booth' ? 'Studio Aktif' : 'Mulai Photo Booth'}
            </button>

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden flex items-center justify-center w-10 h-10 bg-surface-container-high border-2 border-inverse-surface rounded-xl sticker-shadow-sm active-sticker-shadow"
            >
              <span className="material-symbols-outlined text-on-surface text-[24px]">
                {isMobileMenuOpen ? 'close' : 'menu'}
              </span>
            </button>
          </div>

        </div>

        {isMobileMenuOpen && (
          <div className="md:hidden bg-background border-t-2 border-inverse-surface px-4 py-6 flex flex-col gap-4 shadow-lg">
            <nav className="flex flex-col gap-3">
              {[
                { id: 'beranda', label: 'Beranda' },
                { id: 'galeri', label: 'Galeri' },
                { id: 'frame', label: 'Frame' },
                { id: 'cara-kerja', label: 'Cara Kerja' },
              ].map((nav) => (
                <button
                  key={nav.id}
                  onClick={() => {
                    setCurrentPage(nav.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`text-left py-2 px-3 rounded-xl border-2 transition-all font-bold text-base ${
                    currentPage === nav.id
                      ? 'bg-primary-container border-inverse-surface text-on-primary-container sticker-shadow-sm'
                      : 'border-transparent text-on-surface hover:bg-surface-container'
                  }`}
                >
                  {nav.label}
                </button>
              ))}
            </nav>

            <button
              onClick={() => {
                setCurrentPage('booth');
                setIsMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 bg-primary text-white py-3 rounded-xl border-2 border-inverse-surface sticker-shadow active-sticker-shadow font-bold text-sm"
            >
              <span className="material-symbols-outlined text-[18px]">stars</span>
              Mulai Photo Booth
            </button>
          </div>
        )}
      </header>

      {/* ================= MAIN CONTENT ================= */}
      <main className="w-full pt-20 flex-1">
        
        {/* PAGE 1: BERANDA */}
        {currentPage === 'beranda' && (
          <div className="flex flex-col w-full gap-16 pb-20">
            <section className="w-full flex flex-col items-center justify-center text-center px-6 lg:px-20 gap-4 mt-8 relative">
              <h1 className="text-4xl lg:text-5xl font-extrabold text-on-surface z-10 max-w-4xl leading-tight">
                Abadikan Momen Lucumu dalam Hitungan Detik! <span className="inline-block animate-bounce">✨</span>
              </h1>
              <p className="text-lg text-on-surface-variant max-w-2xl z-10">
                Photobooth web simpel & estetik. Sekarang bisa **foto bareng teman dari HP/Device berbeda** secara langsung!
              </p>

              <div className="w-full max-w-5xl mt-6 bg-surface-container-lowest border-2 border-inverse-surface rounded-3xl sticker-shadow p-4 md:p-6 flex flex-col lg:flex-row gap-6 relative z-10">
                <div className="flex-1 bg-secondary-fixed rounded-2xl border-2 border-inverse-surface overflow-hidden relative group min-h-[320px] flex items-center justify-center">
                  <div className="text-center p-6">
                    <span className="material-symbols-outlined text-6xl text-primary mb-2">photo_camera_front</span>
                    <h3 className="font-bold text-xl mb-2 text-on-surface">Siapkan Senyum Terbaikmu!</h3>
                    <p className="text-sm text-on-surface-variant mb-4">Klik tombol di bawah untuk membuka studio foto.</p>
                    <button
                      onClick={() => setCurrentPage('booth')}
                      className="bg-primary text-white font-bold px-6 py-3 rounded-xl border-2 border-inverse-surface sticker-shadow active-sticker-shadow hover:brightness-110 transition-all inline-flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined">camera</span> Buka Kamera Booth
                    </button>
                  </div>
                </div>

                <div className="w-full lg:w-72 flex flex-col gap-3">
                  <h3 className="font-bold text-lg text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>style</span>
                    Pilihan Frame Unik
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {FRAMES.slice(0, 4).map((f) => (
                      <button
                        key={f.id}
                        onClick={() => { setSelectedFrame(f); setCurrentPage('booth'); }}
                        className="flex flex-col items-center gap-2 p-3 bg-surface-container border-2 border-inverse-surface rounded-xl hover:bg-primary-container transition-colors active-sticker-shadow"
                      >
                        <div className={`w-full aspect-[3/4] border-2 border-inverse-surface rounded-md ${f.bg}`} />
                        <span className="font-bold text-xs text-center text-on-surface">{f.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* PAGE 2: STUDIO PHOTOBOOTH & MULTI-DEVICE 6-GRID */}
        {currentPage === 'booth' && (
          <div className="max-w-7xl mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-8 my-4">
            
            {/* AREA KIRI: KAMERA & ROOM MANAGEMENT */}
            <div className="lg:col-span-7 flex flex-col gap-4">
              
              {/* PANEL ROOM & USERNAME */}
              <div className="bg-primary-container p-4 rounded-2xl border-2 border-inverse-surface sticker-shadow flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-2xl text-on-primary-container">groups</span>
                  <div>
                    <h4 className="font-bold text-sm text-on-primary-container">Dual Multi-Device Studio (Sync 6-Grid)</h4>
                    <p className="text-xs text-on-surface-variant">Atur username, hubungkan ID room, lalu klik sekali untuk foto berdua!</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-surface p-3 rounded-xl border-2 border-inverse-surface">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase text-on-surface-variant">1. Username Anda</label>
                    <div className="flex gap-2">
                        {/* Input Username */}
                        <input
                        type="text"
                        placeholder="Contoh: Raihaan"
                        value={username}
                        disabled={!!myPeerId}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full px-3 py-1.5 border-2 border-inverse-surface rounded-lg text-xs font-bold bg-[#2c3041] text-white placeholder:text-stone-400"
                        />
                      <button
                        onClick={() => initPeer(username)}
                        disabled={!!myPeerId}
                        className="px-3 py-1.5 bg-primary text-white rounded-lg border-2 border-inverse-surface text-xs font-bold disabled:opacity-50"
                      >
                        {myPeerId ? 'Aktif' : 'Set'}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase text-on-surface-variant">2. ID Room Teman</label>
                    <form onSubmit={connectToFriend} className="flex gap-2">
                        {/* Input ID Room Teman */}
                        <input
                        type="text"
                        placeholder="Tempel ID Room Teman"
                        value={targetRoomCode}
                        onChange={(e) => setTargetRoomCode(e.target.value)}
                        className="w-full px-3 py-1.5 border-2 border-inverse-surface rounded-lg text-xs font-bold bg-[#2c3041] text-white placeholder:text-stone-400"
                        />
                      <button
                        type="submit"
                        className="px-3 py-1.5 bg-secondary-container text-on-secondary-container rounded-lg border-2 border-inverse-surface text-xs font-bold"
                      >
                        Gabung
                      </button>
                    </form>
                  </div>
                </div>

                {myPeerId && (
                  <div className="flex items-center justify-between bg-surface-container-high px-3 py-2 rounded-xl border-2 border-inverse-surface">
                    <span className="text-xs  font-bold text-on-surface">
                      ID Room Anda: <span className="text-primary font-mono select-all underline">{myPeerId}</span>
                    </span>
                    <button
                      onClick={() => navigator.clipboard.writeText(myPeerId)}
                     className="w-full px-3 py-1.5 border-2 border-inverse-surface rounded-lg text-xs font-bold bg-[#2c3041] text-white placeholder:text-stone-400"
                    >
                      Salin ID
                    </button>
                  </div>
                )}
              </div>

              {/* TAMPILAN KAMERA DUA USER */}
              <div className="bg-surface-container-lowest p-4 rounded-3xl border-2 border-inverse-surface sticker-shadow relative">
                
                {countdown !== null && (
                  <div className="absolute inset-0 z-30 bg-black/40 backdrop-blur-xs rounded-3xl flex items-center justify-center">
                    <span className="text-8xl font-black text-primary-container animate-ping">
                      {countdown}
                    </span>
                  </div>
                )}

                <div className={`relative aspect-[4/3] rounded-2xl overflow-hidden border-2 border-inverse-surface bg-black grid ${connectedFriend ? 'grid-cols-2 gap-1' : 'grid-cols-1'}`}>
                  
                  {/* Kamera 1 (Lokal) */}
                  <div className="relative w-full h-full overflow-hidden">
                    <Webcam
                      audio={false}
                      ref={webcamRef}
                      screenshotFormat="image/jpeg"
                      videoConstraints={{ facingMode: "user" }}
                      className={`w-full h-full object-cover ${selectedFilter.class}`}
                    />
                    <span className="absolute bottom-2 left-2 bg-black/60 text-white px-2 py-0.5 rounded text-[10px] font-bold">
                      {username || 'Anda'}
                    </span>
                  </div>

                  {/* Kamera 2 (Teman via WebRTC) */}
                  {connectedFriend ? (
                    <div className="relative w-full h-full overflow-hidden">
                      <video
                        ref={friendVideoRef}
                        autoPlay
                        playsInline
                        className={`w-full h-full object-cover ${selectedFilter.class}`}
                      />
                      <span className="absolute bottom-2 left-2 bg-black/60 text-white px-2 py-0.5 rounded text-[10px] font-bold">
                        {connectedFriend.name}
                      </span>
                    </div>
                  ) : (
                    myPeerId && (
                      <div className="bg-stone-800 flex flex-col items-center justify-center text-white p-2 text-center">
                        <span className="material-symbols-outlined text-3xl mb-1 animate-pulse">person_add</span>
                        <span className="text-[10px] font-bold">Menunggu Teman Memasukkan ID Room...</span>
                      </div>
                    )
                  )}
                </div>

                {/* CONTROLS BAR */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-1 bg-surface-container p-1 rounded-xl border-2 border-inverse-surface">
                    <span className="material-symbols-outlined text-sm ml-2 text-on-surface">timer</span>
                    {[3, 5, 10].map((sec) => (
                      <button
                        key={sec}
                        onClick={() => setTimerDelay(sec)}
                        className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                          timerDelay === sec ? 'bg-primary-container border border-inverse-surface text-on-surface' : 'opacity-60 text-on-surface'
                        }`}
                      >
                        {sec}s
                      </button>
                    ))}
                  </div>

                  {/* Tombol Eksekusi Foto Sinkron Berdua */}
                  <button
                    onClick={handleStartBothSession}
                    disabled={isCapturing || myPhotos.length >= 3}
                    className="flex items-center gap-2 bg-primary text-white disabled:opacity-50 font-bold px-6 py-3 rounded-2xl border-2 border-inverse-surface sticker-shadow active-sticker-shadow transition-all"
                  >
                    <span className="material-symbols-outlined">photo_camera</span>
                    {myPhotos.length >= 3 ? 'Frame Penuh' : 'Mulai Foto Bersama'}
                  </button>

                  <button
                    onClick={handleResetBoth}
                    className="p-3 bg-surface-container hover:bg-surface-container-high rounded-xl border-2 border-inverse-surface"
                    title="Reset Sesi Foto"
                  >
                    <span className="material-symbols-outlined text-sm text-on-surface">refresh</span>
                  </button>
                </div>
              </div>

              {/* FILTER SELECTOR */}
              <div className="bg-surface-container-lowest p-4 rounded-2xl border-2 border-inverse-surface sticker-shadow">
                <h4 className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1 text-on-surface">
                  <span className="material-symbols-outlined text-sm">auto_awesome</span> Pilih Filter ({FILTERS.length})
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {FILTERS.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setSelectedFilter(f)}
                      className={`py-2 px-2 text-xs font-bold rounded-xl border-2 border-inverse-surface transition-all ${
                        selectedFilter.id === f.id ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface text-on-surface'
                      }`}
                    >
                      {f.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* AREA KANAN: HASIL FOTO STRIP DUAL 6-GRID */}
            <div className="lg:col-span-5 flex flex-col items-center gap-4">
              
              <div className="w-full flex gap-2 overflow-x-auto pb-2">
                {FRAMES.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setSelectedFrame(f)}
                    className={`whitespace-nowrap px-4 py-2 text-xs font-bold rounded-xl border-2 border-inverse-surface transition-all ${
                      selectedFrame.id === f.id ? 'bg-primary-container text-on-surface sticker-shadow-sm' : 'bg-surface-container-lowest text-on-surface'
                    }`}
                  >
                    {f.name}
                  </button>
                ))}
              </div>

              {/* PHOTO STRIP 6 GRID LAYOUT */}
              <div
                ref={stripRef}
                className={`w-[320px] p-4 ${selectedFrame.bg} ${selectedFrame.border} border-4 rounded-xl sticker-shadow flex flex-col gap-3 transition-all`}
              >
                <div className={`text-center font-extrabold tracking-widest text-[11px] uppercase ${selectedFrame.text}`}>
                  {selectedFrame.headerText}
                </div>

                {/* Name Header */}
                <div className="grid grid-cols-2 text-center text-[10px] font-bold border-b border-inverse-surface pb-1">
                  <span>{username || 'Anda'}</span>
                  <span>{connectedFriend?.name || 'Teman'}</span>
                </div>

                {/* Grid 3 Baris x 2 Kolom */}
                {[0, 1, 2].map((idx) => (
                  <div key={idx} className="grid grid-cols-2 gap-2">
                    {/* Slot Foto Saya */}
                    <div className="aspect-[4/3] bg-surface-container border-2 border-inverse-surface rounded-lg overflow-hidden flex items-center justify-center">
                      {myPhotos[idx] ? (
                        <img
                          src={myPhotos[idx]}
                          alt={`Foto Saya ${idx + 1}`}
                          className={`w-full h-full object-cover ${selectedFilter.class}`}
                        />
                      ) : (
                        <span className="text-[10px] font-bold opacity-30">Slot {idx + 1}</span>
                      )}
                    </div>

                    {/* Slot Foto Teman */}
                    <div className="aspect-[4/3] bg-surface-container border-2 border-inverse-surface rounded-lg overflow-hidden flex items-center justify-center">
                      {friendPhotos[idx] ? (
                        <img
                          src={friendPhotos[idx]}
                          alt={`Foto Teman ${idx + 1}`}
                          className={`w-full h-full object-cover ${selectedFilter.class}`}
                        />
                      ) : (
                        <span className="text-[10px] font-bold opacity-30">Slot {idx + 1}</span>
                      )}
                    </div>
                  </div>
                ))}

                <div className={`text-center text-[10px] font-bold ${selectedFrame.text} pt-1`}>
                  {new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })}
                </div>
              </div>

              <button
                onClick={downloadStrip}
                disabled={myPhotos.length === 0}
                className="w-[320px] flex items-center justify-center gap-2 bg-tertiary-container hover:bg-tertiary disabled:opacity-50 text-on-surface font-bold py-3 rounded-2xl border-2 border-inverse-surface sticker-shadow active-sticker-shadow transition-all"
              >
                <span className="material-symbols-outlined">download</span> Download 6-Grid Strip PNG
              </button>
            </div>

          </div>
        )}

        {/* PAGE 3: GALERI */}
        {currentPage === 'galeri' && (
          <div className="max-w-5xl mx-auto px-6 py-12 flex flex-col gap-8">
            <h2 className="text-3xl font-extrabold text-center text-on-surface">Galeri Momen Seru 📸</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {['Vintage Pop', 'Minty Fresh', 'Mono Yellow'].map((item, i) => (
                <div key={i} className="bg-surface-container-lowest p-4 border-2 border-inverse-surface rounded-2xl sticker-shadow text-center">
                  <div className="aspect-[1/2] w-full bg-secondary-container rounded-xl border-2 border-inverse-surface mb-3 flex items-center justify-center font-bold text-on-secondary-container">
                    Sample Strip #{i + 1}
                  </div>
                  <p className="font-bold text-on-surface">{item}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PAGE 4: FRAME */}
        {currentPage === 'frame' && (
          <div className="max-w-4xl mx-auto px-6 py-12 flex flex-col gap-6 text-center">
            <h2 className="text-3xl font-extrabold text-on-surface">Koleksi Bingkai Unik ✨</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {FRAMES.map((f) => (
                <div key={f.id} className="p-4 bg-surface-container-lowest border-2 border-inverse-surface rounded-2xl sticker-shadow flex flex-col items-center gap-3">
                  <div className={`w-32 h-48 ${f.bg} ${f.border} border-2 rounded-lg flex items-center justify-center font-bold text-xs p-2 text-center`}>
                    {f.headerText}
                  </div>
                  <span className="font-bold text-sm text-on-surface">{f.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PAGE 5: CARA KERJA */}
        {currentPage === 'cara-kerja' && (
          <div className="max-w-3xl mx-auto px-6 py-12 flex flex-col gap-6">
            <h2 className="text-3xl font-extrabold text-center text-on-surface mb-4">Cara Kerja SnapPop! 🚀</h2>
            <div className="flex flex-col gap-4">
              {[
                { step: '1', title: 'Buka Studio Kamera', desc: 'Izinkan akses webcam pada laptop atau smartphone Anda.' },
                { step: '2', title: 'Atur Username & ID Room', desc: 'Isi username Anda, klik Set, lalu salin ID Room untuk diberikan ke teman.' },
                { step: '3', title: 'Hubungkan Kamera Berdua', desc: 'Teman memasukkan ID Room Anda lalu klik Gabung untuk streaming berdua.' },
                { step: '4', title: 'Ambil Foto Bersama & Download', desc: 'Klik Mulai Foto Bersama sekali, foto 6-grid otomatis tersimpan dan siap diunduh.' },
              ].map((item) => (
                <div key={item.step} className="flex items-center gap-4 p-4 bg-surface-container-lowest border-2 border-inverse-surface rounded-2xl sticker-shadow">
                  <div className="w-12 h-12 rounded-full bg-primary-container border-2 border-inverse-surface flex items-center justify-center font-extrabold text-lg text-on-surface">
                    {item.step}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-on-surface">{item.title}</h3>
                    <p className="text-sm text-on-surface-variant">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>

      {/* ================= FOOTER ================= */}
      <footer className="w-full bg-surface-container border-t-2 border-inverse-surface py-12">
        <div className="px-6 lg:px-20 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">photo_camera</span>
              <span className="font-bold text-xl text-on-surface">SnapPop!</span>
            </div>
            <p className="text-sm text-on-surface-variant">
              Abadikan momen ceriamu dengan sentuhan sticker retro pop yang unik dan seru!
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <h4 className="font-bold uppercase tracking-wider text-xs text-on-surface">Navigasi</h4>
            <div className="flex flex-col gap-1 text-sm text-on-surface-variant">
              <button onClick={() => setCurrentPage('beranda')} className="text-left hover:text-primary">Beranda</button>
              <button onClick={() => setCurrentPage('galeri')} className="text-left hover:text-primary">Galeri</button>
              <button onClick={() => setCurrentPage('cara-kerja')} className="text-left hover:text-primary">Cara Kerja</button>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <h4 className="font-bold uppercase tracking-wider text-xs text-on-surface">Ikuti Kami</h4>
            <div className="flex gap-2">
              <div className="w-10 h-10 border-2 border-inverse-surface rounded-lg bg-surface-container-highest flex items-center justify-center sticker-shadow-sm">
                <span className="material-symbols-outlined text-sm text-on-surface">camera</span>
              </div>
              <div className="w-10 h-10 border-2 border-inverse-surface rounded-lg bg-surface-container-highest flex items-center justify-center sticker-shadow-sm">
                <span className="material-symbols-outlined text-sm text-on-surface">share</span>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-8 pt-4 border-t-2 border-inverse-surface/10 text-center text-xs text-on-surface-variant">
          © 2026 SnapPop Studio. Dibuat dengan penuh keceriaan.
        </div>
      </footer>

    </div>
  );
}