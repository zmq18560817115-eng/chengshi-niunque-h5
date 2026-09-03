// Publication state must be checked on every request. Conditional response
// headers still let the browser reuse bytes without leaving a stale public CDN copy.
export const REPORT_IMAGE_CACHE_CONTROL = "private, no-cache, must-revalidate";

export function reportImageUnavailableResponse(): Response {
  return new Response("图片报告暂时无法加载，请稍后重试。", {
    status: 503,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/plain; charset=utf-8",
      "Retry-After": "3",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export function proxyReportImage(stored: Response, contentType: string): Response {
  const headers = new Headers({
    "Cache-Control": REPORT_IMAGE_CACHE_CONTROL,
    "Content-Type": contentType,
    "X-Content-Type-Options": "nosniff",
  });
  for (const name of ["accept-ranges", "content-length", "content-range", "etag", "last-modified"]) {
    const value = stored.headers.get(name);
    if (value) headers.set(name, value);
  }
  return new Response(stored.body, { status: stored.status, headers });
}
