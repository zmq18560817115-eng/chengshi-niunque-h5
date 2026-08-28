import { NextRequest, NextResponse } from "next/server";

const reportDetailPath = /^\/reports\/[^/]+\/items\/([^/]+)\/reports\/?$/;

export function middleware(request: NextRequest) {
  const match = request.nextUrl.pathname.match(reportDetailPath);
  const encodedCardId = match?.[1] ?? "";
  let cardId = encodedCardId;
  try {
    cardId = decodeURIComponent(encodedCardId);
  } catch {
    // An invalid path segment cannot match a reserved application ID.
  }

  // These predictable IDs belonged to the old public test slots. Reject them
  // before React starts streaming, otherwise App Router can correctly render a
  // not-found boundary while the already-started HTTP response still says 200.
  if (cardId.startsWith("placeholder-slot-")) {
    return new NextResponse("Not Found", {
      status: 404,
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/reports/:slug/items/:cardId/reports",
};
