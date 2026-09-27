import jwt from "jsonwebtoken";
import {
  json,
  corsHeaders,
  sessionCookie,
} from "../../server/vercel-lib.mjs";

export async function POST(request) {
  try {
    if (
      !process.env.ADMIN_USER ||
      !process.env.ADMIN_PASSWORD ||
      !process.env.JWT_SECRET
    ) {
      return json(
        {
          message: "Admin environment variables are not configured",
        },
        503,
        corsHeaders()
      );
    }

    const body = await request.json();

    const username = String(body?.username || "");
    const password = String(body?.password || "");

    if (
      username !== process.env.ADMIN_USER ||
      password !== process.env.ADMIN_PASSWORD
    ) {
      return json(
        {
          message: "Invalid credentials",
        },
        401,
        corsHeaders()
      );
    }

    const token = jwt.sign(
      {
        username,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "8h",
      }
    );

    return json(
      {
        ok: true,
        message: "Login successful",
      },
      200,
      {
        ...corsHeaders(),
        "Set-Cookie": sessionCookie(token),
      }
    );
  } catch (error) {
    console.error("Admin login error:", error);

    return json(
      {
        message: "Login failed",
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