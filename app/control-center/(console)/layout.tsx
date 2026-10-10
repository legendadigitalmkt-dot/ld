import { requirePlatformPermission } from "@/lib/control";
import { ControlShell } from "@/components/control/control-shell";
export default async function ConsoleLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const context = await requirePlatformPermission();
	return <ControlShell context={context}>{children}</ControlShell>;
}
