import {
  auth,
  loadContent,
  saveContent,
  json,
  corsHeaders,
} from "../../server/vercel-lib.mjs";

export async function GET(request) {
  try {
    if (!auth(request)) {
      return json(
        {
          message: "Unauthorized",
        },
        401,
        corsHeaders()
      );
    }

    const content = await loadContent();

    return json(
      content,
      200,
      corsHeaders()
    );
  } catch (error) {
    console.error("Admin content GET error:", error);

    return json(
      {
        message: "Failed to load admin content",
      },
      500,
      corsHeaders()
    );
  }
}

export async function PUT(request) {
  try {
    if (!auth(request)) {
      return json(
        {
          message: "Unauthorized",
        },
        401,
        corsHeaders()
      );
    }

    const data = await request.json();

    const result = await saveContent(data);

    if (result?.error) {
      return json(
        {
          message: result.error,
        },
        503,
        corsHeaders()
      );
    }

    const content = await loadContent();

    return json(
      {
        ...result,
        content,
      },
      200,
      corsHeaders()
    );
  } catch (error) {
    console.error("Admin content PUT error:", error);

    return json(
      {
        message: "Failed to save content",
      },
      500,
      corsHeaders()
    );
  }
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(),
  });
}