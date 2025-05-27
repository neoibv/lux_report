import * as XLSX from 'xlsx';

export interface SurveyData {
  headers: string[];
  questions: string[];
  rows: any[];
  questionTypes: QuestionType[];
  questionRowIndex: number;
}

export interface QuestionType {
  columnIndex: number;
  type: 'likert' | 'multiple' | 'open' | 'matrix' | 'multiple_select';
  options?: string[];
  scale?: 'satisfaction_5' | 'agreement_5';
  otherResponses?: string[];
  matrixGroupId?: number;
  commonPrefix?: string;
  differences?: string[];
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
        const questionTypes = analyzeQuestionTypes(questions, rows);

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

// 행렬형 문항 그룹을 찾는 함수
const findMatrixGroups = (questions: string[]): Map<number, { indices: number[], commonPrefix: string }> => {
  const matrixGroups = new Map<number, { indices: number[], commonPrefix: string }>();
  let currentGroupId = 0;
  
  // 모든 문항의 접두사 패턴을 찾기
  const prefixPatterns = new Map<string, number[]>();
  
  questions.forEach((question, index) => {
    // 문장의 주요 부분(마지막 3단어 제외)을 접두사로 사용
    const words = question.split(/\s+/);
    if (words.length <= 3) return; // 너무 짧은 문항은 제외
    
    // 마지막 3단어를 제외한 나머지를 접두사로 사용
    const prefix = words.slice(0, -3).join(' ');
    
    if (!prefixPatterns.has(prefix)) {
      prefixPatterns.set(prefix, []);
    }
    prefixPatterns.get(prefix)?.push(index);
  });
  
  // 2개 이상의 문항이 같은 접두사를 가지면 행렬형 그룹으로 인정
  prefixPatterns.forEach((indices, prefix) => {
    if (indices.length >= 2) {
      const groupQuestions = indices.map(i => questions[i]);
      const commonPrefix = findCommonPrefix(groupQuestions);
      
      // 공통 접두사가 전체 문장의 70% 이상을 차지하는 경우만 행렬형으로 인정
      const avgLength = groupQuestions.reduce((sum, q) => sum + q.length, 0) / groupQuestions.length;
      if (commonPrefix.length >= avgLength * 0.7) {
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

const analyzeQuestionTypes = (questions: string[], rows: any[]): QuestionType[] => {
  // 행렬형 그룹 찾기
  const matrixGroups = findMatrixGroups(questions);
  
  return questions.map((question, index) => {
    const columnData = rows.map(row => row[index]);
    
    // 복수 응답 확인
    let hasMultipleSelect = false;
    const allOptions = new Set<string>();

    columnData.forEach(value => {
      if (typeof value !== 'string') return;
      const trimmedValue = value.trim();
      if (!trimmedValue) return;

      // '@@'가 두 번 이상 존재하는지 확인
      const delimiterCount = (trimmedValue.match(/@@/g) || []).length;
      if (delimiterCount >= 2) {
        hasMultipleSelect = true;
        // '@@'로 분리된 각 응답을 옵션으로 추가
        trimmedValue.split('@@').forEach(option => {
          const trimmedOption = option.trim();
          if (trimmedOption) {
            allOptions.add(trimmedOption);
          }
        });
      }
    });

    if (hasMultipleSelect) {
      return {
        columnIndex: index,
        type: 'multiple_select',
        options: Array.from(allOptions)
      };
    }

    // 고유 응답 수집
    const uniqueValues = new Set<string>();
    columnData.forEach(value => {
      if (typeof value === 'string') {
        const trimmedValue = value.trim();
        if (trimmedValue) {
          uniqueValues.add(trimmedValue);
        }
      }
    });

    // 1. 주관식 확인 - 고유 응답이 10개를 초과하면 주관식으로 판단
    if (uniqueValues.size > 10) {
      return {
        columnIndex: index,
        type: 'open',
        options: undefined
      };
    }

    // 2. 리커트 척도 확인 - 고유 응답이 10개 이하인 경우만 확인
    if (uniqueValues.size <= 10) {
      let bestMatchScaleId = null;
      let highestMatchScore = 0;
      let otherResponses = new Set<string>();

      for (const scaleId in LIKERT_SCALES) {
        const scale = LIKERT_SCALES[scaleId];
        let currentMatchScore = 0;
        let positiveResponsesFound = 0;
        let negativeResponsesFound = 0;
        let intensifierUsedCount = 0;

        columnData.forEach(response => {
          if (typeof response !== 'string' || !response.trim()) return;
          
          const responseStr = response.trim();
          let responseMatchScore = 0;
          let foundDirectResponseMatch = false;
          
          // 정확한 응답 매칭
          if (scale.responses.includes(responseStr)) {
            responseMatchScore += 2;
            foundDirectResponseMatch = true;
            const scoreIndex = scale.responses.indexOf(responseStr);
            if (scale.scores[scoreIndex] > 3) positiveResponsesFound++;
            else if (scale.scores[scoreIndex] < 3) negativeResponsesFound++;
          }

          // 키워드 매칭
          if (!foundDirectResponseMatch) {
            let tempIntensifierUsed = false;
            for (const intensifier of scale.intensifiers) {
              if (responseStr.includes(intensifier)) {
                tempIntensifierUsed = true;
                for (const pk of scale.positive_keywords) {
                  if (responseStr.includes(pk) && (responseStr.startsWith(intensifier) || responseStr.endsWith(pk))) {
                    responseMatchScore += 1.5;
                    positiveResponsesFound++;
                    break;
                  }
                }
                if (responseMatchScore > 0 && tempIntensifierUsed) break;

                for (const nk of scale.negative_keywords) {
                  if (responseStr.includes(nk) && (responseStr.startsWith(intensifier) || responseStr.endsWith(nk))) {
                    responseMatchScore += 1.5;
                    negativeResponsesFound++;
                    break;
                  }
                }
                if (responseMatchScore > 0 && tempIntensifierUsed) break;
              }
            }
            if (tempIntensifierUsed) intensifierUsedCount++;
          }

          currentMatchScore += responseMatchScore;
        });

        // 긍정적/부정적 응답이 모두 있는 경우에만 점수 계산
        if (positiveResponsesFound > 0 && negativeResponsesFound > 0) {
          const matchRatio = uniqueValues.size > 0 ? currentMatchScore / (uniqueValues.size * 2) : 0;
          const responseCountSimilarity = scale.responses.length > 0 ? 1 - (Math.abs(uniqueValues.size - scale.responses.length) / scale.responses.length) : 0;
          const intensifierBonus = (intensifierUsedCount / uniqueValues.size) * 0.2;
          const finalScore = matchRatio * 0.6 + responseCountSimilarity * 0.2 + intensifierBonus;

          if (finalScore > highestMatchScore && finalScore > 0.4) {
            highestMatchScore = finalScore;
            bestMatchScaleId = scaleId;
          }
        }
      }

      // 리커트 척도로 판단되는 경우
      if (bestMatchScaleId) {
        // 기타응답 분리
        const matchedLikertResponses = new Set(LIKERT_SCALES[bestMatchScaleId].responses);
        const otherResponsesArr = Array.from(uniqueValues).filter(
          v => !matchedLikertResponses.has(v)
        );

        // 행렬형 그룹에 속하는지 확인
        for (const [groupId, groupInfo] of matrixGroups.entries()) {
          if (groupInfo.indices.includes(index)) {
            const groupQuestions = groupInfo.indices.map(i => questions[i]);
            const differences = getMatrixDifferences(groupQuestions, groupInfo.commonPrefix);
            return {
              columnIndex: index,
              type: 'matrix',
              scale: bestMatchScaleId as 'satisfaction_5' | 'agreement_5',
              options: LIKERT_SCALES[bestMatchScaleId].responses,
              otherResponses: otherResponsesArr,
              matrixGroupId: groupId,
              commonPrefix: groupInfo.commonPrefix,
              differences: differences
            };
          }
        }

        return {
          columnIndex: index,
          type: 'likert',
          scale: bestMatchScaleId as 'satisfaction_5' | 'agreement_5',
          options: LIKERT_SCALES[bestMatchScaleId].responses,
          otherResponses: otherResponsesArr
        };
      }
    }

    // 3. 기본값은 객관식
    return {
      columnIndex: index,
      type: 'multiple',
      options: Array.from(uniqueValues) as string[]
    };
  });
}; 