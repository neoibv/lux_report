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
        const matrixGroups = findMatrixGroupsByString(questions, rows);
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
const findMatrixGroupsByString = (questions: string[], rows?: any[][]): Map<number, { indices: number[], commonPrefix: string }> => {
  const matrixGroups = new Map<number, { indices: number[], commonPrefix: string }>();
  let currentGroupId = 0;

  // 슬라이딩 윈도우로 연속된 문항 그룹핑 (최소 2개 이상)
  const minPrefixLength = 15; // 공통 도입문구 최소 길이
  const minGroupSize = 2;
  const n = questions.length;

  // 모든 쌍에 대해 공통 접두사 계산
  function getLongestCommonPrefix(strs: string[]): string {
    if (!strs.length) return '';
    let prefix = strs[0];
    for (let i = 1; i < strs.length; i++) {
      while (strs[i].indexOf(prefix) !== 0) {
        prefix = prefix.slice(0, -1);
        if (!prefix) return '';
      }
    }
    return prefix;
  }

  // 윈도우 크기 2~n까지 반복
  for (let size = n; size >= minGroupSize; size--) {
    for (let start = 0; start <= n - size; start++) {
      const indices = Array.from({length: size}, (_, i) => start + i);
      const groupQuestions = indices.map(i => questions[i]);
      const commonPrefix = getLongestCommonPrefix(groupQuestions);
      if (commonPrefix.length >= minPrefixLength) {
        // 항목명(차이점) 추출: 길이 제한 없이, 모두 달라야 함
        const differences = groupQuestions.map(q => q.slice(commonPrefix.length).trim());
        const allUnique = new Set(differences).size === groupQuestions.length;
        if (!allUnique) continue;
        // 응답 옵션 70% 이상 일치
        let allSimilarOptions = true;
        if (rows) {
          const optionSets = indices.map(colIdx => {
            const values = rows.map(row => row[colIdx]).filter(v => v !== undefined && v !== null && v !== '');
            return Array.from(new Set(values)).sort();
          });
          // 첫 옵션 집합과 나머지 비교
          const firstSet = optionSets[0];
          for (let i = 1; i < optionSets.length; i++) {
            const setA = new Set(firstSet);
            const setB = new Set(optionSets[i]);
            const intersection = new Set([...setA].filter(x => setB.has(x)));
            const ratio = intersection.size / Math.max(setA.size, setB.size);
            if (ratio < 0.7) {
              allSimilarOptions = false;
              break;
            }
          }
        }
        if (allSimilarOptions) {
          // 이미 포함된 인덱스는 건너뜀(겹침 방지)
          if ([...matrixGroups.values()].some(g => g.indices.some(idx => indices.includes(idx)))) continue;
          matrixGroups.set(currentGroupId, { indices, commonPrefix });
          currentGroupId++;
        }
      }
    }
  }

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

  // 1. 복수응답 먼저 처리 (응답 데이터 기반)
  for (let i = 0; i < columnCount; i++) {
    const values = rows.map(row => row[i]).filter(v => v !== undefined && v !== null && v !== '');
    if (values.length === 0) continue;

    // 복수응답: @@ 구분자 포함 비율이 30% 이상이면 복수응답
    const multiSelectRatio = values.filter(v => typeof v === 'string' && v.includes('@@')).length / values.length;
    if (multiSelectRatio >= 0.3) {
      // 보기 목록 추출
      const optionsSet = new Set<string>();
      const otherResponsesSet = new Set<string>();
      values.forEach(v => {
        if (typeof v === 'string') {
          v.split('@@').forEach(opt => {
            const trimmedOpt = opt.trim();
            if (trimmedOpt.includes('_Others') || trimmedOpt.startsWith('Others_')) {
              otherResponsesSet.add(trimmedOpt);
            } else {
              optionsSet.add(trimmedOpt);
            }
          });
        }
      });
      questionTypes.push({
        columnIndex: i,
        type: 'multiple_select',
        options: Array.from(optionsSet),
        otherResponses: Array.from(otherResponsesSet)
      });
    }
  }

  // 2. 행렬형 문항 처리 (복수응답으로 분류되지 않은 문항만)
  matrixGroups.forEach((group, groupId) => {
    group.indices.forEach(columnIndex => {
      // 이미 복수응답으로 분류된 문항은 건너뛰기
      if (questionTypes.some(qt => qt.columnIndex === columnIndex)) return;

      const values = rows.map(row => row[columnIndex]).filter(v => v !== undefined && v !== null && v !== '');
      if (values.length === 0) return;
      const uniqueValues = [...new Set(values)];

      // 문항의 전체 옵션 후보: uniqueValues + 실제 헤더/질문지에서 추출된 choices(있으면)
      // 우선 uniqueValues만 사용, 추후 필요시 외부에서 optionsSet 등 주입 가능
      const options = uniqueValues;

      // 행렬형 문항의 응답 패턴 분석
      let likertScaleMatch: LikertScale | null = null;
      for (const scale of Object.values(LIKERT_SCALES)) {
        if (options.length < 1) continue;
        const matchCount = scale.responses.filter(r => options.includes(r)).length;
        if (matchCount / scale.responses.length >= 0.6) {
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
        options: likertScaleMatch?.responses || options,
        otherResponses: options.filter(v => !likertScaleMatch?.responses.includes(v) || v.includes('_Others') || v.startsWith('Others_')),
        scoreMap: likertScaleMatch ? Object.fromEntries(
          options.map((resp) => {
            const idx = likertScaleMatch!.responses.indexOf(resp);
            return [resp, idx !== -1 ? likertScaleMatch!.scores[idx] : -1];
          })
        ) : undefined
      });
    });
  });

  // 3. 나머지 문항 처리 (복수응답, 행렬형으로 분류되지 않은 문항만)
  for (let i = 0; i < columnCount; i++) {
    // 이미 분류된 문항은 건너뛰기
    if (questionTypes.some(qt => qt.columnIndex === i)) continue;

    const values = rows.map(row => row[i]).filter(v => v !== undefined && v !== null && v !== '');
    if (values.length === 0) continue;
    const uniqueValues = [...new Set(values)];

    // 문항의 전체 옵션 후보: uniqueValues + 실제 헤더/질문지에서 추출된 choices(있으면)
    // 우선 uniqueValues만 사용, 추후 필요시 외부에서 optionsSet 등 주입 가능
    const options = uniqueValues;

    // 3-1. 주관식: 고유 응답 10개 이상
    if (uniqueValues.length >= 10) {
      questionTypes.push({
        columnIndex: i,
        type: 'open'
      });
      continue;
    }

    // 3-2. 리커트 감지: 응답 개수 5~7개, 표준 응답 70% 이상 일치
    let likertScaleMatch: LikertScale | null = null;
    for (const scale of Object.values(LIKERT_SCALES)) {
      if (options.length < 1) continue;
      const matchCount = scale.responses.filter(r => options.includes(r)).length;
      if (matchCount / scale.responses.length >= 0.6) {
        likertScaleMatch = scale;
        break;
      }
    }
    if (likertScaleMatch) {
      // 기타응답 분리
      const otherResponses = uniqueValues.filter(v => !likertScaleMatch!.responses.includes(v));
      // scoreMap 생성
      const scoreMap = Object.fromEntries(
        (options).map((resp) => {
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

    // 3-3. 객관식: 응답 2~6개, 리커트와 무관
    if (uniqueValues.length >= 2 && uniqueValues.length <= 6) {
      questionTypes.push({
        columnIndex: i,
        type: 'multiple',
        options: uniqueValues
      });
      continue;
    }

    // 3-4. 기본값: 주관식
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

// 행렬형 문항 감지 함수 개선
const detectMatrixQuestion = (questions: string[]): boolean => {
  if (questions.length < 2) return false;
  
  // 첫 번째 행이 문항이고, 나머지 행들이 보기인 경우
  const firstRow = questions[0].trim();
  const otherRows = questions.slice(1);
  
  // 첫 번째 행이 문항 형식인지 확인 (숫자로 시작하거나 특수문자로 시작)
  const isFirstRowQuestion = /^[\d\s\.\)\-\*]+[가-힣a-zA-Z]/.test(firstRow);
  
  // 나머지 행들이 보기 형식인지 확인 (알파벳이나 숫자로 시작)
  const areOtherRowsOptions = otherRows.every(row => 
    /^[a-zA-Z0-9][\s\.\)]+[가-힣a-zA-Z]/.test(row.trim())
  );
  
  return isFirstRowQuestion && areOtherRowsOptions;
};

// 행렬형 문항 파싱 함수 개선
const parseMatrixQuestion = (questions: string[]): { question: string; options: string[] } => {
  const question = questions[0].trim();
  const options = questions.slice(1).map(row => {
    // 보기에서 알파벳/숫자와 점/괄호 제거
    return row.trim().replace(/^[a-zA-Z0-9][\s\.\)]+/, '').trim();
  });
  
  return { question, options };
};

interface ParsedData {
  questions: string[];
  questionOptions: string[][];
  responses: string[][];
}

const parseExcelData = (data: any[]): ParsedData => {
  const questions: string[] = [];
  const questionOptions: string[][] = [];
  const responses: string[][] = [];

  // 행렬형 문항 처리 로직 개선
  let currentMatrixQuestion: string[] = [];
  let isProcessingMatrix = false;
  let matrixQuestionCount = 0;

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const rowValues = Object.values(row).filter((value): value is string => 
      typeof value === 'string' && value.trim() !== ''
    );

    if (rowValues.length === 0) continue;

    // 행렬형 문항 시작 감지
    if (!isProcessingMatrix && detectMatrixQuestion(rowValues)) {
      isProcessingMatrix = true;
      currentMatrixQuestion = rowValues;
      matrixQuestionCount = 1;
      continue;
    }

    // 행렬형 문항 계속 처리
    if (isProcessingMatrix) {
      if (rowValues.length > 0 && /^[a-zA-Z0-9][\s\.\)]+[가-힣a-zA-Z]/.test(rowValues[0])) {
        currentMatrixQuestion.push(...rowValues);
        matrixQuestionCount++;
      } else {
        // 행렬형 문항 종료
        if (currentMatrixQuestion.length > 0) {
          const { question, options } = parseMatrixQuestion(currentMatrixQuestion);
          questions.push(question);
          questionOptions.push(options);
        }
        isProcessingMatrix = false;
        currentMatrixQuestion = [];
      }
    }

    // 일반 문항 처리
    if (!isProcessingMatrix && rowValues.length > 0) {
      const question = rowValues[0].trim();
      if (question && !questions.includes(question)) {
        questions.push(question);
        const options = rowValues.slice(1).filter(opt => opt.trim() !== '');
        questionOptions.push(options);
      }
    }
  }

  // 마지막 행렬형 문항 처리
  if (isProcessingMatrix && currentMatrixQuestion.length > 0) {
    const { question, options } = parseMatrixQuestion(currentMatrixQuestion);
    questions.push(question);
    questionOptions.push(options);
  }

  return {
    questions,
    questionOptions,
    responses
  };
}; 