import { redirect } from "next/navigation";
import { requirePlatformEligibility } from "@/lib/control";
import { MfaGate } from "@/components/control/mfa-gate";
export default async function VerifyPage() {
	const context = await requirePlatformEligibility();
	if (context.mfa_verified) redirect("/control-center");
	return <MfaGate />;
}
