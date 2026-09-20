import axios from "axios";

// Use VITE_API_URL or default to empty string for relative paths (delegating to Vite proxy)
const API_BASE_URL = import.meta.env.VITE_API_URL ?? "/api";

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

export default axiosInstance;
