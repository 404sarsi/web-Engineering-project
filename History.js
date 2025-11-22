import React, { useState } from 'react';
import './History.css';

const History = ({ history, onDelete }) => {
    const [viewImage, setViewImage] = useState(null);
    const [viewImageData, setViewImageData] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    const formatDate = (isoString) => {
        const date = new Date(isoString);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleDelete = (itemId, prompt) => {
        setDeleteConfirm({ id: itemId, prompt });
    };

    const confirmDelete = () => {
        if (deleteConfirm) {
            onDelete(deleteConfirm.id);
            setDeleteConfirm(null);
        }
    };

    const cancelDelete = () => {
        setDeleteConfirm(null);
    };

    const downloadImage = async (url, index, prompt) => {
        try {
            // For Pollinations AI, use a different approach
            // Create an image element to ensure it's loaded, then convert to canvas
            const img = new Image();
            img.crossOrigin = 'anonymous';

            img.onload = () => {
                try {
                    // Create canvas and draw image
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);

                    // Convert to blob and download
                    canvas.toBlob((blob) => {
                        const blobUrl = window.URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = blobUrl;
                        link.download = `${prompt.slice(0, 30).replace(/[^a-z0-9]/gi, '_')}-${index + 1}.jpg`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        window.URL.revokeObjectURL(blobUrl);
                    }, 'image/jpeg', 0.95);
                } catch (canvasError) {
                    console.error('Canvas error:', canvasError);
                    // Final fallback: direct download link
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `${prompt.slice(0, 30).replace(/[^a-z0-9]/gi, '_')}-${index + 1}.jpg`;
                    link.target = '_blank';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                }
            };

            img.onerror = () => {
                console.error('Image load error');
                // Fallback: direct download
                const link = document.createElement('a');
                link.href = url;
                link.download = `${prompt.slice(0, 30).replace(/[^a-z0-9]/gi, '_')}-${index + 1}.jpg`;
                link.target = '_blank';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            };

            img.src = url;
        } catch (error) {
            console.error('Download error:', error);
            // Final fallback: open in new tab
            window.open(url, '_blank');
        }
    };

    return (
        <div className="history">
            <div className="history-container">
                <h2 className="history-title">Generation History</h2>

                {history.length === 0 ? (
                    <div className="empty-history">
                        <p>📜 No generation history yet</p>
                        <p className="empty-subtitle">Start generating images to see your history</p>
                    </div>
                ) : (
                    <div className="history-list">
                        {history.map((item) => (
                            <div key={item.id} className="history-item hover-scale">
                                <div className="history-header">
                                    <div className="history-info">
                                        <h3 className="history-prompt">{item.prompt}</h3>
                                        <p className="history-date">{formatDate(item.timestamp)}</p>
                                    </div>
                                    <div className="history-actions">
                                        <div className="history-badge">
                                            {item.images} image{item.images > 1 ? 's' : ''}
                                        </div>
                                        <button
                                            onClick={() => handleDelete(item.id, item.prompt)}
                                            className="delete-history-button"
                                            title="Delete this history"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>

                                <div className="history-details">
                                    <div className="detail-item">
                                        <span className="detail-label">Style:</span>
                                        <span className="detail-value">{item.style}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">Resolution:</span>
                                        <span className="detail-value">{item.resolution}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">Quality:</span>
                                        <span className="detail-value">{item.quality}</span>
                                    </div>
                                </div>

                                {item.imageUrls && item.imageUrls.length > 0 && (
                                    <div className="history-thumbnails">
                                        {item.imageUrls.map((url, index) => (
                                            <div key={index} className="thumbnail-wrapper">
                                                <img
                                                    src={url}
                                                    alt={`Generated ${index + 1}`}
                                                    className="history-thumbnail"
                                                />
                                                <div className="thumbnail-overlay">
                                                    <button
                                                        onClick={() => {
                                                            setViewImage(url);
                                                            setViewImageData({ url, index, prompt: item.prompt });
                                                        }}
                                                        className="view-thumb-button"
                                                        title="View Image"
                                                    >
                                                        View
                                                    </button>
                                                    <button
                                                        onClick={() => downloadImage(url, index, item.prompt)}
                                                        className="download-thumb-button"
                                                        title="Download Image"
                                                    >
                                                        Download
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {deleteConfirm && (
                <div className="delete-modal" onClick={cancelDelete}>
                    <div className="delete-modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="delete-modal-icon">⚠️</div>
                        <h3 className="delete-modal-title">Delete History</h3>
                        <p className="delete-modal-message">
                            Are you sure you want to delete this generation?
                        </p>
                        <p className="delete-modal-prompt">"{deleteConfirm.prompt}"</p>
                        <div className="delete-modal-actions">
                            <button onClick={cancelDelete} className="delete-cancel-button">
                                Cancel
                            </button>
                            <button onClick={confirmDelete} className="delete-confirm-button">
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {viewImage && (
                <div className="image-modal" onClick={() => {
                    setViewImage(null);
                    setViewImageData(null);
                }}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <button className="modal-close" onClick={() => {
                            setViewImage(null);
                            setViewImageData(null);
                        }}>
                            ✕
                        </button>
                        <img src={viewImage} alt="Full size view" className="modal-image" />
                        {viewImageData && (
                            <button
                                className="modal-download"
                                onClick={() => downloadImage(viewImageData.url, viewImageData.index, viewImageData.prompt)}
                                title="Download Image"
                            >
                                Download
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default History;
