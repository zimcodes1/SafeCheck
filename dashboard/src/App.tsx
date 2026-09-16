import { ThemeProvider } from "./contexts/ThemeContext";
import { TopBar } from "./components/TopBar";
import { DemoView } from "./views/DemoView";
import {
  LiveView,
  AlertsView,
  CommandsHistory,
  ReadingsHistory,
} from "./pages/safecheck";
import { Routes, Route, Navigate } from "react-router-dom";

export function App() {
  return (
    <ThemeProvider defaultTheme="system">
      <div className="min-h-screen bg-surface-0 text-text-primary flex flex-col font-sans transition-colors duration-200">
        <TopBar />

        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Navigate to="/live" replace />} />
            <Route path="/demo" element={<DemoView />} />
            <Route path="/live" element={<LiveView />} />
            <Route path="/alerts" element={<AlertsView />} />
            <Route path="/history/commands" element={<CommandsHistory />} />
            <Route path="/history/readings" element={<ReadingsHistory />} />
          </Routes>
        </main>
      </div>
    </ThemeProvider>
  );
}

export default App;
