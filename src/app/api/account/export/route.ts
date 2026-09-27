import { exportOwnMemberData, MemberAccessError } from "@/server/member/dal";

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  try {
    const data = await exportOwnMemberData();
    return Response.json(data, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Disposition": 'attachment; filename="lumina-account-export.json"',
      },
    });
  } catch (error) {
    if (error instanceof MemberAccessError) {
      return Response.json(
        { error: error.reason },
        { status: error.reason === "authentication_required" ? 401 : 403, headers: { "Cache-Control": "no-store" } },
      );
    }
    return Response.json({ error: "account_export_unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
