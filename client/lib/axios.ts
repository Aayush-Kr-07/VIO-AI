import axios from 'axios';

const axiosInstance = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 15000,
});

// ── Response interceptor — handle 401 globally ────────────
axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401 && error.config?.url !== '/api/auth/me') {
            // Clear stale auth data and redirect to login
            if (typeof window !== 'undefined') {
                localStorage.removeItem('user');
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default axiosInstance;