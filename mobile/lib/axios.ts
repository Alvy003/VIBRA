import axios from "axios";
import Constants from "expo-constants";

let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
    authToken = token;
};

export const getAuthToken = () => authToken;

const API_URL_FROM_CONFIG = Constants.expoConfig?.extra?.apiUrl;
const API_URL_FROM_ENV = process.env.EXPO_PUBLIC_API_URL;

console.log("[Axios] Config API URL:", API_URL_FROM_CONFIG);
console.log("[Axios] Env API URL:", API_URL_FROM_ENV);
console.log("[Axios] App Variant:", process.env.APP_VARIANT);
console.log("[Axios] Node Env:", process.env.NODE_ENV);

const BASE_URL = API_URL_FROM_CONFIG || API_URL_FROM_ENV;

console.log("[Axios] Base URL being used:", BASE_URL);

export const axiosInstance = axios.create({
    baseURL: BASE_URL + "/api",
    timeout: 120000, // 120 second timeout for long-running AI generation tasks
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
            if (authToken) {
                console.warn("[Axios] 401 Unauthorized error - Token might be expired or invalid", {
                    url: error.config?.url,
                    hasToken: true
                });
            } else {
                // Expected during early startup before ClerkAuthHandler syncs
                // console.debug("[Axios] 401 (Expected) - No token synced yet for:", error.config?.url);
            }
        }
        return Promise.reject(error);
    }
);
