import PostHog from 'posthog-react-native';

let posthogClient: PostHog | undefined = undefined;

export const initAnalytics = () => {
    if (!posthogClient && process.env.EXPO_PUBLIC_POSTHOG_API_KEY) {
        posthogClient = new PostHog(process.env.EXPO_PUBLIC_POSTHOG_API_KEY, {
            host: process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com',
            captureAppLifecycleEvents: true,
        });
    }
    return posthogClient;
};

export const captureEvent = (event: string, properties?: any) => {
    posthogClient?.capture(event, properties);
};

export const identifyUser = (id: string) => {
    posthogClient?.identify(id);
};

export const resetAnalytics = () => {
    posthogClient?.reset();
};
