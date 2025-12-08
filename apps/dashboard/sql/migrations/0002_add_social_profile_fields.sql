-- 소셜 로그인 시 추가 프로필 정보 저장을 위한 컬럼 추가
-- 카카오/네이버 등에서 수집되는 정보 저장

-- profiles 테이블에 소셜 로그인 정보 컬럼 추가
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS gender TEXT,
ADD COLUMN IF NOT EXISTS age_range TEXT,
ADD COLUMN IF NOT EXISTS birthday TEXT,
ADD COLUMN IF NOT EXISTS provider TEXT;

-- 인덱스 추가 (검색 최적화)
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);
CREATE INDEX IF NOT EXISTS idx_profiles_provider ON public.profiles(provider);

-- handle_sign_up 함수 수정 (카카오/네이버 소셜 로그인 정보 저장)
CREATE OR REPLACE FUNCTION handle_sign_up()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET SEARCH_PATH = ''
AS $$
DECLARE
    v_provider TEXT;
    v_email TEXT;
    v_phone TEXT;
    v_name TEXT;
    v_avatar_url TEXT;
    v_gender TEXT;
    v_age_range TEXT;
    v_birthday TEXT;
BEGIN
    -- 프로바이더 확인
    v_provider := new.raw_app_meta_data ->> 'provider';
    
    -- 이메일 (auth.users에서 가져오거나 메타데이터에서)
    v_email := COALESCE(new.email, new.raw_user_meta_data ->> 'email');
    
    -- 전화번호 (카카오: phone_number)
    v_phone := new.raw_user_meta_data ->> 'phone_number';
    
    IF new.raw_app_meta_data IS NOT NULL AND new.raw_app_meta_data ? 'provider' THEN
        -- 이메일/전화번호 인증
        IF v_provider = 'email' OR v_provider = 'phone' THEN
            v_name := COALESCE(new.raw_user_meta_data ->> 'name', 'Anonymous');
            
            INSERT INTO public.profiles (profile_id, name, email, phone, marketing_consent, provider)
            VALUES (
                new.id, 
                v_name,
                v_email,
                v_phone,
                COALESCE((new.raw_user_meta_data ->> 'marketing_consent')::boolean, TRUE),
                v_provider
            );
        
        -- 카카오 로그인
        ELSIF v_provider = 'kakao' THEN
            v_name := COALESCE(
                new.raw_user_meta_data ->> 'name',
                new.raw_user_meta_data ->> 'full_name',
                new.raw_user_meta_data -> 'kakao_account' -> 'profile' ->> 'nickname',
                'Anonymous'
            );
            v_avatar_url := COALESCE(
                new.raw_user_meta_data ->> 'avatar_url',
                new.raw_user_meta_data -> 'kakao_account' -> 'profile' ->> 'profile_image_url'
            );
            v_gender := new.raw_user_meta_data -> 'kakao_account' ->> 'gender';
            v_age_range := new.raw_user_meta_data -> 'kakao_account' ->> 'age_range';
            v_birthday := new.raw_user_meta_data -> 'kakao_account' ->> 'birthday';
            v_phone := new.raw_user_meta_data -> 'kakao_account' ->> 'phone_number';
            v_email := COALESCE(v_email, new.raw_user_meta_data -> 'kakao_account' ->> 'email');
            
            INSERT INTO public.profiles (
                profile_id, name, avatar_url, email, phone, 
                gender, age_range, marketing_consent, provider
            )
            VALUES (
                new.id, 
                v_name,
                v_avatar_url,
                v_email,
                v_phone,
                v_gender,
                v_age_range,
                TRUE,
                'kakao'
            );
        
        -- 네이버 로그인
        ELSIF v_provider = 'naver' THEN
            v_name := COALESCE(
                new.raw_user_meta_data ->> 'name',
                new.raw_user_meta_data ->> 'full_name',
                'Anonymous'
            );
            v_avatar_url := new.raw_user_meta_data ->> 'avatar_url';
            v_gender := new.raw_user_meta_data ->> 'gender';
            v_age_range := new.raw_user_meta_data ->> 'age';
            v_birthday := new.raw_user_meta_data ->> 'birthday';
            v_phone := new.raw_user_meta_data ->> 'mobile';
            
            INSERT INTO public.profiles (
                profile_id, name, avatar_url, email, phone, 
                gender, age_range, marketing_consent, provider
            )
            VALUES (
                new.id, 
                v_name,
                v_avatar_url,
                v_email,
                v_phone,
                v_gender,
                v_age_range,
                TRUE,
                'naver'
            );
        
        -- 기타 OAuth (구글 등)
        ELSE
            v_name := COALESCE(new.raw_user_meta_data ->> 'full_name', 'Anonymous');
            v_avatar_url := new.raw_user_meta_data ->> 'avatar_url';
            
            INSERT INTO public.profiles (profile_id, name, avatar_url, email, marketing_consent, provider)
            VALUES (
                new.id, 
                v_name,
                v_avatar_url,
                v_email,
                TRUE,
                v_provider
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- 코멘트 추가
COMMENT ON COLUMN public.profiles.email IS '사용자 이메일 (소셜 로그인에서 수집)';
COMMENT ON COLUMN public.profiles.phone IS '전화번호 (카카오: +82 10-xxxx-xxxx 형식)';
COMMENT ON COLUMN public.profiles.gender IS '성별 (male/female)';
COMMENT ON COLUMN public.profiles.age_range IS '연령대 (예: 20~29)';
COMMENT ON COLUMN public.profiles.birthday IS '생일 (MMDD 형식)';
COMMENT ON COLUMN public.profiles.provider IS '로그인 제공자 (email/kakao/naver/google)';

