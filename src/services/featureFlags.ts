interface FeatureFlagConfig {
    [key: string]: boolean; // Feature flag key-value pairs
}

// Default feature flag configuration
const defaultFeatureFlags: FeatureFlagConfig = {
    'server-side-apps': false,
};

// Load feature flags from environment variables or configuration
const loadFeatureFlags = (): FeatureFlagConfig => {
    // In a real application, this would load from environment variables or a config file
    return {
        ...defaultFeatureFlags,
    };
};

export const featureFlags = loadFeatureFlags();
export { FeatureFlagConfig };
