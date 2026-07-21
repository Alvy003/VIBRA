import axios from "axios";
import Constants from "expo-constants";
import * as Sentry from "@sentry/react-native";

let authToken: string | null = null;
let sessionVersion = 0;

export const setAuthToken = (token: string | null) => {
    authToken = token;
};

export const getAuthToken = () => authToken;

export const incrementSessionVersion = () => {
    sessionVersion++;
    if (__DEV__) {
        console.log(`[Axios] Session version incremented to: ${sessionVersion}`);
    }
};

export const getSessionVersion = () => sessionVersion;

const API_URL_FROM_CONFIG = Constants.expoConfig?.extra?.apiUrl;
const API_URL_FROM_ENV = process.env.EXPO_PUBLIC_API_URL;

if (__DEV__) {
    console.log("[Axios] Config API URL:", API_URL_FROM_CONFIG);
    console.log("[Axios] Env API URL:", API_URL_FROM_ENV);
    console.log("[Axios] App Variant:", process.env.APP_VARIANT);
    console.log("[Axios] Node Env:", process.env.NODE_ENV);
}

const BASE_URL = API_URL_FROM_CONFIG || API_URL_FROM_ENV;

if (__DEV__) {
    console.log("[Axios] Base URL being used:", BASE_URL);
}

export const axiosInstance = axios.create({
    baseURL: BASE_URL + "/api",
    timeout: 120000, // 120 second timeout for long-running AI generation tasks
});

// Add request interceptor to inject token
axiosInstance.interceptors.request.use(
    (config) => {
        // Attach session version to config
        (config as any).sessionVersion = sessionVersion;
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

// Add response interceptor for debugging 401s and capturing API errors in Sentry
axiosInstance.interceptors.response.use(
    (response) => {
        // Discard stale responses if session version changed
        const reqSessionVersion = (response.config as any)?.sessionVersion;
        if (reqSessionVersion !== undefined && reqSessionVersion !== sessionVersion) {
            if (__DEV__) {
                console.log(`[Axios] Discarding response from stale session (req: ${reqSessionVersion}, current: ${sessionVersion})`);
            }
            return Promise.reject(new Error("STALE_SESSION"));
        }

        // Reset player store backend failures on any successful backend request
        try {
            const { usePlayerStore } = require('../stores/usePlayerStore');
            const state = usePlayerStore.getState();
            if (state.consecutiveBackendFailures > 0) {
                state.resetBackendFailures();
            }
        } catch (e) {
            // ignore
        }
        return response;
    },
    (error) => {
        // Discard stale errors if session version changed
        const reqSessionVersion = (error.config as any)?.sessionVersion;
        if (reqSessionVersion !== undefined && reqSessionVersion !== sessionVersion) {
            if (__DEV__) {
                console.log(`[Axios] Discarding error from stale session (req: ${reqSessionVersion}, current: ${sessionVersion})`);
            }
            return Promise.reject(new Error("STALE_SESSION"));
        }

        // Suppress logs and sentry if it is already a stale session error
        if (error?.message === "STALE_SESSION") {
            return Promise.reject(error);
        }

        // Ignore aborted/cancelled requests
        if (axios.isCancel(error)) {
            return Promise.reject(error);
        }

        const status = error.response?.status;
        const configUrl = error.config?.url || '';
        const method = error.config?.method?.toUpperCase() || 'UNKNOWN';

        // Increment backend failures on failed backend request
        try {
            if (status !== 401) {
                const { usePlayerStore } = require('../stores/usePlayerStore');
                usePlayerStore.getState().handleBackendFailure();
            }
        } catch (e) {
            // ignore
        }

        // Expected 401 on startup when the user is not yet logged in/synced
        const isExpected401 = status === 401 && !authToken;

        if (!isExpected401) {
            const sanitizeUrl = (url: string): string => {
                if (!url) return url;
                return url.replace(/https?:\/\/[^\s"'`<>]*saavncdn[^\s"'`<>]+/gi, '[CDN_URL_SANITIZED]');
            };
            const sanitizedUrl = sanitizeUrl(configUrl);

            Sentry.captureException(error, {
                tags: {
                    operation: 'api_request',
                    api_status: status ? String(status) : 'network_error',
                    api_method: method,
                    api_endpoint: sanitizedUrl.split('?')[0],
                },
                extra: {
                    status: status,
                    url: sanitizedUrl,
                    statusText: error.response?.statusText,
                    errorCode: error.code,
                    errorMessage: error.message,
                }
            });
        }

        if (status === 401) {
            if (authToken) {
                if (__DEV__) {
                    console.warn("[Axios] 401 Unauthorized error - Token might be expired or invalid", {
                        url: configUrl,
                        hasToken: true
                    });
                }
            } else {
                // Expected during early startup before ClerkAuthHandler syncs
                // console.debug("[Axios] 401 (Expected) - No token synced yet for:", error.config?.url);
            }
        }
        return Promise.reject(error);
    }
);
