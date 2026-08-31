/**
 * Expo Config Plugin: Foreground Service
 * 
 * Adds the <service> declaration to AndroidManifest.xml for
 * react-native-background-actions. Without this, the service can't start.
 * 
 * Expo autolinking includes the native Java code, but does NOT automatically
 * add the <service> manifest entry — that's what this plugin does.
 */
const { withAndroidManifest } = require("@expo/config-plugins");

module.exports = function foregroundServicePlugin(config) {
  return withAndroidManifest(config, (config) => {
    const application = config.modResults.manifest.application[0];
    
    // Check if service already exists
    const existingServices = application.service || [];
    const hasService = existingServices.some(
      (s) => s.$?.["android:name"] === "com.asterinet.react.backgroundactions.BackgroundActionsService"
    );
    
    if (!hasService) {
      if (!application.service) application.service = [];
      application.service.push({
        $: {
          "android:name": "com.asterinet.react.backgroundactions.BackgroundActionsService",
          "android:exported": "false",
          "android:foregroundServiceType": "dataSync",
        },
      });
    }
    
    return config;
  });
};
