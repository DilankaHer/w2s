module.exports = {
  expo: {
    owner: "dilankaher",
    name: "w2s",
    slug: "w2s-mobile",
    version: "1.0.0",
    sdkVersion: "54.0.0",
    orientation: "portrait",
    newArchEnabled: true,
    icon: "./assets/icon.png",
    userInterfaceStyle: "dark",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#1A1A1A"
    },
    assetBundlePatterns: ["**/*"],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.w2s.mobile"
    },
    android: {
      package: "com.w2s.mobile"
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    extra: {
      // API URL from environment variable, fallback to production
      apiUrl: process.env.APP_ENV === 'production'
        ? "https://w2s-api.duvaher.com"
        : "http://192.168.1.109:3000",
      eas: {
        projectId: "fdae008a-9b7c-4f0e-8ce2-8e782f30864f"
      }
    },
  }
}
