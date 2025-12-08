/**
 * OpenAI 벡터 임베딩을 사용한 RAG 지식 베이스 구축 스크립트
 * 
 * 실행 방법:
 * npx tsx scripts/embed-knowledge.ts
 * 
 * 환경변수 필요:
 * - OPENAI_API_KEY
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';

// 환경변수
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY 환경변수가 필요합니다.');
  process.exit(1);
}

if (!SUPABASE_URL) {
  console.error('❌ SUPABASE_URL 환경변수가 필요합니다.');
  process.exit(1);
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY 환경변수가 필요합니다.');
  process.exit(1);
}

// 클라이언트 초기화
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// CSV 파싱 함수
function parseCSV(content: string): Record<string, string>[] {
  const lines = content.split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  const rows: Record<string, string>[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // CSV 파싱 (쌍따옴표 처리)
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    
    if (values.length >= headers.length - 1) {
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      rows.push(row);
    }
  }
  
  return rows;
}

// 텍스트를 벡터로 변환
async function getEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small', // 저렴하고 성능 좋음
    input: text,
  });
  return response.data[0].embedding;
}

// 지식 데이터를 DB에 저장
async function uploadKnowledge(csvPath: string) {
  console.log('📖 CSV 파일 읽기:', csvPath);
  const content = fs.readFileSync(csvPath, 'utf-8');
  const rows = parseCSV(content);
  
  console.log(`📊 총 ${rows.length}개의 데이터 발견`);
  
  // 기존 데이터 삭제 (선택적)
  const { error: deleteError } = await supabase
    .from('chat_knowledge')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // 모든 데이터 삭제
  
  if (deleteError) {
    console.error('⚠️ 기존 데이터 삭제 실패:', deleteError);
  } else {
    console.log('🗑️ 기존 데이터 삭제 완료');
  }
  
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    
    // 필수 필드 체크
    if (!row.question || !row.answer || row.answer === row.source_name) {
      console.log(`⏭️ [${i + 1}/${rows.length}] 스킵 (불완전한 데이터)`);
      continue;
    }
    
    try {
      // 질문과 답변을 결합하여 임베딩 생성
      const textToEmbed = `질문: ${row.question}\n답변: ${row.answer}`;
      console.log(`🔄 [${i + 1}/${rows.length}] 임베딩 생성 중: ${row.question.substring(0, 30)}...`);
      
      const embedding = await getEmbedding(textToEmbed);
      
      // 태그 파싱
      const tags = row.tags 
        ? row.tags.replace(/"/g, '').split(',').map(t => t.trim()).filter(t => t)
        : [];
      
      // DB에 저장
      const { error } = await supabase.from('chat_knowledge').insert({
        topic: row.topic || 'general',
        age_range: row.age_range || 'all',
        question: row.question,
        answer: row.answer,
        source_name: row.source_name,
        source_url: row.source_url || null,
        source_type: 'official',
        tags: tags,
        embedding: embedding,
        verified: true,
      });
      
      if (error) {
        console.error(`❌ 저장 실패: ${error.message}`);
        errorCount++;
      } else {
        console.log(`✅ [${i + 1}/${rows.length}] 저장 완료`);
        successCount++;
      }
      
      // Rate limit 방지 (1초에 3개 정도)
      await new Promise(resolve => setTimeout(resolve, 350));
      
    } catch (err) {
      console.error(`❌ [${i + 1}/${rows.length}] 오류:`, err);
      errorCount++;
    }
  }
  
  console.log('\n========================================');
  console.log(`✅ 성공: ${successCount}개`);
  console.log(`❌ 실패: ${errorCount}개`);
  console.log('========================================');
}

// 메인 실행
const csvPath = process.argv[2] || '/Users/inkyojeong/Downloads/chat_knowledge_fixed_utf8bom.csv';
uploadKnowledge(csvPath);

