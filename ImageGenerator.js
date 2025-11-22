import React, { useState } from 'react';
import './ImageGenerator.css';

const ImageGenerator = ({ onGenerate }) => {
    const [prompt, setPrompt] = useState('');
    const [style, setStyle] = useState('realistic');
    const [resolution, setResolution] = useState('medium');
    const [quality, setQuality] = useState('standard');
    const [numImages, setNumImages] = useState(1);
    const [generatedImages, setGeneratedImages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [imageLoadingStates, setImageLoadingStates] = useState({});
    const [status, setStatus] = useState('');
    const [fullscreenImage, setFullscreenImage] = useState(null);

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            setStatus('error');
            setTimeout(() => setStatus(''), 3000);
            return;
        }

        setLoading(true);
        setStatus('processing');
        setGeneratedImages([]);
        setImageLoadingStates({});

        try {
            const images = [];
            const resolutionMap = {
                'low': '256x256',
                'medium': '512x512',
                'high': '1024x1024'
            };

            const size = resolutionMap[resolution] || '512x512';

            for (let i = 0; i < numImages; i++) {
                // Using Pollinations AI - Free, no API key needed
                const encodedPrompt = encodeURIComponent(`${prompt}, ${style} style, ${quality} quality`);
                const seed = Date.now() + i * 100; // Better seed variation
                const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${size.split('x')[0]}&height=${size.split('x')[1]}&seed=${seed}&nologo=true`;

                images.push({
                    url: imageUrl,
                    id: seed
                });
            }

            // Set images but keep loading state
            setGeneratedImages(images);

            // Initialize loading states for all images
            const loadingStates = {};
            images.forEach(img => {
                loadingStates[img.id] = true;
            });
            setImageLoadingStates(loadingStates);

            setStatus('success');

            // Add to history
            onGenerate({
                prompt,
                style,
                resolution,
                quality,
                images: images.length,
                imageUrls: images.map(img => img.url)
            });

        } catch (error) {
            console.error('Generation error:', error);
            setStatus('error');
            setLoading(false);
        }
    };

    const handleImageLoad = (imageId) => {
        setImageLoadingStates(prev => {
            const updated = { ...prev, [imageId]: false };
            // Check if all images are loaded
            const allLoaded = Object.values(updated).every(isLoading => !isLoading);
            if (allLoaded) {
                setLoading(false);
            }
            return updated;
        });
    };

    const handleImageError = (imageId) => {
        console.error(`Failed to load image ${imageId}`);
        setImageLoadingStates(prev => {
            const updated = { ...prev, [imageId]: false };
            // Check if all images are done (loaded or errored)
            const allDone = Object.values(updated).every(isLoading => !isLoading);
            if (allDone) {
                setLoading(false);
            }
            return updated;
        });
    };

    const downloadImage = async (url, index) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = `ai-generated-${Date.now()}-${index}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error('Download error:', error);
        }
    };

    return (
        <div className="image-generator">
            <div className="generator-container">
                <div className="controls-panel">
                    <h2 className="panel-title">Image Generation</h2>

                    <div className="form-group">
                        <label>Text Prompt</label>
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Describe the image you want to generate..."
                            rows="4"
                            className="textarea-input"
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Art Style</label>
                            <select
                                value={style}
                                onChange={(e) => setStyle(e.target.value)}
                                className="select-input"
                            >
                                <option value="painting">Painting</option>
                                <option value="realistic">Realistic</option>
                                <option value="cartoon">Cartoon</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Resolution</label>
                            <select
                                value={resolution}
                                onChange={(e) => setResolution(e.target.value)}
                                className="select-input"
                            >
                                <option value="low">Low (256x256)</option>
                                <option value="medium">Medium (512x512)</option>
                                <option value="high">High (1024x1024)</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Quality</label>
                            <select
                                value={quality}
                                onChange={(e) => setQuality(e.target.value)}
                                className="select-input"
                            >
                                <option value="standard">Standard</option>
                                <option value="high">High</option>
                                <option value="ultra">Ultra</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Number of Images</label>
                            <select
                                value={numImages}
                                onChange={(e) => setNumImages(Number(e.target.value))}
                                className="select-input"
                            >
                                <option value="1">1</option>
                                <option value="2">2</option>
                                <option value="3">3</option>
                                <option value="4">4</option>
                            </select>
                        </div>
                    </div>

                    <button
                        onClick={handleGenerate}
                        disabled={loading}
                        className="generate-button"
                    >
                        {loading ? 'Generating...' : 'Generate'}
                    </button>

                    {status && (
                        <div className={`status-message ${status}`}>
                            {status === 'processing' && 'Processing your request...'}
                            {status === 'success' && 'Images generated successfully!'}
                            {status === 'error' && 'Please enter a valid prompt'}
                        </div>
                    )}
                </div>

                <div className="results-panel">
                    <h2 className="panel-title">Generated Images</h2>

                    {!loading && generatedImages.length === 0 && (
                        <div className="empty-state">
                            <p>Enter a prompt and click Generate to create images</p>
                        </div>
                    )}

                    <div className="images-grid">
                        {generatedImages.map((image, index) => (
                            <div key={image.id} className="image-card hover-scale">
                                <div className="image-wrapper">
                                    {imageLoadingStates[image.id] && (
                                        <div className="image-loading">
                                            <div className="spinner"></div>
                                            <p>Loading...</p>
                                        </div>
                                    )}
                                    <img
                                        src={image.url}
                                        alt={`Generated ${index + 1}`}
                                        className="generated-image"
                                        onLoad={() => handleImageLoad(image.id)}
                                        onError={() => handleImageError(image.id)}
                                        style={{ display: imageLoadingStates[image.id] ? 'none' : 'block' }}
                                    />
                                    {!imageLoadingStates[image.id] && (
                                        <div className="image-overlay">
                                            <button
                                                onClick={() => setFullscreenImage(image.url)}
                                                className="overlay-button"
                                            >
                                                View
                                            </button>
                                            <button
                                                onClick={() => downloadImage(image.url, index)}
                                                className="overlay-button"
                                            >
                                                Download
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {fullscreenImage && (
                <div className="fullscreen-modal" onClick={() => setFullscreenImage(null)}>
                    <div className="fullscreen-content">
                        <img src={fullscreenImage} alt="Fullscreen" />
                        <button className="close-button" onClick={() => setFullscreenImage(null)}>
                            X
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ImageGenerator;
