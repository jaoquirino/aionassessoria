import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if any admin exists in the system
    const { data: existingAdmins, error: adminError } = await supabase
      .from("user_roles")
      .select("id")
      .eq("role", "admin")
      .limit(1);

    if (adminError) {
      return new Response(
        JSON.stringify({ error: adminError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user already has a role
    const { data: existingRole } = await supabase
      .from("user_roles")
      .select("id, role")
      .eq("user_id", user.id)
      .single();

    if (existingRole) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          role: existingRole.role,
          isFirstAdmin: false,
          message: "User already has a role" 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user was created with make_admin flag (setup mode)
    const makeAdmin = user.user_metadata?.make_admin === true;

    // If no admins exist OR user was created with make_admin flag, make them admin
    if (!existingAdmins || existingAdmins.length === 0 || makeAdmin) {
      const { error: insertError } = await supabase
        .from("user_roles")
        .insert({ user_id: user.id, role: "admin" });

      if (insertError) {
        return new Response(
          JSON.stringify({ error: insertError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Also create team_members entry for the first admin
      const fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Admin';
      const { error: teamError } = await supabase
        .from("team_members")
        .insert({
          name: fullName,
          role: "Administrador",
          permission: "admin",
          user_id: user.id,
          email: user.email,
        });

      if (teamError) {
        console.error("Error creating team member for first admin:", teamError);
      }

      // Clear the make_admin flag from user metadata
      if (makeAdmin) {
        await supabase.auth.admin.updateUserById(user.id, {
          user_metadata: { ...user.user_metadata, make_admin: undefined }
        });
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          role: "admin",
          isFirstAdmin: !existingAdmins || existingAdmins.length === 0,
          message: "Admin created successfully" 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If admins exist, this user needs to be assigned by an admin
    return new Response(
      JSON.stringify({ 
        success: false, 
        role: null,
        isFirstAdmin: false,
        message: "User needs to be assigned a role by an admin" 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
