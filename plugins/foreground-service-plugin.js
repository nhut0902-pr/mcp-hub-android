const { withAndroidManifest } = require("@expo/config-plugins");

const SERVICE_NAME = "com.asterinet.react.bgactions.RNBackgroundActionsTask";

module.exports = function foregroundServicePlugin(config) {
  return withAndroidManifest(config, (config) => {
    const application = config.modResults.manifest.application[0];
    if (!application.service) application.service = [];
    const existingIdx = application.service.findIndex(
      (s) => s.$?.["android:name"] === SERVICE_NAME || s.$?.["android:name"] === ".RNBackgroundActionsTask"
    );
    if (existingIdx >= 0) {
      application.service[existingIdx].$["android:foregroundServiceType"] = "dataSync";
    } else {
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
