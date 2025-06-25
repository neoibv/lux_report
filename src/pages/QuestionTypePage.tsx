import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useSurveyStore from '../store/surveyStore';
import { QuestionTypeValue, Question } from '../types';
import QuestionTypeSelector from '../components/QuestionTypeSelector';

// 문항 유형별 색상 정의
const typeColors = {
  matrix: {
    border: 'border-purple-200',
    text: 'text-purple-800',
    title: 'text-purple-900'
  },
  multiple: {
    border: 'border-green-200',
    text: 'text-green-800',
    title: 'text-green-900'
  },
  likert: {
    border: 'border-blue-200',
    text: 'text-blue-800',
    title: 'text-blue-900'
  },
  multiple_select: {
    border: 'border-orange-200',
    text: 'text-orange-800',
    title: 'text-orange-900'
  },
  open: {
    border: 'border-yellow-200',
    text: 'text-yellow-800',
    title: 'text-yellow-900'
  }
};

interface MatrixGroup {
  id: string;
  title: string;
  questions: Question[];
}

const QuestionTypePage: React.FC = () => {
  const navigate = useNavigate();
  const { surveyData, setSurveyData } = useSurveyStore();
  const [matrixQuestions, setMatrixQuestions] = useState<MatrixGroup[]>([]);
  const [multipleQuestions, setMultipleQuestions] = useState<Question[]>([]);
  const [likertQuestions, setLikertQuestions] = useState<Question[]>([]);
  const [multipleSelectQuestions, setMultipleSelectQuestions] = useState<Question[]>([]);
  const [openQuestions, setOpenQuestions] = useState<Question[]>([]);

  useEffect(() => {
    if (!surveyData) {
      navigate('/');
      return;
    }

    // 항상 최신 surveyData로 그룹별 상태 재분류
    const matrixGroups = surveyData.matrixGroups || [];
    // matrixGroups의 각 group.questions도 surveyData.questions에서 최신 type으로 갱신
    const updatedMatrixGroups = matrixGroups.map(group => ({
      ...group,
      questions: group.questions.map(gq => surveyData.questions.find(q => q.id === gq.id) || gq)
    }));
    const generalQuestions = surveyData.questions.filter(q => !q.matrixGroupId);

    // 일반 문항을 유형별로 분류
    const multiple = generalQuestions.filter(q => q.type === 'multiple');
    const likert = generalQuestions.filter(q => q.type === 'likert');
    const multipleSelect = generalQuestions.filter(q => q.type === 'multiple_select');
    const open = generalQuestions.filter(q => q.type === 'open');

    setMatrixQuestions(updatedMatrixGroups);
    setMultipleQuestions(multiple);
    setLikertQuestions(likert);
    setMultipleSelectQuestions(multipleSelect);
    setOpenQuestions(open);
  }, [surveyData, navigate]);

  // 리커트 scoreMap 자동 생성 함수
  function getLikertScoreMap(options: any[] | undefined): Record<string, number> | undefined {
    if (!options || options.length === 0) return undefined;
    // 모든 옵션을 string으로 변환 후 trim
    const normalizedOptions = options.map(opt => String(opt).trim());
    // 1~5가 모두 포함되어 있으면 순서와 상관없이 리커트로 간주
    const allNumbers = ['1', '2', '3', '4', '5'];
    const hasAllNumbers = allNumbers.every(num => normalizedOptions.includes(num));
    if (hasAllNumbers) {
      const scoreMap: Record<string, number> = {};
      allNumbers.forEach(num => { scoreMap[num] = parseInt(num); });
      return scoreMap;
    }
    return undefined;
  }

  // 리커트 응답값 매핑 함수
  function mapToLikertScale(response: string, scoreMap: Record<string, number>): string {
    if (response == null) return '';
    const trimmed = String(response).trim();
    // 숫자형 응답값도 문자열로 변환하여 비교
    const foundKey = Object.keys(scoreMap).find(
      key => key === trimmed || key === String(Number(trimmed))
    );
    if (foundKey) return foundKey;
    return '';
  }

  // 숫자형 리커트 scoreMap 생성 함수 (1~5 숫자 응답용)
  function getNumericLikertScoreMap(options: string[] | undefined): Record<string, number> | undefined {
    if (!options || options.length === 0) return undefined;
    const numericValues = options.map(v => String(v).trim());
    // 1~5가 모두 포함되어 있으면 순서와 상관없이 리커트로 간주
    const allNumbers = ['1', '2', '3', '4', '5'];
    const hasAllNumbers = allNumbers.every(num => numericValues.includes(num));
    if (hasAllNumbers) {
      const scoreMap: Record<string, number> = {};
      allNumbers.forEach(num => { scoreMap[num] = parseInt(num); });
      return scoreMap;
    }
    return undefined;
  }

  // 숫자 응답값을 가진 문항의 실제 응답값들을 분석하여 리커트 매핑 생성
  function createNumericLikertMapping(questionId: string): { scoreMap: Record<string, number>, options: string[], displayTexts: string[] } | null {
    if (!surveyData) return null;
    
    const columnIndex = parseInt(questionId.substring(1));
    const questionType = surveyData.questionTypes.find(qt => qt.columnIndex === columnIndex);
    
    if (!questionType || !Array.isArray(questionType.responses)) return null;
    
    // 실제 응답값들 추출 (빈 값 제외)
    const actualResponses: string[] = [];
    questionType.responses.forEach((response: any) => {
      if (response !== undefined && response !== null && response !== '' && String(response).trim() !== '') {
        actualResponses.push(String(response));
      }
    });
    
    if (actualResponses.length === 0) return null;
    
    // 숫자 응답값들만 필터링
    const numericResponses: string[] = [];
    actualResponses.forEach(v => {
      if (/^[1-5]$/.test(v.trim())) {
        numericResponses.push(v);
      }
    });
    
    if (numericResponses.length === 0) return null;
    
    // 고유한 숫자 응답값들 추출
    const uniqueNumericResponses = Array.from(new Set(numericResponses));
    uniqueNumericResponses.sort((a, b) => parseInt(a) - parseInt(b));
    
    // 1~5 중 누락된 숫자들 찾기
    const allNumbers = ['1', '2', '3', '4', '5'];
    const missingNumbers: string[] = [];
    allNumbers.forEach(num => {
      if (!uniqueNumericResponses.includes(num)) {
        missingNumbers.push(num);
      }
    });
    
    // 완전한 1~5 옵션 생성 (누락된 숫자도 포함)
    const completeOptions = [...uniqueNumericResponses, ...missingNumbers];
    completeOptions.sort((a, b) => parseInt(a) - parseInt(b));
    
    // scoreMap 생성 (1=1, 2=2, ..., 5=5)
    const scoreMap: Record<string, number> = {};
    completeOptions.forEach(num => {
      scoreMap[num] = parseInt(num);
    });
    
    // displayTexts 생성 (숫자에 대응하는 텍스트)
    const displayTexts: string[] = [];
    completeOptions.forEach(num => {
      const defaultTexts: Record<string, string> = {
        '1': '1 (매우 나쁘다)',
        '2': '2 (나쁘다)',
        '3': '3 (보통이다)',
        '4': '4 (좋다)',
        '5': '5 (매우 좋다)'
      };
      displayTexts.push(defaultTexts[num] || num);
    });
    
    return {
      scoreMap,
      options: completeOptions,
      displayTexts
    };
  }

  // 응답이 있는 문항인지 확인하는 함수
  function hasResponses(question: Question): boolean {
    if (!surveyData) return false;
    
    const columnIndex = parseInt(question.id.substring(1));
    const questionType = surveyData.questionTypes.find(qt => qt.columnIndex === columnIndex);
    
    if (!questionType || !Array.isArray(questionType.responses)) return false;
    
    // 응답이 하나라도 있는지 확인 (빈 문자열, null, undefined 제외)
    return questionType.responses.some((response: any) => 
      response !== undefined && response !== null && response !== ''
    );
  }

  const handleQuestionTypeChange = (questionId: string, newType: QuestionTypeValue) => {
    if (!surveyData) return;

    let updatedQuestionTypes = surveyData.questionTypes;
    let updatedRows = surveyData.rows;

    const updatedQuestions = surveyData.questions.map(q => {
      if (q.id !== questionId) return q;

      if (newType === 'likert') {
        // scoreMap, options, displayTexts 생성
        let scoreMap = getLikertScoreMap(q.options);
        let options = q.options || [];
        let displayTexts: string[] = [];

        if (!scoreMap) {
          // 실제 응답값에서 추출
          const questionType = surveyData.questionTypes.find(
            qt => qt.columnIndex === parseInt(q.id.replace(/\D/g, ''))
          );
          if (questionType && Array.isArray(questionType.responses)) {
            const actualResponses = Array.from(new Set(
              (questionType.responses as any[])
                .filter((r: any) => r !== undefined && r !== null && r !== '')
                .map((r: any) => String(r))
            )) as string[];
            scoreMap = getNumericLikertScoreMap(actualResponses);
            if (scoreMap) {
              const numericMapping = createNumericLikertMapping(q.id);
              if (numericMapping) {
                scoreMap = numericMapping.scoreMap;
                options = numericMapping.options;
                displayTexts = numericMapping.displayTexts;
              }
            }
          }
        }

        // scoreMap이 없으면 fallback (기본 1~5)
        if (!scoreMap) {
          scoreMap = { '1': 1, '2': 2, '3': 3, '4': 4, '5': 5 };
          options = ['1', '2', '3', '4', '5'];
          displayTexts = [
            '1 (매우 나쁘다)', '2 (나쁘다)', '3 (보통이다)', '4 (좋다)', '5 (매우 좋다)'
          ];
        }

        // === [동기화 보강] ===
        // options, displayTexts, scoreMap을 점수 내림차순(5~1)으로 정렬
        const optionScorePairs = options.map(opt => ({
          opt,
          score: scoreMap![opt]
        }));
        optionScorePairs.sort((a, b) => (b.score || 0) - (a.score || 0));
        options = optionScorePairs.map(pair => pair.opt);
        displayTexts = options.map((opt, idx) => displayTexts[idx] || '');
        // scoreMap도 정렬된 options 기준으로 재생성
        const newScoreMap: Record<string, number> = {};
        options.forEach(opt => { newScoreMap[opt] = scoreMap![opt]; });
        scoreMap = newScoreMap;

        // responses를 scoreMap의 key로 변환(정규화)
        const questionType = surveyData.questionTypes.find(
          qt => qt.columnIndex === parseInt(q.id.replace(/\D/g, ''))
        );
        if (questionType && Array.isArray(questionType.responses)) {
          const mappedResponses = questionType.responses.map((response: string) => {
            const trimmed = String(response).trim();
            const foundKey = Object.keys(scoreMap!).find(
              key => key === trimmed || key === String(Number(trimmed))
            );
            return foundKey || trimmed;
          });
          updatedQuestionTypes = surveyData.questionTypes.map(qt =>
            qt.columnIndex === parseInt(q.id.replace(/\D/g, ''))
              ? { ...qt, responses: mappedResponses, options, displayTexts, scoreMap, responseOrder: options }
              : qt
          );
        }

        // rows의 해당 컬럼 값도 scoreMap의 key로 변환(정규화)
        const colIdx = parseInt(q.id.replace(/\D/g, ''));
        updatedRows = surveyData.rows.map(row => {
          const original = row[colIdx];
          if (original === undefined || original === null || original === '') return row;
          const trimmed = String(original).trim();
          const foundKey = Object.keys(scoreMap!).find(
            key => key === trimmed || key === String(Number(trimmed))
          );
          const newRow = [...row];
          newRow[colIdx] = foundKey || trimmed;
          return newRow;
        });

        return { ...q, type: newType, scoreMap, options, displayTexts };
      }

      return { ...q, type: newType };
    });

    // questionTypes도 type 동기화
    const columnIndex = parseInt(questionId.replace(/\D/g, ''));
    updatedQuestionTypes = updatedQuestionTypes.map(qt =>
      qt.columnIndex === columnIndex ? { ...qt, type: newType } : qt
    );

    const newSurveyData = {
      ...surveyData,
      questions: updatedQuestions,
      questionTypes: updatedQuestionTypes,
      rows: updatedRows,
      matrixGroups: (surveyData.matrixGroups || []).map(group => ({
        ...group,
        questions: group.questions.map(gq =>
          updatedQuestions.find(q => q.id === gq.id) || gq
        )
      })),
      headers: surveyData ? surveyData.headers ?? [] : [],
      questionRowIndex: surveyData ? surveyData.questionRowIndex ?? 0 : 0,
      title: surveyData ? surveyData.title ?? '' : '',
      description: surveyData ? surveyData.description ?? '' : '',
      totalResponses: surveyData ? surveyData.totalResponses ?? 0 : 0,
    };
    setSurveyData(newSurveyData);
  };

  // 행렬형 세트 내 소문항 유형 변경 시 분리 로직 추가
  const handleMatrixQuestionTypeChange = (groupId: string, questionId: string, newType: QuestionTypeValue) => {
    if (!surveyData) return;

    // 1. 해당 matrixGroup에서 문항 제거
    const updatedMatrixGroups = (surveyData.matrixGroups || []).map(group => {
      if (group.id !== groupId) return group;
      return {
        ...group,
        questions: group.questions.filter(q => q.id !== questionId)
      };
    }).filter(group => group.questions.length > 0);

    // 2. 해당 문항을 일반 문항으로 이동(type만 변경, 리커트면 scoreMap 자동 생성 및 응답값 매핑)
    const updatedQuestions = surveyData.questions.map(q => {
      if (q.id !== questionId) return q;
      
      if (newType === 'likert') {
        const scoreMap = getLikertScoreMap(q.options);
        if (scoreMap) {
          // 해당 문항의 응답 데이터 찾기
          const questionType = surveyData.questionTypes.find(
            qt => qt.columnIndex === parseInt(q.id.substring(1))
          );
          
          if (questionType && Array.isArray(questionType.responses)) {
            // 응답값들을 리커트 스케일에 맞춰 매핑
            const mappedResponses = questionType.responses.map((response: string) =>
              mapToLikertScale(response, scoreMap)
            );
            
            // questionTypes 업데이트
            const updatedQuestionTypes = surveyData.questionTypes.map(qt => {
              if (qt.columnIndex === parseInt(q.id.substring(1))) {
                return {
                  ...qt,
                  responses: mappedResponses
                };
              }
              return qt;
            });

            setSurveyData({
              ...surveyData,
              questions: updatedQuestions,
              headers: surveyData ? surveyData.headers ?? [] : [],
              rows: surveyData ? surveyData.rows ?? [] : [],
              questionTypes: updatedQuestionTypes,
              questionRowIndex: surveyData ? surveyData.questionRowIndex ?? 0 : 0,
              title: surveyData ? surveyData.title ?? '' : '',
              description: surveyData ? surveyData.description ?? '' : '',
              totalResponses: surveyData ? surveyData.totalResponses ?? 0 : 0,
            });
          }
        }
        return { ...q, type: newType, matrixGroupId: undefined, scoreMap };
      }
      
      if ('scoreMap' in q && q.scoreMap) {
        const { scoreMap, ...rest } = q;
        return { ...rest, type: newType, matrixGroupId: undefined };
      }
      return { ...q, type: newType, matrixGroupId: undefined };
    });

      setSurveyData({
        ...surveyData,
      matrixGroups: updatedMatrixGroups,
      questions: updatedQuestions,
      headers: surveyData ? surveyData.headers ?? [] : [],
      rows: surveyData ? surveyData.rows ?? [] : [],
      questionTypes: surveyData ? surveyData.questionTypes ?? [] : [],
      questionRowIndex: surveyData ? surveyData.questionRowIndex ?? 0 : 0,
      title: surveyData ? surveyData.title ?? '' : '',
      description: surveyData ? surveyData.description ?? '' : '',
      totalResponses: surveyData ? surveyData.totalResponses ?? 0 : 0,
    });
  };

  // 세트 전체 유형 일괄 변경 함수
  const handleMatrixGroupTypeChange = (groupId: string, newType: QuestionTypeValue) => {
    if (!surveyData) return;
    
    // 해당 세트의 모든 문항 id 추출
    const group = (surveyData.matrixGroups || []).find(g => g.id === groupId);
    if (!group) return;
    
    // 대표 옵션(세트 첫 문항의 options) 추출
    const groupOptions = group.questions[0]?.options ?? ['매우 만족', '만족', '보통', '불만족', '매우 불만족'];

    // 1. questions 업데이트 - matrixGroupId 제거하고 type 변경, 리커트면 options도 통일
    const updatedQuestions = surveyData.questions.map(q => {
      if (!group.questions.some(gq => gq.id === q.id)) return q;
      
      // 리커트로 변경 시 scoreMap 자동 생성 및 응답값 매핑, options 통일
      if (newType === 'likert') {
        const options = groupOptions;
        const scoreMap = getLikertScoreMap(options);
        if (scoreMap) {
          // 해당 문항의 응답 데이터 찾기
          const questionType = surveyData.questionTypes.find(
            qt => qt.columnIndex === parseInt(q.id.substring(1))
          );
          
          if (questionType && Array.isArray(questionType.responses)) {
            // 응답값들을 리커트 스케일에 맞춰 매핑
            const mappedResponses = questionType.responses.map((response: string) =>
              mapToLikertScale(response, scoreMap)
            );

            // questionTypes 업데이트
            const updatedQuestionTypes = surveyData.questionTypes.map(qt => {
              if (qt.columnIndex === parseInt(q.id.substring(1))) {
                return {
                  ...qt,
                  responses: mappedResponses
                };
              }
              return qt;
            });

            setSurveyData({
              ...surveyData,
              questions: updatedQuestions,
              headers: surveyData ? surveyData.headers ?? [] : [],
              rows: surveyData ? surveyData.rows ?? [] : [],
              questionTypes: updatedQuestionTypes,
              questionRowIndex: surveyData ? surveyData.questionRowIndex ?? 0 : 0,
              title: surveyData ? surveyData.title ?? '' : '',
              description: surveyData ? surveyData.description ?? '' : '',
              totalResponses: surveyData ? surveyData.totalResponses ?? 0 : 0,
            });
          }
        }
        // 반드시 type, scoreMap, options 동기화
        return { ...q, type: newType as QuestionTypeValue, matrixGroupId: undefined, options, scoreMap };
      }
      
      if ('scoreMap' in q && q.scoreMap) {
        const { scoreMap, ...rest } = q;
        return { ...rest, type: newType, matrixGroupId: undefined };
      }
      return { ...q, type: newType, matrixGroupId: undefined };
    });

    // 2. matrixGroups에서 해당 세트 제거
    const updatedMatrixGroups = (surveyData.matrixGroups || []).filter(g => g.id !== groupId);

    setSurveyData({
      ...surveyData,
      questions: updatedQuestions,
      matrixGroups: updatedMatrixGroups,
      headers: surveyData ? surveyData.headers ?? [] : [],
      rows: surveyData ? surveyData.rows ?? [] : [],
      questionTypes: surveyData ? surveyData.questionTypes ?? [] : [],
      questionRowIndex: surveyData ? surveyData.questionRowIndex ?? 0 : 0,
      title: surveyData ? surveyData.title ?? '' : '',
      description: surveyData ? surveyData.description ?? '' : '',
      totalResponses: surveyData ? surveyData.totalResponses ?? 0 : 0,
    });
  };

  const handleContinue = () => {
    // 분석 페이지로 이동 전, scoreMap이 없는 리커트 문항은 자동으로 scoreMap과 options를 저장
    if (surveyData) {
      const updatedQuestions = surveyData.questions.map(q => {
        if (q.type === 'likert' && (!q.scoreMap || Object.keys(q.scoreMap).length === 0) && q.options && q.options.length === 5) {
          const scoreMap = getLikertScoreMap(q.options);
          // options를 scoreMap의 key 순서대로 동기화
          const newOptions = scoreMap ? Object.keys(scoreMap) : q.options;
          return { ...q, scoreMap, options: newOptions };
        }
        return q;
      });
      setSurveyData({
        ...surveyData,
        questions: updatedQuestions,
        headers: surveyData ? surveyData.headers ?? [] : [],
        rows: surveyData ? surveyData.rows ?? [] : [],
        questionTypes: surveyData ? surveyData.questionTypes ?? [] : [],
        questionRowIndex: surveyData ? surveyData.questionRowIndex ?? 0 : 0,
        title: surveyData ? surveyData.title ?? '' : '',
        description: surveyData ? surveyData.description ?? '' : '',
        totalResponses: surveyData ? surveyData.totalResponses ?? 0 : 0,
      });
    }
    navigate('/analysis');
  };

  // LikertScoreMappingInfo 개선: options 전체 기준으로 매핑 표시
  const LikertScoreMappingInfo = ({ question, extraResponses }: { question: Question, extraResponses?: string[] }) => {
    if (!question.options || question.type !== 'likert') return null;
    // options를 항상 string으로 변환 후 trim
    const normalizedOptions = (question.options ?? []).map(opt => String(opt).trim());
    const scoreMap = question.scoreMap || getLikertScoreMap(normalizedOptions);
    const fallbackMap = getLikertScoreMap(normalizedOptions);
    if (!scoreMap && !fallbackMap) return null;
    // 기타 응답 추출: options에 없는 실제 응답값
    const etcResponses = (extraResponses || []).filter(
      resp => !(normalizedOptions).some(opt => opt.trim().toLowerCase() === resp.trim().toLowerCase())
    );
    // options 전체 기준으로 매핑 표시
    const entries = normalizedOptions.map(opt => {
      const norm = opt.trim().toLowerCase();
      const score = scoreMap?.[norm];
      return { label: opt, norm: norm, score };
    });
    return (
      <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
        <h4 className="font-medium text-gray-700 mb-1">리커트 스코어 매핑:</h4>
        <div className="space-y-1">
          {entries.map((entry) => {
            const { label, norm, score } = entry;
            if (typeof score === 'string' && score === '기타') {
              return (
                <div key={label} className="flex items-center gap-2">
                  <span className="text-gray-600">{label}</span>
                  <span className="text-gray-400">→</span>
                  <span className="font-medium text-gray-400">기타 응답</span>
                </div>
              );
            }
            const fallback = (fallbackMap && fallbackMap[norm]) ?? 3;
            return (
              <div key={label} className="flex items-center gap-2">
                <span className="text-gray-600">{label}</span>
                <span className="text-gray-400">→</span>
                <span className="font-medium text-blue-600">
                  {typeof score === 'number' ? score : fallback}점
                </span>
              </div>
            );
          })}
          {etcResponses.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-gray-600">기타 응답</span>
              <span className="text-gray-400">→</span>
              <span className="font-medium text-gray-400">-</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // LikertScoreMappingEditor 개선: options 전체 기준으로 매핑 에디터 표시/저장
  const LikertScoreMappingEditor = ({ question }: { question: Question }) => {
    if (!question.options || question.type !== 'likert') return null;
    const normalizedOptions = (question.options ?? []).map(opt => String(opt).trim());
    const [localScoreMap, setLocalScoreMap] = useState<Record<string, { score: number, isOther: boolean }>>({});
    const [localDisplayTexts, setLocalDisplayTexts] = useState<Record<string, string>>({});
    const [showEditor, setShowEditor] = useState(false);
    
    // 디폴트 리커트 텍스트 - 점수 순서(5점→1점)에 맞게
    const getDefaultLikertTexts = (options: string[]) => {
      if (options.length === 5) {
        return ['매우 그렇다', '그렇다', '보통', '그렇지 않다', '전혀 그렇지 않다'];
      } else if (options.length === 4) {
        return ['매우 그렇다', '그렇다', '그렇지 않다', '전혀 그렇지 않다'];
      } else if (options.length === 3) {
        return ['그렇다', '보통', '그렇지 않다'];
      }
      return options.map(() => '');
    };
    
    useEffect(() => {
      const initialMap: Record<string, { score: number, isOther: boolean }> = {};
      const likertMap = getLikertScoreMap(normalizedOptions);
      normalizedOptions.forEach(opt => {
        let scoreRaw = question.scoreMap ? question.scoreMap[opt] : undefined;
        let score: number = 3;
        let isOther = false;
        if (typeof scoreRaw === 'number') {
          score = scoreRaw;
          isOther = false;
        } else if (scoreRaw === '기타') {
          score = 3;
          isOther = true;
        } else if (likertMap && typeof likertMap[opt] === 'number') {
          score = likertMap[opt];
          isOther = false;
        }
        initialMap[opt] = { score, isOther };
      });
      setLocalScoreMap(initialMap);
      
      // displayTexts 초기화 - 점수 순서에 맞게 정렬하여 매핑
      const displayTextsInit: Record<string, string> = {};
      const defaultTexts = getDefaultLikertTexts(normalizedOptions);
      
      // 점수 순서로 정렬된 옵션 생성 (5점→1점)
      const sortedOptions = [...normalizedOptions].sort((a, b) => {
        const scoreA = initialMap[a]?.score || 3;
        const scoreB = initialMap[b]?.score || 3;
        return scoreB - scoreA; // 내림차순 (5점→1점)
      });
      
      // 기존 displayTexts가 있으면 사용, 없으면 디폴트 텍스트 사용
      if (question.displayTexts && question.displayTexts.length > 0) {
        // 기존 displayTexts를 점수 순서에 맞게 매핑
        sortedOptions.forEach((opt, idx) => {
          displayTextsInit[opt] = question.displayTexts![idx] || defaultTexts[idx] || '';
        });
      } else {
        // 디폴트 텍스트 사용
        sortedOptions.forEach((opt, idx) => {
          displayTextsInit[opt] = defaultTexts[idx] || '';
        });
      }
      
      setLocalDisplayTexts(displayTextsInit);
      // eslint-disable-next-line
    }, [question.id, showEditor]);
    
    const handleScoreChange = (opt: string, score: number) => {
      setLocalScoreMap(prev => ({ ...prev, [opt]: { ...prev[opt], score } }));
    };
    const handleOtherChange = (opt: string, checked: boolean) => {
      setLocalScoreMap(prev => ({ ...prev, [opt]: { ...prev[opt], isOther: checked } }));
    };
    const handleDisplayTextChange = (opt: string, value: string) => {
      setLocalDisplayTexts(prev => ({ ...prev, [opt]: value }));
    };
    const handleSave = () => {
      const entries = Object.entries(localScoreMap);
      const sortedEntries = [
        ...entries.filter(([_, v]) => !v.isOther).sort((a, b) => b[1].score - a[1].score),
        ...entries.filter(([_, v]) => v.isOther)
      ];
      
      const newScoreMap: Record<string, any> = {};
      const newOptions: string[] = []; // 점수 순으로 정렬된 응답값 (e.g., 5, 4, 3...)
      const textToScoreMap: Record<string, string> = {}; // 원본 텍스트 -> 점수 매핑

      sortedEntries.forEach(([opt, { score, isOther }]) => {
        const scoreStr = String(score);
        newOptions.push(scoreStr);
        newScoreMap[scoreStr] = score;
        if(isOther) newScoreMap[scoreStr] = '기타';
        textToScoreMap[opt] = scoreStr;
      });

      if (!surveyData) return;
      // displayTexts는 점수 순 정렬(5→1)에 맞춰, 원본 응답값에 대응하는 텍스트를 추출
      const newDisplayTexts: string[] = sortedEntries.map(([opt]) => localDisplayTexts[opt] || '');
      console.log('[DEBUG] LikertScoreMappingEditor - newDisplayTexts:', newDisplayTexts);
      console.log('[DEBUG] LikertScoreMappingEditor - sortedEntries:', sortedEntries);
      console.log('[DEBUG] LikertScoreMappingEditor - localDisplayTexts:', localDisplayTexts);
      
      const colIdx = parseInt(question.id.replace(/\D/g, ''));

      // 1. 원본 데이터(rows)의 응답값을 새로운 점수 체계에 맞게 변환
      const updatedRows = surveyData.rows.map(row => {
        const originalValue = String(row[colIdx] || '').trim();
        const mappedValue = textToScoreMap[originalValue];
        if (mappedValue !== undefined) {
          const newRow = [...row];
          newRow[colIdx] = mappedValue;
          return newRow;
        }
        return row;
      });
      
      // 2. questions 배열 업데이트
      const updatedQuestions = surveyData.questions.map(q =>
        q.id === question.id ? { ...q, scoreMap: newScoreMap, options: newOptions, displayTexts: newDisplayTexts } : q
      );
      
      // 3. questionTypes 배열 업데이트
      const updatedQuestionTypes = surveyData.questionTypes.map(qt =>
        qt.columnIndex === colIdx 
          ? { ...qt, scoreMap: newScoreMap, options: newOptions, displayTexts: newDisplayTexts, responseOrder: newOptions }
          : qt
      );
      
      setSurveyData({
        ...surveyData,
        questions: updatedQuestions,
        questionTypes: updatedQuestionTypes,
        rows: updatedRows, // 변환된 원본 데이터로 업데이트
        headers: surveyData.headers,
        questionRowIndex: surveyData.questionRowIndex,
        title: surveyData.title,
        description: surveyData.description,
        totalResponses: surveyData.totalResponses,
      });
      setShowEditor(false);
    };
    if (normalizedOptions.length === 0) return null;
    return (
      <div className="mt-2">
        <button
          className="px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300 mb-2"
          onClick={() => setShowEditor(v => !v)}
        >
          {showEditor ? '매핑 닫기' : '응답값-점수 매핑 직접 수정'}
        </button>
        {showEditor && (
          <div className="bg-gray-50 p-3 rounded border border-gray-200">
            <div className="mb-2 text-xs text-gray-600">실제 응답값별 점수 매핑을 직접 지정할 수 있습니다.</div>
            <table className="w-full text-sm mb-2">
        <thead>
                <tr className="text-gray-700">
                  <th className="text-left">응답값</th>
                  <th className="text-left">점수</th>
                  <th className="text-left">라벨 텍스트</th>
                  <th className="text-left">기타 응답</th>
          </tr>
        </thead>
        <tbody>
                {normalizedOptions.map(opt => (
                  <tr key={opt}>
                    <td className="py-1 pr-2">{opt}</td>
                    <td>
                      <select
                        className="border rounded px-1 py-0.5 text-xs"
                        value={localScoreMap[opt]?.score}
                        onChange={e => handleScoreChange(opt, Number(e.target.value))}
                        disabled={localScoreMap[opt]?.isOther}
                      >
                        {[5,4,3,2,1].map(score => (
                          <option key={score} value={score}>{score}점</option>
                        ))}
                      </select>
              </td>
                    <td>
                      <input
                        className="border rounded px-1 py-0.5 text-xs w-32"
                        type="text"
                        value={localDisplayTexts[opt] || ''}
                        onChange={e => handleDisplayTextChange(opt, e.target.value)}
                        placeholder="예: 매우 그렇다"
                      />
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={!!localScoreMap[opt]?.isOther}
                        onChange={e => handleOtherChange(opt, e.target.checked)}
                      /> 기타 응답
              </td>
            </tr>
          ))}
        </tbody>
      </table>
            <button
              className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
              onClick={handleSave}
            >
              매핑 저장
            </button>
          </div>
        )}
      </div>
    );
  };

  // MatrixLikertScoreMappingInfo도 동일하게 displayTexts 표시
  const MatrixLikertScoreMappingInfo = ({ question, extraResponses }: { question: Question, extraResponses?: string[] }) => {
    if (!question.options || question.type !== 'likert') return null;
    // options를 항상 string으로 변환 후 trim
    const normalizedOptions = (question.options ?? []).map(opt => String(opt).trim());
    const scoreMap = question.scoreMap || getLikertScoreMap(normalizedOptions);
    const fallbackMap = getLikertScoreMap(normalizedOptions);
    if (!scoreMap && !fallbackMap) return null;
    const etcResponses = (extraResponses || []).filter(
      resp => !(normalizedOptions).some(opt => opt.trim().toLowerCase() === resp.trim().toLowerCase())
    );
    const entries = normalizedOptions.map(opt => {
      const norm = opt.trim().toLowerCase();
      const score = scoreMap?.[norm];
      return { label: opt, norm: norm, score };
    });
    return (
      <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
        <h4 className="font-medium text-gray-700 mb-1">리커트 스코어 매핑:</h4>
        <div className="space-y-1">
          {entries.map((entry, idx) => {
            const { label, norm, score } = entry;
            const displayText = question.displayTexts?.[idx] || '';
            if (typeof score === 'string' && score === '기타') {
              return (
                <div key={label} className="flex items-center gap-2">
                  <span className="text-gray-600">{label}</span>
                  <span className="text-gray-400">→</span>
                  <span className="font-medium text-gray-400">기타 응답</span>
                  {displayText && <span className="text-gray-500 text-xs">({displayText})</span>}
                </div>
              );
            }
            const fallback = (fallbackMap && fallbackMap[norm]) ?? 3;
      return (
              <div key={label} className="flex items-center gap-2">
                <span className="text-gray-600">{label}</span>
                <span className="text-gray-400">→</span>
                <span className="font-medium text-blue-600">
                  {typeof score === 'number' ? score : fallback}점
                </span>
                {displayText && <span className="text-gray-500 text-xs">({displayText})</span>}
              </div>
            );
          })}
          {etcResponses.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-gray-600">기타 응답</span>
              <span className="text-gray-400">→</span>
              <span className="font-medium text-gray-400">-</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const MatrixLikertScoreMappingEditor = ({ group }: { group: MatrixGroup }) => {
    const { surveyData, setSurveyData } = useSurveyStore();
    const [localScoreMap, setLocalScoreMap] = useState<Record<string, { score: number, isOther: boolean }>>({});
    const [localDisplayTexts, setLocalDisplayTexts] = useState<Record<string, string>>({});
    const [showEditor, setShowEditor] = useState(false);
    const question = group.questions[0];
    const options = question.options ?? [];
    
    // 디폴트 리커트 텍스트 - 점수 순서(5점→1점)에 맞게
    const getDefaultLikertTexts = (options: string[]) => {
      if (options.length === 5) {
        return ['매우 그렇다', '그렇다', '보통', '그렇지 않다', '전혀 그렇지 않다'];
      } else if (options.length === 4) {
        return ['매우 그렇다', '그렇다', '그렇지 않다', '전혀 그렇지 않다'];
      } else if (options.length === 3) {
        return ['그렇다', '보통', '그렇지 않다'];
      }
      return options.map(() => '');
    };
    
    useEffect(() => {
      const initialMap: Record<string, { score: number, isOther: boolean }> = {};
      const likertMap = getLikertScoreMap(options);
      options.forEach(opt => {
        const normOpt = opt.trim().toLowerCase();
        let scoreRaw = question.scoreMap ? question.scoreMap[normOpt] : undefined;
        let score: number = 3;
        let isOther = false;
        if (typeof scoreRaw === 'number') {
          score = scoreRaw;
          isOther = false;
        } else if (scoreRaw === '기타') {
          score = 3;
          isOther = true;
        } else if (likertMap && typeof likertMap[normOpt] === 'number') {
          score = likertMap[normOpt];
          isOther = false;
        }
        initialMap[opt] = { score, isOther };
      });
      setLocalScoreMap(initialMap);
      
      // displayTexts 초기화 - 점수 순서에 맞게 정렬하여 매핑
      const displayTextsInit: Record<string, string> = {};
      const defaultTexts = getDefaultLikertTexts(options);
      
      // 점수 순서로 정렬된 옵션 생성 (5점→1점)
      const sortedOptions = [...options].sort((a, b) => {
        const scoreA = initialMap[a]?.score || 3;
        const scoreB = initialMap[b]?.score || 3;
        return scoreB - scoreA; // 내림차순 (5점→1점)
      });
      
      // 기존 displayTexts가 있으면 사용, 없으면 디폴트 텍스트 사용
      if (question.displayTexts && question.displayTexts.length > 0) {
        // 기존 displayTexts를 점수 순서에 맞게 매핑
        sortedOptions.forEach((opt, idx) => {
          displayTextsInit[opt] = question.displayTexts![idx] || defaultTexts[idx] || '';
        });
      } else {
        // 디폴트 텍스트 사용
        sortedOptions.forEach((opt, idx) => {
          displayTextsInit[opt] = defaultTexts[idx] || '';
        });
      }
      
      setLocalDisplayTexts(displayTextsInit);
      // eslint-disable-next-line
    }, [question.id, showEditor]);
    
    const handleScoreChange = (opt: string, score: number) => {
      setLocalScoreMap(prev => ({ ...prev, [opt]: { ...prev[opt], score } }));
    };
    const handleOtherChange = (opt: string, checked: boolean) => {
      setLocalScoreMap(prev => ({ ...prev, [opt]: { ...prev[opt], isOther: checked } }));
    };
    const handleDisplayTextChange = (opt: string, value: string) => {
      setLocalDisplayTexts(prev => ({ ...prev, [opt]: value }));
    };
    const handleSave = () => {
      const entries = Object.entries(localScoreMap);
      const sortedEntries = [
        ...entries.filter(([_, v]) => !v.isOther).sort((a, b) => b[1].score - a[1].score),
        ...entries.filter(([_, v]) => v.isOther)
      ];
      
      const newScoreMap: Record<string, any> = {};
      const newOptions: string[] = []; // 점수 순으로 정렬된 응답값 (e.g., 5, 4, 3...)
      const textToScoreMap: Record<string, string> = {}; // 원본 텍스트 -> 점수 매핑

      sortedEntries.forEach(([opt, { score, isOther }]) => {
        const scoreStr = String(score);
        newOptions.push(scoreStr);
        newScoreMap[scoreStr] = score;
        if(isOther) newScoreMap[scoreStr] = '기타';
        textToScoreMap[opt] = scoreStr;
      });

      if (!surveyData) return;
      // displayTexts는 점수 순 정렬(5→1)에 맞춰, 원본 응답값에 대응하는 텍스트를 추출
      const newDisplayTexts: string[] = sortedEntries.map(([opt]) => localDisplayTexts[opt] || '');
      console.log('[DEBUG] LikertScoreMappingEditor - newDisplayTexts:', newDisplayTexts);
      console.log('[DEBUG] LikertScoreMappingEditor - sortedEntries:', sortedEntries);
      console.log('[DEBUG] LikertScoreMappingEditor - localDisplayTexts:', localDisplayTexts);
      
      const colIdxs = group.questions.map(q => parseInt(q.id.replace(/\D/g, '')));

      // 1. 원본 데이터(rows)의 응답값을 새로운 점수 체계에 맞게 변환
      const updatedRows = surveyData.rows.map(row => {
        const newRow = [...row];
        let changed = false;
        colIdxs.forEach(colIdx => {
          const originalValue = String(row[colIdx] || '').trim();
          const mappedValue = textToScoreMap[originalValue];
          if (mappedValue !== undefined) {
            newRow[colIdx] = mappedValue;
            changed = true;
          }
        });
        return changed ? newRow : row;
      });
      
      // 2. questions 배열 업데이트
      const updatedQuestions = surveyData.questions.map(q =>
        group.questions.some(gq => gq.id === q.id)
          ? { ...q, scoreMap: newScoreMap, options: newOptions, displayTexts: newDisplayTexts }
          : q
      );
      
      // 3. questionTypes 배열 업데이트
      const updatedQuestionTypes = surveyData.questionTypes.map(qt =>
        colIdxs.includes(qt.columnIndex)
          ? { ...qt, scoreMap: newScoreMap, options: newOptions, displayTexts: newDisplayTexts, responseOrder: newOptions }
          : qt
      );
      
      setSurveyData({
        ...surveyData,
        questions: updatedQuestions,
        questionTypes: updatedQuestionTypes,
        rows: updatedRows, // 변환된 원본 데이터로 업데이트
        matrixGroups: (surveyData.matrixGroups || []).map(g =>
          g.id === group.id
            ? { ...g, scoreMap: newScoreMap, options: newOptions, displayTexts: newDisplayTexts }
            : g
        ),
        headers: surveyData.headers,
        questionRowIndex: surveyData.questionRowIndex,
        title: surveyData.title,
        description: surveyData.description,
        totalResponses: surveyData.totalResponses,
      });
      setShowEditor(false);
    };
    if (options.length === 0) return null;
    return (
      <div className="mt-2">
        <button
          className="px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300 mb-2"
          onClick={() => setShowEditor(v => !v)}
        >
          {showEditor ? '매핑 닫기' : '응답값-점수 매핑 직접 수정'}
        </button>
        {showEditor && (
          <div className="bg-gray-50 p-3 rounded border border-gray-200">
            <div className="mb-2 text-xs text-gray-600">실제 응답값별 점수 매핑을 직접 지정할 수 있습니다.</div>
            <table className="w-full text-sm mb-2">
              <thead>
                <tr className="text-gray-700">
                  <th className="text-left">응답값</th>
                  <th className="text-left">점수</th>
                  <th className="text-left">라벨 텍스트</th>
                  <th className="text-left">기타 응답</th>
                </tr>
              </thead>
              <tbody>
                {options.map(opt => (
                  <tr key={opt}>
                    <td className="py-1 pr-2">{opt}</td>
                    <td>
            <select
                        className="border rounded px-1 py-0.5 text-xs"
                        value={localScoreMap[opt]?.score}
                        onChange={e => handleScoreChange(opt, Number(e.target.value))}
                        disabled={localScoreMap[opt]?.isOther}
                      >
                        {[5,4,3,2,1].map(score => (
                          <option key={score} value={score}>{score}점</option>
              ))}
            </select>
                    </td>
                    <td>
                      <input
                        className="border rounded px-1 py-0.5 text-xs w-32"
                        type="text"
                        value={localDisplayTexts[opt] || ''}
                        onChange={e => handleDisplayTextChange(opt, e.target.value)}
                        placeholder="예: 매우 그렇다"
                      />
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={!!localScoreMap[opt]?.isOther}
                        onChange={e => handleOtherChange(opt, e.target.checked)}
                      /> 기타 응답
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
              onClick={handleSave}
            >
              매핑 저장
            </button>
          </div>
        )}
          </div>
    );
  };

  // 응답 옵션을 표시하는 컴포넌트
  const ResponseOptions = ({ question }: { question: Question }) => {
    if (!question.options || question.options.length === 0) return null;

    // 복수응답의 경우 기타응답 구분
    if (question.type === 'multiple_select') {
      const questionType = surveyData?.questionTypes.find(
        (qt) => qt.columnIndex === parseInt(question.id.substring(1))
      );
      const otherResponses = questionType?.otherResponses || [];
      const mainOptions = question.options.filter(opt => !otherResponses.includes(opt));

      return (
        <div className="mt-1 text-sm">
          <div>
            <span className="font-medium text-gray-700">주요 응답: </span>
            <div className="mt-1 flex flex-wrap gap-1">
              {mainOptions.map((option: string, index: number) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {option}
              </span>
            ))}
            </div>
          </div>
          {otherResponses.length > 0 && (
            <div className="mt-2">
              <span className="font-medium text-gray-700">기타 응답: </span>
              <div className="mt-1">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                  {otherResponses.length}건
                  </span>
              </div>
            </div>
          )}
        </div>
      );
    }

      return (
      <div className="mt-1 text-sm">
        <span className="font-medium text-gray-700">응답 옵션: </span>
        <div className="mt-1 flex flex-wrap gap-1">
          {(question.options ?? []).map((option: string, index: number) => (
            <span
              key={index}
              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
            >
              {option}
                  </span>
                ))}
              </div>
        {question.type === 'likert' && (
          <MatrixLikertScoreMappingInfo
            question={{ ...question, type: 'likert' }}
            extraResponses={Array.isArray(question.responses) ? question.responses : []}
          />
        )}
        {question.type === 'likert' && <LikertScoreMappingEditor question={question} />}
      </div>
    );
  };

  // 행렬형 문항 그룹의 응답 옵션을 표시하는 컴포넌트
  const MatrixResponseOptions = ({ group }: { group: MatrixGroup }) => {
    // 대표 소문항의 options가 없으면 기본값으로 대체
    const defaultLikertOptions = ['매우 만족', '만족', '보통', '불만족', '매우 불만족'];
    const options = (group.questions[0]?.options && group.questions[0].options.length > 0)
      ? group.questions[0].options
      : defaultLikertOptions;

    return (
      <div className="mt-1 text-sm">
        <span className="font-medium text-gray-700">응답 옵션: </span>
        <div className="mt-1 flex flex-wrap gap-1">
          {options.map((option: string, index: number) => (
            <span
              key={index}
              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
            >
              {option}
                      </span>
                    ))}
                  </div>
        <div className="mt-4">
          <MatrixLikertScoreMappingInfo
            question={{ ...group.questions[0], options }}
            extraResponses={Array.isArray(group.questions[0].responses) ? group.questions[0].responses : []}
          />
          <MatrixLikertScoreMappingEditor group={group} />
        </div>
        {/* 소문항 리스트는 그대로 */}
      </div>
    );
  };

  const renderQuestionList = (questions: Question[], title: string, type: QuestionTypeValue) => {
    if (questions.length === 0) return null;
    const colors = typeColors[type];
    // 헤더 정보 접근
    const headers = surveyData?.headers;
    const questionRowIndex = surveyData?.questionRowIndex;

    return (
      <div className="mb-8">
        <h2 className={`text-xl font-semibold mb-4 ${colors.title}`}>{title}</h2>
        <div className={`bg-white rounded-lg shadow p-6 ${colors.border} border-2`}>
          <div className="space-y-6">
            {questions.map(question => {
              // question.id에서 인덱스 추출 (예: q3 -> 3)
              let colIdx = -1;
              if (question.id && question.id.startsWith('q')) {
                const idx = parseInt(question.id.substring(1));
                if (!isNaN(idx)) colIdx = idx;
              }
              const header = (typeof questionRowIndex === 'number' && questionRowIndex > 0 && headers && headers[colIdx]) ? headers[colIdx] : null;
              console.log(question.type);
              return (
                <div key={question.id} className="flex items-start justify-between">
                  <div className="flex-1">
                    {header && (
                      <div className="text-xs text-gray-500 mb-0.5">[{header}]</div>
                    )}
                    <p className={`${colors.text}`}>{question.text}</p>
                    <ResponseOptions question={question} />
                  </div>
                  <div className="ml-4">
                    <QuestionTypeSelector
                      questionType={question.type}
                      onTypeChange={(type) => handleQuestionTypeChange(question.id, type)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  if (!surveyData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            문항 유형 검토
          </h1>
          <p className="text-lg text-gray-600">
            각 문항의 유형을 확인하고 필요한 경우 수정하세요
          </p>
        <button
            onClick={handleContinue}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-base font-semibold shadow"
        >
            분석 페이지로 이동
        </button>
      </div>

        {matrixQuestions.length > 0 && (
          <div className="mb-8">
            <h2 className={`text-xl font-semibold mb-4 ${typeColors.matrix.title}`}>행렬형 문항</h2>
        <div className="space-y-6">
              {matrixQuestions.map(group => (
                <div key={group.id} className={`bg-white rounded-lg shadow p-6 ${typeColors.matrix.border} border-2`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className={`text-lg font-medium ${typeColors.matrix.text}`}>{group.title}</h3>
                    <select
                      className="ml-2 border rounded px-2 py-1 text-sm"
                      defaultValue=""
                      onChange={e => {
                        const val = e.target.value as QuestionTypeValue;
                        if (val) handleMatrixGroupTypeChange(group.id, val);
                      }}
                    >
                      <option value="">세트 전체 유형 변경</option>
                      <option value="multiple">객관식</option>
                      <option value="multiple_select">복수응답</option>
                      <option value="likert">리커트</option>
                      <option value="open">주관식</option>
                    </select>
                  </div>
                  <MatrixResponseOptions group={group} />
                  <div className="mt-4 space-y-4">
                    {group.questions.map(question => {
                      // question.id에서 인덱스 추출 (예: q3 -> 3)
                      let colIdx = -1;
                      if (question.id && question.id.startsWith('q')) {
                        const idx = parseInt(question.id.substring(1));
                        if (!isNaN(idx)) colIdx = idx;
                      }
                      const header = (typeof surveyData?.questionRowIndex === 'number' && surveyData?.questionRowIndex > 0 && surveyData?.headers && surveyData?.headers[colIdx]) ? surveyData.headers[colIdx] : null;
                      console.log(question.type);
                      return (
                        <div key={question.id} className="flex items-center justify-between">
                          <div className="flex-1">
                            {header && (
                              <div className="text-xs text-gray-500 mb-0.5">[{header}]</div>
                            )}
                            <p className={typeColors.matrix.text}>{question.text}</p>
                          </div>
                          <div className="ml-4">
                            <QuestionTypeSelector
                              questionType={question.type}
                              onTypeChange={(type) => handleMatrixQuestionTypeChange(group.id, question.id, type)}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {renderQuestionList(multipleQuestions, '객관식 문항', 'multiple')}
        {renderQuestionList(likertQuestions, '리커트 문항', 'likert')}
        {renderQuestionList(multipleSelectQuestions, '복수응답 문항', 'multiple_select')}
        {renderQuestionList(openQuestions, '주관식 문항', 'open')}
      </div>
    </div>
  );
};

export default QuestionTypePage; 