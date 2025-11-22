import React, { useState } from 'react';
import './Login.css';

const Login = ({ onLogin }) => {
    const [isRegistering, setIsRegistering] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const getUsers = () => {
        const users = localStorage.getItem('registered_users');
        return users ? JSON.parse(users) : [];
    };

    const handleLogin = (e) => {
        e.preventDefault();

        if (!username || !password) {
            setError('Please enter both username and password');
            return;
        }

        const users = getUsers();
        const user = users.find(u => u.username === username && u.password === password);

        if (user) {
            localStorage.setItem('username', username);
            onLogin(username);
        } else {
            setError('Invalid username or password');
        }
    };

    const handleRegister = (e) => {
        e.preventDefault();

        if (!username || !password || !email) {
            setError('Please fill in all fields');
            return;
        }

        if (username.length < 3) {
            setError('Username must be at least 3 characters');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError('Please enter a valid email address');
            return;
        }

        const users = getUsers();

        if (users.find(u => u.username === username)) {
            setError('Username already exists');
            return;
        }

        if (users.find(u => u.email === email)) {
            setError('Email already registered');
            return;
        }

        users.push({ username, password, email, registeredAt: new Date().toISOString() });
        localStorage.setItem('registered_users', JSON.stringify(users));

        setSuccess('Registration successful! You can now login.');
        setError('');
        setTimeout(() => {
            setIsRegistering(false);
            setSuccess('');
            setUsername('');
            setPassword('');
            setConfirmPassword('');
            setEmail('');
        }, 2000);
    };

    const toggleMode = () => {
        setIsRegistering(!isRegistering);
        setError('');
        setSuccess('');
        setUsername('');
        setPassword('');
        setConfirmPassword('');
        setEmail('');
    };

    return (
        <div className="login-container">
            <div className="login-box">
                <h1 className="login-title">AI Image Generator</h1>
                <p className="login-subtitle">Generate stunning images with AI</p>

                <form onSubmit={isRegistering ? handleRegister : handleLogin} className="login-form">
                    <div className="form-group">
                        <label htmlFor="username">Username</label>
                        <input
                            type="text"
                            id="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter your username"
                            className="form-input"
                        />
                    </div>

                    {isRegistering && (
                        <div className="form-group">
                            <label htmlFor="email">Email</label>
                            <input
                                type="email"
                                id="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Enter your email"
                                className="form-input"
                            />
                        </div>
                    )}

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <div className="password-input-container">
                            <input
                                type={showPassword ? "text" : "password"}
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter your password"
                                className="form-input"
                            />
                            <span className="password-toggle" onClick={() => setShowPassword(!showPassword)}>
                                {showPassword ? (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                        <circle cx="12" cy="12" r="3"></circle>
                                    </svg>
                                ) : (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                        <line x1="1" y1="1" x2="23" y2="23"></line>
                                    </svg>
                                )}
                            </span>
                        </div>
                    </div>

                    {isRegistering && (
                        <div className="form-group">
                            <label htmlFor="confirmPassword">Confirm Password</label>
                            <div className="password-input-container">
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    id="confirmPassword"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Confirm your password"
                                    className="form-input"
                                />
                                <span className="password-toggle" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                                    {showConfirmPassword ? (
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                            <circle cx="12" cy="12" r="3"></circle>
                                        </svg>
                                    ) : (
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                            <line x1="1" y1="1" x2="23" y2="23"></line>
                                        </svg>
                                    )}
                                </span>
                            </div>
                        </div>
                    )}

                    {error && <div className="error-message">{error}</div>}
                    {success && <div className="success-message">{success}</div>}

                    <button type="submit" className="login-button">
                        {isRegistering ? 'Register' : 'Login'}
                    </button>
                </form>

                <p className="toggle-mode" onClick={toggleMode}>
                    {isRegistering ? 'Already have an account? Login' : "Don't have an account? Register"}
                </p>
            </div>
        </div>
    );
};

export default Login;
