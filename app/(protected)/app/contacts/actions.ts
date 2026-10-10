"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireWorkspace } from "@/lib/workspace";

export async function createContact(formData: FormData) {
	const workspace = await requireWorkspace();
	const name = String(formData.get("name") || "")
		.trim()
		.slice(0, 160);
	const phone =
		String(formData.get("phone") || "")
			.trim()
			.slice(0, 40) || null;
	const source = String(formData.get("source") || "Manual")
		.trim()
		.slice(0, 80);
	const submittedKey = String(formData.get("intakeKey") || "").trim();
	const intakeKey =
		/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
			submittedKey,
		)
			? submittedKey
			: randomUUID();

	if (name.length < 2) return;

	const supabase = await createClient();
	const { error } = await supabase.rpc("create_lead_with_deal", {
		p_workspace_id: workspace.id,
		p_name: name,
		p_phone: phone,
		p_source: source,
		p_intake_key: intakeKey,
	});

	if (error) throw new Error(`Failed to create lead: ${error.message}`);

	revalidatePath("/app/contacts");
	revalidatePath("/app/pipeline");
	revalidatePath("/app");
	redirect("/app/contacts?created=1");
}
