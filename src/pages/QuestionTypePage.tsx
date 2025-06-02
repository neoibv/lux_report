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
  function getLikertScoreMap(options: string[] | undefined): Record<string, number> | undefined {
    if (!options || options.length !== 5) return undefined;
    return options.reduce((acc, opt, idx) => {
      acc[opt.trim().toLowerCase()] = 5 - idx;
      return acc;
    }, {} as Record<string, number>);
  }

  // 리커트 응답값 매핑 함수
  function mapToLikertScale(response: string, scoreMap: Record<string, number>): string {
    const normalizedResponse = response.trim().toLowerCase();
    const score = scoreMap[normalizedResponse];
    
    // 기존 응답값이 scoreMap에 없는 경우, 가장 가까운 값으로 매핑
    if (score === undefined) {
      const likertScales = ['매우 그렇다', '그렇다', '보통이다', '아니다', '전혀 아니다'];
      // 응답값과 각 리커트 스케일 간의 유사도 계산
      const similarities = likertScales.map(scale => ({
        scale,
        similarity: calculateSimilarity(normalizedResponse, scale)
      }));
      // 가장 유사한 스케일 선택
      const mostSimilar = similarities.reduce((a, b) => 
        a.similarity > b.similarity ? a : b
      );
      return mostSimilar.scale;
    }
    
    // scoreMap에 있는 경우 해당하는 리커트 스케일 반환
    const likertScales = ['매우 그렇다', '그렇다', '보통이다', '아니다', '전혀 아니다'];
    return likertScales[5 - score - 1];
  }

  // 문자열 유사도 계산 함수 (Levenshtein 거리 기반)
  function calculateSimilarity(str1: string, str2: string): number {
    const track = Array(str2.length + 1).fill(null).map(() =>
      Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i += 1) {
      track[0][i] = i;
    }
    for (let j = 0; j <= str2.length; j += 1) {
      track[j][0] = j;
    }

    for (let j = 1; j <= str2.length; j += 1) {
      for (let i = 1; i <= str1.length; i += 1) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        track[j][i] = Math.min(
          track[j][i - 1] + 1,
          track[j - 1][i] + 1,
          track[j - 1][i - 1] + indicator
        );
      }
    }

    const maxLength = Math.max(str1.length, str2.length);
    return 1 - (track[str2.length][str1.length] / maxLength);
  }

  const handleQuestionTypeChange = (questionId: string, newType: QuestionTypeValue) => {
    if (!surveyData) return;

    const updatedQuestions = surveyData.questions.map(q => {
      if (q.id !== questionId) return q;
      
      // 리커트로 변경 시 scoreMap 자동 생성 및 응답값 매핑
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
        return { ...q, type: newType, scoreMap };
      }
      
      // scoreMap이 있으면 제거(리커트에서 다른 유형으로 변경)
      if ('scoreMap' in q && q.scoreMap) {
        const { scoreMap, ...rest } = q;
        return { ...rest, type: newType };
      }
      return { ...q, type: newType };
    });

    setSurveyData({
      ...surveyData,
      questions: updatedQuestions,
      matrixGroups: (surveyData.matrixGroups || []).map(group => ({
        ...group,
        questions: group.questions.map(gq =>
          updatedQuestions.find(q => q.id === gq.id) || gq
        )
      })),
      headers: surveyData ? surveyData.headers ?? [] : [],
      rows: surveyData ? surveyData.rows ?? [] : [],
      questionTypes: surveyData ? surveyData.questionTypes ?? [] : [],
      questionRowIndex: surveyData ? surveyData.questionRowIndex ?? 0 : 0,
      title: surveyData ? surveyData.title ?? '' : '',
      description: surveyData ? surveyData.description ?? '' : '',
      totalResponses: surveyData ? surveyData.totalResponses ?? 0 : 0,
    });
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
    const scoreMap = question.scoreMap || getLikertScoreMap(question.options);
    const fallbackMap = getLikertScoreMap(question.options);
    if (!scoreMap && !fallbackMap) return null;
    // 기타 응답 추출: options에 없는 실제 응답값
    const etcResponses = (extraResponses || []).filter(
      resp => !(question.options ?? []).some(opt => opt.trim().toLowerCase() === resp.trim().toLowerCase())
    );
    // options 전체 기준으로 매핑 표시
    const entries = (question.options ?? []).map(opt => {
      const normOpt = opt.trim().toLowerCase();
      const score = scoreMap?.[normOpt];
      return { label: opt, norm: normOpt, score };
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
    const { surveyData, setSurveyData } = useSurveyStore();
    const [localScoreMap, setLocalScoreMap] = useState<Record<string, { score: number, isOther: boolean }>>({});
    const [showEditor, setShowEditor] = useState(false);
    const options = question.options ?? [];
    // 기타응답 추출용 uniqueResponses
    const questionType = surveyData?.questionTypes.find(
      qt => qt.columnIndex === parseInt(question.id.substring(1))
    );
    let uniqueResponses: string[] = Array.from(
      new Set((questionType?.responses || []).map((r: string) => r.trim()))
    );
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
      // eslint-disable-next-line
    }, [question.id, showEditor]);
    const handleScoreChange = (opt: string, score: number) => {
      setLocalScoreMap(prev => ({ ...prev, [opt]: { ...prev[opt], score } }));
    };
    const handleOtherChange = (opt: string, checked: boolean) => {
      setLocalScoreMap(prev => ({ ...prev, [opt]: { ...prev[opt], isOther: checked } }));
    };
    const handleSave = () => {
      const entries = Object.entries(localScoreMap);
      const sortedEntries = [
        ...entries.filter(([_, v]) => !v.isOther).sort((a, b) => b[1].score - a[1].score),
        ...entries.filter(([_, v]) => v.isOther)
      ];
      const newScoreMap: Record<string, any> = {};
      const newOptions: string[] = [];
      sortedEntries.forEach(([opt, { score, isOther }]) => {
        const norm = opt.trim().toLowerCase();
        newScoreMap[norm] = isOther ? '기타' : score;
        newOptions.push(opt);
      });
      if (!surveyData) return;
      const updatedQuestions = surveyData.questions.map(q =>
        q.id === question.id ? { ...q, scoreMap: newScoreMap, options: newOptions } : q
      );
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

  // MatrixLikertScoreMappingInfo/Editor도 동일하게 options 전체 기준으로 매핑/에디터 표시/저장
  const MatrixLikertScoreMappingInfo = ({ question, extraResponses }: { question: Question, extraResponses?: string[] }) => {
    if (!question.options) return null;
    const scoreMap = question.scoreMap || getLikertScoreMap(question.options);
    const fallbackMap = getLikertScoreMap(question.options);
    if (!scoreMap && !fallbackMap) return null;
    const etcResponses = (extraResponses || []).filter(
      resp => !(question.options ?? []).some(opt => opt.trim().toLowerCase() === resp.trim().toLowerCase())
    );
    const entries = (question.options ?? []).map(opt => {
      const normOpt = opt.trim().toLowerCase();
      const score = scoreMap?.[normOpt];
      return { label: opt, norm: normOpt, score };
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

  const MatrixLikertScoreMappingEditor = ({ group }: { group: MatrixGroup }) => {
    const { surveyData, setSurveyData } = useSurveyStore();
    const [localScoreMap, setLocalScoreMap] = useState<Record<string, { score: number, isOther: boolean }>>({});
    const [showEditor, setShowEditor] = useState(false);
    const question = group.questions[0];
    const options = question.options ?? [];
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
      // eslint-disable-next-line
    }, [question.id, showEditor]);
    const handleScoreChange = (opt: string, score: number) => {
      setLocalScoreMap(prev => ({ ...prev, [opt]: { ...prev[opt], score } }));
    };
    const handleOtherChange = (opt: string, checked: boolean) => {
      setLocalScoreMap(prev => ({ ...prev, [opt]: { ...prev[opt], isOther: checked } }));
    };
    const handleSave = () => {
      const entries = Object.entries(localScoreMap);
      const sortedEntries = [
        ...entries.filter(([_, v]) => !v.isOther).sort((a, b) => b[1].score - a[1].score),
        ...entries.filter(([_, v]) => v.isOther)
      ];
      const newScoreMap: Record<string, any> = {};
      const newOptions: string[] = [];
      sortedEntries.forEach(([opt, { score, isOther }]) => {
        const norm = opt.trim().toLowerCase();
        newScoreMap[norm] = isOther ? '기타' : score;
        newOptions.push(opt);
      });
      if (!surveyData) return;
      // 세트 내 모든 소문항에 일괄 적용
      const updatedQuestions = surveyData.questions.map(q =>
        group.questions.some(gq => gq.id === q.id)
          ? { ...q, scoreMap: newScoreMap, options: newOptions }
          : q
      );
      setSurveyData({
        ...surveyData,
        questions: updatedQuestions,
        matrixGroups: (surveyData.matrixGroups || []).map(g =>
          g.id === group.id
            ? { ...g, questions: g.questions.map(gq => ({ ...gq, scoreMap: newScoreMap, options: newOptions })) }
            : g
        ),
        headers: surveyData ? surveyData.headers ?? [] : [],
        rows: surveyData ? surveyData.rows ?? [] : [],
        questionTypes: surveyData ? surveyData.questionTypes ?? [] : [],
        questionRowIndex: surveyData ? surveyData.questionRowIndex ?? 0 : 0,
        title: surveyData ? surveyData.title ?? '' : '',
        description: surveyData ? surveyData.description ?? '' : '',
        totalResponses: surveyData ? surveyData.totalResponses ?? 0 : 0,
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