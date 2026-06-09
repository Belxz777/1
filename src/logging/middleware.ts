import { Elysia } from 'elysia';

// WeakMap: Request как ключ — не мешает GC, не нужна ручная очистка
const timings = new WeakMap<Request, number>();

export const loggingMiddleware = new Elysia()
  .onRequest(({ request, set }) => {
    timings.set(request, performance.now());

    const requestId = crypto.randomUUID();
    set.headers['x-request-id'] = requestId;

    const path = new URL(request.url).pathname;
    console.log(`➡️  [${requestId}] ${request.method} ${path}`);
  })

  .onAfterResponse(({ request, set }) => {
    const start = timings.get(request);
    timings.delete(request); // явная очистка

    const duration = start !== undefined ? performance.now() - start : -1;
    const requestId = set.headers['x-request-id'];
    const path = new URL(request.url).pathname;

    console.log(
      `⬅️  [${requestId}] ${request.method} ${path} ${set.status} (${duration.toFixed(2)}ms)`
    );
  })

  .onError(({ request, error, code, set }) => {
    const requestId = set.headers['x-request-id'] ?? 'unknown';
    const path = new URL(request.url).pathname;

    console.error(
      `❌ [${requestId}] ${request.method} ${path} | ${code}: ${error}`
    );
  });