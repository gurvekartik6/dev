import {
  auth,
  loadContent,
  saveContent,
  json,
  corsHeaders,
} from '../../server/vercel-lib.mjs';

/* =========================================================
   ERROR RESPONSE
========================================================= */

function errorResponse(error) {
  const status =
    Number(error?.status) || 500;

  return json(
    {
      message:
        error?.message ||
        'Failed to load/save admin content',
    },
    status,
    corsHeaders()
  );
}

/* =========================================================
   GET CONTENT
========================================================= */

export async function GET(request) {
  try {
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

    const content =
      await loadContent();

    return json(
      content,
      200,
      corsHeaders()
    );
  } catch (error) {
    console.error(
      'Admin content GET error:',
      error
    );

    return errorResponse(
      error
    );
  }
}

/* =========================================================
   UPDATE CONTENT
========================================================= */

export async function PUT(request) {
  try {
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

    let data;

    try {
      data =
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

    if (
      !data ||
      typeof data !== 'object'
    ) {
      return json(
        {
          message:
            'Invalid content payload.',
        },
        400,
        corsHeaders()
      );
    }

    /*
     * Save to GitHub/local persistence.
     */
    const result =
      await saveContent(
        data
      );

    /*
     * If saveContent returns
     * an error object.
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

    /*
     * Read back the content so the
     * frontend receives the actual
     * persisted version.
     */
    const content =
      await loadContent();

    return json(
      {
        ...result,
        content,
      },
      200,
      corsHeaders()
    );
  } catch (error) {
    console.error(
      'Admin content PUT error:',
      error
    );

    return errorResponse(
      error
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