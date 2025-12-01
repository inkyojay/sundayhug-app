/**
 * 고객 회원 정보 조회 API
 */
import type { Route } from "./+types/member";

import { data } from "react-router";
import makeServerClient from "~/core/lib/supa-client.server";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const memberId = url.searchParams.get("id");
  
  if (!memberId) {
    return data({ member: null, error: "회원 ID가 필요합니다." }, { status: 400 });
  }
  
  const [supabase] = makeServerClient(request);
  
  const { data: member, error } = await supabase
    .from("warranty_members")
    .select("id, name, email, phone, baby_name, baby_birth_date, baby_gender, password_hash, kakao_id, naver_id")
    .eq("id", memberId)
    .single();
    
  if (error) {
    console.error("Failed to load member:", error);
    return data({ member: null, error: "회원 정보를 찾을 수 없습니다." }, { status: 404 });
  }
  
  // 비밀번호 해시는 클라이언트에 노출하지 않고 존재 여부만 전달
  return data({ 
    member: {
      id: member.id,
      name: member.name,
      email: member.email,
      phone: member.phone,
      baby_name: member.baby_name,
      baby_birth_date: member.baby_birth_date,
      baby_gender: member.baby_gender,
      password_hash: member.password_hash ? "exists" : null,
      has_kakao: !!member.kakao_id,
      has_naver: !!member.naver_id,
    }
  });
}


