/**
 * 블로그 번역 - 한국어
 */
export default {
  // 메인
  title: "블로그",
  subtitle: "육아 꿀팁과 제품 활용법",

  // 카테고리
  categories: {
    all: "전체",
    sleepGuide: "수면 가이드",
    productTips: "제품 활용법",
    parenting: "육아 팁",
  },

  // 목록
  list: {
    featured: "추천 콘텐츠",
    recent: "최근 글",
    popular: "인기 글",
    empty: "아직 작성된 글이 없습니다",
    readTime: "{{minutes}}분 읽기",
    viewMore: "더 보기",
    postsCount: "{{count}}개의 글",
  },

  // 상세
  detail: {
    author: "작성자",
    publishDate: "발행일",
    readTime: "읽기 시간",
    share: "공유",
    linkCopied: "링크가 복사되었습니다!",

    // 오디오
    audio: {
      title: "오디오로 듣기",
      playing: "재생 중...",
      duration: "약 {{minutes}}분 소요",
    },

    // 관련 글
    related: {
      title: "다른 글도 읽어보세요",
    },

    // 에러
    notFound: {
      title: "글을 찾을 수 없습니다",
      backToList: "블로그로 돌아가기",
    },
  },

  // 검색
  search: {
    placeholder: "검색어를 입력하세요",
    noResults: "검색 결과가 없습니다",
    resultsCount: "{{count}}개의 검색 결과",
  },

  // 태그
  tags: {
    title: "태그",
  },

  // 에러
  errors: {
    loadFailed: "글을 불러오는데 실패했습니다",
    tryAgain: "다시 시도해 주세요",
  },
} as const;
