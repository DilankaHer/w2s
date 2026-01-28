# W2S Mobile App

React Native mobile application for the W2S workout tracking system, built with Expo.

## Features

- User authentication (login/signup)
- Workout template management
- Session tracking with timer
- Exercise and set management
- Real-time workout progress tracking

## Prerequisites

- Node.js 18+
- pnpm (`npm install -g pnpm`)
- Expo CLI (`pnpm add -g expo-cli` or `npm install -g expo-cli`)
- iOS Simulator (for Mac) or Android Emulator

**Note:** This project uses Expo SDK 53 with React Native 0.79 and React 19. The New Architecture is enabled by default.

## Setup

1. Install dependencies:
```bash
pnpm install
```

2. Configure API URL (optional):
   - Create a `.env` file in the `mobile/` directory
   - Add: `EXPO_PUBLIC_API_BASE_URL=http://your-backend-url:3000`
   - Default is `http://localhost:3000`

3. Start the development server:
```bash
pnpm start
```

4. Run on your device:
   - Scan the QR code with Expo Go app (iOS/Android)
   - Or press `i` for iOS simulator, `a` for Android emulator

## Project Structure

```
mobile/
├── App.tsx                 # Root component with navigation
├── src/
│   ├── api/
│   │   └── client.ts       # tRPC client configuration
│   ├── hooks/
│   │   └── useAuth.ts      # Authentication hook
│   ├── components/
│   │   └── ProtectedRoute.tsx  # Route protection wrapper
│   ├── screens/            # Screen components
│   │   ├── LoginScreen.tsx
│   │   ├── LandingScreen.tsx
│   │   ├── TemplateDetailScreen.tsx
│   │   ├── SessionDetailScreen.tsx
│   │   └── CreateTemplateScreen.tsx
│   └── types/
│       └── index.ts         # TypeScript type definitions
└── package.json
```

## Development

The app follows the same business logic as the web frontend:
- Uses tRPC for API communication
- Cookie-based authentication
- Same data structures and API endpoints

## Building for Production

```bash
# iOS
expo build:ios

# Android
expo build:android
```

## Notes

- The app uses AsyncStorage for cookie persistence
- Make sure your backend is running and accessible from your device/emulator
- For local development, use your computer's IP address instead of localhost
