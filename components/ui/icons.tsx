import type { CSSProperties } from "react";

export type IconName =
	| "arrow"
	| "play"
	| "check"
	| "close"
	| "dashboard"
	| "contacts"
	| "inbox"
	| "pipeline"
	| "tasks"
	| "automation"
	| "team"
	| "reports"
	| "integrations"
	| "settings"
	| "ai"
	| "shield"
	| "clock"
	| "search"
	| "bell"
	| "send"
	| "more"
	| "menu"
	| "lock"
	| "target";
const paths: Record<IconName, string[]> = {
	arrow: ["M4 12h16", "m14 6 6 6-6 6"],
	play: ["m9 5 11 7-11 7V5Z"],
	check: ["m5 12 4 4L19 6"],
	close: ["m6 6 12 12", "m18 6-12 12"],
	dashboard: ["M3 3h7v7H3z", "M14 3h7v7h-7z", "M3 14h7v7H3z", "M14 14h7v7h-7z"],
	contacts: [
		"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",
		"M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8",
		"M22 21v-2a4 4 0 0 0-3-3.87",
		"M16 3.13a4 4 0 0 1 0 7.75",
	],
	inbox: [
		"M21 11.5a8.38 8.38 0 0 1-.9 3.8A8.5 8.5 0 0 1 12.5 20a8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z",
	],
	pipeline: ["M3 3h18l-7 8v8l-4 2V11L3 3Z"],
	tasks: ["M9 3h6v4H9z", "M9 5H5v16h14V5h-4", "m9 14 2 2 4-4"],
	automation: ["m13 2-9 12h7l-1 8 10-12h-7l1-8Z"],
	team: [
		"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",
		"M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8",
		"M18 8v6",
		"M15 11h6",
	],
	reports: ["M4 20h16", "M7 16V9", "M12 16V4", "M17 16v-5"],
	integrations: [
		"M10 13a5 5 0 0 0 7 .5l4-4a5 5 0 0 0-7-7l-2 2",
		"M14 11a5 5 0 0 0-7-.5l-4 4a5 5 0 0 0 7 7l2-2",
	],
	settings: ["M4 7h16", "M4 17h16", "M9 4v6", "M15 14v6"],
	ai: [
		"m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z",
		"M20 2v4",
		"M18 4h4",
	],
	shield: ["M12 3 3 7v5c0 5 9 9 9 9s9-4 9-9V7l-9-4Z", "m8 12 3 3 5-5"],
	clock: ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20", "M12 6v6l4 2"],
	search: ["M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16", "m17 17 4 4"],
	bell: ["M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9", "M10 21h4"],
	send: ["m22 2-7 20-4-9-9-4L22 2Z", "m22 2-11 11"],
	more: ["M5 12h.01", "M12 12h.01", "M19 12h.01"],
	menu: ["M4 6h16", "M4 12h16", "M4 18h16"],
	lock: ["M5 11h14v10H5z", "M8 11V7a4 4 0 0 1 8 0v4"],
	target: [
		"M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18",
		"M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8",
	],
};
export function Icon({
	name,
	className,
	style,
}: {
	name: IconName;
	className?: string;
	style?: CSSProperties;
}) {
	return (
		<svg
			className={className}
			style={style}
			width="20"
			height="20"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.7"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			{paths[name].map((d) => (
				<path key={d} d={d} />
			))}
		</svg>
	);
}
export function GrowthMark() {
	return (
		<span className="growth-mark" aria-hidden="true">
			<span />
			<span />
			<span />
			<span />
		</span>
	);
}
