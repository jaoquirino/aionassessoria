import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { username, newPassword } = await req.json();

    if (!username || !newPassword) {
      return new Response(
        JSON.stringify({ error: "username and newPassword are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find user by username
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("user_id, must_reset_password")
      .eq("username", username.toLowerCase())
      .maybeSingle();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: "Usuário não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!profile.must_reset_password) {
      return new Response(
        JSON.stringify({ error: "Redefinição de senha não solicitada para este usuário" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update the user's password AND confirm email using GoTrue Admin API directly
    // email_confirm: true ensures imported users can sign in even without email
    const updateRes = await fetch(
      `${supabaseUrl}/auth/v1/admin/users/${profile.user_id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseServiceKey}`,
          "apikey": supabaseServiceKey,
        },
        body: JSON.stringify({ password: newPassword, email_confirm: true }),
      }
    );

    if (!updateRes.ok) {
      const errorBody = await updateRes.json().catch(() => ({}));
      console.error("Password update failed:", errorBody);
      return new Response(
        JSON.stringify({ error: errorBody.message || errorBody.msg || "Erro ao atualizar senha" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Clear the must_reset_password flag - CRITICAL: must succeed
    const { error: clearFlagError, data: clearedRows } = await supabase
      .from("profiles")
      .update({ must_reset_password: false })
      .eq("user_id", profile.user_id)
      .select("user_id, must_reset_password");

    if (clearFlagError) {
      console.error("Failed to clear must_reset_password flag:", clearFlagError);
      return new Response(
        JSON.stringify({ error: "Senha atualizada, mas falhou ao limpar a flag de reset. Contate o admin." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("must_reset_password cleared for user:", profile.user_id, "rows:", clearedRows);

    return new Response(
      JSON.stringify({ success: true, cleared: clearedRows }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
