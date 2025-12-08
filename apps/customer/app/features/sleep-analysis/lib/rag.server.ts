/**
 * RAG (Retrieval-Augmented Generation) Service for Sleep Safety References
 *
 * This module handles:
 * 1. Embedding generation using Gemini
 * 2. Storing references with embeddings in Supabase
 * 3. Retrieving relevant references based on similarity search
 */
import { GoogleGenAI } from "@google/genai";
import adminClient from "~/core/lib/supa-admin-client.server";

export interface SleepSafetyReference {
  id?: string;
  title: string;
  url: string;
  content: string;
  source: string;
  category: string;
  age_group: string;
  keywords?: string[];
  embedding?: number[];
  language?: string;
  is_verified?: boolean;
}

/**
 * Generate embedding for text using Gemini
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.embedContent({
    model: "text-embedding-004",
    contents: text,
  });

  // text-embedding-004 returns 768-dimensional vectors
  return response.embeddings?.[0]?.values ?? [];
}

/**
 * Store a reference with its embedding in Supabase
 */
export async function storeReference(
  reference: Omit<SleepSafetyReference, "id" | "embedding">
): Promise<void> {
  const client = adminClient;

  // Generate embedding from content
  const textForEmbedding = `${reference.title} ${reference.content} ${reference.keywords?.join(" ") ?? ""}`;
  const embedding = await generateEmbedding(textForEmbedding);

  const { error } = await client.from("sleep_safety_references").insert({
    ...reference,
    embedding,
  });

  if (error) {
    console.error("Error storing reference:", error);
    throw error;
  }
}

/**
 * Store multiple references at once
 */
export async function storeReferences(
  references: Omit<SleepSafetyReference, "id" | "embedding">[]
): Promise<void> {
  for (const reference of references) {
    await storeReference(reference);
    // Small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

/**
 * Get relevant references based on age group and categories
 */
export async function getRelevantReferences(
  ageGroup: string,
  categories: string[]
): Promise<SleepSafetyReference[]> {
  const client = adminClient;

  // First try to get from database without embedding search
  const { data, error } = await client
    .from("sleep_safety_references")
    .select("*")
    .eq("is_verified", true)
    .or(`age_group.eq.${ageGroup},age_group.eq.all`)
    .in("category", categories)
    .limit(10);

  if (error) {
    console.error("Error fetching references:", error);
    return getDefaultReferences();
  }

  if (!data || data.length === 0) {
    return getDefaultReferences();
  }

  return data.map((ref) => ({
    id: ref.id,
    title: ref.title,
    url: ref.url,
    content: ref.content,
    source: ref.source,
    category: ref.category,
    age_group: ref.age_group,
  }));
}

/**
 * Search references using embedding similarity
 */
export async function searchReferencesBySimilarity(
  query: string,
  ageGroup?: string,
  category?: string,
  limit: number = 5
): Promise<SleepSafetyReference[]> {
  const client = adminClient;

  // Generate query embedding
  const queryEmbedding = await generateEmbedding(query);

  // Call the search function
  const { data, error } = await client.rpc("search_sleep_references", {
    query_embedding: queryEmbedding,
    match_threshold: 0.7,
    match_count: limit,
    filter_category: category ?? null,
    filter_age_group: ageGroup ?? null,
  });

  if (error) {
    console.error("Error searching references:", error);
    return getDefaultReferences();
  }

  return data ?? [];
}

/**
 * Check if references table has data
 */
export async function hasReferencesData(): Promise<boolean> {
  const client = adminClient;

  const { count, error } = await client
    .from("sleep_safety_references")
    .select("*", { count: "exact", head: true });

  if (error) {
    console.error("Error checking references:", error);
    return false;
  }

  return (count ?? 0) > 0;
}

/**
 * Default references when database is empty or unavailable
 */
function getDefaultReferences(): SleepSafetyReference[] {
  return [
    {
      title: "미국소아과학회(AAP) 안전 수면 권장사항",
      url: "https://www.aap.org/en/patient-care/safe-sleep/",
      content:
        "AAP는 영아돌연사증후군(SIDS) 예방을 위해 등을 대고 재우기, 단단한 매트리스 사용, 부드러운 침구 제거를 권장합니다.",
      source: "AAP",
      category: "sids",
      age_group: "all",
    },
    {
      title: "CDC 영아돌연사증후군 예방 가이드",
      url: "https://www.cdc.gov/sids/about/index.html",
      content:
        "CDC는 안전한 수면 환경 조성을 위해 아기 침대에 베개, 담요, 장난감을 두지 말 것을 권고합니다.",
      source: "CDC",
      category: "bedding",
      age_group: "all",
    },
    {
      title: "한국소아과학회 영아 수면 안전 지침",
      url: "https://www.pediatrics.or.kr/",
      content:
        "한국소아과학회는 24개월 미만 영아의 안전한 수면을 위해 등을 대고 재우기와 적절한 실내 온도 유지를 권장합니다.",
      source: "KPS",
      category: "sleep_position",
      age_group: "all",
    },
  ];
}

/**
 * Initial reference data for seeding
 */
export const INITIAL_REFERENCES: Omit<
  SleepSafetyReference,
  "id" | "embedding"
>[] = [
  // SIDS Prevention - AAP
  {
    title: "AAP Safe Sleep Guidelines 2022",
    url: "https://www.aap.org/en/patient-care/safe-sleep/",
    content: `미국소아과학회(AAP)의 2022년 안전 수면 가이드라인 핵심 내용:
1. Back to Sleep: 모든 수면 시 등을 대고 재우기 (낮잠 포함)
2. 단단하고 평평한 수면 표면 사용
3. 침대 안에 부드러운 물건 금지 (베개, 담요, 범퍼, 인형 등)
4. 아기와 같은 방에서 자되, 같은 침대는 금지
5. 모유 수유 권장 (SIDS 위험 감소)
6. 공갈 젖꼭지 사용 고려 (수면 시)
7. 과열 방지 (실내 온도 20-22도 권장)`,
    source: "AAP",
    category: "sids",
    age_group: "all",
    keywords: ["SIDS", "영아돌연사", "안전수면", "등자세", "back to sleep"],
    language: "ko",
    is_verified: true,
  },
  // Sleep Surface
  {
    title: "안전한 수면 표면 가이드",
    url: "https://www.cpsc.gov/SafeSleep",
    content: `안전한 수면 표면 조건:
1. 매트리스는 손으로 눌렀을 때 즉시 원상복귀 되어야 함
2. 매트리스와 침대 프레임 사이 틈이 손가락 2개 이하
3. 시트는 팽팽하게 고정되어야 함
4. 포지셔너, 쐐기 베개, 기울어진 수면 제품 사용 금지
5. 바시넷/크래들은 무게 제한 확인 필요
6. 성인용 침대, 소파, 쿠션에서 재우기 금지`,
    source: "CPSC",
    category: "sleep_surface",
    age_group: "all",
    keywords: ["매트리스", "침대", "수면표면", "바시넷", "크래들"],
    language: "ko",
    is_verified: true,
  },
  // Bedding Safety
  {
    title: "침구 안전 가이드라인",
    url: "https://www.cdc.gov/sids/about/index.html",
    content: `아기 침대에 두면 안 되는 물건들:
1. 베개 - 24개월 미만 절대 금지
2. 이불, 담요 - 슬립색(수면조끼)으로 대체
3. 범퍼 가드 - 통기성 메쉬도 권장하지 않음
4. 봉제 인형, 장난감
5. 포지셔너, 쐐기 베개
6. 헐렁한 시트

대안:
- 담요 대신 슬립색 사용 (TOG 지수로 두께 선택)
- 여름: TOG 0.5-1.0, 겨울: TOG 1.5-2.5`,
    source: "CDC",
    category: "bedding",
    age_group: "all",
    keywords: ["베개", "담요", "이불", "범퍼", "슬립색", "침구"],
    language: "ko",
    is_verified: true,
  },
  // Sleep Position by Age
  {
    title: "월령별 수면 자세 가이드",
    url: "https://www.healthychildren.org/English/ages-stages/baby/sleep/Pages/Sleep-Position-Why-Back-is-Best.aspx",
    content: `월령별 수면 자세 권장사항:

0-3개월:
- 반드시 등을 대고 재우기
- 아기가 스스로 뒤집을 수 없음
- 엎드린 자세는 매우 위험

4-6개월:
- 등을 대고 재우기 유지
- 아기가 스스로 뒤집으면 그대로 두어도 됨
- 단, 침대 안은 완전히 비어있어야 함

7-12개월:
- 등을 대고 재우기 시작
- 스스로 뒤집는 것은 OK
- 낙상 방지를 위해 매트리스 높이 최저로

13-24개월:
- 선호하는 자세로 재워도 됨
- 베개는 여전히 권장하지 않음`,
    source: "AAP",
    category: "sleep_position",
    age_group: "all",
    keywords: ["수면자세", "등자세", "뒤집기", "엎드려자기"],
    language: "ko",
    is_verified: true,
  },
  // 0-3 months specific
  {
    title: "신생아~3개월 수면 안전 특별 가이드",
    url: "https://www.aap.org/en/patient-care/safe-sleep/",
    content: `0-3개월 아기의 특별 주의사항:

SIDS 위험이 가장 높은 시기입니다.

필수 사항:
1. 매 수면 시 등을 대고 재우기 (낮잠 포함)
2. 스와들링 시 엉덩이는 자유롭게
3. 스와들링된 상태로 뒤집히면 즉시 풀어주기
4. 체온 조절: 어른보다 한 겹 더
5. 수유 후 트림시키기

금지 사항:
1. 카시트, 바운서에서 장시간 수면
2. 어른과 같은 침대에서 수면
3. 푹신한 표면에서 수면`,
    source: "AAP",
    category: "environment",
    age_group: "0-3months",
    keywords: ["신생아", "스와들링", "SIDS", "체온조절"],
    language: "ko",
    is_verified: true,
  },
  // 4-6 months specific
  {
    title: "4-6개월 수면 안전 가이드",
    url: "https://www.healthychildren.org/English/ages-stages/baby/sleep/Pages/default.aspx",
    content: `4-6개월 아기의 수면 안전 주의사항:

이 시기 특징:
- 뒤집기 시작
- 물건 잡기 시작
- 입에 물건 넣기 시작

주의사항:
1. 스와들링 중단 (뒤집기 시작하면)
2. 침대 주변 50cm 이내 물건 제거
3. 모빌이 손에 닿으면 제거
4. 매트리스 높이 한 단계 낮추기

대안:
- 스와들링 대신 슬립색 사용
- 팔이 자유로운 수면복 선택`,
    source: "AAP",
    category: "environment",
    age_group: "4-6months",
    keywords: ["뒤집기", "스와들링중단", "슬립색"],
    language: "ko",
    is_verified: true,
  },
  // 7-12 months specific
  {
    title: "7-12개월 수면 안전 가이드",
    url: "https://www.healthychildren.org/English/ages-stages/baby/sleep/Pages/default.aspx",
    content: `7-12개월 아기의 수면 안전 주의사항:

이 시기 특징:
- 기어다니기
- 잡고 서기
- 물건 당기기

주의사항:
1. 매트리스 가장 낮은 위치로 조절
2. 침대 주변 가구 1m 이상 거리두기
3. 작은 물건 완전 제거 (질식 위험)
4. 전선, 커튼 코드 정리

체크리스트:
- 아기 가슴이 난간보다 낮은가?
- 침대에서 손이 닿는 곳에 물건이 없는가?
- 모든 가구가 벽에 고정되어 있는가?`,
    source: "AAP",
    category: "environment",
    age_group: "7-12months",
    keywords: ["기어다니기", "서기", "낙상방지", "매트리스높이"],
    language: "ko",
    is_verified: true,
  },
  // 13-24 months specific
  {
    title: "13-24개월 수면 안전 가이드",
    url: "https://www.healthychildren.org/English/ages-stages/toddler/sleep/Pages/default.aspx",
    content: `13-24개월 유아의 수면 안전 주의사항:

이 시기 특징:
- 걷기, 뛰기
- 침대 탈출 시도
- 문 열기, 서랍 열기

주의사항:
1. 침대 난간이 가슴 아래면 유아 침대로 전환
2. 모든 서랍, 문에 안전 잠금장치
3. 키 큰 가구 벽에 고정
4. 창문 안전장치 설치

유아 침대 전환 시기:
- 아기가 난간을 넘으려고 할 때
- 키가 89cm 이상일 때
- 침대에서 떨어진 적이 있을 때`,
    source: "AAP",
    category: "environment",
    age_group: "13-24months",
    keywords: ["유아침대", "침대전환", "낙상", "안전잠금장치"],
    language: "ko",
    is_verified: true,
  },
  // Temperature
  {
    title: "수면 환경 온도 가이드",
    url: "https://www.lullabytrust.org.uk/safer-sleep-advice/baby-room-temperature/",
    content: `아기 방 적정 온도:

권장 온도: 16-20°C (한국 환경에서는 20-22°C)

과열 위험 신호:
- 땀이 남
- 가슴이 뜨거움
- 빠른 호흡
- 발진

온도별 옷차림:
- 24°C 이상: 기저귀만 또는 얇은 바디슈트
- 22-24°C: 반팔 바디슈트 + TOG 0.5 슬립색
- 20-22°C: 긴팔 바디슈트 + TOG 1.0 슬립색
- 18-20°C: 긴팔 바디슈트 + TOG 2.5 슬립색
- 16-18°C: 긴팔 바디슈트 + 내복 + TOG 2.5 슬립색

금지사항:
- 모자 씌워 재우기
- 전기장판, 온수 매트 사용`,
    source: "Lullaby Trust",
    category: "temperature",
    age_group: "all",
    keywords: ["온도", "과열", "체온", "슬립색", "TOG"],
    language: "ko",
    is_verified: true,
  },
  // Clothing
  {
    title: "아기 수면복 가이드",
    url: "https://www.whattoexpect.com/first-year/how-to-dress-baby-for-sleep/",
    content: `아기 수면복 선택 가이드:

슬립색(Sleep Sack) 사용법:
- TOG 지수로 두께 선택
- 어깨 부분이 잘 맞는지 확인
- 목 부분이 너무 넓지 않은지 확인

TOG 지수 설명:
- TOG 0.5: 여름용 (24°C 이상)
- TOG 1.0: 봄/가을용 (20-24°C)
- TOG 1.5: 환절기용 (18-21°C)
- TOG 2.5: 겨울용 (16-20°C)

주의사항:
- 모자 금지 (실내 수면 시)
- 끈이 달린 옷 금지
- 후드 달린 옷 금지
- 너무 헐렁한 옷 금지`,
    source: "AAP",
    category: "clothing",
    age_group: "all",
    keywords: ["수면복", "슬립색", "TOG", "옷차림"],
    language: "ko",
    is_verified: true,
  },
];

