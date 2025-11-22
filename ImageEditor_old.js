import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './ImageEditor.css';

const ImageEditor = () => {
    const [selectedImage, setSelectedImage] = useState(null);
    const [originalUrl, setOriginalUrl] = useState(null);
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

    const fileInputRef = useRef(null);
    const canvasRef = useRef(null);
    const displayCanvasRef = useRef(null);
    const originalImageRef = useRef(null);

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
                resetAllEffects();
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    };

    // Apply all effects in real-time
    useEffect(() => {
        if (!originalImageRef.current) return;

        const canvas = displayCanvasRef.current;
        const ctx = canvas.getContext('2d');
        const img = originalImageRef.current;

        canvas.width = img.width;
        canvas.height = img.height;

        // Apply blur using CSS filter first
        ctx.filter = `blur(${blurLevel}px) brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
        ctx.drawImage(img, 0, 0);
        ctx.filter = 'none';

        // Get image data for pixel-level operations
        let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Apply sharpen
        if (sharpenLevel > 0) {
            imageData = applySharpen(imageData, sharpenLevel);
        }

        // Apply noise
        if (noiseLevel > 0) {
            for (let i = 0; i < data.length; i += 4) {
                const noise = (Math.random() - 0.5) * noiseLevel;
                imageData.data[i] = Math.max(0, Math.min(255, imageData.data[i] + noise));
                imageData.data[i + 1] = Math.max(0, Math.min(255, imageData.data[i + 1] + noise));
                imageData.data[i + 2] = Math.max(0, Math.min(255, imageData.data[i + 2] + noise));
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
            setOriginalUrl(canvas.toDataURL());
            originalImageRef.current = new Image();
            originalImageRef.current.src = canvas.toDataURL();
            setStatus('success');
            setTimeout(() => setStatus(''), 3000);
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
                originalImageRef.current = img;
                setOriginalUrl(url);
                setStatus('success');
                setLoading(false);
            };
            img.src = url;

        } catch (error) {
            console.error('Background removal error:', error);

            // Fallback
            if (!originalImageRef.current) {
                setStatus('error');
                setLoading(false);
                return;
            }

            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            const img = originalImageRef.current;

            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            // Edge sampling for background color
            const edgePixels = [];
            for (let x = 0; x < canvas.width; x += 5) {
                edgePixels.push([data[(0 * canvas.width + x) * 4], data[(0 * canvas.width + x) * 4 + 1], data[(0 * canvas.width + x) * 4 + 2]]);
                edgePixels.push([data[((canvas.height - 1) * canvas.width + x) * 4], data[((canvas.height - 1) * canvas.width + x) * 4 + 1], data[((canvas.height - 1) * canvas.width + x) * 4 + 2]]);
            }
            for (let y = 0; y < canvas.height; y += 5) {
                edgePixels.push([data[(y * canvas.width + 0) * 4], data[(y * canvas.width + 0) * 4 + 1], data[(y * canvas.width + 0) * 4 + 2]]);
                edgePixels.push([data[(y * canvas.width + (canvas.width - 1)) * 4], data[(y * canvas.width + (canvas.width - 1)) * 4 + 1], data[(y * canvas.width + (canvas.width - 1)) * 4 + 2]]);
            }

            let avgR = 0, avgG = 0, avgB = 0;
            edgePixels.forEach(([r, g, b]) => {
                avgR += r;
                avgG += g;
                avgB += b;
            });
            avgR /= edgePixels.length;
            avgG /= edgePixels.length;
            avgB /= edgePixels.length;

            const threshold = 40;
            for (let i = 0; i < data.length; i += 4) {
                const distance = Math.sqrt(
                    Math.pow(data[i] - avgR, 2) +
                    Math.pow(data[i + 1] - avgG, 2) +
                    Math.pow(data[i + 2] - avgB, 2)
                );
                if (distance < threshold) {
                    data[i + 3] = 0;
                }
            }

            ctx.putImageData(imageData, 0, 0);
            const newUrl = canvas.toDataURL();
            const newImg = new Image();
            newImg.onload = () => {
                originalImageRef.current = newImg;
                setOriginalUrl(newUrl);
                setStatus('success');
                setLoading(false);
            };
            newImg.src = newUrl;
        }
    };

    const resetAllEffects = () => {
        setBlurLevel(0);
        setSharpenLevel(0);
        setNoiseLevel(0);
        setBrightness(100);
        setContrast(100);
        setSaturation(100);
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

    // Top edge
    for (let x = 0; x < canvas.width; x += sampleSize) {
        const i = (0 * canvas.width + x) * 4;
        edgePixels.push([data[i], data[i + 1], data[i + 2]]);
    }

    // Bottom edge
    for (let x = 0; x < canvas.width; x += sampleSize) {
        const i = ((canvas.height - 1) * canvas.width + x) * 4;
        edgePixels.push([data[i], data[i + 1], data[i + 2]]);
    }

    // Left edge
    for (let y = 0; y < canvas.height; y += sampleSize) {
        const i = (y * canvas.width + 0) * 4;
        edgePixels.push([data[i], data[i + 1], data[i + 2]]);
    }

    // Right edge
    for (let y = 0; y < canvas.height; y += sampleSize) {
        const i = (y * canvas.width + (canvas.width - 1)) * 4;
        edgePixels.push([data[i], data[i + 1], data[i + 2]]);
    }

    // Calculate average background color
    let avgR = 0, avgG = 0, avgB = 0;
    edgePixels.forEach(([r, g, b]) => {
        avgR += r;
        avgG += g;
        avgB += b;
    });
    avgR /= edgePixels.length;
    avgG /= edgePixels.length;
    avgB /= edgePixels.length;

    // Remove similar colors with threshold
    const threshold = 40;
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        const distance = Math.sqrt(
            Math.pow(r - avgR, 2) +
            Math.pow(g - avgG, 2) +
            Math.pow(b - avgB, 2)
        );

        if (distance < threshold) {
            data[i + 3] = 0; // Make transparent
        }
    }

    ctx.putImageData(imageData, 0, 0);
});
setStatus('success');
setLoading(false);
        }
    };

const handleBlur = (level = blurLevel) => {
    applyCanvasEffect((ctx, canvas) => {
        ctx.filter = `blur(${level}px)`;
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            ctx.drawImage(img, 0, 0);
        };
        img.src = currentImageRef.current || previewUrl;
    }, true);
};

const handleSharpen = (level = sharpenLevel) => {
    applyCanvasEffect((ctx, canvas) => {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const factor = level;

        for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.min(255, data[i] * factor);
            data[i + 1] = Math.min(255, data[i + 1] * factor);
            data[i + 2] = Math.min(255, data[i + 2] * factor);
        }

        ctx.putImageData(imageData, 0, 0);
    }, true);
};

const handleAddNoise = (level = noiseLevel) => {
    applyCanvasEffect((ctx, canvas) => {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            const noise = (Math.random() - 0.5) * level;
            data[i] = Math.max(0, Math.min(255, data[i] + noise));
            data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
            data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
        }

        ctx.putImageData(imageData, 0, 0);
    }, true);
};

const handleBrightness = (value = brightness) => {
    applyCanvasEffect((ctx, canvas) => {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const factor = value / 100;

        for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.min(255, data[i] * factor);
            data[i + 1] = Math.min(255, data[i + 1] * factor);
            data[i + 2] = Math.min(255, data[i + 2] * factor);
        }

        ctx.putImageData(imageData, 0, 0);
    }, true);
};

const handleContrast = (value = contrast) => {
    applyCanvasEffect((ctx, canvas) => {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const factor = (259 * (value + 255)) / (255 * (259 - value));

        for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.min(255, Math.max(0, factor * (data[i] - 128) + 128));
            data[i + 1] = Math.min(255, Math.max(0, factor * (data[i + 1] - 128) + 128));
            data[i + 2] = Math.min(255, Math.max(0, factor * (data[i + 2] - 128) + 128));
        }

        ctx.putImageData(imageData, 0, 0);
    }, true);
};

const handleSaturation = (value = saturation) => {
    applyCanvasEffect((ctx, canvas) => {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const factor = value / 100;

        for (let i = 0; i < data.length; i += 4) {
            const gray = 0.2989 * data[i] + 0.5870 * data[i + 1] + 0.1140 * data[i + 2];
            data[i] = Math.min(255, gray + (data[i] - gray) * factor);
            data[i + 1] = Math.min(255, gray + (data[i + 1] - gray) * factor);
            data[i + 2] = Math.min(255, gray + (data[i + 2] - gray) * factor);
        }

        ctx.putImageData(imageData, 0, 0);
    }, true);
};

const resetImage = () => {
    setEditedImage(null);
    setBlurLevel(5);
    setSharpenLevel(1.5);
    setNoiseLevel(50);
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
};

const downloadImage = () => {
    if (!editedImage) return;

    const link = document.createElement('a');
    link.href = editedImage;
    link.download = `edited-${Date.now()}.png`;
    link.click();
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
                    📁 Choose Image
                </button>

                {previewUrl && (
                    <div className="preview-container">
                        <img src={previewUrl} alt="Preview" className="preview-image" />
                        <p className="image-info">
                            Dimensions: {dimensions.width} × {dimensions.height}
                        </p>
                    </div>
                )}
            </div>

            <div className="editing-section">
                <h2 className="panel-title">Editing Tools</h2>

                <div className="tools-grid">
                    <div className="tool-card">
                        <h3>📏 Resize</h3>
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
                        <button onClick={handleResize} disabled={!previewUrl || loading} className="tool-button">
                            Apply Resize
                        </button>
                    </div>

                    <div className="tool-card">
                        <h3>🎭 Remove Background</h3>
                        <p className="tool-description">Uses AI to remove background</p>
                        <button onClick={handleRemoveBackground} disabled={!selectedImage || loading} className="tool-button">
                            Remove Background
                        </button>
                    </div>

                    <div className="tool-card">
                        <h3>🌫️ Blur</h3>
                        <div className="slider-container">
                            <input
                                type="range"
                                min="0"
                                max="20"
                                value={blurLevel}
                                onChange={(e) => setBlurLevel(parseInt(e.target.value))}
                                className="slider"
                            />
                            <span className="slider-value">{blurLevel}px</span>
                        </div>
                        <button onClick={() => handleBlur()} disabled={!previewUrl || loading} className="tool-button">
                            Apply Blur
                        </button>
                    </div>

                    <div className="tool-card">
                        <h3>✨ Sharpen</h3>
                        <div className="slider-container">
                            <input
                                type="range"
                                min="1"
                                max="3"
                                step="0.1"
                                value={sharpenLevel}
                                onChange={(e) => setSharpenLevel(parseFloat(e.target.value))}
                                className="slider"
                            />
                            <span className="slider-value">{sharpenLevel.toFixed(1)}x</span>
                        </div>
                        <button onClick={() => handleSharpen()} disabled={!previewUrl || loading} className="tool-button">
                            Apply Sharpen
                        </button>
                    </div>

                    <div className="tool-card">
                        <h3>📡 Add Noise</h3>
                        <div className="slider-container">
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={noiseLevel}
                                onChange={(e) => setNoiseLevel(parseInt(e.target.value))}
                                className="slider"
                            />
                            <span className="slider-value">{noiseLevel}</span>
                        </div>
                        <button onClick={() => handleAddNoise()} disabled={!previewUrl || loading} className="tool-button">
                            Apply Noise
                        </button>
                    </div>

                    <div className="tool-card">
                        <h3>☀️ Brightness</h3>
                        <div className="slider-container">
                            <input
                                type="range"
                                min="0"
                                max="200"
                                value={brightness}
                                onChange={(e) => setBrightness(parseInt(e.target.value))}
                                className="slider"
                            />
                            <span className="slider-value">{brightness}%</span>
                        </div>
                        <button onClick={() => handleBrightness()} disabled={!previewUrl || loading} className="tool-button">
                            Apply Brightness
                        </button>
                    </div>

                    <div className="tool-card">
                        <h3>🎚️ Contrast</h3>
                        <div className="slider-container">
                            <input
                                type="range"
                                min="0"
                                max="200"
                                value={contrast}
                                onChange={(e) => setContrast(parseInt(e.target.value))}
                                className="slider"
                            />
                            <span className="slider-value">{contrast}%</span>
                        </div>
                        <button onClick={() => handleContrast()} disabled={!previewUrl || loading} className="tool-button">
                            Apply Contrast
                        </button>
                    </div>

                    <div className="tool-card">
                        <h3>🎨 Saturation</h3>
                        <div className="slider-container">
                            <input
                                type="range"
                                min="0"
                                max="200"
                                value={saturation}
                                onChange={(e) => setSaturation(parseInt(e.target.value))}
                                className="slider"
                            />
                            <span className="slider-value">{saturation}%</span>
                        </div>
                        <button onClick={() => handleSaturation()} disabled={!previewUrl || loading} className="tool-button">
                            Apply Saturation
                        </button>
                    </div>

                    <div className="tool-card reset-card">
                        <button onClick={resetImage} disabled={!editedImage} className="reset-button">
                            🔄 Reset to Original
                        </button>
                    </div>
                </div>

                {status && (
                    <div className={`status-message ${status}`}>
                        {status === 'processing' && '🔄 Processing...'}
                        {status === 'success' && '✅ Effect applied successfully!'}
                        {status === 'error' && '❌ Error applying effect'}
                    </div>
                )}

                {loading && <div className="spinner"></div>}
            </div>

            <div className="result-section">
                <h2 className="panel-title">Result</h2>

                {editedImage ? (
                    <div className="result-container">
                        <img src={editedImage} alt="Edited" className="result-image" />
                        <button onClick={downloadImage} className="download-button">
                            ⬇️ Download Edited Image
                        </button>
                    </div>
                ) : (
                    <div className="empty-result">
                        <p>Apply an effect to see the result</p>
                    </div>
                )}
            </div>
        </div>
    </div>
);
};

export default ImageEditor;
