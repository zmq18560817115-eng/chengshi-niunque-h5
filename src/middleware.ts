import { NextRequest, NextResponse } from "next/server";
import { isReservedPlaceholderCardId, isRetiredPublicTestAssetPath } from "@/server/public-report-policy";

const reportDetailPath = /^\/reports\/[^/]+\/items\/([^/]+)\/reports\/?$/;

export function middleware(request: NextRequest) {
  if (isRetiredPublicTestAssetPath(request.nextUrl.pathname)) {
    return new NextResponse("Not Found", {
      status: 404,
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }

  const match = request.nextUrl.pathname.match(reportDetailPath);
  const encodedCardId = match?.[1] ?? "";
  let cardId = encodedCardId;
  try {
    cardId = decodeURIComponent(encodedCardId);
  } catch {
    // Invalid URL encoding cannot be a valid public card identifier.
  }

  // Reject the former predictable test slots before React starts streaming;
  // a page-level notFound() alone can retain a 200 after streaming begins.
  if (isReservedPlaceholderCardId(cardId)) {
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
  matcher: [
    "/reports/:slug/items/:cardId/reports",
    "/design/reports/:path*",
  ],
};
