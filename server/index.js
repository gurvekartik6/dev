require('dotenv').config()

const express = require('express')
const cors = require('cors')
const fs = require('fs')
const path = require('path')
const jwt = require('jsonwebtoken')

const { validateContent } = require('./validation')

const app = express()

const PORT = Number(process.env.PORT || 5000)

const ROOT = path.join(__dirname, '..')
const DATA_FILE = path.join(__dirname, 'data.js')

const PUBLIC_DIR = path.join(ROOT, 'client', 'public')
const UPLOADS_DIR = path.join(PUBLIC_DIR, 'uploads')
const DIST_DIR = path.join(ROOT, 'client', 'dist')

const IS_PRODUCTION = process.env.NODE_ENV === 'production'

const DEFAULT_LOCAL_ORIGIN = 'http://localhost:5173'
const CORS_ORIGIN = process.env.CORS_ORIGIN || DEFAULT_LOCAL_ORIGIN

/*
|--------------------------------------------------------------------------
| Environment validation
|--------------------------------------------------------------------------
*/

function getRequiredEnvironment() {
  const missing = []

  if (!process.env.ADMIN_USER) {
    missing.push('ADMIN_USER')
  }

  if (!process.env.ADMIN_PASSWORD) {
    missing.push('ADMIN_PASSWORD')
  }

  if (!process.env.JWT_SECRET) {
    missing.push('JWT_SECRET')
  }

  return missing
}

/*
|--------------------------------------------------------------------------
| Middleware
|--------------------------------------------------------------------------
*/

app.use(
  cors({
    origin: CORS_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  })
)

app.use(
  express.json({
    limit: '7mb',
  })
)

/*
|--------------------------------------------------------------------------
| Static uploads
|--------------------------------------------------------------------------
*/

app.use(
  '/uploads',
  express.static(UPLOADS_DIR, {
    fallthrough: false,
    maxAge: IS_PRODUCTION ? '1d' : 0,
  })
)

/*
|--------------------------------------------------------------------------
| Content helpers
|--------------------------------------------------------------------------
*/

function loadContent() {
  delete require.cache[require.resolve('./data.js')]

  const content = require('./data.js')

  return content
}

function saveContent(data) {
  validateContent(data)

  fs.writeFileSync(
    DATA_FILE,
    'module.exports = ' +
      JSON.stringify(data, null, 2) +
      ';\n',
    'utf8'
  )
}

/*
|--------------------------------------------------------------------------
| Authentication helpers
|--------------------------------------------------------------------------
*/

function getToken(req) {
  const authorization = req.headers.authorization || ''

  if (/^Bearer\s+/i.test(authorization)) {
    return authorization
      .replace(/^Bearer\s+/i, '')
      .trim()
  }

  const cookieHeader = req.headers.cookie || ''

  const match = cookieHeader.match(
    /(?:^|;\s*)devsphere_session=([^;]+)/
  )

  return match ? match[1] : ''
}

function requireAuth(req, res, next) {
  const secret = process.env.JWT_SECRET

  if (!secret) {
    return res.status(503).json({
      message: 'JWT_SECRET is not configured',
    })
  }

  const token = getToken(req)

  if (!token) {
    return res.status(401).json({
      message: 'Unauthorized',
    })
  }

  try {
    req.user = jwt.verify(token, secret)

    return next()
  } catch (error) {
    return res.status(401).json({
      message: 'Unauthorized',
    })
  }
}

/*
|--------------------------------------------------------------------------
| Cookie helper
|--------------------------------------------------------------------------
*/

function createSessionCookie(token) {
  const parts = [
    `devsphere_session=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=28800',
  ]

  if (IS_PRODUCTION) {
    parts.push('Secure')
  }

  return parts.join('; ')
}

function clearSessionCookie() {
  const parts = [
    'devsphere_session=',
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
  ]

  if (IS_PRODUCTION) {
    parts.push('Secure')
  }

  return parts.join('; ')
}

/*
|--------------------------------------------------------------------------
| Upload helpers
|--------------------------------------------------------------------------
*/

function safeSection(value) {
  return (
    String(value || 'site')
      .replace(/[^a-z0-9_-]/gi, '')
      .toLowerCase()
      .slice(0, 50) || 'site'
  )
}

function safeName(value) {
  const original = String(value || 'upload')

  const basename = path.basename(original)

  return basename
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 180)
}

function allowedUpload(section, filename, mime) {
  const ext = path.extname(filename).toLowerCase()
  const normalizedMime = String(mime || '').toLowerCase()

  const imageExtensions = [
    '.png',
    '.jpg',
    '.jpeg',
    '.webp',
    '.svg',
  ]

  const imageMimeTypes = [
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/svg+xml',
  ]

  /*
   * Team resumes are PDF files.
   */
  if (
    section === 'team' &&
    ext === '.pdf' &&
    normalizedMime === 'application/pdf'
  ) {
    return true
  }

  /*
   * Everything else must be an allowed image.
   */
  if (!imageExtensions.includes(ext)) {
    return false
  }

  return imageMimeTypes.includes(normalizedMime)
}

/*
|--------------------------------------------------------------------------
| Root / health
|--------------------------------------------------------------------------
*/

app.get('/', (req, res, next) => {
  /*
   * During development Vite owns the frontend.
   */
  if (!IS_PRODUCTION && !fs.existsSync(DIST_DIR)) {
    return res.redirect('http://localhost:5173/')
  }

  return next()
})

app.get('/api/health', (req, res) => {
  return res.status(200).json({
    ok: true,
    service: 'devsphere-api',
    environment: process.env.NODE_ENV || 'development',
  })
})

/*
|--------------------------------------------------------------------------
| Public content
|--------------------------------------------------------------------------
*/

app.get('/api/content', (req, res) => {
  try {
    const content = loadContent()

    return res.status(200).json(content)
  } catch (error) {
    console.error('Content load error:', error)

    return res.status(500).json({
      message: 'Unable to load content',
      error: error.message,
    })
  }
})

/*
|--------------------------------------------------------------------------
| Admin login
|--------------------------------------------------------------------------
*/

app.post('/api/admin/login', (req, res) => {
  try {
    const missing = getRequiredEnvironment()

    if (missing.length > 0) {
      console.error(
        'Missing admin environment variables:',
        missing.join(', ')
      )

      return res.status(503).json({
        message: 'Admin environment variables are not configured',
        missing,
      })
    }

    const body = req.body || {}

    const username =
      typeof body.username === 'string'
        ? body.username.trim()
        : ''

    const password =
      typeof body.password === 'string'
        ? body.password
        : ''

    if (!username || !password) {
      return res.status(400).json({
        message: 'Username and password are required',
      })
    }

    if (
      username !== process.env.ADMIN_USER ||
      password !== process.env.ADMIN_PASSWORD
    ) {
      return res.status(401).json({
        message: 'Invalid credentials',
      })
    }

    const token = jwt.sign(
      {
        username,
        role: 'admin',
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '8h',
      }
    )

    res.setHeader(
      'Set-Cookie',
      createSessionCookie(token)
    )

    return res.status(200).json({
      ok: true,
      message: 'Login successful',
      user: {
        username,
        role: 'admin',
      },
    })
  } catch (error) {
    console.error('Login error:', error)

    return res.status(500).json({
      message: 'Unable to process login',
    })
  }
})

/*
|--------------------------------------------------------------------------
| Admin logout
|--------------------------------------------------------------------------
*/

app.post('/api/admin/logout', (req, res) => {
  res.setHeader(
    'Set-Cookie',
    clearSessionCookie()
  )

  return res.status(200).json({
    ok: true,
    message: 'Logged out successfully',
  })
})

/*
|--------------------------------------------------------------------------
| Admin content GET
|--------------------------------------------------------------------------
*/

app.get('/api/admin/content', requireAuth, (req, res) => {
  try {
    const content = loadContent()

    return res.status(200).json(content)
  } catch (error) {
    console.error('Admin content load error:', error)

    return res.status(500).json({
      message: 'Unable to load admin content',
      error: error.message,
    })
  }
})

/*
|--------------------------------------------------------------------------
| Admin content PUT
|--------------------------------------------------------------------------
*/

app.put('/api/admin/content', requireAuth, (req, res) => {
  try {
    const data = req.body

    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return res.status(400).json({
        message: 'Invalid content payload',
      })
    }

    saveContent(data)

    const updatedContent = loadContent()

    return res.status(200).json({
      ok: true,
      persisted: 'local-file',
      content: updatedContent,
    })
  } catch (error) {
    console.error('Content save error:', error)

    return res.status(400).json({
      message: error.message || 'Unable to save content',
    })
  }
})

/*
|--------------------------------------------------------------------------
| Admin upload
|--------------------------------------------------------------------------
*/

app.post('/api/admin/upload', requireAuth, (req, res) => {
  try {
    const {
      filename,
      mime,
      base64,
      section,
    } = req.body || {}

    if (
      typeof filename !== 'string' ||
      typeof base64 !== 'string' ||
      !filename ||
      !base64
    ) {
      return res.status(400).json({
        message: 'filename and base64 are required',
      })
    }

    const safeSectionName = safeSection(section)
    const filenameSafe = safeName(filename)

    if (
      !allowedUpload(
        safeSectionName,
        filenameSafe,
        mime
      )
    ) {
      return res.status(400).json({
        message: 'Unsupported file type',
      })
    }

    /*
     * Approximately 4 MB decoded payload.
     */
    if (base64.length > 5_500_000) {
      return res.status(413).json({
        message:
          'File is too large. Keep uploads below about 4 MB.',
      })
    }

    /*
     * Validate Base64.
     */
    const normalizedBase64 = base64
      .replace(/^data:[^;]+;base64,/, '')
      .replace(/\s/g, '')

    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(normalizedBase64)) {
      return res.status(400).json({
        message: 'Invalid Base64 upload data',
      })
    }

    const buffer = Buffer.from(
      normalizedBase64,
      'base64'
    )

    if (!buffer.length) {
      return res.status(400).json({
        message: 'Uploaded file is empty',
      })
    }

    const generatedName =
      `${Date.now()}-` +
      `${Math.random()
        .toString(36)
        .slice(2, 8)}-` +
      filenameSafe

    const directory = path.join(
      UPLOADS_DIR,
      safeSectionName
    )

    const destination = path.join(
      directory,
      generatedName
    )

    fs.mkdirSync(directory, {
      recursive: true,
    })

    fs.writeFileSync(
      destination,
      buffer
    )

    return res.status(200).json({
      ok: true,
      url:
        `/uploads/${safeSectionName}/${generatedName}`,
      persisted: 'local-file',
      filename: generatedName,
    })
  } catch (error) {
    console.error('Upload error:', error)

    return res.status(500).json({
      message: 'Upload failed',
      error: error.message,
    })
  }
})

/*
|--------------------------------------------------------------------------
| API 404
|--------------------------------------------------------------------------
|
| This MUST come before the frontend SPA fallback.
| Otherwise /api/... could accidentally receive index.html.
|
*/

app.use('/api', (req, res) => {
  return res.status(404).json({
    message: `API route not found: ${req.method} ${req.path}`,
  })
})

/*
|--------------------------------------------------------------------------
| Production frontend
|--------------------------------------------------------------------------
*/

if (fs.existsSync(DIST_DIR)) {
  app.use(
    express.static(DIST_DIR, {
      index: 'index.html',
    })
  )

  /*
   * Express 5-safe SPA fallback.
   */
  app.use((req, res, next) => {
    if (
      req.method !== 'GET' ||
      req.path.startsWith('/uploads/')
    ) {
      return next()
    }

    return res.sendFile(
      path.join(DIST_DIR, 'index.html')
    )
  })
}

/*
|--------------------------------------------------------------------------
| Final 404
|--------------------------------------------------------------------------
*/

app.use((req, res) => {
  return res.status(404).json({
    message: 'Route not found',
  })
})

/*
|--------------------------------------------------------------------------
| Server start
|--------------------------------------------------------------------------
*/

app.listen(PORT, () => {
  console.log(
    `DevSphere API running at http://localhost:${PORT}`
  )

  if (IS_PRODUCTION) {
    console.log('Environment: production')
  } else {
    console.log('Environment: development')
  }

  if (
    !process.env.ADMIN_USER ||
    !process.env.ADMIN_PASSWORD ||
    !process.env.JWT_SECRET
  ) {
    console.warn(
      '\nWARNING: ADMIN_USER, ADMIN_PASSWORD or JWT_SECRET is missing.\n' +
      'Admin login will return HTTP 503 until these are configured.\n'
    )
  }
})
