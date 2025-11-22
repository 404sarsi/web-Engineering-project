import React, { useState, useEffect } from 'react';
import './App.css';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        // Check if user is already logged in
        const loggedInUser = localStorage.getItem('currentLoggedInUser');
        if (loggedInUser) {
            setCurrentUser(loggedInUser);
            setIsLoggedIn(true);
        }
    }, []);

    const handleLogin = (username) => {
        localStorage.setItem('currentLoggedInUser', username);
        setIsLoggedIn(true);
        setCurrentUser(username);
    };

    const handleLogout = () => {
        localStorage.removeItem('currentLoggedInUser');
        setIsLoggedIn(false);
        setCurrentUser(null);
    };

    return (
        <div className="App">
            {!isLoggedIn ? (
                <Login onLogin={handleLogin} />
            ) : (
                <Dashboard username={currentUser} onLogout={handleLogout} />
            )}
        </div>
    );
}

export default App;
