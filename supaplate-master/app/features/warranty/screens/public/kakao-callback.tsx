import type { Route } from "./+types/kakao-callback";
import makeServerClient from "~/core/lib/supa-client.server";
import { redirect } from "react-router";

export async function loader({ request }: Route.LoaderArgs) {
  const [supabase] = makeServerClient(request);
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  
  if (error || !code) {
    return redirect("/customer/login?error=kakao_failed");
  }
  
  // 카카오 REST API 키
  const KAKAO_CLIENT_ID = "7474843a05c3daf50d1253676e6badbd";
  const KAKAO_CLIENT_SECRET = "fKH6o2bNEmPMIAKE0ftRP9X0Ub6Gom6q";
  const REDIRECT_URI = `${url.origin}/customer/kakao/callback`;
  
  try {
    // 1. 인가 코드로 토큰 요청
    const tokenResponse = await fetch("https://kauth.kakao.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: KAKAO_CLIENT_ID,
        client_secret: KAKAO_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        code,
      }),
    });
    
    const tokenData = await tokenResponse.json();
    
    if (!tokenData.access_token) {
      console.error("카카오 토큰 발급 실패:", tokenData);
      return redirect("/customer/login?error=kakao_token_failed");
    }
    
    // 2. 사용자 정보 요청
    const userResponse = await fetch("https://kapi.kakao.com/v2/user/me", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });
    
    const userData = await userResponse.json();
    
    if (!userData.id) {
      console.error("카카오 사용자 정보 조회 실패:", userData);
      return redirect("/customer/login?error=kakao_user_failed");
    }
    
    const kakaoId = String(userData.id);
    const kakaoNickname = userData.kakao_account?.profile?.nickname || null;
    const kakaoProfileImage = userData.kakao_account?.profile?.profile_image_url || null;
    const kakaoPhone = userData.kakao_account?.phone_number?.replace(/^\+82 /, "0").replace(/-/g, "") || null;
    
    // 3. 기존 회원 확인
    let { data: member } = await supabase
      .from("warranty_members")
      .select("*")
      .eq("kakao_id", kakaoId)
      .single();
    
    if (!member) {
      // 전화번호로도 확인 (기존 일반 회원일 수 있음)
      if (kakaoPhone) {
        const { data: phoneMatch } = await supabase
          .from("warranty_members")
          .select("*")
          .eq("phone", kakaoPhone)
          .single();
        
        if (phoneMatch) {
          // 기존 회원에 카카오 연결
          await supabase
            .from("warranty_members")
            .update({
              kakao_id: kakaoId,
              kakao_nickname: kakaoNickname,
              kakao_profile_image: kakaoProfileImage,
            })
            .eq("id", phoneMatch.id);
          
          member = { ...phoneMatch, kakao_id: kakaoId };
        }
      }
    }
    
    // 4. 신규 회원이면 생성
    if (!member) {
      const { data: newMember, error: insertError } = await supabase
        .from("warranty_members")
        .insert({
          kakao_id: kakaoId,
          kakao_nickname: kakaoNickname,
          kakao_profile_image: kakaoProfileImage,
          phone: kakaoPhone,
          name: kakaoNickname,
        })
        .select()
        .single();
      
      if (insertError) {
        console.error("회원 생성 실패:", insertError);
        return redirect("/customer/login?error=create_failed");
      }
      
      member = newMember;
      
      // 전화번호로 등록된 보증서 연결
      if (kakaoPhone) {
        await supabase
          .from("warranties")
          .update({ member_id: member.id })
          .eq("customer_phone", kakaoPhone);
      }
    }
    
    // 5. 마지막 로그인 업데이트
    await supabase
      .from("warranty_members")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", member.id);
    
    // 6. 쿠키 + localStorage 설정 후 리다이렉트 (클라이언트에서 처리하기 위해)
    const headers = new Headers();
    headers.append(
      "Set-Cookie",
      `warranty_member_id=${member.id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`
    );
    headers.append(
      "Set-Cookie",
      `warranty_member_name=${encodeURIComponent(member.name || kakaoNickname || "")}; Path=/; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`
    );
    // localStorage 설정을 위해 쿼리 파라미터로 전달
    headers.append("Location", `/customer/mypage?memberId=${member.id}&memberName=${encodeURIComponent(member.name || kakaoNickname || "")}&memberPhone=${encodeURIComponent(member.phone || "")}`);
    
    return new Response(null, {
      status: 302,
      headers,
    });
    
  } catch (error) {
    console.error("카카오 로그인 에러:", error);
    return redirect("/customer/login?error=kakao_error");
  }
}

export default function KakaoCallback() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-white text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500 mx-auto mb-4"></div>
        <p>카카오 로그인 처리 중...</p>
      </div>
    </div>
  );
}

