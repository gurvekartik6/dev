import jwt from 'jsonwebtoken';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { validateContent } = require('./validation.js');

const API = 'https://api.github.com';

/* =========================================================
   RESPONSE HELPERS
========================================================= */

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...headers,
    },
  });
}

export function corsHeaders() {
  const headers = {
    'access-control-allow-headers': 'Content-Type, Authorization',
    'access-control-allow-methods': 'GET,POST,PUT,OPTIONS',
  };

  if (process.env.CORS_ORIGIN) {
    headers['access-control-allow-origin'] =
      process.env.CORS_ORIGIN;
  }

  return headers;
}

/* =========================================================
   ENVIRONMENT
========================================================= */

function env(name) {
  return String(process.env[name] || '').trim();
}

/* =========================================================
   AUTHENTICATION
========================================================= */

export function auth(request) {
  const authorization =
    request.headers.get('authorization') || '';

  const cookie =
    request.headers.get('cookie') || '';

  let token = '';

  if (authorization.startsWith('Bearer ')) {
    token = authorization.slice(7);
  } else {
    const match = cookie.match(
      /(?:^|;\s*)devsphere_session=([^;]+)/
    );

    token = match?.[1] || '';
  }

  if (!token || !env('JWT_SECRET')) {
    return null;
  }

  try {
    return jwt.verify(
      token,
      env('JWT_SECRET')
    );
  } catch {
    return null;
  }
}

export function sessionCookie(token) {
  return [
    `devsphere_session=${token}`,
    'Path=/',
    'HttpOnly',
    process.env.VERCEL ? 'Secure' : '',
    'SameSite=Lax',
    'Max-Age=28800',
  ]
    .filter(Boolean)
    .join('; ');
}

/* =========================================================
   GITHUB CONFIGURATION
========================================================= */

export function githubEnabled() {
  return Boolean(
    env('GITHUB_TOKEN') &&
      env('GITHUB_OWNER') &&
      env('GITHUB_REPO')
  );
}

/* =========================================================
   GITHUB API
========================================================= */

async function gh(path, options = {}) {
  const token = env('GITHUB_TOKEN');

  if (!token) {
    const error = new Error(
      'GITHUB_TOKEN is not configured on the server.'
    );

    error.status = 503;

    throw error;
  }

  const response = await fetch(
    `${API}${path}`,
    {
      ...options,

      headers: {
        Accept:
          'application/vnd.github+json',

        Authorization:
          `Bearer ${token}`,

        'X-GitHub-Api-Version':
          '2022-11-28',

        ...(options.headers || {}),
      },
    }
  );

  const text = await response.text();

  let body = {};

  try {
    body = text
      ? JSON.parse(text)
      : {};
  } catch {
    body = {
      message:
        text ||
        `GitHub API returned ${response.status}`,
    };
  }

  if (!response.ok) {
    const error = new Error(
      body?.message ||
        `GitHub API returned ${response.status}`
    );

    error.status = response.status;
    error.github = body;

    throw error;
  }

  return body;
}

/* =========================================================
   GITHUB REPOSITORY PATH
========================================================= */

function repoPath(filePath) {
  const owner = env('GITHUB_OWNER');
  const repo = env('GITHUB_REPO');

  if (!owner) {
    const error = new Error(
      'GITHUB_OWNER is not configured.'
    );

    error.status = 503;
    throw error;
  }

  if (!repo) {
    const error = new Error(
      'GITHUB_REPO is not configured.'
    );

    error.status = 503;
    throw error;
  }

  return (
    `/repos/${encodeURIComponent(owner)}` +
    `/${encodeURIComponent(repo)}` +
    `/contents/${filePath}`
  );
}

/* =========================================================
   GET FILE FROM GITHUB
========================================================= */

export async function githubFile(filePath) {
  const branch =
    env('GITHUB_BRANCH') || 'main';

  return gh(
    `${repoPath(filePath)}?ref=${encodeURIComponent(
      branch
    )}`
  );
}

/* =========================================================
   PARSE server/data.js
========================================================= */

function parseDataSource(source) {
  const match = source.match(
    /module\.exports\s*=\s*([\s\S]*?)\s*;?\s*$/
  );

  if (!match) {
    throw new Error(
      'Invalid server/data.js format in GitHub.'
    );
  }

  let value;

  try {
    value = Function(
      `"use strict"; return (${match[1]});`
    )();
  } catch (error) {
    throw new Error(
      `Unable to parse server/data.js: ${error.message}`
    );
  }

  return validateContent(value);
}

/* =========================================================
   LOAD CONTENT
========================================================= */

export async function loadContent() {
  /*
   * Local development.
   */
  if (!githubEnabled()) {
    if (process.env.VERCEL) {
      const error = new Error(
        'GitHub persistence is not configured on Vercel. Set GITHUB_TOKEN, GITHUB_OWNER and GITHUB_REPO.'
      );

      error.status = 503;

      throw error;
    }

    const local =
      require('./data.js');

    return validateContent(local);
  }

  /*
   * Production.
   */
  try {
    const file =
      await githubFile(
        'server/data.js'
      );

    if (!file?.content) {
      throw new Error(
        'GitHub returned server/data.js without content.'
      );
    }

    const encoded =
      String(file.content).replace(
        /\s/g,
        ''
      );

    const source =
      Buffer.from(
        encoded,
        'base64'
      ).toString('utf8');

    return parseDataSource(source);
  } catch (error) {
    console.error(
      'loadContent GitHub error:',
      error
    );

    if (error?.status === 401) {
      const e = new Error(
        'GitHub authentication failed. Check GITHUB_TOKEN.'
      );

      e.status = 401;
      throw e;
    }

    if (error?.status === 403) {
      const e = new Error(
        'GitHub denied access. Check the token permissions.'
      );

      e.status = 403;
      throw e;
    }

    if (error?.status === 404) {
      const e = new Error(
        `GitHub repository or server/data.js was not found. Check GITHUB_OWNER="${env(
          'GITHUB_OWNER'
        )}", GITHUB_REPO="${env(
          'GITHUB_REPO'
        )}", and GITHUB_BRANCH="${env(
          'GITHUB_BRANCH'
        ) || 'main'}".`
      );

      e.status = 404;
      throw e;
    }

    throw error;
  }
}

/* =========================================================
   SAVE CONTENT
========================================================= */

export async function saveContent(data) {
  /*
   * Always validate CMS data first.
   */
  validateContent(data);

  /*
   * Local development.
   */
  if (!githubEnabled()) {
    if (process.env.VERCEL) {
      const error = new Error(
        'Vercel CMS persistence requires GITHUB_OWNER, GITHUB_REPO and GITHUB_TOKEN.'
      );

      error.status = 503;

      throw error;
    }

    const fs =
      require('node:fs');

    const path =
      require('node:path');

    const filePath =
      path.join(
        process.cwd(),
        'server',
        'data.js'
      );

    const content =
      'module.exports = ' +
      JSON.stringify(
        data,
        null,
        2
      ) +
      ';\n';

    fs.writeFileSync(
      filePath,
      content,
      'utf8'
    );

    return {
      persisted: 'local-file',
    };
  }

  /*
   * Production GitHub persistence.
   */
  const branch =
    env('GITHUB_BRANCH') ||
    'main';

  const content =
    Buffer.from(
      'module.exports = ' +
        JSON.stringify(
          data,
          null,
          2
        ) +
        ';\n',
      'utf8'
    ).toString('base64');

  /*
   * Retry once if another CMS save changed
   * the GitHub SHA.
   */
  for (
    let attempt = 0;
    attempt < 2;
    attempt += 1
  ) {
    try {
      const file =
        await githubFile(
          'server/data.js'
        );

      if (!file?.sha) {
        const error =
          new Error(
            'GitHub did not return a SHA for server/data.js.'
          );

        error.status = 500;

        throw error;
      }

      const result =
        await gh(
          repoPath(
            'server/data.js'
          ),
          {
            method: 'PUT',

            headers: {
              'content-type':
                'application/json',
            },

            body: JSON.stringify({
              message:
                'chore(cms): update DevSphere content',

              content,

              sha: file.sha,

              branch,
            }),
          }
        );

      return {
        persisted: 'github',
        commit:
          result?.commit?.sha ||
          null,
      };
    } catch (error) {
      /*
       * SHA conflict.
       * Fetch the newest SHA and retry.
       */
      if (
        error?.status === 409 &&
        attempt === 0
      ) {
        continue;
      }

      console.error(
        'GitHub CMS save error:',
        error
      );

      if (error?.status === 401) {
        const e =
          new Error(
            'GitHub authentication failed. Check GITHUB_TOKEN in Vercel.'
          );

        e.status = 401;
        throw e;
      }

      if (error?.status === 403) {
        const e =
          new Error(
            'GitHub denied the write. Give the GitHub token Contents: Read and write permission for the configured repository.'
          );

        e.status = 403;
        throw e;
      }

      if (error?.status === 404) {
        const e =
          new Error(
            `GitHub repository or server/data.js was not found. Check GITHUB_OWNER="${env(
              'GITHUB_OWNER'
            )}", GITHUB_REPO="${env(
              'GITHUB_REPO'
            )}", and GITHUB_BRANCH="${branch}".`
          );

        e.status = 404;
        throw e;
      }

      if (error?.status === 409) {
        const e =
          new Error(
            'GitHub reported a file conflict. Please refresh the CMS and save again.'
          );

        e.status = 409;
        throw e;
      }

      if (error?.status === 422) {
        const e =
          new Error(
            `GitHub rejected the content update: ${error.message}`
          );

        e.status = 422;
        throw e;
      }

      throw error;
    }
  }

  throw new Error(
    'GitHub persistence failed after retry.'
  );
}

/* =========================================================
   UPLOAD ASSET
========================================================= */

export async function uploadAsset({
  filename,
  mime,
  base64,
  section,
}) {
  if (!githubEnabled()) {
    if (process.env.VERCEL) {
      const error =
        new Error(
          'Vercel asset uploads require GITHUB_TOKEN, GITHUB_OWNER and GITHUB_REPO.'
        );

      error.status = 503;

      throw error;
    }

    return {
      error:
        'Use local Express upload endpoint.',
    };
  }

  if (!filename) {
    const error =
      new Error(
        'Filename is required.'
      );

    error.status = 400;

    throw error;
  }

  if (!base64) {
    const error =
      new Error(
        'Base64 file data is required.'
      );

    error.status = 400;

    throw error;
  }

  const extensionMatch =
    String(filename)
      .toLowerCase()
      .match(
        /\.[a-z0-9]+$/
      );

  const ext =
    extensionMatch?.[0] || '';

  const allowedImages = [
    '.png',
    '.jpg',
    '.jpeg',
    '.webp',
    '.svg',
  ];

  const sectionName =
    String(
      section || 'site'
    )
      .replace(
        /[^a-z0-9_-]/gi,
        ''
      )
      .toLowerCase() ||
    'site';

  /*
   * Team uploads:
   * images + PDF.
   */
  if (
    sectionName === 'team' &&
    ext !== '.pdf' &&
    !allowedImages.includes(ext)
  ) {
    const error =
      new Error(
        'Team uploads must be PNG, JPG, JPEG, WEBP, SVG or PDF.'
      );

    error.status = 400;

    throw error;
  }

  /*
   * Other uploads:
   * images only.
   */
  if (
    sectionName !== 'team' &&
    !allowedImages.includes(ext)
  ) {
    const error =
      new Error(
        'Only PNG, JPG, JPEG, WEBP and SVG images are allowed.'
      );

    error.status = 400;

    throw error;
  }

  const safeFilename =
    String(filename).replace(
      /[^a-zA-Z0-9._-]/g,
      '-'
    );

  const repoPathValue =
    `client/public/uploads/${sectionName}/${Date.now()}-${safeFilename}`;

  const branch =
    env('GITHUB_BRANCH') ||
    'main';

  try {
    const result =
      await gh(
        repoPath(
          repoPathValue
        ),
        {
          method: 'PUT',

          headers: {
            'content-type':
              'application/json',
          },

          body: JSON.stringify({
            message:
              `chore(cms): upload ${safeFilename}`,

            content: base64,

            branch,
          }),
        }
      );

    const rawUrl =
      `https://raw.githubusercontent.com/` +
      `${env('GITHUB_OWNER')}/` +
      `${env('GITHUB_REPO')}/` +
      `${encodeURIComponent(branch)}/` +
      repoPathValue
        .split('/')
        .map(
          encodeURIComponent
        )
        .join('/');

    return {
      url: rawUrl,
      persisted: 'github',
      commit:
        result?.commit?.sha ||
        null,
    };
  } catch (error) {
    console.error(
      'GitHub asset upload error:',
      error
    );

    if (error?.status === 401) {
      const e =
        new Error(
          'GitHub authentication failed. Check GITHUB_TOKEN.'
        );

      e.status = 401;
      throw e;
    }

    if (error?.status === 403) {
      const e =
        new Error(
          'GitHub denied the upload. Your token needs Contents: Read and write permission.'
        );

      e.status = 403;
      throw e;
    }

    if (error?.status === 404) {
      const e =
        new Error(
          `GitHub repository was not found. Check GITHUB_OWNER="${env(
            'GITHUB_OWNER'
          )}" and GITHUB_REPO="${env(
            'GITHUB_REPO'
          )}".`
        );

      e.status = 404;
      throw e;
    }

    if (error?.status === 422) {
      const e =
        new Error(
          `GitHub rejected the upload: ${error.message}`
        );

      e.status = 422;
      throw e;
    }

    throw error;
  }
}