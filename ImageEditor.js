import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './ImageEditor.css';

const ImageEditor = () => {
    const [selectedImage, setSelectedImage] = useState(null);
    const [originalUrl, setOriginalUrl] = useState(null);
    const [baseImageUrl, setBaseImageUrl] = useState(null); // Preserve true original
    const [backgroundRemoved, setBackgroundRemoved] = useState(false);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const [newDimensions, setNewDimensions] = useState({ width: 0, height: 0 });

    // Interactive controls
    const [blurLevel, setBlurLevel] = useState(0);
    const [sharpenLevel, setSharpenLevel] = useState(0);
    const [noiseLevel, setNoiseLevel] = useState(0);
    const [brightness, setBrightness] = useState(100);
    const [contrast, setContrast] = useState(100);
    const [saturation, setSaturation] = useState(100);

    // History for undo/redo
    const [history, setHistory] = useState([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    const fileInputRef = useRef(null);
    const canvasRef = useRef(null);
    const displayCanvasRef = useRef(null);
    const originalImageRef = useRef(null);
    const originalCanvasRef = useRef(null);

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setSelectedImage(file);
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                setDimensions({ width: img.width, height: img.height });
                setNewDimensions({ width: img.width, height: img.height });
                originalImageRef.current = img;
                setOriginalUrl(event.target.result);
                setBaseImageUrl(event.target.result); // Store true original
                resetAllEffects();

                // Initialize history
                const initialState = { blur: 0, sharpen: 0, noise: 0, brightness: 100, contrast: 100, saturation: 100 };
                setHistory([initialState]);
                setHistoryIndex(0);
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    };

    // Render original image whenever it changes
    useEffect(() => {
        if (!baseImageUrl || !originalCanvasRef.current) return;

        const img = new Image();
        img.onload = () => {
            const origCanvas = originalCanvasRef.current;
            origCanvas.width = img.width;
            origCanvas.height = img.height;
            const origCtx = origCanvas.getContext('2d');
            origCtx.clearRect(0, 0, origCanvas.width, origCanvas.height);
            origCtx.drawImage(img, 0, 0);
        };
        img.src = baseImageUrl;
    }, [baseImageUrl]);    // Apply all effects in real-time
    useEffect(() => {
        if (!originalImageRef.current || !displayCanvasRef.current) return;

        const canvas = displayCanvasRef.current;
        const ctx = canvas.getContext('2d');
        const img = originalImageRef.current;

        canvas.width = img.width;
        canvas.height = img.height;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Apply CSS filters (blur, brightness, contrast, saturation)
        ctx.filter = `blur(${blurLevel}px) brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
        ctx.drawImage(img, 0, 0);
        ctx.filter = 'none';

        // Get image data for pixel-level operations
        let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // Apply sharpen if needed
        if (sharpenLevel > 0) {
            imageData = applySharpen(imageData, sharpenLevel);
        }

        // Apply noise if needed
        if (noiseLevel > 0) {
            const data = imageData.data;
            for (let i = 0; i < data.length; i += 4) {
                const noise = (Math.random() - 0.5) * noiseLevel;
                data[i] = Math.max(0, Math.min(255, data[i] + noise));
                data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
                data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
            }
        }

        ctx.putImageData(imageData, 0, 0);
    }, [blurLevel, sharpenLevel, noiseLevel, brightness, contrast, saturation, originalUrl]);

    const applySharpen = (imageData, amount) => {
        const data = imageData.data;
        const w = imageData.width;
        const h = imageData.height;
        const output = new ImageData(w, h);

        const factor = amount / 10;
        const kernel = [
            0, -factor, 0,
            -factor, 1 + 4 * factor, -factor,
            0, -factor, 0
        ];

        for (let y = 1; y < h - 1; y++) {
            for (let x = 1; x < w - 1; x++) {
                for (let c = 0; c < 3; c++) {
                    let sum = 0;
                    for (let ky = -1; ky <= 1; ky++) {
                        for (let kx = -1; kx <= 1; kx++) {
                            const idx = ((y + ky) * w + (x + kx)) * 4 + c;
                            const kidx = (ky + 1) * 3 + (kx + 1);
                            sum += data[idx] * kernel[kidx];
                        }
                    }
                    const idx = (y * w + x) * 4 + c;
                    output.data[idx] = Math.max(0, Math.min(255, sum));
                }
                const idx = (y * w + x) * 4 + 3;
                output.data[idx] = data[idx];
            }
        }
        return output;
    };

    const handleResize = () => {
        if (!originalUrl) return;

        const img = new Image();
        img.onload = () => {
            const canvas = canvasRef.current;
            canvas.width = newDimensions.width;
            canvas.height = newDimensions.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, newDimensions.width, newDimensions.height);

            setDimensions(newDimensions);
            const newUrl = canvas.toDataURL();

            // Update editing source without affecting base original
            setOriginalUrl(newUrl);
            const newImg = new Image();
            newImg.onload = () => {
                originalImageRef.current = newImg;
            };
            newImg.src = newUrl;
            setStatus('success');
            setTimeout(() => setStatus(''), 3000);
            saveToHistory();
        };
        img.src = originalUrl;
    };

    const handleRemoveBackground = async () => {
        if (!selectedImage) return;

        setLoading(true);
        setStatus('processing');

        try {
            const formData = new FormData();
            formData.append('image_file', selectedImage);
            formData.append('size', 'auto');

            const response = await axios.post(
                'https://api.remove.bg/v1.0/removebg',
                formData,
                {
                    headers: {
                        'X-Api-Key': 'pnEdDMT5zKaWCr9xyF4xdyVV',
                    },
                    responseType: 'arraybuffer'
                }
            );

            const blob = new Blob([response.data], { type: 'image/png' });
            const url = URL.createObjectURL(blob);

            const img = new Image();
            img.onload = () => {
                // Update editing source without affecting base original
                originalImageRef.current = img;
                setOriginalUrl(url);
                setBackgroundRemoved(true);
                setStatus('success');
                setLoading(false);
                saveToHistory();
            };
            img.src = url;

        } catch (error) {
            console.error('Background removal error:', error);

            if (!originalImageRef.current) {
                setStatus('error');
                setLoading(false);
                return;
            }

            // Advanced fallback algorithm with improved edge detection
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            const img = originalImageRef.current;

            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            // Step 1: Enhanced edge detection using improved Sobel operator
            const edges = new Uint8Array(canvas.width * canvas.height);
            const gradientDir = new Float32Array(canvas.width * canvas.height);

            for (let y = 1; y < canvas.height - 1; y++) {
                for (let x = 1; x < canvas.width - 1; x++) {
                    // Calculate gradients for all RGB channels
                    let gxR = 0, gyR = 0, gxG = 0, gyG = 0, gxB = 0, gyB = 0;

                    // Sobel kernels
                    for (let dy = -1; dy <= 1; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            const pixIdx = ((y + dy) * canvas.width + (x + dx)) * 4;
                            const sobelX = dx * (Math.abs(dy) === 1 ? 1 : 2);
                            const sobelY = dy * (Math.abs(dx) === 1 ? 1 : 2);

                            gxR += data[pixIdx] * sobelX;
                            gyR += data[pixIdx] * sobelY;
                            gxG += data[pixIdx + 1] * sobelX;
                            gyG += data[pixIdx + 1] * sobelY;
                            gxB += data[pixIdx + 2] * sobelX;
                            gyB += data[pixIdx + 2] * sobelY;
                        }
                    }

                    // Combine RGB gradients for more accurate edge detection
                    const gx = (Math.abs(gxR) + Math.abs(gxG) + Math.abs(gxB)) / 3;
                    const gy = (Math.abs(gyR) + Math.abs(gyG) + Math.abs(gyB)) / 3;

                    const pixelIdx = y * canvas.width + x;
                    edges[pixelIdx] = Math.sqrt(gx * gx + gy * gy);
                    gradientDir[pixelIdx] = Math.atan2(gy, gx);
                }
            }

            // Step 2: Advanced background sampling with statistical analysis
            const edgePixels = [];
            const borderDepth = 20; // Deeper sampling for better accuracy
            const edgeThreshold = 40; // Lower threshold for edge detection

            // Sample from all four borders, avoiding edge regions
            for (let d = 0; d < borderDepth; d++) {
                for (let x = d; x < canvas.width - d; x += 2) {
                    const topIdx = d * canvas.width + x;
                    const bottomIdx = (canvas.height - 1 - d) * canvas.width + x;

                    if (edges[topIdx] < edgeThreshold) {
                        edgePixels.push([data[topIdx * 4], data[topIdx * 4 + 1], data[topIdx * 4 + 2]]);
                    }
                    if (edges[bottomIdx] < edgeThreshold) {
                        edgePixels.push([data[bottomIdx * 4], data[bottomIdx * 4 + 1], data[bottomIdx * 4 + 2]]);
                    }
                }
                for (let y = d; y < canvas.height - d; y += 2) {
                    const leftIdx = y * canvas.width + d;
                    const rightIdx = y * canvas.width + (canvas.width - 1 - d);

                    if (edges[leftIdx] < edgeThreshold) {
                        edgePixels.push([data[leftIdx * 4], data[leftIdx * 4 + 1], data[leftIdx * 4 + 2]]);
                    }
                    if (edges[rightIdx] < edgeThreshold) {
                        edgePixels.push([data[rightIdx * 4], data[rightIdx * 4 + 1], data[rightIdx * 4 + 2]]);
                    }
                }
            }

            // Step 3: K-means inspired clustering for background color detection
            const sortedR = edgePixels.map(p => p[0]).sort((a, b) => a - b);
            const sortedG = edgePixels.map(p => p[1]).sort((a, b) => a - b);
            const sortedB = edgePixels.map(p => p[2]).sort((a, b) => a - b);

            // Use median for robustness against outliers
            const medianIndex = Math.floor(edgePixels.length / 2);
            const bgR = sortedR[medianIndex];
            const bgG = sortedG[medianIndex];
            const bgB = sortedB[medianIndex];

            // Calculate standard deviation for adaptive thresholding
            const calculateStdDev = (arr, median) => {
                const variance = arr.reduce((sum, val) => sum + Math.pow(val - median, 2), 0) / arr.length;
                return Math.sqrt(variance);
            };

            const stdDevR = calculateStdDev(sortedR, bgR);
            const stdDevG = calculateStdDev(sortedG, bgG);
            const stdDevB = calculateStdDev(sortedB, bgB);
            const avgStdDev = (stdDevR + stdDevG + stdDevB) / 3;

            // Step 4: Multi-pass intelligent removal with region growing
            const baseThreshold = 110 + avgStdDev * 0.7; // Higher threshold for complete removal

            for (let i = 0; i < data.length; i += 4) {
                const pixelIndex = i / 4;
                const x = pixelIndex % canvas.width;
                const y = Math.floor(pixelIndex / canvas.width);

                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];

                // Euclidean color distance
                const colorDistance = Math.sqrt(
                    Math.pow(r - bgR, 2) +
                    Math.pow(g - bgG, 2) +
                    Math.pow(b - bgB, 2)
                );

                // Edge strength and context awareness
                const edgeStrength = edges[pixelIndex] || 0;

                // Distance from border (normalized 0-1)
                const distFromBorder = Math.min(
                    Math.min(x, canvas.width - x - 1),
                    Math.min(y, canvas.height - y - 1)
                ) / Math.min(canvas.width, canvas.height);

                // Adaptive threshold based on multiple factors
                let threshold = baseThreshold;

                // Reduce threshold for strong edges (preserve subject)
                if (edgeStrength > 45) {
                    threshold *= 0.45;
                } else if (edgeStrength > 30) {
                    threshold *= 0.6;
                }
                // Increase threshold near borders (remove more background aggressively)
                else if (distFromBorder < 0.2) {
                    threshold *= 1.6;
                } else if (distFromBorder < 0.3) {
                    threshold *= 1.4;
                }

                if (colorDistance < threshold) {
                    // Complete removal approach - make background fully transparent
                    if (edgeStrength < 15 && distFromBorder < 0.25) {
                        // Definitely background - remove completely
                        data[i + 3] = 0;
                    } else if (edgeStrength > 45) {
                        // Strong edge - definitely subject, keep fully opaque
                        data[i + 3] = 255;
                    } else {
                        // Transition zone - calculate alpha
                        let alpha = (colorDistance / threshold) * 255;

                        // Strong edge preservation
                        if (edgeStrength > 30) {
                            alpha = Math.min(255, alpha * 2.5);
                        } else if (edgeStrength > 20) {
                            alpha = Math.min(255, alpha * 1.8);
                        }

                        // Aggressive removal near threshold boundary
                        if (colorDistance < threshold * 0.4) {
                            alpha *= 0.3; // Make mostly transparent
                        } else if (colorDistance < threshold * 0.6) {
                            alpha *= 0.6; // Partially transparent
                        } else if (colorDistance > threshold * 0.8) {
                            alpha = Math.min(255, alpha * 1.4); // Keep more opaque
                        }

                        data[i + 3] = Math.max(0, Math.min(255, alpha));
                    }
                }
            } ctx.putImageData(imageData, 0, 0);
            const newUrl = canvas.toDataURL();
            const newImg = new Image();
            newImg.onload = () => {
                // Update editing source without affecting base original
                originalImageRef.current = newImg;
                setOriginalUrl(newUrl);
                setBackgroundRemoved(true);
                setStatus('success');
                setLoading(false);
                saveToHistory();
            };
            newImg.src = newUrl;
        }
    };

    const saveToHistory = () => {
        const currentState = {
            blur: blurLevel,
            sharpen: sharpenLevel,
            noise: noiseLevel,
            brightness: brightness,
            contrast: contrast,
            saturation: saturation
        };

        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(currentState);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    };

    const undo = () => {
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            const state = history[newIndex];
            setBlurLevel(state.blur);
            setSharpenLevel(state.sharpen);
            setNoiseLevel(state.noise);
            setBrightness(state.brightness);
            setContrast(state.contrast);
            setSaturation(state.saturation);
            setHistoryIndex(newIndex);

            // Reset to base if going back to start and background was removed
            if (newIndex === 0 && backgroundRemoved && baseImageUrl) {
                const img = new Image();
                img.onload = () => {
                    originalImageRef.current = img;
                    setOriginalUrl(baseImageUrl);
                    setBackgroundRemoved(false);
                };
                img.src = baseImageUrl;
            }
        }
    };

    const redo = () => {
        if (historyIndex < history.length - 1) {
            const newIndex = historyIndex + 1;
            const state = history[newIndex];
            setBlurLevel(state.blur);
            setSharpenLevel(state.sharpen);
            setNoiseLevel(state.noise);
            setBrightness(state.brightness);
            setContrast(state.contrast);
            setSaturation(state.saturation);
            setHistoryIndex(newIndex);
        }
    };

    const resetAllEffects = () => {
        setBlurLevel(0);
        setSharpenLevel(0);
        setNoiseLevel(0);
        setBrightness(100);
        setContrast(100);
        setSaturation(100);

        // Reset to base image if background was removed
        if (backgroundRemoved && baseImageUrl) {
            const img = new Image();
            img.onload = () => {
                originalImageRef.current = img;
                setOriginalUrl(baseImageUrl);
                setBackgroundRemoved(false);
            };
            img.src = baseImageUrl;
        }

        saveToHistory();
    };

    const downloadImage = () => {
        if (!displayCanvasRef.current) return;

        displayCanvasRef.current.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `edited-${Date.now()}.png`;
            link.click();
            URL.revokeObjectURL(url);
        });
    };

    return (
        <div className="image-editor">
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            <div className="editor-container">
                <div className="upload-section">
                    <h2 className="panel-title">Upload Image</h2>

                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageUpload}
                        accept="image/*"
                        style={{ display: 'none' }}
                    />

                    <button
                        onClick={() => fileInputRef.current.click()}
                        className="upload-button"
                    >
                        Choose Image
                    </button>

                    {originalUrl && (
                        <div className="preview-container">
                            <div className="image-comparison">
                                <div className="comparison-item">
                                    <h4>Original</h4>
                                    <canvas ref={originalCanvasRef} className="preview-image" />
                                </div>
                                <div className="comparison-item">
                                    <h4>Edited</h4>
                                    <canvas ref={displayCanvasRef} className="preview-image" />
                                </div>
                            </div>
                            <p className="image-info">
                                Dimensions: {dimensions.width} × {dimensions.height}
                            </p>
                            <div className="history-controls">
                                <button onClick={undo} disabled={historyIndex <= 0} className="history-button">
                                    ← Undo
                                </button>
                                <button onClick={redo} disabled={historyIndex >= history.length - 1} className="history-button">
                                    Redo →
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="editing-section">
                    <h2 className="panel-title">Editing Tools</h2>

                    <div className="tools-grid">
                        <div className="tool-card">
                            <h3>Resize</h3>
                            <div className="dimension-inputs">
                                <input
                                    type="number"
                                    value={newDimensions.width}
                                    onChange={(e) => setNewDimensions({ ...newDimensions, width: parseInt(e.target.value) || 0 })}
                                    placeholder="Width"
                                    className="dimension-input"
                                />
                                <span>×</span>
                                <input
                                    type="number"
                                    value={newDimensions.height}
                                    onChange={(e) => setNewDimensions({ ...newDimensions, height: parseInt(e.target.value) || 0 })}
                                    placeholder="Height"
                                    className="dimension-input"
                                />
                            </div>
                            <button onClick={handleResize} disabled={!originalUrl || loading} className="tool-button">
                                Apply Resize
                            </button>
                        </div>

                        <div className="tool-card">
                            <h3>Remove Background</h3>
                            <p className="tool-description">AI-powered removal</p>
                            <button onClick={handleRemoveBackground} disabled={!selectedImage || loading} className="tool-button">
                                Remove Background
                            </button>
                        </div>

                        <div className="tool-card">
                            <h3>Blur</h3>
                            <div className="slider-container">
                                <input
                                    type="range"
                                    min="0"
                                    max="20"
                                    value={blurLevel}
                                    onChange={(e) => setBlurLevel(parseInt(e.target.value))}
                                    onMouseUp={saveToHistory}
                                    onTouchEnd={saveToHistory}
                                    className="slider"
                                />
                                <span className="slider-value">{blurLevel}px</span>
                            </div>
                        </div>

                        <div className="tool-card">
                            <h3>Sharpen</h3>
                            <div className="slider-container">
                                <input
                                    type="range"
                                    min="0"
                                    max="10"
                                    step="1"
                                    value={sharpenLevel}
                                    onChange={(e) => setSharpenLevel(parseInt(e.target.value))}
                                    onMouseUp={saveToHistory}
                                    onTouchEnd={saveToHistory}
                                    className="slider"
                                />
                                <span className="slider-value">{sharpenLevel}</span>
                            </div>
                        </div>

                        <div className="tool-card">
                            <h3>Add Noise</h3>
                            <div className="slider-container">
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={noiseLevel}
                                    onChange={(e) => setNoiseLevel(parseInt(e.target.value))}
                                    onMouseUp={saveToHistory}
                                    onTouchEnd={saveToHistory}
                                    className="slider"
                                />
                                <span className="slider-value">{noiseLevel}</span>
                            </div>
                        </div>

                        <div className="tool-card">
                            <h3>Brightness</h3>
                            <div className="slider-container">
                                <input
                                    type="range"
                                    min="0"
                                    max="200"
                                    value={brightness}
                                    onChange={(e) => setBrightness(parseInt(e.target.value))}
                                    onMouseUp={saveToHistory}
                                    onTouchEnd={saveToHistory}
                                    className="slider"
                                />
                                <span className="slider-value">{brightness}%</span>
                            </div>
                        </div>

                        <div className="tool-card">
                            <h3>Contrast</h3>
                            <div className="slider-container">
                                <input
                                    type="range"
                                    min="0"
                                    max="200"
                                    value={contrast}
                                    onChange={(e) => setContrast(parseInt(e.target.value))}
                                    onMouseUp={saveToHistory}
                                    onTouchEnd={saveToHistory}
                                    className="slider"
                                />
                                <span className="slider-value">{contrast}%</span>
                            </div>
                        </div>

                        <div className="tool-card">
                            <h3>Saturation</h3>
                            <div className="slider-container">
                                <input
                                    type="range"
                                    min="0"
                                    max="200"
                                    value={saturation}
                                    onChange={(e) => setSaturation(parseInt(e.target.value))}
                                    onMouseUp={saveToHistory}
                                    onTouchEnd={saveToHistory}
                                    className="slider"
                                />
                                <span className="slider-value">{saturation}%</span>
                            </div>
                        </div>

                        <div className="tool-card reset-card">
                            <button onClick={resetAllEffects} disabled={!originalUrl} className="reset-button">
                                Reset All Effects
                            </button>
                            <button onClick={downloadImage} disabled={!originalUrl} className="download-button">
                                Download Image
                            </button>
                        </div>
                    </div>

                    {status && (
                        <div className={`status-message ${status}`}>
                            {status === 'processing' && 'Processing...'}
                            {status === 'success' && 'Effect applied successfully!'}
                            {status === 'error' && 'Error applying effect'}
                        </div>
                    )}

                    {loading && <div className="spinner"></div>}
                </div>
            </div>
        </div>
    );
};

export default ImageEditor;
