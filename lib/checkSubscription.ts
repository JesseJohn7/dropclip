import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function isSubscribed(email: string): Promise<boolean> {
  const { data } = await supabase
    .from("subscribers")
    .select("expires_at, status")
    .eq("email", email)
    .eq("status", "active")
    .single();

  if (!data) return false;
  return new Date(data.expires_at) > new Date();
}