import {
  auth,
  uploadAsset,
  json,
  corsHeaders,
} from "../../server/vercel-lib.mjs";

export async function POST(request) {
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

    const body = await request.json();

    if (!body?.base64 || !body?.filename) {
      return json(
        {
          message: "filename and base64 are required",
        },
        400,
        corsHeaders()
      );
    }

    if (body.base64.length > 5_500_000) {
      return json(
        {
          message:
            "File too large for this JSON upload endpoint; keep uploads under about 4 MB",
        },
        413,
        corsHeaders()
      );
    }

    const result = await uploadAsset(body);

    return json(
      result,
      200,
      corsHeaders()
    );
  } catch (error) {
    console.error("Admin upload error:", error);

    return json(
      {
        message: error.message || "Upload failed",
      },
      400,
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