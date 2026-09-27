import "server-only";

import { headers } from "next/headers";
import { getMemberAuth, isMemberAuthConfigured } from "./index";

export async function getSignedInMember() {
  if (!isMemberAuthConfigured()) return null;
  return getMemberAuth().api.getSession({ headers: await headers() });
}
