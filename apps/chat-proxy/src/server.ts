import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { isPlatform } from '@stream/core'
import { createChatSseResponse } from '@stream/sse/server'
import { corsHeaders, resolveCorsOrigin } from './cors'
import { chatCredential } from './credential'

const PORT = Number(process.env.PORT ?? 3080)
const HOST = process.env.HOST ?? '127.0.0.1'

const STREAM_PATH = /^\/api\/chat\/([^/]+)\/stream\/?$/

function writeJson(
  res: ServerResponse,
  status: number,
  body: unknown,
  extraHeaders: Record<string, string> = {},
): void {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
    ...extraHeaders,
  })
  res.end(payload)
}

async function pipeWebResponse(
  web: Response,
  res: ServerResponse,
  extraHeaders: Record<string, string>,
): Promise<void> {
  const headers: Record<string, string> = { ...extraHeaders }
  web.headers.forEach((value, key) => {
    headers[key] = value
  })
  res.writeHead(web.status, headers)

  if (!web.body) {
    res.end()
    return
  }

  const reader = web.body.getReader()
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (value) {
        if (!res.write(Buffer.from(value))) {
          await new Promise<void>((resolve) => res.once('drain', resolve))
        }
      }
    }
    res.end()
  } catch (error) {
    reader.cancel().catch(() => {})
    if (!res.writableEnded) {
      res.destroy(error instanceof Error ? error : undefined)
    }
  }
}

async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const origin = resolveCorsOrigin(req.headers.origin)
  const cors = corsHeaders(origin)
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)

  if (req.method === 'OPTIONS') {
    res.writeHead(204, { ...cors, 'access-control-max-age': '86400' })
    res.end()
    return
  }

  if (req.method === 'GET' && url.pathname === '/health') {
    res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8', ...cors })
    res.end('ok')
    return
  }

  const match = STREAM_PATH.exec(url.pathname)
  if (req.method === 'GET' && match) {
    const platformRaw = match[1] ?? ''
    if (!isPlatform(platformRaw)) {
      writeJson(res, 400, { error: `지원하지 않는 플랫폼: ${platformRaw}` }, cors)
      return
    }

    const channelId = url.searchParams.get('channelId')?.trim() ?? ''
    const ac = new AbortController()
    const onClose = () => ac.abort()
    req.once('close', onClose)

    try {
      const web = createChatSseResponse({
        platform: platformRaw,
        channelId,
        credential: chatCredential(platformRaw),
        signal: ac.signal,
      })
      await pipeWebResponse(web, res, cors)
    } finally {
      req.off('close', onClose)
    }
    return
  }

  writeJson(res, 404, { error: 'not found' }, cors)
}

const server = createServer((req, res) => {
  void handleRequest(req, res).catch((error) => {
    console.error('[chat-proxy]', error)
    if (!res.headersSent) {
      writeJson(res, 500, { error: 'internal error' })
    } else if (!res.writableEnded) {
      res.destroy()
    }
  })
})

server.listen(PORT, HOST, () => {
  console.log(`[chat-proxy] listening on http://${HOST}:${PORT}`)
})
