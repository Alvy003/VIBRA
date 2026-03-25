import axios from "axios";

let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
    authToken = token;
};

export const axiosInstance = axios.create({
    baseURL: process.env.EXPO_PUBLIC_API_URL + "/api",
});

// Add request interceptor to inject token
axiosInstance.interceptors.request.use(
    (config) => {
        if (authToken) {
            config.headers.Authorization = `Bearer ${authToken}`;
        } else {
            // console.warn("[Axios] No auth token available for request:", config.url);
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add response interceptor for debugging 401s
axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            console.error("[Axios] 401 Unauthorized error - Token might be expired or invalid", {
                url: error.config?.url,
                hasToken: !!authToken
            });
        }
        return Promise.reject(error);
    }
);
