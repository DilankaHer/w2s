export default {
    expo: {
      name: "w2s-mobile",
      slug: "w2s-mobile",
      version: "1.0.0",
      orientation: "portrait",
      icon: "./assets/images/icon.png",
      scheme: "w2smobile",
      userInterfaceStyle: "automatic",
      newArchEnabled: true,
  
      ios: {
        supportsTablet: true,
      },
  
      android: {
        package: "com.duvaher.w2s",
        adaptiveIcon: {
          backgroundColor: "#E6F4FE",
          foregroundImage: "./assets/images/android-icon-foreground.png",
          backgroundImage: "./assets/images/android-icon-background.png",
          monochromeImage: "./assets/images/android-icon-monochrome.png",
        },
        softwareKeyboardLayoutMode: "resize",
        edgeToEdgeEnabled: false,
        predictiveBackGestureEnabled: false,
      },
  
      web: {
        output: "single",
        favicon: "./assets/images/favicon.png",
      },
  
      plugins: [
        [
          "expo-splash-screen",
          {
            image: "./assets/images/splash-icon.png",
            imageWidth: 200,
            resizeMode: "contain",
            backgroundColor: "#ffffff",
            dark: { backgroundColor: "#000000" },
          },
        ],
        "expo-sqlite",
      ],
  
      experiments: {
        typedRoutes: true,
        reactCompiler: true,
      },
  
      extra: {
        apiUrl: process.env.EXPO_PUBLIC_API_URL,
        appEnv: process.env.EXPO_PUBLIC_APP_ENV,
      },
    },
  };