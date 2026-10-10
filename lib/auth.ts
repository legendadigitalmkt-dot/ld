import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type AuthUser = {
	id: string;
	email: string | null;
};

export const requireUser = cache(async (): Promise<AuthUser> => {
	const supabase = await createClient();
	const { data, error } = await supabase.auth.getClaims();
	const claims = data?.claims;

	if (error || !claims?.sub) redirect("/login");
	const access = await supabase.rpc("account_access");
	if (access.error) throw new Error("Não foi possível validar o acesso agora.");
	if (!access.data) redirect("/access-paused");

	return {
		id: String(claims.sub),
		email: typeof claims.email === "string" ? claims.email : null,
	};
});
