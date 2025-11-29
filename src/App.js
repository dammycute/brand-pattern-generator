import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useRef, useCallback } from 'react';
import { Upload, Download, RefreshCw, Settings, X } from 'lucide-react';
const BrandPatternGenerator = () => {
    const [shapes, setShapes] = useState([]);
    const [pattern, setPattern] = useState(null);
    const [options, setOptions] = useState({
        shapeCount: 100,
        offsetIntensity: 0.3,
        enableRotation: true,
        canvasSize: 1080
    });
    const [isGenerating, setIsGenerating] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const canvasRef = useRef(null);
    const previewCanvasRef = useRef(null);
    const fileInputRef = useRef(null);
    // Load and parse uploaded files
    const loadShapes = useCallback(async (files) => {
        const newShapes = [];
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const fileType = file.type;
            if (!fileType.includes('svg') && !fileType.includes('png')) {
                alert(`Unsupported file type: ${file.name}`);
                continue;
            }
            const dataUrl = await readFileAsDataURL(file);
            const type = fileType.includes('svg') ? 'svg' : 'png';
            let svgContent;
            let width = 100;
            let height = 100;
            if (type === 'svg') {
                svgContent = await readFileAsText(file);
                const dims = extractSVGDimensions(svgContent);
                width = dims.width;
                height = dims.height;
            }
            else {
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
    const readFileAsDataURL = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };
    // Helper: Read file as text
    const readFileAsText = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    };
    // Helper: Extract SVG dimensions
    const extractSVGDimensions = (svgContent) => {
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
    const getImageDimensions = (dataUrl) => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve({ width: img.width, height: img.height });
            img.src = dataUrl;
        });
    };
    // Generate pattern layout using grid-based distribution
    const generatePatternLayout = useCallback((opts) => {
        if (shapes.length === 0)
            return [];
        const { shapeCount, offsetIntensity, enableRotation, canvasSize } = opts;
        const layout = [];
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
    const renderToCanvas = useCallback(async (layout, canvas, size) => {
        const ctx = canvas.getContext('2d');
        if (!ctx)
            return;
        canvas.width = size;
        canvas.height = size;
        // Clear canvas
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, size, size);
        // Load all images first
        const imageCache = new Map();
        for (const shape of layout) {
            if (!imageCache.has(shape.asset.id)) {
                const img = await loadImage(shape.asset.dataUrl);
                imageCache.set(shape.asset.id, img);
            }
        }
        // Draw each shape
        for (const shape of layout) {
            const img = imageCache.get(shape.asset.id);
            ctx.save();
            ctx.translate(shape.x, shape.y);
            ctx.rotate((shape.rotation * Math.PI) / 180);
            ctx.scale(shape.scale, shape.scale);
            ctx.drawImage(img, -shape.asset.width / 2, -shape.asset.height / 2, shape.asset.width, shape.asset.height);
            ctx.restore();
        }
    }, []);
    // Helper: Load image
    const loadImage = (src) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });
    };
    // Render pattern to SVG
    const renderToSVG = useCallback((layout, size) => {
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
            }
            else {
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
        }
        catch (error) {
            console.error('Error generating pattern:', error);
            alert('Error generating pattern. Please try again.');
        }
        finally {
            setIsGenerating(false);
        }
    }, [shapes, options, generatePatternLayout, renderToCanvas]);
    // Export PNG
    const exportPNG = useCallback(() => {
        if (!canvasRef.current || !pattern)
            return;
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
        if (!pattern)
            return;
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
    const handleFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            loadShapes(e.target.files);
        }
    };
    // Remove shape
    const removeShape = (id) => {
        setShapes(shapes.filter(s => s.id !== id));
    };
    return (_jsxs("div", { className: "min-h-screen bg-gray-50 p-8", children: [_jsxs("div", { className: "max-w-7xl mx-auto", children: [_jsx("h1", { className: "text-4xl font-bold text-gray-900 mb-2", children: "Brand Pattern Generator" }), _jsx("p", { className: "text-gray-600 mb-8", children: "Upload your brand shapes and generate beautiful, balanced patterns" }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-3 gap-8", children: [_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "bg-white rounded-lg shadow-sm p-6", children: [_jsx("h2", { className: "text-xl font-semibold mb-4", children: "Upload Shapes" }), _jsx("input", { ref: fileInputRef, type: "file", accept: ".svg,.png", multiple: true, onChange: handleFileChange, className: "hidden" }), _jsxs("button", { onClick: () => fileInputRef.current?.click(), className: "w-full border-2 border-dashed border-gray-300 rounded-lg p-8 hover:border-blue-500 hover:bg-blue-50 transition-colors flex flex-col items-center justify-center gap-2", children: [_jsx(Upload, { className: "w-8 h-8 text-gray-400" }), _jsx("span", { className: "text-sm text-gray-600", children: "Click to upload SVG or PNG" }), _jsx("span", { className: "text-xs text-gray-400", children: "Multiple files supported" })] }), shapes.length > 0 && (_jsxs("div", { className: "mt-4 space-y-2", children: [_jsxs("h3", { className: "text-sm font-medium text-gray-700", children: ["Uploaded (", shapes.length, ")"] }), _jsx("div", { className: "grid grid-cols-4 gap-2", children: shapes.map(shape => (_jsxs("div", { className: "relative group", children: [_jsx("div", { className: "aspect-square bg-gray-100 rounded border border-gray-200 p-2 flex items-center justify-center", children: _jsx("img", { src: shape.dataUrl, alt: "", className: "max-w-full max-h-full" }) }), _jsx("button", { onClick: () => removeShape(shape.id), className: "absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity", children: _jsx(X, { className: "w-3 h-3" }) })] }, shape.id))) })] }))] }), _jsxs("div", { className: "bg-white rounded-lg shadow-sm p-6", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsx("h2", { className: "text-xl font-semibold", children: "Settings" }), _jsx("button", { onClick: () => setShowSettings(!showSettings), className: "text-gray-500 hover:text-gray-700", children: _jsx(Settings, { className: "w-5 h-5" }) })] }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsxs("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: ["Number of Shapes: ", options.shapeCount] }), _jsx("input", { type: "range", min: "20", max: "200", value: options.shapeCount, onChange: (e) => setOptions({ ...options, shapeCount: parseInt(e.target.value) }), className: "w-full" })] }), _jsxs("div", { children: [_jsxs("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: ["Offset Intensity: ", Math.round(options.offsetIntensity * 100), "%"] }), _jsx("input", { type: "range", min: "0", max: "0.8", step: "0.1", value: options.offsetIntensity, onChange: (e) => setOptions({ ...options, offsetIntensity: parseFloat(e.target.value) }), className: "w-full" })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("input", { type: "checkbox", id: "rotation", checked: options.enableRotation, onChange: (e) => setOptions({ ...options, enableRotation: e.target.checked }), className: "rounded" }), _jsx("label", { htmlFor: "rotation", className: "text-sm font-medium text-gray-700", children: "Enable Rotation" })] })] }), _jsx("button", { onClick: generatePattern, disabled: shapes.length === 0 || isGenerating, className: "w-full mt-6 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium", children: isGenerating ? (_jsxs(_Fragment, { children: [_jsx(RefreshCw, { className: "w-5 h-5 animate-spin" }), "Generating..."] })) : (_jsxs(_Fragment, { children: [_jsx(RefreshCw, { className: "w-5 h-5" }), "Generate Pattern"] })) })] })] }), _jsxs("div", { className: "lg:col-span-2 space-y-6", children: [_jsxs("div", { className: "bg-white rounded-lg shadow-sm p-6", children: [_jsx("h2", { className: "text-xl font-semibold mb-4", children: "Preview" }), _jsx("div", { className: "bg-gray-100 rounded-lg p-4 flex items-center justify-center", children: pattern ? (_jsx("canvas", { ref: previewCanvasRef, className: "max-w-full border border-gray-300 rounded shadow-sm" })) : (_jsxs("div", { className: "text-center py-20 text-gray-400", children: [_jsx(RefreshCw, { className: "w-16 h-16 mx-auto mb-4" }), _jsx("p", { children: "Upload shapes and click Generate Pattern" })] })) })] }), pattern && (_jsxs("div", { className: "bg-white rounded-lg shadow-sm p-6", children: [_jsx("h2", { className: "text-xl font-semibold mb-4", children: "Export Options" }), _jsx("p", { className: "text-sm text-gray-600 mb-4", children: "Download your pattern as PNG or SVG (1080 \u00D7 1080 px)" }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("button", { onClick: exportPNG, className: "bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 font-medium", children: [_jsx(Download, { className: "w-5 h-5" }), "Download PNG"] }), _jsxs("button", { onClick: exportSVG, className: "bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2 font-medium", children: [_jsx(Download, { className: "w-5 h-5" }), "Download SVG"] })] })] }))] })] })] }), _jsx("canvas", { ref: canvasRef, className: "hidden" })] }));
};
export default BrandPatternGenerator;
//# sourceMappingURL=App.js.map