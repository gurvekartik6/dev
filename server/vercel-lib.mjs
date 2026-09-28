import jwt from 'jsonwebtoken';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { validateContent } = require('./validation.js');

const API = 'https://api.github.com';

/* ---------------------------------------------------------
   Response helpers
--------------------------------------------------------- */

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...headers
    }
  });
}

export function corsHeaders() {
  const headers = {
    'access-control-allow-headers': 'Content-Type, Authorization',
    'access-control-allow-methods': 'GET,POST,PUT,OPTIONS'
  };

  if (process.env.CORS_ORIGIN) {
    headers['access-control-allow-origin'] = process.env.CORS_ORIGIN;
  }

  return headers;
}

/* ---------------------------------------------------------
   Authentication
--------------------------------------------------------- */

export function auth(request) {
  const authorization = request.headers.get('authorization') || '';
  const cookie = request.headers.get('cookie') || '';

  const bearerToken = authorization.startsWith('Bearer ')
    ? authorization.slice(7)
    : null;

  const cookieMatch = cookie.match(
    /(?:^|;\s*)devsphere_session=([^;]+)/
  );

  const cookieToken = cookieMatch ? cookieMatch[1] : null;

  const token = bearerToken || cookieToken;

  if (!token || !process.env.JWT_SECRET) {
    return null;
  }

  try {
    return jwt.verify(token, process.env.JWT_SECRET);
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
    'Max-Age=28800'
  ]
    .filter(Boolean)
    .join('; ');
}

/* ---------------------------------------------------------
   GitHub configuration
--------------------------------------------------------- */

export function githubEnabled() {
  return Boolean(
    process.env.GITHUB_TOKEN &&
    process.env.GITHUB_OWNER &&
    process.env.GITHUB_REPO
  );
}

/* ---------------------------------------------------------
   GitHub API helper
--------------------------------------------------------- */

async function gh(path, options = {}) {
  if (!process.env.GITHUB_TOKEN) {
    throw new Error(
      'GITHUB_TOKEN is not configured in the Vercel environment.'
    );
  }

  const response = await fetch(`${API}${path}`, {
    ...options,

    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options.headers || {})
    }
  });

  const text = await response.text();

  let body;

  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = {
      message: text || 'Unknown GitHub API response'
    };
  }

  if (!response.ok) {
    const message =
      body?.message ||
      `GitHub API request failed with status ${response.status}`;

    const error = new Error(message);

    error.status = response.status;
    error.githubResponse = body;

    throw error;
  }

  return body;
}

/* ---------------------------------------------------------
   GitHub file helpers
--------------------------------------------------------- */

export async function githubFile(filePath) {
  if (!githubEnabled()) {
    throw new Error(
      'GitHub persistence is not configured. Set GITHUB_TOKEN, GITHUB_OWNER and GITHUB_REPO.'
    );
  }

  const branch = process.env.GITHUB_BRANCH || 'main';

  const encodedPath = filePath
    .split('/')
    .map(encodeURIComponent)
    .join('/');

  return gh(
    `/repos/${encodeURIComponent(
      process.env.GITHUB_OWNER
    )}/${encodeURIComponent(
      process.env.GITHUB_REPO
    )}/contents/${encodedPath}?ref=${encodeURIComponent(branch)}`
  );
}

/* ---------------------------------------------------------
   Load CMS content
--------------------------------------------------------- */

export async function loadContent() {
  /*
   * Local development:
   * read server/data.js directly.
   */
  if (!githubEnabled()) {
    if (process.env.VERCEL) {
      throw new Error(
        'GitHub persistence is not configured on Vercel. Set GITHUB_TOKEN, GITHUB_OWNER and GITHUB_REPO.'
      );
    }

    const local = require('./data.js');

    return validateContent(local);
  }

  /*
   * Production:
   * read server/data.js from GitHub.
   */
  const file = await githubFile('server/data.js');

  if (!file?.content) {
    throw new Error(
      'GitHub returned server/data.js without file content.'
    );
  }

  const source = Buffer.from(
    file.content.replace(/\n/g, ''),
    'base64'
  ).toString('utf8');

  /*
   * Expected format:
   *
   * module.exports = {
   *   ...
   * };
   */

  const match = source.match(
    /module\.exports\s*=\s*([\s\S]*?)\s*;?\s*$/
  );

  if (!match) {
    throw new Error(
      'Invalid server/data.js format. Expected "module.exports = {...};".'
    );
  }

  let value;

  try {
    value = Function(
      `"use strict"; return (${match[1]});`
    )();
  } catch (error) {
    throw new Error(
      `Unable to parse server/data.js from GitHub: ${error.message}`
    );
  }

  return validateContent(value);
}

/* ---------------------------------------------------------
   Save CMS content
--------------------------------------------------------- */

export async function saveContent(data) {
  /*
   * Validate before doing anything.
   */
  validateContent(data);

  /*
   * Local development.
   */
  if (!githubEnabled()) {
    if (process.env.VERCEL) {
      return {
        error:
          'Vercel CMS persistence requires GITHUB_OWNER, GITHUB_REPO and GITHUB_TOKEN.'
      };
    }

    const fs = require('node:fs');
    const path = require('node:path');

    const filePath = path.join(
      process.cwd(),
      'server',
      'data.js'
    );

    const content =
      'module.exports = ' +
      JSON.stringify(data, null, 2) +
      ';\n';

    fs.writeFileSync(filePath, content, 'utf8');

    return {
      persisted: 'local-file'
    };
  }

  /*
   * Production GitHub persistence.
   */
  const branch = process.env.GITHUB_BRANCH || 'main';

  let file;

  try {
    file = await githubFile('server/data.js');
  } catch (error) {
    console.error('Unable to read server/data.js from GitHub:', error);

    return {
      error:
        `Unable to read server/data.js from GitHub: ${error.message}`
    };
  }

  if (!file?.sha) {
    return {
      error:
        'GitHub did not return a SHA for server/data.js.'
    };
  }

  const content =
    'module.exports = ' +
    JSON.stringify(data, null, 2) +
    ';\n';

  const body = {
    message: 'chore(cms): update DevSphere content',
    content: Buffer.from(content, 'utf8').toString('base64'),
    sha: file.sha,
    branch
  };

  try {
    const result = await gh(
      `/repos/${encodeURIComponent(
        process.env.GITHUB_OWNER
      )}/${encodeURIComponent(
        process.env.GITHUB_REPO
      )}/contents/server/data.js`,
      {
        method: 'PUT',

        headers: {
          'content-type': 'application/json'
        },

        body: JSON.stringify(body)
      }
    );

    return {
      persisted: 'github',
      commit: result?.commit?.sha || null
    };
  } catch (error) {
    console.error('GitHub CMS update failed:', {
      message: error.message,
      status: error.status,
      response: error.githubResponse
    });

    /*
     * Give a useful error instead of simply returning
     * "Failed to save content".
     */

    if (error.status === 401) {
      return {
        error:
          'GitHub authentication failed. Check GITHUB_TOKEN in Vercel.'
      };
    }

    if (error.status === 403) {
      return {
        error:
          'GitHub denied the write request. Check that the token has Contents: Read and write permission for this repository.'
      };
    }

    if (error.status === 404) {
      return {
        error:
          `GitHub repository or file not found. Check GITHUB_OWNER="${process.env.GITHUB_OWNER}", GITHUB_REPO="${process.env.GITHUB_REPO}", and that server/data.js exists on branch "${branch}".`
      };
    }

    if (error.status === 409) {
      return {
        error:
          'GitHub reported a conflict because server/data.js changed after it was loaded. Refresh the CMS page and try saving again.'
      };
    }

    if (error.status === 422) {
      return {
        error:
          `GitHub rejected the update: ${error.message}`
      };
    }

    return {
      error:
        `GitHub CMS update failed: ${error.message}`
    };
  }
}

/* ---------------------------------------------------------
   Upload CMS asset
--------------------------------------------------------- */

export async function uploadAsset({
  filename,
  mime,
  base64,
  section
}) {
  if (!githubEnabled()) {
    if (process.env.VERCEL) {
      throw new Error(
        'Vercel asset uploads require GITHUB_TOKEN, GITHUB_OWNER and GITHUB_REPO.'
      );
    }

    return {
      error: 'Use local Express upload endpoint'
    };
  }

  const originalFilename = String(filename || '');

  const extensionMatch = originalFilename
    .toLowerCase()
    .match(/\.[a-z0-9]+$/);

  const ext = extensionMatch
    ? extensionMatch[0]
    : '';

  const allowedImages = [
    '.png',
    '.jpg',
    '.jpeg',
    '.webp',
    '.svg'
  ];

  const sectionName =
    String(section || 'site')
      .replace(/[^a-z0-9_-]/gi, '')
      .toLowerCase() || 'site';

  /*
   * Team section allows PDF + images.
   */
  if (
    sectionName === 'team' &&
    ext !== '.pdf' &&
    !allowedImages.includes(ext)
  ) {
    throw new Error(
      'Team uploads must be images or PDF files.'
    );
  }

  /*
   * Other sections only allow images.
   */
  if (
    sectionName !== 'team' &&
    !allowedImages.includes(ext)
  ) {
    throw new Error(
      'Only PNG, JPG, JPEG, WEBP and SVG images are allowed here.'
    );
  }

  const safeFilename =
    originalFilename.replace(
      /[^a-zA-Z0-9._-]/g,
      '-'
    );

  const repoPath =
    `client/public/uploads/${sectionName}/${Date.now()}-${safeFilename}`;

  const branch =
    process.env.GITHUB_BRANCH || 'main';

  const result = await gh(
    `/repos/${encodeURIComponent(
      process.env.GITHUB_OWNER
    )}/${encodeURIComponent(
      process.env.GITHUB_REPO
    )}/contents/${repoPath}`,
    {
      method: 'PUT',

      headers: {
        'content-type': 'application/json'
      },

      body: JSON.stringify({
        message: `chore(cms): upload ${safeFilename}`,
        content: base64,
        branch
      })
    }
  );

  const rawUrl =
    `https://raw.githubusercontent.com/` +
    `${encodeURIComponent(process.env.GITHUB_OWNER)}/` +
    `${encodeURIComponent(process.env.GITHUB_REPO)}/` +
    `${encodeURIComponent(branch)}/` +
    repoPath
      .split('/')
      .map(encodeURIComponent)
      .join('/');

  return {
    url: rawUrl,
    persisted: 'github',
    commit: result?.commit?.sha || null
  };
}