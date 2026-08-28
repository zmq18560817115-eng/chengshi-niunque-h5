// Report URLs are authorization-by-publication-state endpoints. They must be
// revalidated on every use so taking an asset/card/module offline cannot leave
// a previously cached 200 available at a shared CDN edge. ETag/Last-Modified
// still let browsers perform a cheap conditional revalidation.
export const REPORT_IMAGE_CACHE_CONTROL = "private, no-cache, must-revalidate";

export function reportImageUnavailableResponse(): Response {
  return new Response("REPORT_IMAGE_UNAVAILABLE", {
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
