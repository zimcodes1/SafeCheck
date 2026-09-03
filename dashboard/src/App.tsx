import { useState } from "react";
import { ThemeProvider } from "./contexts/ThemeContext";
import { TopBar } from "./components/TopBar";
import { DemoView } from "./views/DemoView";
import { Card, CardContent } from "./components/ui/Card";
import { Activity, Bell } from "lucide-react";

export function App() {
	const [activeTab, setActiveTab] = useState<string>("demo");

	return (
		<ThemeProvider defaultTheme="system">
			<div className="min-h-screen bg-surface-0 text-text-primary flex flex-col font-sans transition-colors duration-200">
				<TopBar
					activeTab={activeTab}
					onTabChange={setActiveTab}
					isOnline={true}
				/>

				<main className="flex-1">
					{activeTab === "demo" && <DemoView />}

					{activeTab === "live" && (
						<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
							<Card className="text-center py-12">
								<CardContent className="space-y-4">
									<div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center">
										<Activity className="w-6 h-6" />
									</div>
									<h2 className="text-lg font-bold text-text-primary">
										Live View Ready for Integration
									</h2>
									<p className="text-sm text-text-secondary max-w-md mx-auto">
										The live plant view will poll{" "}
										<code className="text-primary font-mono text-xs">
											GET /plant/live
										</code>{" "}
										every 1.0s. See the components showcase under the{" "}
										<strong>Components Demo</strong> tab.
									</p>
								</CardContent>
							</Card>
						</div>
					)}

					{activeTab === "alerts" && (
						<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
							<Card className="text-center py-12">
								<CardContent className="space-y-4">
									<div className="w-12 h-12 rounded-2xl bg-warning/10 text-warning mx-auto flex items-center justify-center">
										<Bell className="w-6 h-6" />
									</div>
									<h2 className="text-lg font-bold text-text-primary">
										Alerts Feed Ready for Integration
									</h2>
									<p className="text-sm text-text-secondary max-w-md mx-auto">
										The alert feed will query{" "}
										<code className="text-primary font-mono text-xs">
											GET /alerts
										</code>
										. See the components showcase under the{" "}
										<strong>Components Demo</strong> tab.
									</p>
								</CardContent>
							</Card>
						</div>
					)}
				</main>
			</div>
		</ThemeProvider>
	);
}

export default App;
