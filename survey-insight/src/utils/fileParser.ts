import * as XLSX from 'xlsx';
import { QuestionType, QuestionTypeValue, Question } from '../types';

export interface SurveyData {
  headers: string[];
  questions: string[];
  rows: any[];
  questionTypes: QuestionType[];
  questionRowIndex: number;
}

interface LikertScale {
  id: string;
  name: string;
  positive_keywords: string[];
  negative_keywords: string[];
  intensifiers: string[];
  neutral_keywords?: string[];
  responses: string[];
  scores: number[];
}

interface LikertScales {
  [key: string]: LikertScale;
}

export const LIKERT_SCALES: LikertScales = {
  satisfaction_5: {
    id: "satisfaction_5",
    name: "5점 만족도 (매우 만족 ~ 매우 불만족)",
    positive_keywords: ["만족"],
    negative_keywords: ["불만족"],
    intensifiers: ["매우", "다소", "약간", "전혀", "별로"],
    responses: ["매우 만족", "만족", "보통", "불만족", "매우 불만족"],
    scores: [5, 4, 3, 2, 1]
  },
  agreement_5: {
    id: "agreement_5",
    name: "5점 동의도 (매우 그렇다 ~ 전혀 아니다)",
    positive_keywords: ["그렇다", "동의한다", "동의"],
    negative_keywords: ["아니다", "동의하지 않는다"],
    intensifiers: ["매우", "다소", "약간", "전혀", "별로"],
    responses: ["매우 그렇다", "그렇다", "보통이다", "아니다", "전혀 아니다"],
    scores: [5, 4, 3, 2, 1]
  },
  agreement_5_v2: {
    id: "agreement_5_v2",
    name: "5점 동의도 (매우 그렇다 ~ 전혀 그렇지 않다)",
    positive_keywords: ["그렇다", "동의한다", "동의"],
    negative_keywords: ["그렇지 않다", "동의하지 않는다"],
    intensifiers: ["매우", "다소", "약간", "전혀", "별로"],
    responses: ["매우 그렇다", "그렇다", "보통", "그렇지 않다", "전혀 그렇지 않다"],
    scores: [5, 4, 3, 2, 1]
  },
  agreement_5_v3: {
    id: "agreement_5_v3",
    name: "5점 동의도 (매우 동의함 ~ 전혀 동의하지 않음)",
    positive_keywords: ["동의함", "동의한다"],
    negative_keywords: ["동의하지 않음", "동의하지 않는다"],
    intensifiers: ["매우", "다소", "전혀"],
    responses: ["매우 동의함", "다소 동의함", "보통", "다소 동의하지 않음", "전혀 동의하지 않음"],
    scores: [5, 4, 3, 2, 1]
  },
  improvement_5: {
    id: "improvement_5",
    name: "5점 변화 (눈에 띄게 더 좋아짐 ~ 눈에 띄게 더 나빠짐)",
    positive_keywords: ["좋아짐", "좋아졌다"],
    negative_keywords: ["나빠짐", "나빠졌다"],
    intensifiers: ["눈에 띄게", "미미하게", "다소", "거의"],
    neutral_keywords: ["변함 없음", "변하지 않음"],
    responses: ["눈에 띄게 더 좋아짐", "미미하게 더 좋아짐", "거의 변함 없음", "미미하게 더 나빠짐", "눈에 띄게 더 나빠짐"],
    scores: [5, 4, 3, 2, 1]
  },
  agreement_numeric_desc: {
    id: "agreement_numeric_desc",
    name: "5점 동의도 (1점 전혀 그렇지 않다 ~ 5점 매우 그렇다)",
    positive_keywords: ["그렇다", "동의"],
    negative_keywords: ["그렇지 않다"],
    intensifiers: ["매우", "전혀"],
    responses: ["5 (매우 그렇다)", "4 (그렇다)", "3 (보통)", "2 (그렇지 않다)", "1 (전혀 그렇지 않다)"],
    scores: [5, 4, 3, 2, 1]
  },
  satisfaction_numeric_desc: {
    id: "satisfaction_numeric_desc",
    name: "5점 만족도 (1점 매우 불만족 ~ 5점 매우 만족)",
    positive_keywords: ["만족"],
    negative_keywords: ["불만족"],
    intensifiers: ["매우"],
    responses: ["5 (매우 만족)", "4 (만족)", "3 (보통)", "2 (불만족)", "1 (매우 불만족)"],
    scores: [5, 4, 3, 2, 1]
  },
  fun_5_v2: {
    id: "fun_5_v2",
    name: "5점 재미 (매우 재미있음 ~ 매우 재미없음)",
    positive_keywords: ["재미있음"],
    negative_keywords: ["재미없음"],
    intensifiers: ["매우", "다소", "별로"],
    responses: ["매우 재미있음", "다소 재미있음", "보통", "다소 재미없음", "매우 재미없음"],
    scores: [5, 4, 3, 2, 1]
  }
};

// HTML 태그 제거 함수: HTML 표준 태그(<b>, <i>, <span> 등)만 제거, <GK 빠른 반응> 등은 남김
const removeHtmlTags = (text: string): string => {
  if (typeof text !== 'string') return text;
  // HTML 표준 태그만 제거 (짧은 알파벳 태그, 숫자/공백/한글 포함시 남김)
  return text.replace(/<\/?(b|i|u|em|strong|span|div|p|br|h[1-6]|ul|ol|li|table|tr|td|th|thead|tbody|tfoot|a|img|hr|sup|sub|small|big|blockquote|pre|code|mark|cite|abbr|address|dl|dt|dd|s|del|ins|iframe|video|audio|source|canvas|svg|path|g|rect|circle|ellipse|line|polyline|polygon|text|defs|symbol|use|clipPath|filter|foreignObject|linearGradient|radialGradient|mask|pattern|stop|tspan|textPath|fe[a-zA-Z0-9]*|figcaption|figure|main|nav|section|article|aside|footer|header|details|summary|dialog|menu|menuitem|output|progress|meter|time|wbr|data|datalist|fieldset|legend|label|input|button|select|option|textarea|form|optgroup|script|style|link|meta|title|base|col|colgroup|caption|area|map|object|param|embed|noframes|noscript|template|slot|track|picture|portal|bdi|bdo|ruby|rt|rp|samp|kbd|var|q|dfn|math|mi|mn|mo|ms|mtext|annotation|annotation-xml|mprescripts|none|semantics|mrow|mfrac|msqrt|mroot|mstyle|mmultiscripts|mpadded|mphantom|mfenced|menclose|maligngroup|malignmark|mtable|mtr|mtd|mlabeledtr|maction|mglyph|mprescripts|none|semantics|annotation|annotation-xml)\b[^>]*>/gi, '');
};

export const parseFile = async (file: File, questionRowIndex: number = 1): Promise<SurveyData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];

        if (jsonData.length < questionRowIndex + 2) {
          throw new Error('데이터가 충분하지 않습니다.');
        }

        // HTML 태그 제거 적용
        const headers = (jsonData[0] as string[]).map(removeHtmlTags);
        const questions = (jsonData[questionRowIndex] as string[]).map(removeHtmlTags);
        const rows = jsonData.slice(questionRowIndex + 1).map(row => 
          row.map((cell: any) => typeof cell === 'string' ? removeHtmlTags(cell) : cell)
        );

        // 행렬형 그룹 찾기
        const matrixGroups = findMatrixGroupsByString(questions);
        const questionTypes = analyzeQuestionTypes(rows, matrixGroups);

        resolve({
          headers,
          questions,
          rows,
          questionTypes,
          questionRowIndex
        });
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('파일을 읽는 중 오류가 발생했습니다.'));
    };

    if (file.name.endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      reader.readAsBinaryString(file);
    }
  });
};

// 행렬형 문항 그룹을 찾는 함수 (string[] 기반, 내부용)
const findMatrixGroupsByString = (questions: string[]): Map<number, { indices: number[], commonPrefix: string }> => {
  const matrixGroups = new Map<number, { indices: number[], commonPrefix: string }>();
  let currentGroupId = 0;
  
  // 모든 문항의 접두사 패턴을 찾기
  const prefixPatterns = new Map<string, number[]>();
  
  questions.forEach((question, index) => {
    // 문장의 주요 부분(마지막 4단어 제외)을 접두사로 사용
    const words = question.split(/\s+/);
    if (words.length <= 4) return; // 너무 짧은 문항은 제외
    
    // 마지막 4단어를 제외한 나머지를 접두사로 사용
    const prefix = words.slice(0, -4).join(' ');
    
    if (!prefixPatterns.has(prefix)) {
      prefixPatterns.set(prefix, []);
    }
    prefixPatterns.get(prefix)?.push(index);
  });
  
  // 3개 이상의 문항이 같은 접두사를 가지면 행렬형 그룹으로 인정
  prefixPatterns.forEach((indices, prefix) => {
    if (indices.length >= 3) {
      const groupQuestions = indices.map(i => questions[i]);
      const commonPrefix = findCommonPrefix(groupQuestions);
      
      // 공통 접두사가 전체 문장의 80% 이상을 차지하는 경우만 행렬형으로 인정
      const avgLength = groupQuestions.reduce((sum, q) => sum + q.length, 0) / groupQuestions.length;
      if (commonPrefix.length >= avgLength * 0.8) {
        matrixGroups.set(currentGroupId, { indices, commonPrefix });
        currentGroupId++;
      }
    }
  });

  return matrixGroups;
};

// 공통 접두사를 찾는 함수
const findCommonPrefix = (questions: string[]): string => {
  if (questions.length === 0) return '';
  
  const firstQuestion = questions[0];
  let commonPrefix = '';
  
  // 각 단어별로 비교
  const words = firstQuestion.split(/\s+/);
  for (let i = 0; i < words.length; i++) {
    const currentPrefix = words.slice(0, i + 1).join(' ');
    // 모든 질문이 이 접두사로 시작하는지 확인
    if (questions.every(q => q.startsWith(currentPrefix))) {
      commonPrefix = currentPrefix;
    } else {
      break;
    }
  }
  
  return commonPrefix;
};

// 행렬형 문항의 차이점만 추출하는 함수
const getMatrixDifferences = (questions: string[], commonPrefix: string): string[] => {
  return questions.map(q => {
    const difference = q.slice(commonPrefix.length).trim();
    return difference || '(동일)';
  });
};

export function analyzeQuestionTypes(rows: any[], matrixGroups: Map<number, { indices: number[], commonPrefix: string }>): QuestionType[] {
  const questionTypes: QuestionType[] = [];
  const columnCount = rows[0].length;

  // 행렬형 문항 먼저 처리
  matrixGroups.forEach((group, groupId) => {
    group.indices.forEach(columnIndex => {
      const values = rows.map(row => row[columnIndex]).filter(v => v !== undefined && v !== null && v !== '');
      if (values.length === 0) return;
      const uniqueValues = [...new Set(values)];

      // 행렬형 문항의 응답 패턴 분석
      let likertScaleMatch: LikertScale | null = null;
      for (const scale of Object.values(LIKERT_SCALES)) {
        if (uniqueValues.length < 5 || uniqueValues.length > 7) continue;
        const matchCount = scale.responses.filter(r => uniqueValues.includes(r)).length;
        if (matchCount / scale.responses.length >= 0.7) {
          likertScaleMatch = scale;
          break;
        }
      }

      // 행렬형 문항 정보 추가
      questionTypes.push({
        columnIndex,
        type: 'matrix',
        matrixGroupId: groupId,
        commonPrefix: group.commonPrefix,
        scale: likertScaleMatch?.id as 'satisfaction_5' | 'agreement_5' | undefined,
        options: likertScaleMatch?.responses || uniqueValues,
        otherResponses: uniqueValues.filter(v => !likertScaleMatch?.responses.includes(v)),
        scoreMap: likertScaleMatch ? Object.fromEntries(
          uniqueValues.map((resp) => {
            const idx = likertScaleMatch!.responses.indexOf(resp);
            return [resp, idx !== -1 ? likertScaleMatch!.scores[idx] : -1];
          })
        ) : undefined
      });
    });
  });

  // 나머지 문항 처리
  for (let i = 0; i < columnCount; i++) {
    // 이미 행렬형으로 처리된 문항은 건너뛰기
    if (questionTypes.some(qt => qt.columnIndex === i)) continue;

    const values = rows.map(row => row[i]).filter(v => v !== undefined && v !== null && v !== '');
    if (values.length === 0) continue;
    const uniqueValues = [...new Set(values)];

    // 1. 복수응답: @@ 구분자 포함 비율이 30% 이상이면 복수응답
    const multiSelectRatio = values.filter(v => typeof v === 'string' && v.includes('@@')).length / values.length;
    if (multiSelectRatio >= 0.3) {
      // 보기 목록 추출
      const optionsSet = new Set<string>();
      values.forEach(v => {
        if (typeof v === 'string') {
          v.split('@@').forEach(opt => optionsSet.add(opt.trim()));
        }
      });
      questionTypes.push({
        columnIndex: i,
        type: 'multiple_select',
        options: Array.from(optionsSet)
      });
      continue;
    }

    // 2. 주관식: 고유 응답 10개 이상
    if (uniqueValues.length >= 10) {
      questionTypes.push({
        columnIndex: i,
        type: 'open'
      });
      continue;
    }

    // 3. 리커트 감지: 응답 개수 5~7개, 표준 응답 70% 이상 일치
    let likertScaleMatch: LikertScale | null = null;
    for (const scale of Object.values(LIKERT_SCALES)) {
      if (uniqueValues.length < 5 || uniqueValues.length > 7) continue;
      const matchCount = scale.responses.filter(r => uniqueValues.includes(r)).length;
      if (matchCount / scale.responses.length >= 0.7) {
        likertScaleMatch = scale;
        break;
      }
    }
    if (likertScaleMatch) {
      // 기타응답 분리
      const otherResponses = uniqueValues.filter(v => !likertScaleMatch!.responses.includes(v));
      // scoreMap 생성
      const scoreMap = Object.fromEntries(
        uniqueValues.map((resp) => {
          const idx = likertScaleMatch!.responses.indexOf(resp);
          return [resp, idx !== -1 ? likertScaleMatch!.scores[idx] : -1];
        })
      );
      questionTypes.push({
        columnIndex: i,
        type: 'likert',
        scale: likertScaleMatch.id as 'satisfaction_5' | 'agreement_5',
        options: likertScaleMatch.responses,
        otherResponses,
        scoreMap
      });
      continue;
    }

    // 4. 객관식: 응답 2~6개, 리커트와 무관
    if (uniqueValues.length >= 2 && uniqueValues.length <= 6) {
      questionTypes.push({
        columnIndex: i,
        type: 'multiple',
        options: uniqueValues
      });
      continue;
    }

    // 5. 기본값: 주관식
    questionTypes.push({
      columnIndex: i,
      type: 'open'
    });
  }

  return questionTypes;
}

// 행렬형 문항 그룹을 찾는 함수 (Question[] 기반, export)
export const findMatrixGroups = (questions: Question[]): { id: string; title: string; questions: Question[] }[] => {
  const groups = new Map<string, { id: string; title: string; questions: Question[] }>();
  
  questions.forEach(question => {
    if (question.matrixGroupId) {
      if (!groups.has(question.matrixGroupId)) {
        groups.set(question.matrixGroupId, {
          id: question.matrixGroupId,
          title: question.matrixTitle || question.matrixGroupId,
          questions: []
        });
      }
      groups.get(question.matrixGroupId)?.questions.push(question);
    }
  });
  
  return Array.from(groups.values());
}; 