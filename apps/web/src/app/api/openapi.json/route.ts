import { openApiDocument } from "@/lib/openapi";

/**
 * GET /api/openapi.json — the machine-readable contract.
 *
 * Public on purpose: a spec you need credentials to read is useless for
 * generating a client or pointing tooling at.
 */
export async function GET() {
  return Response.json(openApiDocument, {
    headers: {
      "cache-control": "public, max-age=300",
      // Lets other origins generate clients straight from this URL.
      "access-control-allow-origin": "*",
    },
  });
}
