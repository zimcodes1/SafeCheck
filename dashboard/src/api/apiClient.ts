import axios, {
    type AxiosError,
    type AxiosInstance,
    type AxiosResponse,
    type InternalAxiosRequestConfig,
} from 'axios';

// Default API client configured for SafeCheck Backend
export const apiClient: AxiosInstance = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
    },
});

// Request interceptor for diagnostics & logging
apiClient.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        // Attach request timestamp for latency tracking
        (config as any).metadata = { startTime: Date.now() };
        return config;
    },
    (error: AxiosError) => {
        return Promise.reject(error);
    }
);

// Response interceptor for error normalization
apiClient.interceptors.response.use(
    (response: AxiosResponse) => {
        return response;
    },
    (error: AxiosError) => {
        // Format error message cleanly for UI notification
        const message =
            (error.response?.data as any)?.detail ||
            error.message ||
            'An unexpected network error occurred';

        console.error(`[API Error] ${error.config?.method?.toUpperCase()} ${error.config?.url}:`, message);
        return Promise.reject(new Error(message));
    }
);

export default apiClient;
