import { requirePlatformEligibility } from "@/lib/control";
export const dynamic = "force-dynamic";
export const metadata = {
	title: "Growth OS · Control Center",
	robots: { index: false, follow: false },
};
export default async function ControlRoot({
	children,
}: {
	children: React.ReactNode;
}) {
	await requirePlatformEligibility();
	return children;
}
