
const API_BASE = (
  import.meta.env.VITE_API_URL || ''
).replace(/\/+$/, '')

/*
|--------------------------------------------------------------------------
| Generic API request
|--------------------------------------------------------------------------
*/

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`

  const config = {
    ...options,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(options.headers || {}),
    },
  }

  /*
   * Only set JSON Content-Type when the request
   * actually has a body and the body isn't FormData.
   */
  if (
    config.body !== undefined &&
    config.body !== null &&
    !(config.body instanceof FormData)
  ) {
    config.headers['Content-Type'] =
      'application/json'
  }

  let response

  try {
    response = await fetch(url, config)
  } catch (error) {
    throw new Error(
      `Unable to connect to the DevSphere API. ` +
        `Make sure the backend is running.`
    )
  }

  const contentType =
    response.headers.get('content-type') || ''

  /*
   * Read the response only once.
   */
  const rawText = await response.text()

  let data = null

  if (rawText) {
    if (contentType.includes('application/json')) {
      try {
        data = JSON.parse(rawText)
      } catch {
        throw new Error(
          `The API returned invalid JSON from ${path}.`
        )
      }
    } else {
      /*
       * This catches the old:
       *
       * Unexpected token '<'
       *
       * problem where Vite returned index.html.
       */
      if (rawText.trimStart().startsWith('<!doctype')) {
        throw new Error(
          `API ${path} returned HTML instead of JSON. ` +
            `Check the Vite API proxy/backend route.`
        )
      }

      throw new Error(
        `Expected JSON from ${path}, ` +
          `received ${contentType || 'unknown content type'}.`
      )
    }
  }

  if (!response.ok) {
    const message =
      data?.message ||
      `API request failed with status ${response.status}.`

    throw new Error(message)
  }

  return data
}

/*
|--------------------------------------------------------------------------
| Public content
|--------------------------------------------------------------------------
*/

export function getContent() {
  return request('/api/content')
}

/*
|--------------------------------------------------------------------------
| Admin authentication
|--------------------------------------------------------------------------
*/

export function login(username, password) {
  return request('/api/admin/login', {
    method: 'POST',

    body: JSON.stringify({
      username,
      password,
    }),
  })
}

export function logout() {
  return request('/api/admin/logout', {
    method: 'POST',
  })
}

/*
|--------------------------------------------------------------------------
| Admin content
|--------------------------------------------------------------------------
*/

export function getAdminContent() {
  return request('/api/admin/content')
}

export function saveContent(data) {
  return request('/api/admin/content', {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

/*
|--------------------------------------------------------------------------
| File upload
|--------------------------------------------------------------------------
*/

export async function uploadFile(file, section) {
  if (!file) {
    throw new Error('No file selected.')
  }

  /*
   * Read the file into bytes.
   */
  const bytes = new Uint8Array(
    await file.arrayBuffer()
  )

  /*
   * Convert bytes to Base64 without using
   * spread on a huge array.
   */
  let binary = ''

  const chunkSize = 0x8000

  for (
    let index = 0;
    index < bytes.length;
    index += chunkSize
  ) {
    const chunk = bytes.subarray(
      index,
      Math.min(
        index + chunkSize,
        bytes.length
      )
    )

    binary += String.fromCharCode(...chunk)
  }

  const base64 = btoa(binary)

  const result = await request(
    '/api/admin/upload',
    {
      method: 'POST',

      body: JSON.stringify({
        filename: file.name,
        mime:
          file.type ||
          'application/octet-stream',
        base64,
        section,
      }),
    }
  )

  if (!result?.url) {
    throw new Error(
      'Upload succeeded but the server did not return a file URL.'
    )
  }

  return result.url
}
