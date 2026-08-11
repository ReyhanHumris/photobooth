import React, { useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import { toPng } from 'html-to-image';
import confetti from 'canvas-confetti';
import { Camera, RefreshCw, Download, Sparkles, Timer, Palette } from 'lucide-react';

const FRAMES = [
  { id: 'cream', name: 'Soft Cream', bg: 'bg-[#FDFBF7]', text: 'text-[#2D3142]', border: 'border-[#2D3142]' },
  { id: 'y2k', name: 'Cyber Y2K', bg: 'bg-gradient-to-r from-teal-200 to-pink-200', text: 'text-purple-950', border: 'border-purple-400' },
  { id: 'newspaper', name: 'Editorial', bg: 'bg-[#F4F1EA]', text: 'text-stone-900', border: 'border-stone-800' },
  { id: 'minimal', name: 'Dark Mode', bg: 'bg-stone-900', text: 'text-stone-100', border: 'border-stone-700' },
];

const FILTERS = [
  { id: 'none', name: 'Normal', class: '' },
  { id: 'grayscale', name: 'B&W Film', class: 'grayscale' },
  { id: 'sepia', name: 'Warm Vintage', class: 'sepia contrast-125' },
  { id: 'soft', name: 'Soft Pastel', class: 'brightness-105 contrast-90 saturate-125' },
];

export default function Photobooth() {
  const webcamRef = useRef(null);
  const stripRef = useRef(null);

  const [photos, setPhotos] = useState([]);
  const [countdown, setCountdown] = useState(null);
  const [selectedFrame, setSelectedFrame] = useState(FRAMES[0]);
  const [selectedFilter, setSelectedFilter] = useState(FILTERS[0]);
  const [timerDelay, setTimerDelay] = useState(3);
  const [isCapturing, setIsCapturing] = useState(false);

  // Fungsi Ambil Foto Individual
  const capturePhoto = useCallback(() => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      setPhotos((prev) => [...prev, imageSrc]);
    }
  }, [webcamRef]);

  // Handler Tombol Jepret (dengan Timer)
  const startSession = () => {
    if (photos.length >= 3) return;
    setIsCapturing(true);
    let count = timerDelay;
    setCountdown(count);

    const interval = setInterval(() => {
      count -= 1;
      if (count > 0) {
        setCountdown(count);
      } else {
        clearInterval(interval);
        setCountdown(null);
        capturePhoto();
        setIsCapturing(false);
      }
    }, 1000);
  };

  // Reset Sesi Foto
  const resetPhotos = () => {
    setPhotos([]);
  };

  // Unduh Hasil Photo Strip
  const downloadStrip = async () => {
    if (!stripRef.current) return;
    try {
      const dataUrl = await toPng(stripRef.current, { cacheBust: true, pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = `snappop-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
      
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    } catch (err) {
      console.error('Gagal mengunduh gambar:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#2D3142] p-4 md:p-8 font-sans">
      {/* Header */}
      <header className="max-w-5xl mx-auto flex justify-between items-center mb-8">
        <div className="flex items-center gap-2">
          <div className="bg-[#FFE893] p-2 rounded-2xl border-2 border-[#2D3142] shadow-[3px_3px_0px_#2D3142]">
            <Sparkles className="w-6 h-6 text-[#2D3142]" />
          </div>
          <h1 className="text-2xl font-black tracking-tight">SnapPop!</h1>
        </div>
        <span className="bg-[#A0E7E5] px-4 py-1.5 rounded-full text-xs font-bold border-2 border-[#2D3142]">
          ✨ Cute & Unisex Photobooth
        </span>
      </header>

      {/* Main Workspace */}
      <main className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Camera Preview & Controls */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="relative bg-white p-4 rounded-3xl border-4 border-[#2D3142] shadow-[6px_6px_0px_#2D3142] overflow-hidden">
            
            {/* Countdown Overlay */}
            {countdown !== null && (
              <div className="absolute inset-0 z-20 bg-black/40 backdrop-blur-sm flex items-center justify-center">
                <span className="text-8xl font-black text-white animate-bounce">
                  {countdown}
                </span>
              </div>
            )}

            {/* Live Camera Feed */}
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden border-2 border-[#2D3142] bg-stone-100">
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                videoConstraints={{ facingMode: "user" }}
                className={`w-full h-full object-cover ${selectedFilter.class}`}
              />
            </div>

            {/* Controls Bar */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              {/* Timer Selector */}
              <div className="flex items-center gap-1 bg-[#F4F1EA] p-1 rounded-xl border-2 border-[#2D3142]">
                <Timer className="w-4 h-4 ml-2" />
                {[3, 5, 10].map((sec) => (
                  <button
                    key={sec}
                    onClick={() => setTimerDelay(sec)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                      timerDelay === sec ? 'bg-[#FFE893] border border-[#2D3142]' : 'opacity-60'
                    }`}
                  >
                    {sec}s
                  </button>
                ))}
              </div>

              {/* Shutter Button */}
              <button
                onClick={startSession}
                disabled={isCapturing || photos.length >= 3}
                className="flex items-center gap-2 bg-[#FFAAA6] hover:bg-[#ff9691] disabled:opacity-50 text-[#2D3142] font-black px-6 py-3 rounded-2xl border-2 border-[#2D3142] shadow-[3px_3px_0px_#2D3142] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
              >
                <Camera className="w-5 h-5" />
                {photos.length >= 3 ? 'Frame Full' : 'Take Shot'}
              </button>

              {/* Reset */}
              <button
                onClick={resetPhotos}
                className="p-3 bg-[#F4F1EA] hover:bg-stone-200 rounded-xl border-2 border-[#2D3142]"
                title="Reset Photos"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filter Customizer */}
          <div className="bg-white p-4 rounded-2xl border-2 border-[#2D3142] shadow-[4px_4px_0px_#2D3142]">
            <div className="flex items-center gap-2 mb-3">
              <Palette className="w-4 h-4" />
              <h3 className="text-xs font-bold uppercase tracking-wider">Select Filter</h3>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSelectedFilter(f)}
                  className={`py-2 px-3 text-xs font-bold rounded-xl border-2 border-[#2D3142] transition-all ${
                    selectedFilter.id === f.id ? 'bg-[#A0E7E5]' : 'bg-[#FDFBF7] opacity-70'
                  }`}
                >
                  {f.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Live Photo Strip Preview */}
        <div className="lg:col-span-5 flex flex-col items-center gap-4">
          
          {/* Frame Theme Options */}
          <div className="w-full flex gap-2 overflow-x-auto pb-2">
            {FRAMES.map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedFrame(f)}
                className={`whitespace-nowrap px-3 py-1.5 text-xs font-bold rounded-xl border-2 border-[#2D3142] transition-all ${
                  selectedFrame.id === f.id ? 'bg-[#FFE893] shadow-[2px_2px_0px_#2D3142]' : 'bg-white'
                }`}
              >
                {f.name}
              </button>
            ))}
          </div>

          {/* Exportable Photo Strip */}
          <div
            ref={stripRef}
            className={`w-[260px] p-4 ${selectedFrame.bg} ${selectedFrame.border} border-4 rounded-xl shadow-[8px_8px_0px_#2D3142] flex flex-col gap-3 transition-all`}
          >
            {/* Header Text di Strip */}
            <div className={`text-center font-black tracking-widest text-xs uppercase ${selectedFrame.text}`}>
              SnapPop! • Studio
            </div>

            {/* Photo Slots (3 Frames) */}
            {[0, 1, 2].map((idx) => (
              <div
                key={idx}
                className="relative aspect-[4/3] bg-stone-200/50 border-2 border-[#2D3142] rounded-lg overflow-hidden flex items-center justify-center"
              >
                {photos[idx] ? (
                  <img
                    src={photos[idx]}
                    alt={`Capture ${idx + 1}`}
                    className={`w-full h-full object-cover ${selectedFilter.class}`}
                  />
                ) : (
                  <span className="text-xs font-bold opacity-30">Slot {idx + 1}</span>
                )}
              </div>
            ))}

            {/* Footer Text di Strip */}
            <div className={`text-center text-[10px] font-bold opacity-80 ${selectedFrame.text} pt-1`}>
              {new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })}
            </div>
          </div>

          {/* Action Download */}
          <button
            onClick={downloadStrip}
            disabled={photos.length === 0}
            className="w-[260px] flex items-center justify-center gap-2 bg-[#B4E197] hover:bg-[#a0d680] disabled:opacity-50 text-[#2D3142] font-black py-3 rounded-2xl border-2 border-[#2D3142] shadow-[4px_4px_0px_#2D3142] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
          >
            <Download className="w-4 h-4" />
            Download Strip
          </button>
        </div>

      </main>
    </div>
  );
}