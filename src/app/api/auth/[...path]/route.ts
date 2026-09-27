import { getNeonAuth } from "@/lib/neon/auth";

interface AuthRouteContext {
  readonly params: Promise<{ readonly path: string[] }>;
}

type AuthMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

async function handleAuthRequest(
  method: AuthMethod,
  request: Request,
  context: AuthRouteContext,
): Promise<Response> {
  const { path } = await context.params;
  if (
    method === "POST" &&
    path[0] === "sign-up" &&
    path.length > 0
  ) {
    return Response.json({ error: "Sign-up is disabled." }, { status: 403 });
  }

  // Staff accounts are created out of band. Social and anonymous sign-in can
  // provision new identities, so the admin proxy accepts only email sign-in.
  if (method === "POST" && path[0] === "sign-in" && path[1] !== "email") {
    return Response.json({ error: "This sign-in method is disabled." }, { status: 403 });
  }

  const handler = getNeonAuth().handler()[method];
  return handler(request, context);
}

export function GET(request: Request, context: AuthRouteContext): Promise<Response> {
  return handleAuthRequest("GET", request, context);
}

export function POST(request: Request, context: AuthRouteContext): Promise<Response> {
  return handleAuthRequest("POST", request, context);
}

export function PUT(request: Request, context: AuthRouteContext): Promise<Response> {
  return handleAuthRequest("PUT", request, context);
}

export function DELETE(request: Request, context: AuthRouteContext): Promise<Response> {
  return handleAuthRequest("DELETE", request, context);
}

export function PATCH(request: Request, context: AuthRouteContext): Promise<Response> {
  return handleAuthRequest("PATCH", request, context);
}
