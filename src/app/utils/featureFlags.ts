// Feature Flags configuration
// This prepares the architecture for future premium features
// In a real app, these could be fetched from a remote config (e.g., LaunchDarkly, Firebase Remote Config)

export const FEATURES = {
  // Premium Features (currently disabled or mock-enabled for demo)
  PREMIUM_COLORS: false,      // Custom star colors
  EXTENDED_MESSAGES: false,   // Longer tribute messages
  PRIVATE_MEMORIALS: true,    // Private memorials (enabled for basic tier for now)
  ANNIVERSARY_REMINDERS: false, // Push notifications for dates
  
  // Experimental Features
  LIVING_MEMORY_DAILY: true,  // The "Today's Memory" feature
};

export const checkFeature = (feature: keyof typeof FEATURES) => {
  return FEATURES[feature];
};
