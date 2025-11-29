import React, { useState, useRef, useCallback } from 'react';
import { Upload, Download, RefreshCw, Settings, X, Sparkles, Image as ImageIcon, Palette } from 'lucide-react';

// Types
interface ShapeAsset {
  id: string;
  file: File;
  type: 'svg' | 'png';
  dataUrl: string;
  svgContent?: string;
  width: number;
  height: number;
}

interface PatternOptions {
  shapeCount: number;
  offsetIntensity: number;
  enableRotation: boolean;
  canvasSize: number;
}

interface PlacedShape {
  asset: ShapeAsset;
  x: number;
  y: number;
  rotation: number;
  scale: number;
}

const BrandPatternGenerator: React.FC = () => {
  const [shapes, setShapes] = useState<ShapeAsset[]>([]);
  const [pattern, setPattern] = useState<PlacedShape[] | null>(null);
  const [options, setOptions] = useState<PatternOptions>({
    shapeCount: 100,
    offsetIntensity: 0.3,
    enableRotation: true,
    canvasSize: 1080
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSettings, setShowSettings] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load and parse uploaded files
  const loadShapes = useCallback(async (files: FileList) => {
    const newShapes: ShapeAsset[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileType = file.type;

      if (!fileType.includes('svg') && !fileType.includes('png')) {
        alert(`Unsupported file type: ${file.name}`);
        continue;
      }

      const dataUrl = await readFileAsDataURL(file);
      const type: 'svg' | 'png' = fileType.includes('svg') ? 'svg' : 'png';

      let svgContent: string | undefined;
      let width = 100;
      let height = 100;

      if (type === 'svg') {
        svgContent = await readFileAsText(file);
        const dims = extractSVGDimensions(svgContent);
        width = dims.width;
        height = dims.height;
      } else {
        const dims = await getImageDimensions(dataUrl);
        width = dims.width;
        height = dims.height;
      }

      newShapes.push({
        id: `shape-${Date.now()}-${i}`,
        file,
        type,
        dataUrl,
        svgContent,
        width,
        height
      });
    }

    setShapes(prev => [...prev, ...newShapes]);
  }, []);

  // Helper: Read file as data URL
  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Helper: Read file as text
  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  // Helper: Extract SVG dimensions
  const extractSVGDimensions = (svgContent: string): { width: number; height: number } => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgContent, 'image/svg+xml');
    const svg = doc.querySelector('svg');

    if (svg) {
      const viewBox = svg.getAttribute('viewBox');
      if (viewBox) {
        const [, , w, h] = viewBox.split(' ').map(Number);
        return { width: w || 100, height: h || 100 };
      }

      const w = parseFloat(svg.getAttribute('width') || '100');
      const h = parseFloat(svg.getAttribute('height') || '100');
      return { width: w, height: h };
    }

    return { width: 100, height: 100 };
  };

  // Helper: Get image dimensions
  const getImageDimensions = (dataUrl: string): Promise<{ width: number; height: number }> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.width, height: img.height });
      img.src = dataUrl;
    });
  };

  // Generate pattern layout using grid-based distribution
  const generatePatternLayout = useCallback((opts: PatternOptions): PlacedShape[] => {
    if (shapes.length === 0) return [];

    const { shapeCount, offsetIntensity, enableRotation, canvasSize } = opts;
    const layout: PlacedShape[] = [];

    // Calculate grid dimensions
    const gridSize = Math.ceil(Math.sqrt(shapeCount));
    const cellSize = canvasSize / gridSize;

    // Generate positions
    for (let i = 0; i < shapeCount; i++) {
      const asset = shapes[Math.floor(Math.random() * shapes.length)];

      // Grid position
      const row = Math.floor(i / gridSize);
      const col = i % gridSize;

      // Base position (center of cell)
      const baseCenterX = col * cellSize + cellSize / 2;
      const baseCenterY = row * cellSize + cellSize / 2;

      // Random offset within cell
      const maxOffset = cellSize * offsetIntensity;
      const offsetX = (Math.random() - 0.5) * maxOffset;
      const offsetY = (Math.random() - 0.5) * maxOffset;

      // Final position
      const x = baseCenterX + offsetX;
      const y = baseCenterY + offsetY;

      // Rotation
      const rotation = enableRotation ? Math.random() * 360 : 0;

      // Scale to fit nicely in grid
      const maxDim = Math.max(asset.width, asset.height);
      const targetSize = cellSize * 0.6;
      const scale = targetSize / maxDim;

      layout.push({ asset, x, y, rotation, scale });
    }

    return layout;
  }, [shapes]);

  // Render pattern to canvas (PNG)
  const renderToCanvas = useCallback(async (
    layout: PlacedShape[],
    canvas: HTMLCanvasElement,
    size: number
  ) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = size;
    canvas.height = size;

    // Clear canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);

    // Load all images first
    const imageCache = new Map<string, HTMLImageElement>();

    for (const shape of layout) {
      if (!imageCache.has(shape.asset.id)) {
        const img = await loadImage(shape.asset.dataUrl);
        imageCache.set(shape.asset.id, img);
      }
    }

    // Draw each shape
    for (const shape of layout) {
      const img = imageCache.get(shape.asset.id)!;

      ctx.save();
      ctx.translate(shape.x, shape.y);
      ctx.rotate((shape.rotation * Math.PI) / 180);
      ctx.scale(shape.scale, shape.scale);

      ctx.drawImage(
        img,
        -shape.asset.width / 2,
        -shape.asset.height / 2,
        shape.asset.width,
        shape.asset.height
      );

      ctx.restore();
    }
  }, []);

  // Helper: Load image
  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  };

  // Render pattern to SVG
  const renderToSVG = useCallback((layout: PlacedShape[], size: number): string => {
    let svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <rect width="${size}" height="${size}" fill="white"/>
`;

    for (const shape of layout) {
      const { asset, x, y, rotation, scale } = shape;
      const transform = `translate(${x.toFixed(2)}, ${y.toFixed(2)}) rotate(${rotation.toFixed(2)}) scale(${scale.toFixed(4)})`;

      if (asset.type === 'svg' && asset.svgContent) {
        // Extract SVG content and embed it
        const parser = new DOMParser();
        const doc = parser.parseFromString(asset.svgContent, 'image/svg+xml');
        const svgEl = doc.querySelector('svg');

        if (svgEl) {
          const innerContent = svgEl.innerHTML;
          const viewBox = svgEl.getAttribute('viewBox') || `0 0 ${asset.width} ${asset.height}`;
          const [, , vbW, vbH] = viewBox.split(' ').map(Number);

          svgContent += `  <g transform="${transform} translate(${-vbW / 2}, ${-vbH / 2})">
    <svg viewBox="${viewBox}" width="${vbW}" height="${vbH}">
      ${innerContent}
    </svg>
  </g>
`;
        }
      } else {
        // Embed PNG as image
        svgContent += `  <image 
    href="${asset.dataUrl}" 
    width="${asset.width}" 
    height="${asset.height}" 
    transform="${transform} translate(${-asset.width / 2}, ${-asset.height / 2})"
  />
`;
      }
    }

    svgContent += '</svg>';
    return svgContent;
  }, []);

  // Generate pattern
  const generatePattern = useCallback(async () => {
    if (shapes.length === 0) {
      alert('Please upload at least one shape');
      return;
    }

    setIsGenerating(true);

    try {
      // Generate layout
      const layout = generatePatternLayout(options);
      setPattern(layout);

      // Render to preview canvas
      if (previewCanvasRef.current) {
        await renderToCanvas(layout, previewCanvasRef.current, 400);
      }

      // Render to full-size canvas (hidden)
      if (canvasRef.current) {
        await renderToCanvas(layout, canvasRef.current, options.canvasSize);
      }
    } catch (error) {
      console.error('Error generating pattern:', error);
      alert('Error generating pattern. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  }, [shapes, options, generatePatternLayout, renderToCanvas]);

  // Export PNG
  const exportPNG = useCallback(() => {
    if (!canvasRef.current || !pattern) return;

    canvasRef.current.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `brand-pattern-${Date.now()}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }
    }, 'image/png');
  }, [pattern]);

  // Export SVG
  const exportSVG = useCallback(() => {
    if (!pattern) return;

    const svgContent = renderToSVG(pattern, options.canvasSize);
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `brand-pattern-${Date.now()}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }, [pattern, options.canvasSize, renderToSVG]);

  // Handle file input
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      loadShapes(e.target.files);
    }
  };

  // Remove shape
  const removeShape = (id: string) => {
    setShapes(shapes.filter(s => s.id !== id));
  };

  return (
    <div className="min-h-screen bg-slate-900 p-8 text-slate-50 selection:bg-indigo-500/30">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12 text-center">
          <div className="inline-flex items-center justify-center p-3 bg-indigo-500/10 rounded-2xl mb-6 ring-1 ring-indigo-500/20">
            <Sparkles className="w-6 h-6 text-indigo-400 mr-2" />
            <span className="text-indigo-200 font-medium tracking-wide">AI-Powered Design Tool</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 text-transparent bg-clip-text tracking-tight">
            Brand Pattern Generator
          </h1>
          <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
            Transform your brand assets into stunning, balanced patterns.
            Upload your logo or shapes and let our algorithm create magic.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column - Upload & Settings */}
          <div className="lg:col-span-4 space-y-6">
            {/* Upload Section */}
            <div className="glass-panel rounded-2xl p-6 transition-all hover:border-indigo-500/30">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-indigo-400" />
                  Upload Shapes
                </h2>
                <span className="text-xs font-medium px-2 py-1 bg-slate-800 rounded-full text-slate-400 border border-slate-700">
                  {shapes.length} assets
                </span>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".svg,.png"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-slate-700 rounded-xl p-8 hover:border-indigo-500 hover:bg-slate-800/50 transition-all group flex flex-col items-center justify-center gap-3"
              >
                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Upload className="w-6 h-6 text-indigo-400" />
                </div>
                <div className="text-center">
                  <span className="block text-sm font-medium text-slate-200 mb-1">Click to upload SVG or PNG</span>
                  <span className="block text-xs text-slate-500">Multiple files supported</span>
                </div>
              </button>

              {/* Uploaded Shapes */}
              {shapes.length > 0 && (
                <div className="mt-6 grid grid-cols-4 gap-3">
                  {shapes.map(shape => (
                    <div key={shape.id} className="relative group aspect-square">
                      <div className="absolute inset-0 bg-slate-800 rounded-lg border border-slate-700 flex items-center justify-center p-2 transition-all group-hover:border-indigo-500/50">
                        <img src={shape.dataUrl} alt="" className="max-w-full max-h-full opacity-80 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <button
                        onClick={() => removeShape(shape.id)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all shadow-lg hover:bg-red-600 transform hover:scale-110"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Settings Panel */}
            <div className="glass-panel rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Settings className="w-5 h-5 text-purple-400" />
                  Configuration
                </h2>
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className={`p-2 rounded-lg transition-colors ${showSettings ? 'bg-indigo-500/20 text-indigo-300' : 'hover:bg-slate-800 text-slate-400'}`}
                >
                  <Palette className="w-4 h-4" />
                </button>
              </div>

              <div className={`space-y-6 transition-all duration-300 ${showSettings ? 'opacity-100' : 'opacity-50 grayscale'}`}>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <label className="text-slate-300 font-medium">Density</label>
                    <span className="text-indigo-300 font-mono">{options.shapeCount}</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="200"
                    value={options.shapeCount}
                    onChange={(e) => setOptions({ ...options, shapeCount: parseInt(e.target.value) })}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <label className="text-slate-300 font-medium">Chaos Factor</label>
                    <span className="text-purple-300 font-mono">{Math.round(options.offsetIntensity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="0.8"
                    step="0.1"
                    value={options.offsetIntensity}
                    onChange={(e) => setOptions({ ...options, offsetIntensity: parseFloat(e.target.value) })}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                  <label htmlFor="rotation" className="text-sm font-medium text-slate-300 cursor-pointer select-none">
                    Random Rotation
                  </label>
                  <div className="relative inline-block w-12 h-6 transition duration-200 ease-in-out rounded-full cursor-pointer">
                    <input
                      type="checkbox"
                      id="rotation"
                      checked={options.enableRotation}
                      onChange={(e) => setOptions({ ...options, enableRotation: e.target.checked })}
                      className="absolute w-6 h-6 opacity-0 cursor-pointer"
                    />
                    <label
                      htmlFor="rotation"
                      className={`block overflow-hidden h-6 rounded-full cursor-pointer transition-colors ${options.enableRotation ? 'bg-indigo-500' : 'bg-slate-700'}`}
                    ></label>
                    <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full shadow transition-transform ${options.enableRotation ? 'translate-x-6' : 'translate-x-0'}`}></div>
                  </div>
                </div>
              </div>

              <button
                onClick={generatePattern}
                disabled={shapes.length === 0 || isGenerating}
                className="w-full mt-8 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-xl hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 font-semibold shadow-lg shadow-indigo-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Creating Magic...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-5 h-5" />
                    Generate Pattern
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Column - Preview & Export */}
          <div className="lg:col-span-8 space-y-6">
            {/* Preview */}
            <div className="glass-panel rounded-2xl p-8 min-h-[600px] flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Live Preview</h2>
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50"></div>
                </div>
              </div>

              <div className="flex-1 bg-slate-950/50 rounded-xl border border-slate-800 p-8 flex items-center justify-center relative overflow-hidden group">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>

                {pattern ? (
                  <div className="relative z-10 shadow-2xl shadow-black/50 transition-transform duration-500 hover:scale-[1.02]">
                    <canvas
                      ref={previewCanvasRef}
                      className="max-w-full h-auto rounded-lg border border-slate-700"
                    />
                  </div>
                ) : (
                  <div className="text-center py-20 text-slate-600 relative z-10">
                    <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-slate-800/50 flex items-center justify-center border border-slate-700">
                      <Sparkles className="w-10 h-10 text-slate-500" />
                    </div>
                    <p className="text-lg font-medium text-slate-400">Ready to create something amazing?</p>
                    <p className="text-sm mt-2">Upload your assets to get started</p>
                  </div>
                )}
              </div>
            </div>

            {/* Export Options */}
            {pattern && (
              <div className="glass-panel rounded-2xl p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-semibold">Export Assets</h2>
                    <p className="text-sm text-slate-400 mt-1">
                      High-resolution downloads ready for production (1080 × 1080 px)
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={exportPNG}
                    className="group relative overflow-hidden bg-slate-800 text-white py-4 rounded-xl hover:bg-slate-700 transition-all border border-slate-700 hover:border-indigo-500/50"
                  >
                    <div className="relative z-10 flex items-center justify-center gap-3 font-medium">
                      <Download className="w-5 h-5 text-indigo-400" />
                      Download PNG
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  </button>

                  <button
                    onClick={exportSVG}
                    className="group relative overflow-hidden bg-slate-800 text-white py-4 rounded-xl hover:bg-slate-700 transition-all border border-slate-700 hover:border-purple-500/50"
                  >
                    <div className="relative z-10 flex items-center justify-center gap-3 font-medium">
                      <Download className="w-5 h-5 text-purple-400" />
                      Download SVG
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hidden full-size canvas */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default BrandPatternGenerator;