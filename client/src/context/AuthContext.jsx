import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Axios Interceptor for dynamic token injection
        const interceptor = axios.interceptors.request.use(
            (config) => {
                const token = localStorage.getItem('token') || sessionStorage.getItem('token');
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
                return config;
            },
            (error) => Promise.reject(error)
        );

        // Axios Response Interceptor to handle 401/403 (Token Expiry)
        const responseInterceptor = axios.interceptors.response.use(
            (response) => response,
            (error) => {
                if (error.response && (error.response.status === 401 || error.response.status === 403)) {
                    // Token expired or invalid
                    localStorage.removeItem('token');
                    sessionStorage.removeItem('token');
                    setUser(null);
                }
                return Promise.reject(error);
            }
        );

        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (token) {
            // Verify token with backend
            axios.get('/api/auth/me')
                .then(res => setUser(res.data.user))
                .catch(() => {
                    localStorage.removeItem('token');
                    sessionStorage.removeItem('token');
                    setUser(null);
                })
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }

        // Cleanup interceptors on unmount
        return () => {
            axios.interceptors.request.eject(interceptor);
            axios.interceptors.response.eject(responseInterceptor);
        };
    }, []);

    const login = async (email, password, rememberMe = false) => {
        try {
            const res = await axios.post('/api/auth/login', { email, password, rememberMe });
            const { token, user } = res.data;

            if (rememberMe) {
                localStorage.setItem('token', token);
                sessionStorage.removeItem('token'); // Clear alternate
            } else {
                sessionStorage.setItem('token', token);
                localStorage.removeItem('token'); // Clear alternate
            }

            setUser(user);
            return user;
        } catch (error) {
            throw error.response?.data?.message || 'Login failed';
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
