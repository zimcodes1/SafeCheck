# SafeCheck Dashboard

React + TypeScript dashboard for the SafeCheck industrial intrusion detection system.

## Features

- **Live Plant Monitoring**: Real-time water tank telemetry with pump and valve status
- **Security Alerts Feed**: View and filter security alerts with severity levels
- **Historical Data**: Command and readings history with export functionality
- **Attack Simulation**: Built-in scenario runner for testing detection capabilities
- **Dark/Light Theme**: System-aware theme switching
- **Responsive Design**: Mobile-friendly interface

## Tech Stack

- React 19 with TypeScript
- Vite for build tooling
- Tailwind CSS v4 for styling
- React Router for navigation
- Axios for API communication
- Zustand for state management
- React Hot Toast for notifications

## Setup & Development

### Prerequisites

- Node.js 18+
- Yarn package manager
- Backend API server running on port 8000

### Installation

```bash
cd dashboard
yarn install
```

### Development Mode

```bash
yarn dev
```

The dashboard will be available at `http://localhost:5173`

### Production Build

```bash
yarn build
```

Build outputs to `dist/` directory.

### Preview Production Build

```bash
yarn preview
```

## API Configuration

The dashboard is configured to proxy API calls to the backend:

- **Development**: Vite proxy routes `/api` to `http://localhost:8000`
- **Production**: Set `VITE_API_URL` environment variable for different backend URL

### Environment Variables

Create `.env.local` file:

```env
VITE_API_URL=http://localhost:8000
```

## Project Structure

```
src/
├── api/              # API client and configuration
├── components/       # Reusable UI components
│   ├── alerts/      # Alert-related components
│   ├── common/      # Common UI elements
│   ├── historical/  # History view components
│   ├── layout/      # Layout components
│   ├── safecheck/   # SafeCheck-specific components
│   └── ui/          # UI primitives
├── contexts/        # React contexts (theme)
├── hooks/           # Custom React hooks
├── pages/           # Page components
│   └── safecheck/   # SafeCheck pages
├── services/        # External services
├── store/           # State management
├── types/           # TypeScript type definitions
├── utils/           # Utility functions
├── views/           # View components
├── App.tsx          # Main application component
└── main.tsx         # Application entry point
```

## Pages

- `/demo` - Component showcase and design system
- `/live` - Live plant monitoring with real-time telemetry
- `/alerts` - Security alerts feed with filtering
- `/history/commands` - Command history with export
- `/history/readings` - Sensor readings history with export

## Backend Integration

The dashboard connects to the SafeCheck backend API:

- `GET /api/plant/live` - Live plant state
- `GET /api/alerts` - Security alerts
- `GET /api/history/readings` - Historical readings
- `GET /api/history/commands` - Command history
- `POST /api/simulate/scenario` - Attack simulation

## Theme System

The dashboard supports dark/light themes with system preference detection:

- **System**: Follows OS preference
- **Light**: Force light mode
- **Dark**: Force dark mode

Theme switcher is available in the top navigation bar.

## State Management

- **Zustand** for global plant state
- **React Context** for theme management
- **Custom hooks** for API polling and data fetching

## Development Notes

- The development server proxies API calls to `http://localhost:8000`
- Hot module replacement is enabled for fast development
- TypeScript strict mode is enabled
- ESLint is configured for code quality

## Troubleshooting

### Backend Connection Issues

If you see "Plant Disconnected" errors:

1. Ensure the backend server is running on port 8000
2. Check that the plant simulator is running on port 5020
3. Verify the Vite proxy configuration in `vite.config.ts`

### Build Errors

If you encounter build errors:

1. Clear the node_modules and reinstall: `rm -rf node_modules && yarn install`
2. Clear the Vite cache: `rm -rf node_modules/.vite`
3. Check TypeScript errors: `yarn tsc --noEmit`

## License

Part of the SafeCheck project for ICSC Hackathon 2026.
