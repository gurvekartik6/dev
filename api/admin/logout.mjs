import {
  json,
  corsHeaders,
} from "../../server/vercel-lib.mjs";

export async function POST() {
  return json(
    {
      ok: true,
    },
    200,
    {
      ...corsHeaders(),
      "Set-Cookie":
        "devsphere_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
    }
  );
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(),
  });
}