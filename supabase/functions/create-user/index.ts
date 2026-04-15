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
 
     // Get requesting user from auth header
     const authHeader = req.headers.get("Authorization");
     if (!authHeader) {
       return new Response(
         JSON.stringify({ error: "No authorization header" }),
         { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     const token = authHeader.replace("Bearer ", "");
     const { data: { user: requestingUser }, error: userError } = await supabase.auth.getUser(token);
     
     if (userError || !requestingUser) {
       return new Response(
         JSON.stringify({ error: "Invalid token" }),
         { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     // Check if requesting user is admin
     const { data: roleData } = await supabase
       .from("user_roles")
       .select("role")
       .eq("user_id", requestingUser.id)
       .eq("role", "admin")
       .maybeSingle();
 
     if (!roleData) {
       return new Response(
         JSON.stringify({ error: "Only admins can create users" }),
         { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     // Get request body
      const { username, password, fullName: rawFullName, roles, permission } = await req.json();
      const fullName = rawFullName ? rawFullName.toLowerCase().replace(/(?:^|\s)\S/g, (c: string) => c.toUpperCase()) : null;
 
     if (!username || !password) {
       return new Response(
         JSON.stringify({ error: "Username and password are required" }),
         { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     // Check if username already exists
     const { data: existingProfile } = await supabase
       .from("profiles")
       .select("id")
       .eq("username", username)
       .maybeSingle();
 
     if (existingProfile) {
       return new Response(
         JSON.stringify({ error: "Username already exists" }),
         { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     // Create the user with internal email
     const internalEmail = `${username.toLowerCase()}@internal.local`;
     
     const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
       email: internalEmail,
       password,
       email_confirm: true,
       user_metadata: {
         full_name: fullName || null,
       },
     });
 
     if (createError) {
       return new Response(
         JSON.stringify({ error: createError.message }),
         { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     // Update profile with username
      const { error: profileUpdateError } = await supabase
       .from("profiles")
       .update({ 
         username,
         full_name: fullName || null,
       })
       .eq("user_id", newUser.user.id);

      if (profileUpdateError) {
        return new Response(
          JSON.stringify({ error: profileUpdateError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
 
     // Assign member role by default
      // Assign role based on permission - admin or member
       const roleToAssign = permission === "admin" ? "admin" : "member";
       const { error: roleInsertError } = await supabase
       .from("user_roles")
         .insert({ user_id: newUser.user.id, role: roleToAssign });

      if (roleInsertError) {
        return new Response(
          JSON.stringify({ error: roleInsertError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
 
     // Create team member entry with roles
      // Always create team member entry - use first role as primary or "Membro" as default
      const roleString = roles && roles.length > 0 ? roles.join(", ") : "Membro";
      
      const { error: teamMemberError } = await supabase
        .from("team_members")
        .insert({
          name: fullName || username,
          role: roleString,
          permission: permission || "operational",
          user_id: newUser.user.id,
        });
      
      if (teamMemberError) {
        console.error("Error creating team member:", teamMemberError);
        // Don't fail the whole operation, user was already created
      }
 
     return new Response(
       JSON.stringify({ 
         success: true, 
         user: {
           id: newUser.user.id,
           username,
           fullName,
         },
         message: "User created successfully" 
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