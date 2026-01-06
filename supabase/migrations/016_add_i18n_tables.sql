-- =============================================
-- i18n 다국어 글로벌화 테이블
-- =============================================

-- 1. 지원 언어 테이블
CREATE TABLE IF NOT EXISTS supported_languages (
  code TEXT PRIMARY KEY,                    -- 'ko', 'en', 'ja', 'vi', 'zh-TW', 'zh-CN', 'ar'
  name TEXT NOT NULL,                       -- 'Korean', 'English', etc.
  native_name TEXT NOT NULL,                -- '한국어', 'English', '日本語', etc.
  direction TEXT DEFAULT 'ltr',             -- 'ltr' or 'rtl'
  enabled BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 국가 테이블
CREATE TABLE IF NOT EXISTS countries (
  code TEXT PRIMARY KEY,                    -- ISO 3166-1 alpha-2: 'KR', 'JP', 'VN', 'TW', 'CN', 'SA'
  name TEXT NOT NULL,                       -- 'South Korea', 'Japan', etc.
  native_name TEXT NOT NULL,                -- '대한민국', '日本', etc.
  default_language TEXT REFERENCES supported_languages(code),
  timezone TEXT,                            -- 'Asia/Seoul', 'Asia/Tokyo', etc.
  currency_code TEXT,                       -- 'KRW', 'JPY', 'VND', 'TWD', 'CNY', 'SAR'
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. 국가별 기능 플래그 테이블
CREATE TABLE IF NOT EXISTS country_feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_flag_id UUID NOT NULL REFERENCES feature_flags(id) ON DELETE CASCADE,
  country_code TEXT NOT NULL REFERENCES countries(code) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}',                -- 국가별 추가 설정
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(feature_flag_id, country_code)
);

-- =============================================
-- 초기 데이터 삽입
-- =============================================

-- 지원 언어 초기 데이터
INSERT INTO supported_languages (code, name, native_name, direction, enabled, sort_order) VALUES
  ('ko', 'Korean', '한국어', 'ltr', true, 1),
  ('en', 'English', 'English', 'ltr', true, 2),
  ('ja', 'Japanese', '日本語', 'ltr', true, 3),
  ('vi', 'Vietnamese', 'Tiếng Việt', 'ltr', true, 4),
  ('zh-TW', 'Traditional Chinese', '繁體中文', 'ltr', true, 5),
  ('zh-CN', 'Simplified Chinese', '简体中文', 'ltr', true, 6),
  ('ar', 'Arabic', 'العربية', 'rtl', true, 7)
ON CONFLICT (code) DO NOTHING;

-- 국가 초기 데이터
INSERT INTO countries (code, name, native_name, default_language, timezone, currency_code, enabled) VALUES
  ('KR', 'South Korea', '대한민국', 'ko', 'Asia/Seoul', 'KRW', true),
  ('JP', 'Japan', '日本', 'ja', 'Asia/Tokyo', 'JPY', true),
  ('VN', 'Vietnam', 'Việt Nam', 'vi', 'Asia/Ho_Chi_Minh', 'VND', true),
  ('TW', 'Taiwan', '台灣', 'zh-TW', 'Asia/Taipei', 'TWD', true),
  ('CN', 'China', '中国', 'zh-CN', 'Asia/Shanghai', 'CNY', true),
  ('SA', 'Saudi Arabia', 'المملكة العربية السعودية', 'ar', 'Asia/Riyadh', 'SAR', true),
  ('US', 'United States', 'United States', 'en', 'America/New_York', 'USD', true),
  ('GB', 'United Kingdom', 'United Kingdom', 'en', 'Europe/London', 'GBP', true)
ON CONFLICT (code) DO NOTHING;

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_country_feature_flags_country ON country_feature_flags(country_code);
CREATE INDEX IF NOT EXISTS idx_country_feature_flags_feature ON country_feature_flags(feature_flag_id);
CREATE INDEX IF NOT EXISTS idx_supported_languages_enabled ON supported_languages(enabled);
CREATE INDEX IF NOT EXISTS idx_countries_enabled ON countries(enabled);

-- RLS 정책
ALTER TABLE supported_languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE country_feature_flags ENABLE ROW LEVEL SECURITY;

-- 읽기 정책 (모든 인증된 사용자)
CREATE POLICY "Allow read supported_languages" ON supported_languages
  FOR SELECT USING (true);

CREATE POLICY "Allow read countries" ON countries
  FOR SELECT USING (true);

CREATE POLICY "Allow read country_feature_flags" ON country_feature_flags
  FOR SELECT USING (true);

-- 쓰기 정책 (관리자만)
CREATE POLICY "Allow admin write supported_languages" ON supported_languages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Allow admin write countries" ON countries
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Allow admin write country_feature_flags" ON country_feature_flags
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );
