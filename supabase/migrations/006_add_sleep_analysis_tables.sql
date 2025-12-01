-- =====================================================
-- 수면 분석 시스템 테이블 마이그레이션
-- JAYCORP 프로젝트에 Sleep Analyzer 통합
-- =====================================================

-- Enable pgvector extension for RAG
CREATE EXTENSION IF NOT EXISTS vector;

-- =====================================================
-- 1. Sleep Analyses 테이블 (수면 분석 결과)
-- =====================================================
CREATE TABLE IF NOT EXISTS sleep_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  image_url TEXT,
  image_base64 TEXT,
  birth_date DATE NOT NULL,
  age_in_months INTEGER NOT NULL,
  summary TEXT NOT NULL,
  report_slides JSONB,
  phone_number TEXT,
  instagram_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sleep_analyses_user_id ON sleep_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_sleep_analyses_created_at ON sleep_analyses(created_at);

-- RLS
ALTER TABLE sleep_analyses ENABLE ROW LEVEL SECURITY;

-- 로그인 사용자는 자신의 분석만 볼 수 있음
CREATE POLICY "users_can_view_own_analyses" ON sleep_analyses
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 로그인 사용자는 자신의 분석을 생성할 수 있음
CREATE POLICY "users_can_insert_analyses" ON sleep_analyses
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- 로그인 사용자는 자신의 분석을 수정할 수 있음
CREATE POLICY "users_can_update_own_analyses" ON sleep_analyses
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- 비로그인 사용자도 분석 생성 가능 (user_id = NULL)
CREATE POLICY "anon_can_insert_analyses" ON sleep_analyses
  FOR INSERT TO anon
  WITH CHECK (user_id IS NULL);

-- 비로그인 사용자는 자신이 생성한 분석 볼 수 있음 (세션 기반)
CREATE POLICY "anon_can_view_own_analyses" ON sleep_analyses
  FOR SELECT TO anon
  USING (user_id IS NULL);

-- =====================================================
-- 2. Sleep Analysis Feedback Items 테이블
-- =====================================================
CREATE TABLE IF NOT EXISTS sleep_analysis_feedback_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES sleep_analyses(id) ON DELETE CASCADE,
  item_number INTEGER NOT NULL,
  x NUMERIC NOT NULL,
  y NUMERIC NOT NULL,
  title TEXT NOT NULL,
  feedback TEXT NOT NULL,
  risk_level TEXT NOT NULL, -- 'High', 'Medium', 'Low', 'Info'
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_feedback_items_analysis_id ON sleep_analysis_feedback_items(analysis_id);

-- RLS (분석에 연결되어 있으므로 분석 권한을 따라감)
ALTER TABLE sleep_analysis_feedback_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feedback_follows_analysis" ON sleep_analysis_feedback_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM sleep_analyses sa
      WHERE sa.id = analysis_id
      AND (sa.user_id = auth.uid() OR sa.user_id IS NULL)
    )
  );

-- =====================================================
-- 3. Sleep Analysis References 테이블
-- =====================================================
CREATE TABLE IF NOT EXISTS sleep_analysis_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES sleep_analyses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  uri TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_references_analysis_id ON sleep_analysis_references(analysis_id);

-- RLS
ALTER TABLE sleep_analysis_references ENABLE ROW LEVEL SECURITY;

CREATE POLICY "references_follows_analysis" ON sleep_analysis_references
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM sleep_analyses sa
      WHERE sa.id = analysis_id
      AND (sa.user_id = auth.uid() OR sa.user_id IS NULL)
    )
  );

-- =====================================================
-- 4. Sleep Safety References 테이블 (RAG용)
-- =====================================================
CREATE TABLE IF NOT EXISTS sleep_safety_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  content TEXT NOT NULL,
  source TEXT NOT NULL, -- 'AAP', 'CDC', 'WHO', 'KPS' (한국소아과학회)
  category TEXT NOT NULL, -- 'sids', 'sleep_surface', 'bedding', 'sleep_position', 'environment', 'temperature', 'clothing'
  age_group TEXT, -- '0-3months', '4-6months', '7-12months', '13-24months', 'all'
  keywords TEXT[], -- 검색용 키워드 배열
  embedding VECTOR(768), -- Gemini embedding dimension
  language TEXT DEFAULT 'ko', -- 'ko', 'en'
  is_verified BOOLEAN DEFAULT true, -- 검증된 자료인지
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vector similarity search index
CREATE INDEX IF NOT EXISTS idx_sleep_safety_references_embedding 
ON sleep_safety_references 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_sleep_safety_references_category ON sleep_safety_references(category);
CREATE INDEX IF NOT EXISTS idx_sleep_safety_references_age_group ON sleep_safety_references(age_group);
CREATE INDEX IF NOT EXISTS idx_sleep_safety_references_source ON sleep_safety_references(source);

-- RLS
ALTER TABLE sleep_safety_references ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read references" ON sleep_safety_references
  FOR SELECT USING (true);

CREATE POLICY "Service role can manage references" ON sleep_safety_references
  FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- 5. Phone OTP Verifications 테이블 (전화번호 인증)
-- =====================================================
CREATE TABLE IF NOT EXISTS phone_otp_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number VARCHAR(20) NOT NULL,
  otp_code VARCHAR(6) NOT NULL,
  verified BOOLEAN DEFAULT false,
  attempts INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_phone_otp_phone_number ON phone_otp_verifications(phone_number);
CREATE INDEX IF NOT EXISTS idx_phone_otp_expires_at ON phone_otp_verifications(expires_at);

-- RLS
ALTER TABLE phone_otp_verifications ENABLE ROW LEVEL SECURITY;

-- Service role만 관리 가능
CREATE POLICY "Service role can manage otp" ON phone_otp_verifications
  FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- 6. Vector Similarity Search Function
-- =====================================================
CREATE OR REPLACE FUNCTION search_sleep_references(
  query_embedding VECTOR(768),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5,
  filter_category TEXT DEFAULT NULL,
  filter_age_group TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  url TEXT,
  content TEXT,
  source TEXT,
  category TEXT,
  age_group TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.title,
    r.url,
    r.content,
    r.source,
    r.category,
    r.age_group,
    1 - (r.embedding <=> query_embedding) AS similarity
  FROM sleep_safety_references r
  WHERE 
    r.is_verified = true
    AND (filter_category IS NULL OR r.category = filter_category)
    AND (filter_age_group IS NULL OR r.age_group = filter_age_group OR r.age_group = 'all')
    AND 1 - (r.embedding <=> query_embedding) > match_threshold
  ORDER BY r.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- =====================================================
-- 7. Updated At Trigger
-- =====================================================
CREATE TRIGGER set_sleep_analyses_updated_at
  BEFORE UPDATE ON sleep_analyses
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_sleep_safety_references_updated_at
  BEFORE UPDATE ON sleep_safety_references
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_phone_otp_updated_at
  BEFORE UPDATE ON phone_otp_verifications
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- =====================================================
-- 완료!
-- =====================================================
COMMENT ON TABLE sleep_analyses IS '수면 환경 분석 결과';
COMMENT ON TABLE sleep_analysis_feedback_items IS '수면 분석 피드백 항목';
COMMENT ON TABLE sleep_analysis_references IS '수면 분석 참고 자료 링크';
COMMENT ON TABLE sleep_safety_references IS '수면 안전 가이드 (RAG용)';
COMMENT ON TABLE phone_otp_verifications IS '전화번호 OTP 인증';

