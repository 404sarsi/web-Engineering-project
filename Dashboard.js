import React, { useState } from 'react';
import './Dashboard.css';
import ImageGenerator from './ImageGenerator';
import ImageEditor from './ImageEditor';
import History from './History';

const Dashboard = ({ username, onLogout }) => {
    const [activeTab, setActiveTab] = useState('generate');
    const [history, setHistory] = useState(() => {
        const saved = localStorage.getItem(`history_${username}`);
        return saved ? JSON.parse(saved) : [];
    });

    const addToHistory = (imageData) => {
        const newHistory = [
            {
                id: Date.now(),
                timestamp: new Date().toISOString(),
                ...imageData
            },
            ...history
        ];
        setHistory(newHistory);
        localStorage.setItem(`history_${username}`, JSON.stringify(newHistory));
    };

    const deleteHistory = (itemId) => {
        const newHistory = history.filter(item => item.id !== itemId);
        setHistory(newHistory);
        localStorage.setItem(`history_${username}`, JSON.stringify(newHistory));
    };

    return (
        <div className="dashboard">
            <header className="dashboard-header">
                <div className="header-content">
                    <h1 className="dashboard-title">🎨 AI Image Generator</h1>
                    <div className="user-info">
                        <span className="username">Welcome, {username}</span>
                        <button onClick={onLogout} className="logout-button">
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            <nav className="dashboard-nav">
                <button
                    className={`nav-button ${activeTab === 'generate' ? 'active' : ''}`}
                    onClick={() => setActiveTab('generate')}
                >
                    Generate
                </button>
                <button
                    className={`nav-button ${activeTab === 'edit' ? 'active' : ''}`}
                    onClick={() => setActiveTab('edit')}
                >
                    Edit
                </button>
                <button
                    className={`nav-button ${activeTab === 'history' ? 'active' : ''}`}
                    onClick={() => setActiveTab('history')}
                >
                    History
                </button>
            </nav>

            <main className="dashboard-content">
                {activeTab === 'generate' && <ImageGenerator onGenerate={addToHistory} />}
                {activeTab === 'edit' && <ImageEditor />}
                {activeTab === 'history' && <History history={history} onDelete={deleteHistory} />}
            </main>
        </div>
    );
};

export default Dashboard;
