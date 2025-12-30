/**
 * 보증서 제품 사진 업로드 API
 */
import type { Route } from "./+types/upload-photo";
import makeServerClient from "~/core/lib/supa-client.server";

export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const [supabase] = makeServerClient(request);
    const formData = await request.formData();
    
    const file = formData.get("file") as File;
    const fileName = formData.get("fileName") as string;

    if (!file || !fileName) {
      return Response.json(
        { error: "파일이 없습니다." },
        { status: 400 }
      );
    }

    // 파일 크기 체크 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      return Response.json(
        { error: "파일 크기는 5MB 이하여야 합니다." },
        { status: 400 }
      );
    }

    // 파일을 ArrayBuffer로 변환
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Supabase Storage에 업로드
    const { data, error } = await supabase.storage
      .from("warranty-photos")
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      console.error("Storage upload error:", error);
      
      // 사용자에게 보여줄 구체적인 에러 메시지 생성
      let userMessage = "파일 업로드에 실패했습니다.";
      
      if (error.message?.includes("duplicate") || error.message?.includes("already exists")) {
        userMessage = "동일한 파일이 이미 존재합니다. 다시 시도해주세요.";
      } else if (error.message?.includes("size") || error.message?.includes("too large")) {
        userMessage = "파일 크기가 너무 큽니다. 5MB 이하의 파일을 선택해주세요.";
      } else if (error.message?.includes("type") || error.message?.includes("mime")) {
        userMessage = "지원하지 않는 파일 형식입니다. JPG, PNG, WEBP, HEIC만 가능합니다.";
      } else if (error.message?.includes("permission") || error.message?.includes("policy")) {
        userMessage = "업로드 권한이 없습니다. 다시 로그인해주세요.";
      } else if (error.message?.includes("network") || error.message?.includes("timeout")) {
        userMessage = "네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.";
      } else if (error.message?.includes("storage") || error.message?.includes("bucket")) {
        userMessage = "저장소 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
      }
      
      return Response.json(
        { 
          error: userMessage,
          detail: process.env.NODE_ENV === "development" ? error.message : undefined
        },
        { status: 500 }
      );
    }

    // 공개 URL 생성
    const { data: urlData } = supabase.storage
      .from("warranty-photos")
      .getPublicUrl(fileName);

    return Response.json({
      success: true,
      url: urlData.publicUrl,
      path: data.path,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return Response.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}


