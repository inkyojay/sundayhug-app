/**
 * 고객 회원 정보 조회 API
 */
import type { Route } from "./+types/member";

import { data } from "react-router";
import makeServerClient from "~/core/lib/supa-client.server";

import { getMemberById } from "../lib/customer.server";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const memberId = url.searchParams.get("id");

  if (!memberId) {
    return data(
      { member: null, error: "회원 ID가 필요합니다." },
      { status: 400 }
    );
  }

  const [supabase] = makeServerClient(request);

  const member = await getMemberById(supabase, memberId);

  if (!member) {
    return data(
      { member: null, error: "회원 정보를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  return data({ member });
}

