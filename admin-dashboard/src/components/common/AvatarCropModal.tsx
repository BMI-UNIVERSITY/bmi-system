import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Upload, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  RotateCcw, 
  Move, 
  Check, 
  X, 
  Image as ImageIcon, 
  Sparkles, 
  RefreshCw 
} from 'lucide-react';

interface AvatarCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCropComplete: (croppedImageDataUrl: string) => void;
  currentAvatarUrl?: string;
  studentName?: string;
}

const PRESET_PORTRAITS = [
  { label: 'Student Male 1', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80' },
  { label: 'Student Female 1', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=500&auto=format&fit=crop&q=80' },
  { label: 'Student Male 2', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80' },
  { label: 'Student Female 2', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500&auto=format&fit=crop&q=80' },
];

export const AvatarCropModal: React.FC<AvatarCropModalProps> = ({
  isOpen,
  onClose,
  onCropComplete,
  currentAvatarUrl,
  studentName = 'Student'
}) => {
  const [imageSrc, setImageSrc] = useState<string | null>(currentAvatarUrl || null);
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [croppedPreview, setCroppedPreview] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Load image object whenever imageSrc changes
  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageRef.current = img;
      setPan({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
      drawCanvas();
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // Redraw canvas on transformation state changes
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 300; // Output target resolution 300x300
    canvas.width = size;
    canvas.height = size;

    ctx.clearRect(0, 0, size, size);

    ctx.save();
    // Move origin to center of canvas
    ctx.translate(size / 2 + pan.x, size / 2 + pan.y);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom, zoom);

    // Calculate image render aspect ratio centered
    const aspect = img.width / img.height;
    let drawW = size;
    let drawH = size;
    if (aspect > 1) {
      drawH = size / aspect;
    } else {
      drawW = size * aspect;
    }

    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();

    // Generate real-time preview URL
    try {
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      setCroppedPreview(dataUrl);
    } catch {
      // Ignore cross-origin error on external placeholder images if un-cleared
    }
  }, [pan, zoom, rotation]);

  useEffect(() => {
    if (imageSrc && imageRef.current) {
      drawCanvas();
    }
  }, [drawCanvas, imageSrc, pan, zoom, rotation]);

  if (!isOpen) return null;

  // File Upload Handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImageSrc(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImageSrc(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Mouse & Touch Pan Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - pan.x,
        y: e.touches[0].clientY - pan.y
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (isDragging && e.touches.length === 1) {
      setPan({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y
      });
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Finalize Crop & Save
  const handleSaveCroppedAvatar = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.95);
      onCropComplete(croppedDataUrl);
      onClose();
    } catch (err) {
      console.error('Error cropping image:', err);
      // Fallback if cross-origin image cannot be exported by canvas
      if (imageSrc) {
        onCropComplete(imageSrc);
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-white text-sm sm:text-base">Upload & Crop Student Avatar</h2>
              <p className="text-[11px] text-slate-400">Position & crop photo for official Student ID & SIS profile</p>
            </div>
          </div>

          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          
          {/* File Select & Drop Area */}
          {!imageSrc ? (
            <div 
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-2xl p-6 sm:p-8 text-center cursor-pointer bg-slate-950/50 hover:bg-slate-950 transition group"
            >
              <input 
                ref={fileInputRef}
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleFileChange}
              />
              <div className="w-12 h-12 rounded-full bg-slate-800 group-hover:bg-indigo-600/20 text-slate-400 group-hover:text-indigo-400 flex items-center justify-center mx-auto mb-3 transition">
                <Upload className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-white text-sm mb-1">Click or drag photo here to upload</h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">Supports JPG, PNG, WEBP files up to 10MB.</p>

              {/* Sample Presets */}
              <div className="mt-6 pt-4 border-t border-slate-800/80">
                <p className="text-[11px] font-semibold text-slate-400 mb-2">Or choose a sample official portrait:</p>
                <div className="grid grid-cols-4 gap-2">
                  {PRESET_PORTRAITS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setImageSrc(preset.url);
                      }}
                      className="p-1 rounded-xl bg-slate-800 hover:bg-indigo-600/30 border border-slate-700 hover:border-indigo-500 transition text-center group"
                    >
                      <img src={preset.url} alt={preset.label} className="w-12 h-12 rounded-lg object-cover mx-auto mb-1" />
                      <span className="text-[9px] text-slate-300 block truncate font-medium">{preset.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              
              {/* Interactive Cropping Viewport */}
              <div className="relative bg-slate-950 rounded-2xl border border-slate-800 p-2 overflow-hidden flex flex-col items-center justify-center select-none">
                
                {/* Crop Box Container */}
                <div 
                  className="relative w-[260px] h-[260px] rounded-xl overflow-hidden cursor-move touch-none flex items-center justify-center shadow-inner"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                >
                  {/* Grid Lines */}
                  <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 opacity-20 border border-white/20">
                    <div className="border-r border-b border-white/20"></div>
                    <div className="border-r border-b border-white/20"></div>
                    <div className="border-b border-white/20"></div>
                    <div className="border-r border-b border-white/20"></div>
                    <div className="border-r border-b border-white/20"></div>
                    <div className="border-b border-white/20"></div>
                    <div className="border-r border-white/20"></div>
                    <div className="border-r border-white/20"></div>
                    <div></div>
                  </div>

                  {/* Circular Overlay Mask according to avatar standard */}
                  <div className="absolute inset-0 pointer-events-none border-[3px] border-indigo-400 rounded-full shadow-[0_0_0_9999px_rgba(15,23,42,0.7)] z-10"></div>

                  {/* Hidden Render Canvas */}
                  <canvas ref={canvasRef} className="hidden" />

                  {/* Displaying Cropped Render Canvas Live or image */}
                  <div className="w-full h-full flex items-center justify-center">
                    {croppedPreview && (
                      <img 
                        src={croppedPreview} 
                        alt="Crop Preview" 
                        className="w-full h-full object-cover rounded-full"
                      />
                    )}
                  </div>

                  {/* Drag Prompt */}
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 pointer-events-none bg-slate-900/80 backdrop-blur-sm text-[10px] text-slate-300 px-2 py-0.5 rounded-full border border-slate-700/60 flex items-center space-x-1">
                    <Move className="w-2.5 h-2.5 text-indigo-400" />
                    <span>Drag to position</span>
                  </div>
                </div>

                {/* Change photo button */}
                <div className="flex items-center justify-between w-full px-2 pt-2 text-xs">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-indigo-400 hover:text-indigo-300 font-semibold flex items-center space-x-1"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Choose different photo</span>
                  </button>
                  <input 
                    ref={fileInputRef}
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleFileChange}
                  />

                  <button
                    type="button"
                    onClick={() => {
                      setZoom(1);
                      setPan({ x: 0, y: 0 });
                      setRotation(0);
                    }}
                    className="text-slate-400 hover:text-white flex items-center space-x-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Reset controls</span>
                  </button>
                </div>
              </div>

              {/* Transformation Controls */}
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 space-y-3">
                
                {/* Zoom Slider */}
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-1.5">
                    <span className="flex items-center space-x-1">
                      <ZoomIn className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Zoom Scale ({Math.round(zoom * 100)}%)</span>
                    </span>
                    <span className="text-[10px] text-slate-500">1x - 3x</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={() => setZoom(prev => Math.max(0.8, prev - 0.1))}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="range"
                      min="0.8"
                      max="3.0"
                      step="0.05"
                      value={zoom}
                      onChange={(e) => setZoom(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => setZoom(prev => Math.min(3.0, prev + 0.1))}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Rotation Controls */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                  <span className="text-xs font-semibold text-slate-300 flex items-center space-x-1">
                    <RotateCw className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Rotate Image ({rotation}°)</span>
                  </span>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setRotation(prev => (prev - 90 + 360) % 360)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center space-x-1 transition"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>-90°</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRotation(prev => (prev + 90) % 360)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center space-x-1 transition"
                    >
                      <RotateCw className="w-3 h-3" />
                      <span>+90°</span>
                    </button>
                  </div>
                </div>

              </div>

              {/* Sample Presets selector below image if user wants to change easily */}
              <div className="pt-1">
                <p className="text-[11px] font-semibold text-slate-400 mb-1.5">Or quick select standard sample portrait:</p>
                <div className="flex space-x-2 overflow-x-auto pb-1">
                  {PRESET_PORTRAITS.map((p, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setImageSrc(p.url)}
                      className="flex items-center space-x-1.5 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 shrink-0 text-xs text-slate-300"
                    >
                      <img src={p.url} className="w-5 h-5 rounded-full object-cover" />
                      <span className="text-[10px]">{p.label}</span>
                    </button>
                  ))}
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={!imageSrc}
            onClick={handleSaveCroppedAvatar}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition flex items-center space-x-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Apply Cropped Avatar</span>
          </button>
        </div>

      </div>
    </div>
  );
};
