import {
  auth,
  uploadAsset,
  json,
  corsHeaders,
} from '../../server/vercel-lib.mjs';

/* =========================================================
   UPLOAD FILE
========================================================= */

export async function POST(request) {
  try {
    /*
     * Check admin authentication.
     */
    if (!auth(request)) {
      return json(
        {
          message:
            'Unauthorized',
        },
        401,
        corsHeaders()
      );
    }

    /*
     * Parse JSON.
     */
    let body;

    try {
      body =
        await request.json();
    } catch {
      return json(
        {
          message:
            'Invalid JSON request body.',
        },
        400,
        corsHeaders()
      );
    }

    /*
     * Required fields.
     */
    if (!body?.filename) {
      return json(
        {
          message:
            'Filename is required.',
        },
        400,
        corsHeaders()
      );
    }

    if (!body?.base64) {
      return json(
        {
          message:
            'Base64 file data is required.',
        },
        400,
        corsHeaders()
      );
    }

    /*
     * Prevent excessively large JSON uploads.
     */
    if (
      body.base64.length >
      5_500_000
    ) {
      return json(
        {
          message:
            'File too large for this upload endpoint. Keep the file below about 4 MB.',
        },
        413,
        corsHeaders()
      );
    }

    /*
     * Upload to GitHub.
     */
    const result =
      await uploadAsset(
        body
      );

    /*
     * uploadAsset can return
     * an error without throwing.
     */
    if (result?.error) {
      return json(
        {
          message:
            result.error,
        },
        503,
        corsHeaders()
      );
    }

    return json(
      result,
      200,
      corsHeaders()
    );
  } catch (error) {
    console.error(
      'Admin upload error:',
      error
    );

    /*
     * GitHub authentication.
     */
    if (
      error?.status === 401
    ) {
      return json(
        {
          message:
            'GitHub authentication failed. Check GITHUB_TOKEN in Vercel.',
        },
        401,
        corsHeaders()
      );
    }

    /*
     * GitHub permission.
     */
    if (
      error?.status === 403
    ) {
      return json(
        {
          message:
            'GitHub permission denied. Your token needs Contents: Read and write permission for this repository.',
        },
        403,
        corsHeaders()
      );
    }

    /*
     * Repository not found.
     */
    if (
      error?.status === 404
    ) {
      return json(
        {
          message:
            'GitHub repository was not found. Check GITHUB_OWNER and GITHUB_REPO.',
        },
        404,
        corsHeaders()
      );
    }

    /*
     * GitHub rejected request.
     */
    if (
      error?.status === 422
    ) {
      return json(
        {
          message:
            `GitHub rejected the upload: ${error.message}`,
        },
        422,
        corsHeaders()
      );
    }

    /*
     * File validation errors.
     */
    if (
      error?.status === 400
    ) {
      return json(
        {
          message:
            error.message ||
            'Invalid upload.',
        },
        400,
        corsHeaders()
      );
    }

    /*
     * Server/GitHub configuration
     * error.
     */
    return json(
      {
        message:
          error?.message ||
          'Upload failed.',
      },
      error?.status || 500,
      corsHeaders()
    );
  }
}

/* =========================================================
   CORS PREFLIGHT
========================================================= */

export function OPTIONS() {
  return new Response(
    null,
    {
      status: 204,
      headers:
        corsHeaders(),
    }
  );
}