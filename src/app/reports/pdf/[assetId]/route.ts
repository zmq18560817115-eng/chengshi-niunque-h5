export const dynamic = "force-dynamic";

export async function GET() {
  return new Response(null, {
    status: 410,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
