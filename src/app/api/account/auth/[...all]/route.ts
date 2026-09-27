import { toNextJsHandler } from "better-auth/next-js";
import { getMemberAuth, isMemberAuthConfigured } from "@/server/auth";

export const runtime = "nodejs";

function unavailableResponse(): Response {
  return Response.json(
    { error: "member_auth_unavailable" },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
}

async function dispatch(method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE", request: Request): Promise<Response> {
  if (!isMemberAuthConfigured()) return unavailableResponse();
  const handlers = toNextJsHandler(getMemberAuth());
  return handlers[method](request);
}

export const GET = (request: Request) => dispatch("GET", request);
export const POST = (request: Request) => dispatch("POST", request);
export const PATCH = (request: Request) => dispatch("PATCH", request);
export const PUT = (request: Request) => dispatch("PUT", request);
export const DELETE = (request: Request) => dispatch("DELETE", request);
