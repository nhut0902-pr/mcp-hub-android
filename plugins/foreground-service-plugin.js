/**
 * Expo Config Plugin: Foreground Service for react-native-background-actions
 * 
 * The library's own AndroidManifest.xml declares:
 *   <service android:name=".RNBackgroundActionsTask" android:exported="false" />
 * 
 * But on Android 14+ (targetSdk 34+), the service MUST also declare
 * android:foregroundServiceType. The library doesn't include this.
 * 
 * This plugin ensures the <service> has the correct foregroundServiceType.
 */
const { withAndroidManifest } = require("@expo/config-plugins");

const SERVICE_NAME = "com.asterinet.react.bgactions.RNBackgroundActionsTask";

module.exports = function foregroundServicePlugin(config) {
  return withAndroidManifest(config, (config) => {
    const application = config.modResults.manifest.application[0];
    
    if (!application.service) application.service = [];
    
    // Check if service already exists (library's own manifest may have added it)
    const existingIdx = application.service.findIndex(
      (s) => s.$?.["android:name"] === SERVICE_NAME || s.$?.["android:name"] === ".RNBackgroundActionsTask"
    );
    
    if (existingIdx >= 0) {
      // Update existing service to add foregroundServiceType
      application.service[existingIdx].$["android:foregroundServiceType"] = "dataSync";
    } else {
      // Add new service declaration
      application.service.push({
        $: {
          "android:name": SERVICE_NAME,
          "android:exported": "false",
          "android:foregroundServiceType": "dataSync",
        },
      });
    }
    
    return config;
  });
};
