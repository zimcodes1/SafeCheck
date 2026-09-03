import { useState, type FC } from "react";
import {
	Button,
	Badge,
	Card,
	CardHeader,
	CardTitle,
	CardDescription,
	CardContent,
	CardFooter,
	StatusIndicator,
	Modal,
} from "../components/ui";
import { ThemeSwitcher } from "../components/ThemeSwitcher";
import { useTheme } from "../hooks/useTheme";
import apiClient from "../api/apiClient";
import {
	Play,
	RotateCcw,
	AlertTriangle,
	ShieldCheck,
	Zap,
	Info,
	ExternalLink,
	Layers,
	Database,
	Sliders,
	CheckCircle2,
} from "lucide-react";

export const DemoView: FC = () => {
	const { theme, resolvedTheme } = useTheme();
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [buttonLoading, setButtonLoading] = useState(false);

	const simulateLoading = () => {
		setButtonLoading(true);
		setTimeout(() => setButtonLoading(false), 1500);
	};

	return (
		<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
			{/* Intro Banner */}
			<div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 rounded-2xl bg-surface-1 border border-border-subtle shadow-sm">
				<div>
					<div className="flex items-center gap-2 text-primary font-semibold text-xs tracking-wider uppercase">
						<ShieldCheck className="w-4 h-4" />
						<span>Design System & Component Scaffold</span>
					</div>
					<h1 className="text-2xl font-bold text-text-primary mt-1">
						SafeCheck Dashboard UI Scaffolding
					</h1>
					<p className="text-sm text-text-secondary mt-1 max-w-2xl">
						Multi-variant UI primitives built with Tailwind CSS, Lucide icons,
						and dynamic tokens matching the SafeCheck Theme Definition.
					</p>
				</div>

				<div className="flex items-center gap-3 self-end md:self-auto bg-surface-2 p-2 rounded-xl border border-border-subtle">
					<span className="text-xs text-text-secondary font-medium pl-1">
						Theme:
					</span>
					<ThemeSwitcher variant="segmented" />
				</div>
			</div>

			{/* 1. Buttons Section */}
			<section className="space-y-4">
				<div>
					<h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
						<Sliders className="w-5 h-5 text-primary" />
						<span>Button Variants & Sizes</span>
					</h2>
					<p className="text-xs text-text-secondary mt-0.5">
						Configurable styles for primary actions, secondary triggers, alerts,
						and loading states.
					</p>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					<Card>
						<CardHeader>
							<CardTitle>Variants</CardTitle>
							<Badge variant="outline" size="sm">
								Style Presets
							</Badge>
						</CardHeader>
						<CardContent className="flex flex-wrap gap-2.5">
							<Button variant="primary">Primary</Button>
							<Button variant="secondary">Secondary</Button>
							<Button variant="outline">Outline</Button>
							<Button variant="ghost">Ghost</Button>
							<Button variant="danger">Danger</Button>
							<Button variant="subtle">Subtle</Button>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Sizes</CardTitle>
							<Badge variant="outline" size="sm">
								Scaling
							</Badge>
						</CardHeader>
						<CardContent className="flex items-center gap-2.5 flex-wrap">
							<Button variant="primary" size="sm">
								Small (sm)
							</Button>
							<Button variant="primary" size="md">
								Medium (md)
							</Button>
							<Button variant="primary" size="lg">
								Large (lg)
							</Button>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Icons & States</CardTitle>
							<Badge variant="outline" size="sm">
								Interactive
							</Badge>
						</CardHeader>
						<CardContent className="flex flex-wrap gap-2.5">
							<Button
								variant="primary"
								leftIcon={<Play className="w-3.5 h-3.5" />}
							>
								Run Cycle
							</Button>
							<Button
								variant="outline"
								rightIcon={<ExternalLink className="w-3.5 h-3.5" />}
							>
								Inspect
							</Button>
							<Button
								variant="secondary"
								isLoading={buttonLoading}
								onClick={simulateLoading}
								leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
							>
								{buttonLoading ? "Loading..." : "Click to Load"}
							</Button>
							<Button variant="secondary" disabled>
								Disabled
							</Button>
						</CardContent>
					</Card>
				</div>
			</section>

			{/* 2. Badges & Confidence Markers */}
			<section className="space-y-4">
				<div>
					<h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
						<Layers className="w-5 h-5 text-primary" />
						<span>Badges & Severity Markers</span>
					</h2>
					<p className="text-xs text-text-secondary mt-0.5">
						Severity color coding (Critical, Warning, Info) and distinctive
						dashed borders for "needs_review" confidence.
					</p>
				</div>

				<Card>
					<CardContent className="space-y-6">
						<div>
							<div className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2.5">
								Severity Badges
							</div>
							<div className="flex flex-wrap gap-2">
								<Badge variant="critical" dot>
									Critical Severity
								</Badge>
								<Badge variant="warning" dot>
									Warning Severity
								</Badge>
								<Badge variant="info" dot>
									Info Severity
								</Badge>
								<Badge variant="success" dot>
									Normal / Safe
								</Badge>
								<Badge variant="neutral">Neutral System</Badge>
								<Badge variant="outline">Border Outline</Badge>
							</div>
						</div>

						<div>
							<div className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2.5">
								Confidence Markers (Brief Requirement)
							</div>
							<div className="flex flex-wrap items-center gap-3">
								<div className="flex items-center gap-2">
									<Badge variant="success" size="md">
										<CheckCircle2 className="w-3 h-3 mr-1" />
										Certain
									</Badge>
									<span className="text-xs text-text-secondary">
										Deterministic logic violation
									</span>
								</div>
								<div className="flex items-center gap-2">
									<Badge variant="review" isReview size="md">
										<AlertTriangle className="w-3 h-3 mr-1" />
										Needs Review
									</Badge>
									<span className="text-xs text-text-secondary">
										Empirical anomaly / dashed border
									</span>
								</div>
							</div>
						</div>
					</CardContent>
				</Card>
			</section>

			{/* 3. Industrial Actuator Indicators */}
			<section className="space-y-4">
				<div>
					<h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
						<Zap className="w-5 h-5 text-primary" />
						<span>Industrial Actuator Indicators</span>
					</h2>
					<p className="text-xs text-text-secondary mt-0.5">
						LED panel indicators representing physical actuators (pump, valve)
						and network link status.
					</p>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
					<Card>
						<CardContent className="py-4">
							<StatusIndicator
								state="active"
								label="PUMP ACTUATOR"
								sublabel="Status: Running (Inflow active)"
								size="md"
							/>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="py-4">
							<StatusIndicator
								state="inactive"
								label="PUMP ACTUATOR"
								sublabel="Status: Stopped / De-energized"
								size="md"
							/>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="py-4">
							<StatusIndicator
								state="active"
								label="DRAIN VALVE"
								sublabel="Status: Open (Draining active)"
								size="md"
							/>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="py-4">
							<StatusIndicator
								state="critical"
								label="DANGER CONDITION"
								sublabel="Near-full tank + pump running"
								pulse
								size="md"
							/>
						</CardContent>
					</Card>
				</div>
			</section>

			{/* 4. Layout & Cards Preview */}
			<section className="space-y-4">
				<div>
					<h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
						<Info className="w-5 h-5 text-primary" />
						<span>Scaffolded Mock Views</span>
					</h2>
					<p className="text-xs text-text-secondary mt-0.5">
						Mock representations showing how components compose into Live
						Telemetry and Security Alert cards.
					</p>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					{/* Mock Live View Card */}
					<Card>
						<CardHeader>
							<div>
								<CardTitle>Water Tank Telemetry Mockup</CardTitle>
								<CardDescription>
									Live View Component Composition
								</CardDescription>
							</div>
							<Badge variant="success" dot size="sm">
								Online
							</Badge>
						</CardHeader>
						<CardContent className="space-y-5">
							{/* Level indicator bar */}
							<div>
								<div className="flex justify-between items-center text-sm font-medium text-text-primary mb-2">
									<span>Tank Fill Level</span>
									<span className="font-bold text-primary">76.4%</span>
								</div>
								<div className="w-full h-4 bg-surface-2 rounded-full overflow-hidden border border-border-subtle">
									<div
										className="h-full bg-primary rounded-full transition-all duration-500"
										style={{ width: "76.4%" }}
									/>
								</div>
								<div className="flex justify-between text-[11px] text-text-tertiary mt-1">
									<span>0% (Empty)</span>
									<span>Danger Threshold: 95%</span>
									<span>100% (Full)</span>
								</div>
							</div>

							{/* Actuator status summary */}
							<div className="p-3.5 rounded-xl bg-surface-2 border border-border-subtle flex items-center justify-around">
								<StatusIndicator
									state="active"
									label="PUMP"
									sublabel="Running"
									size="sm"
								/>
								<div className="w-px h-8 bg-border-subtle" />
								<StatusIndicator
									state="inactive"
									label="VALVE"
									sublabel="Closed"
									size="sm"
								/>
							</div>
						</CardContent>
						<CardFooter>
							<span className="text-xs text-text-secondary">
								Source: Modbus Port 5020
							</span>
							<Button
								size="sm"
								variant="outline"
								onClick={() => setIsModalOpen(true)}
							>
								Inspect Detail
							</Button>
						</CardFooter>
					</Card>

					{/* Mock Alert Card */}
					<Card className="border-warning/40">
						<CardHeader className="bg-warning/5">
							<div className="flex items-center gap-2">
								<Badge variant="warning" dot>
									Warning
								</Badge>
								<Badge variant="review" isReview size="sm">
									Needs Review
								</Badge>
							</div>
							<span className="text-xs text-text-tertiary">32s ago</span>
						</CardHeader>
						<CardContent className="space-y-3">
							<h4 className="text-sm font-semibold text-text-primary">
								Sensor Anomaly: Suspicious Replay Pattern Detected
							</h4>
							<p className="text-xs text-text-secondary leading-relaxed">
								Pump actuator has been active continuously for 5 samples, but
								water level readings remain identical (50.00%). Possible sensor
								replay attack or telemetry freeze.
							</p>
							<div className="flex items-center gap-4 text-[11px] text-text-tertiary pt-2 border-t border-border-subtle/60">
								<span>
									Rule:{" "}
									<strong className="text-text-primary font-medium">
										replay
									</strong>
								</span>
								<span>
									Command ID:{" "}
									<strong className="text-text-primary font-medium">
										None (Telemetry window)
									</strong>
								</span>
							</div>
						</CardContent>
						<CardFooter>
							<span className="text-xs text-text-secondary">
								Layer 3 Analysis
							</span>
							<Button
								size="sm"
								variant="secondary"
								onClick={() => setIsModalOpen(true)}
							>
								View Alert Chain
							</Button>
						</CardFooter>
					</Card>
				</div>
			</section>

			{/* 5. API Client Diagnostics */}
			<section className="space-y-4">
				<div>
					<h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
						<Database className="w-5 h-5 text-primary" />
						<span>API Client Configuration</span>
					</h2>
					<p className="text-xs text-text-secondary mt-0.5">
						Axios client initialized in{" "}
						<code className="text-primary font-mono text-xs">
							src/api/apiClient.ts
						</code>{" "}
						ready for service calls.
					</p>
				</div>

				<Card>
					<CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
						<div className="p-3 bg-surface-2 rounded-lg border border-border-subtle">
							<span className="text-text-secondary block">Base URL</span>
							<span className="font-mono font-semibold text-text-primary mt-1 block">
								{apiClient.defaults.baseURL || "/api"}
							</span>
						</div>
						<div className="p-3 bg-surface-2 rounded-lg border border-border-subtle">
							<span className="text-text-secondary block">Timeout</span>
							<span className="font-mono font-semibold text-text-primary mt-1 block">
								{apiClient.defaults.timeout} ms
							</span>
						</div>
						<div className="p-3 bg-surface-2 rounded-lg border border-border-subtle">
							<span className="text-text-secondary block">Resolved Theme</span>
							<span className="font-mono font-semibold text-primary mt-1 block capitalize">
								{resolvedTheme} ({theme})
							</span>
						</div>
					</CardContent>
				</Card>
			</section>

			{/* Demo Modal */}
			<Modal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				title="Security Alert Investigation Trail"
				description="Detailed correlation chain between command and telemetry"
				maxWidth="md"
				footer={
					<>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setIsModalOpen(false)}
						>
							Dismiss
						</Button>
						<Button
							variant="primary"
							size="sm"
							onClick={() => setIsModalOpen(false)}
						>
							Acknowledge Alert
						</Button>
					</>
				}
			>
				<div className="space-y-4">
					<div className="p-3 rounded-lg bg-surface-2 border border-border-subtle text-xs space-y-1.5">
						<div className="flex justify-between">
							<span className="text-text-secondary">Alert ID:</span>
							<span className="font-mono font-semibold text-text-primary">
								#42
							</span>
						</div>
						<div className="flex justify-between">
							<span className="text-text-secondary">Rule Triggered:</span>
							<Badge variant="critical" size="sm">
								state_machine
							</Badge>
						</div>
						<div className="flex justify-between">
							<span className="text-text-secondary">Confidence:</span>
							<Badge variant="success" size="sm">
								certain
							</Badge>
						</div>
					</div>

					<p className="text-xs text-text-secondary">
						Command instruction sent:{" "}
						<strong className="text-text-primary">pump = ON</strong>. Tank water
						level was already at{" "}
						<strong className="text-critical font-semibold">96.0%</strong> with
						drainage valve closed. Detector flagged command as physically
						hazardous.
					</p>
				</div>
			</Modal>
		</div>
	);
};
