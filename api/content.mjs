import { loadContent, json, corsHeaders } from "../server/vercel-lib.mjs";

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(),
  });
}

export async function GET() {
  try {
    const content = await loadContent();
    return json(content, 200, corsHeaders());
  } catch (error) {
    console.error("GET /api/content failed:", error);

    return json(
      {
        message: error?.message || "Failed to load content",
      },
      500,
      corsHeaders()
    );
  }
}