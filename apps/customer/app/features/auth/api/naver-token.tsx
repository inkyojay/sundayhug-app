/**
 * 네이버 로그인 토큰 API
 * 
 * POST /api/auth/naver/token
 * 네이버 OAuth 코드로 액세스 토큰을 받고, 사용자 정보로 회원가입/로그인 처리
 */
import type { Route } from "./+types/naver-token";

import { data } from "react-router";

import adminClient from "~/core/lib/supa-admin-client.server";

const NAVER_CLIENT_ID = "vg2MoKtr_rnX60RKdUKi";
const NAVER_CLIENT_SECRET = "JdHjpNFM4C";

export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return data({ success: false, error: "Method not allowed" }, { status: 405 });
  }

  try {
    const { code } = await request.json();

    if (!code) {
      return data({ success: false, error: "인증 코드가 없습니다." }, { status: 400 });
    }

    // 1. 액세스 토큰 요청
    const tokenUrl = `https://nid.naver.com/oauth2.0/token?grant_type=authorization_code&client_id=${NAVER_CLIENT_ID}&client_secret=${NAVER_CLIENT_SECRET}&code=${code}`;
    
    const tokenResponse = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error("Naver token error:", tokenData);
      return data({ success: false, error: "네이버 인증에 실패했습니다." }, { status: 400 });
    }

    const accessToken = tokenData.access_token;

    // 2. 사용자 정보 요청
    const profileResponse = await fetch("https://openapi.naver.com/v1/nid/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const profileData = await profileResponse.json();

    if (profileData.resultcode !== "00") {
      console.error("Naver profile error:", profileData);
      return data({ success: false, error: "사용자 정보를 가져올 수 없습니다." }, { status: 400 });
    }

    const naverUser = profileData.response;
    const naverId = naverUser.id;
    const naverEmail = naverUser.email;
    const naverName = naverUser.name || naverUser.nickname;
    const naverPhone = naverUser.mobile?.replace(/-/g, "");
    const naverProfileImage = naverUser.profile_image;

    // 3. 기존 회원 확인 (네이버 ID로)
    let { data: existingMember } = await adminClient
      .from("warranty_members")
      .select("*")
      .eq("naver_id", naverId)
      .single();

    // 네이버 ID로 못 찾으면 전화번호로 검색
    if (!existingMember && naverPhone) {
      const { data: phoneMember } = await adminClient
        .from("warranty_members")
        .select("*")
        .eq("phone", naverPhone)
        .single();
      
      if (phoneMember) {
        // 기존 전화번호 회원에 네이버 ID 연결
        await adminClient
          .from("warranty_members")
          .update({
            naver_id: naverId,
            naver_profile_image: naverProfileImage,
          })
          .eq("id", phoneMember.id);
        
        existingMember = phoneMember;
      }
    }

    // 네이버 ID, 전화번호로 못 찾으면 이메일로 검색
    if (!existingMember && naverEmail) {
      const { data: emailMember } = await adminClient
        .from("warranty_members")
        .select("*")
        .eq("email", naverEmail)
        .single();
      
      if (emailMember) {
        // 기존 이메일 회원에 네이버 ID 연결
        await adminClient
          .from("warranty_members")
          .update({
            naver_id: naverId,
            naver_profile_image: naverProfileImage,
          })
          .eq("id", emailMember.id);
        
        existingMember = emailMember;
      }
    }

    // 4. 신규 회원이면 가입 처리
    if (!existingMember) {
      const { data: newMember, error: insertError } = await adminClient
        .from("warranty_members")
        .insert({
          naver_id: naverId,
          email: naverEmail,
          name: naverName,
          phone: naverPhone,
          naver_profile_image: naverProfileImage,
        })
        .select()
        .single();

      if (insertError) {
        console.error("Member insert error:", insertError);
        return data({ success: false, error: "회원가입에 실패했습니다." }, { status: 500 });
      }

      existingMember = newMember;
    }

    // 5. 마지막 로그인 시간 업데이트
    await adminClient
      .from("warranty_members")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", existingMember.id);

    return data({
      success: true,
      memberId: existingMember.id,
      memberName: existingMember.name || existingMember.email,
      memberPhone: existingMember.phone || "",
    });
  } catch (error) {
    console.error("Naver login error:", error);
    return data({ success: false, error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function loader() {
  return data({ message: "POST /api/auth/naver/token" });
}

