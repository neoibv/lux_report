import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useSurveyStore from '../store/surveyStore';
import { QuestionType } from '../types/surveyTypes';
import { LIKERT_SCALES } from '../utils/fileParser';
import { DragDropContext, Droppable, Draggable, DropResult, DroppableProvided, DraggableProvided } from 'react-beautiful-dnd';

const QuestionTypePage: React.FC = () => {
  const { surveyData, setSurveyData } = useSurveyStore();
  const [questionTypes, setQuestionTypes] = useState<QuestionType[]>([]);
  const [responseOrders, setResponseOrders] = useState<Record<number, { response: string, isOther: boolean }[]>>({});
  const navigate = useNavigate();

  useEffect(() => {
    if (
      surveyData &&
      Object.keys(responseOrders).length === 0 &&
      surveyData.questionTypes.some(
        qt => (qt.type === 'likert' || qt.type === 'matrix') && (!((qt as any).responseOrder) || !((qt as any).scores) || !((qt as any).scoreMap))
      )
    ) {
      // 모든 문항에 대해 responseOrder, scores, scoreMap, otherResponses를 초기화
      const initializedTypes = surveyData.questionTypes.map(qt => {
        if (qt.type === 'likert' || qt.type === 'matrix') {
          const scale = qt.scale || 'satisfaction_5' as 'satisfaction_5';
          const likertResponses = LIKERT_SCALES[scale].responses;
          const likertScores = LIKERT_SCALES[scale].scores;
          const responseCount = new Map<string, number>();
          const otherResponsesSet = new Set<string>();
          surveyData.rows.forEach((row: any) => {
            const value = row[qt.columnIndex];
            if (typeof value === 'string' && value.trim() !== '') {
              if (likertResponses.includes(value)) {
                responseCount.set(value, (responseCount.get(value) || 0) + 1);
              } else {
                otherResponsesSet.add(value);
              }
            }
          });
          const otherResponses = Array.from(otherResponsesSet);
          const orderedResponses = likertResponses
            .filter(response => responseCount.has(response))
            .sort((a, b) => {
              const countA = responseCount.get(a) || 0;
              const countB = responseCount.get(b) || 0;
              return countB - countA;
            });
          const allResponses = [...orderedResponses, ...otherResponses];
          const scores = allResponses.map(resp => {
            const idx = likertResponses.indexOf(resp);
            return idx !== -1 ? likertScores[idx] : -1;
          });
          const scoreMap = Object.fromEntries(
            allResponses.map(resp => {
              const idx = likertResponses.indexOf(resp);
              return [resp, idx !== -1 ? likertScores[idx] : -1];
            })
          );
          return {
            ...qt,
            scale,
            options: likertResponses,
            otherResponses,
            responseOrder: allResponses,
            scores,
            scoreMap
          };
        }
        return qt;
      });
      setQuestionTypes(initializedTypes);
      setSurveyData({ ...surveyData, questionTypes: initializedTypes });
      // 기존 응답 순서도 초기화
      const initialOrders: Record<number, { response: string, isOther: boolean }[]> = {};
      initializedTypes.forEach(qt => {
        if (qt.type === 'likert' || qt.type === 'matrix') {
          initialOrders[qt.columnIndex] = getRepresentativeResponses(qt.columnIndex, qt.type);
        }
      });
      setResponseOrders(initialOrders);
    }
  }, [surveyData]);

  const handleTypeChange = (columnIndex: number, newType: QuestionType['type']) => {
    console.log('[디버그] handleTypeChange 호출됨', columnIndex, newType);
    const updatedTypes = questionTypes.map(qt => {
      if (qt.columnIndex === columnIndex) {
        if (newType === 'likert' || newType === 'matrix') {
          // 리커트 응답만 필터링하여 순서대로 정렬
          const scale = qt.scale || 'satisfaction_5' as 'satisfaction_5';
          const likertResponses = LIKERT_SCALES[scale].responses;
          const likertScores = LIKERT_SCALES[scale].scores;
          const responseCount = new Map<string, number>();
          const otherResponsesSet = new Set<string>();

          // 실제 응답 데이터에서 빈도수 계산
          surveyData?.rows.forEach((row: any) => {
            const value = row[columnIndex];
            if (typeof value === 'string' && value.trim() !== '') {
              if (likertResponses.includes(value)) {
                responseCount.set(value, (responseCount.get(value) || 0) + 1);
              } else {
                otherResponsesSet.add(value);
              }
            }
          });

          // 리커트 응답만 필터링하여 순서대로 정렬
          const orderedResponses = likertResponses
            .filter(response => responseCount.has(response))
            .sort((a, b) => {
              const countA = responseCount.get(a) || 0;
              const countB = responseCount.get(b) || 0;
              return countB - countA;
            });

          // 점수 배열 및 scoreMap 생성
          const otherResponses = Array.from(otherResponsesSet);
          const allResponses = [...orderedResponses, ...otherResponses];
          const scores = allResponses.map(resp => {
            const idx = likertResponses.indexOf(resp);
            return idx !== -1 ? likertScores[idx] : -1;
          });
          const scoreMap = Object.fromEntries(
            allResponses.map(resp => {
              const idx = likertResponses.indexOf(resp);
              return [resp, idx !== -1 ? likertScores[idx] : -1];
            })
          );

          return {
            ...qt,
            type: newType,
            scale,
            options: likertResponses,
            otherResponses,
            responseOrder: allResponses,
            scores,
            scoreMap
          };
        }
        return { ...qt, type: newType };
      }
      return qt;
    });
    
    setQuestionTypes(updatedTypes);
    if (surveyData) {
      setSurveyData({
        ...surveyData,
        questionTypes: updatedTypes
      });
      // [검증1] setSurveyData 직후 로그
      console.log('[검증1] setSurveyData 직후 surveyData.questionTypes:', updatedTypes);
    }
  };

  // 문자열 유사도 계산 함수
  const calculateSimilarity = (str1: string, str2: string): number => {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();
    
    // 정확히 일치
    if (s1 === s2) return 1;
    
    // 부분 문자열 포함
    if (s1.includes(s2) || s2.includes(s1)) return 0.8;
    
    // 공통 단어 수 계산
    const words1 = new Set(s1.split(/\s+/));
    const words2 = new Set(s2.split(/\s+/));
    const commonWords = new Set([...words1].filter(x => words2.has(x)));
    
    if (commonWords.size > 0) {
      return 0.5 + (commonWords.size / Math.max(words1.size, words2.size)) * 0.3;
    }
    
    return 0;
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const columnIndex = Number(result.source.droppableId.split('-')[1]);
    if (isNaN(columnIndex)) return;
    const items = Array.from(responseOrders[columnIndex] || []);

    // normal/other 내 index를 전체 배열 index로 변환
    const getGlobalIndex = (droppableId: string, localIndex: number) => {
      const isOther = droppableId.startsWith('other');
      let count = -1;
      for (let i = 0; i < items.length; i++) {
        if ((items[i].isOther ? 'other' : 'normal') === (isOther ? 'other' : 'normal')) {
          count++;
          if (count === localIndex) return i;
        }
      }
      return -1;
    };

    const sourceGlobalIdx = getGlobalIndex(result.source.droppableId, result.source.index);
    const destGlobalIdx = getGlobalIndex(result.destination.droppableId, result.destination.index);
    if (sourceGlobalIdx === -1 || destGlobalIdx === -1) return;

    const [movedItem] = items.splice(sourceGlobalIdx, 1);
    movedItem.isOther = result.destination.droppableId.startsWith('other');
    items.splice(destGlobalIdx, 0, movedItem);

    setResponseOrders(prev => ({ ...prev, [columnIndex]: items }));
    // surveyStore 업데이트
    const updatedTypes = questionTypes.map(qt =>
      qt.columnIndex === columnIndex ? { ...qt, responseOrder: items.map(item => item.response) } : qt
    );
    setQuestionTypes(updatedTypes);
    if (surveyData) {
      setSurveyData({ ...surveyData, questionTypes: updatedTypes });
    }
  };

  // 문항 유형별로 그룹화
  const groupedQuestions = questionTypes.reduce((acc, qt) => {
    const type = qt.type;
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(qt);
    return acc;
  }, {} as Record<QuestionType['type'], QuestionType[]>);

  // 유형별 라벨과 색상 정의
  const typeLabels: Record<QuestionType['type'], string> = {
    likert: '리커트 척도',
    multiple: '객관식',
    open: '주관식',
    matrix: '행렬형',
    multiple_select: '복수 응답'
  };
  const typeColors: Record<QuestionType['type'], string> = {
    likert: 'bg-blue-100 text-blue-800',
    multiple: 'bg-green-100 text-green-800',
    open: 'bg-yellow-100 text-yellow-800',
    matrix: 'bg-purple-100 text-purple-800',
    multiple_select: 'bg-orange-100 text-orange-800'
  };

  // 대표 응답 추출 함수
  const getRepresentativeResponses = (columnIndex: number, type: QuestionType['type']): { response: string, isOther: boolean }[] => {
    if (!surveyData) return [];
    const qt = questionTypes.find(qt => qt.columnIndex === columnIndex);
    if ((type === 'likert' || type === 'matrix') && qt) {
      const scale = qt.scale;
      if (scale && LIKERT_SCALES[scale]) {
        // responseOrder, otherResponses가 있으면 우선 사용
        if (qt.responseOrder && qt.otherResponses) {
          const likertItems = qt.responseOrder
            .filter(resp => !qt.otherResponses!.includes(resp))
            .map(response => ({ response, isOther: false }));
          const otherItems = qt.otherResponses.map(response => ({ response, isOther: true }));
          return [...likertItems, ...otherItems];
        }
        // 없으면 실제 응답 기준으로 리커트 순서대로
        const responses = surveyData.rows
          .map((row: any) => row[columnIndex])
          .filter((value: any): value is string => typeof value === 'string' && value.trim() !== '');
        const likertValid = LIKERT_SCALES[scale].responses.filter(resp => responses.includes(resp));
        const likertItems = likertValid.map(response => ({ response, isOther: false }));
        const otherValid = Array.from(new Set(responses)).filter(resp => !LIKERT_SCALES[scale].responses.includes(resp));
        const otherItems = otherValid.map(response => ({ response, isOther: true }));
        return [...likertItems, ...otherItems];
      }
    }
    // 다른 유형의 경우 빈도수 기반으로 정렬
    const responses = surveyData.rows
      .map((row: any) => row[columnIndex])
      .filter((value: any): value is string => typeof value === 'string' && value.trim() !== '');
    const responseCount = new Map<string, number>();
    responses.forEach((response: string) => {
      responseCount.set(response, (responseCount.get(response) || 0) + 1);
    });
    return Array.from(responseCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([response]) => ({
        response: response,
        isOther: false
      }));
  };

  // 리커트/행렬형 응답 편집 테이블 컴포넌트
  const LikertEditTable: React.FC<{
    columnIndex: number,
    questionTypes: QuestionType[],
    setQuestionTypes: any,
    surveyData: any,
    setSurveyData: any
  }> = ({ columnIndex, questionTypes, setQuestionTypes, surveyData, setSurveyData }) => {
    const question = questionTypes.find(qt => qt.columnIndex === columnIndex);
    const scale = question?.scale;
    const reps = getRepresentativeResponses(columnIndex, question?.type ?? 'likert');
    // LIKERT_SCALES 기준 대표응답/기타응답 분리
    const likertResponses = scale ? LIKERT_SCALES[scale].responses : [];
    const likertScores = scale ? LIKERT_SCALES[scale].scores : [];
    // 실제 응답값만 추출 및 빈도수 계산
    const responses = surveyData?.rows
      .map((row: any) => row[columnIndex])
      .filter((value: any): value is string => typeof value === 'string' && value.trim() !== '') || [];
    const freqMap = new Map<string, number>();
    (responses as string[]).forEach((r: string) => {
      freqMap.set(r, (freqMap.get(r) || 0) + 1);
    });
    // 리커트 기준(5→1점) 순서로 실제 응답이 있는 값만 정렬
    const likertValid = likertResponses.filter(resp => freqMap.has(resp));
    // 점수 자동 할당 (5점~1점)
    const maxScore = 5;
    const normalResponsesData = likertValid.map((resp, idx) => ({
      response: resp,
      isOther: false,
      score: maxScore - idx
    }));
    // 기타응답: 실제 응답 중 리커트 기준에 없는 값
    const otherValid = Array.from(freqMap.keys()).filter(resp => !likertResponses.includes(resp));
    const otherResponsesData = otherValid.map(resp => ({ response: resp, isOther: true, score: '-' }));
    const [normalResponses, setNormalResponses] = useState(normalResponsesData);
    const [otherResponses, setOtherResponses] = useState<{ response: string; isOther: boolean; score: string | number }[]>(otherResponsesData);

    useEffect(() => {
      setNormalResponses(normalResponsesData);
      setOtherResponses(otherResponsesData);
      // eslint-disable-next-line
    }, [JSON.stringify(responses)]);

    // 기타로 이동
    const moveToOther = (idx: number) => {
      const moved = normalResponses[idx];
      setNormalResponses(normalResponses.filter((_, i) => i !== idx));
      setOtherResponses([...otherResponses, { ...moved, isOther: true, score: '-' }]);
      updateStore(normalResponses.filter((_, i) => i !== idx), [...otherResponses, { ...moved, isOther: true, score: '-' }]);
    };
    // 일반으로 이동
    const moveToNormal = (idx: number) => {
      const moved = otherResponses[idx];
      // 리커트 기준 순서에 맞게 삽입
      const insertIdx = likertValid.indexOf(moved.response);
      let newNormal = [...normalResponses];
      if (insertIdx !== -1) {
        newNormal.splice(insertIdx, 0, { ...moved, isOther: false, score: maxScore - insertIdx });
      } else {
        newNormal.push({ ...moved, isOther: false, score: -1 });
      }
      setNormalResponses(newNormal);
      setOtherResponses(otherResponses.filter((_, i) => i !== idx));
      updateStore(newNormal, otherResponses.filter((_, i) => i !== idx));
    };
    // 상태 반영
    const updateStore = (normalArr: any[], otherArr: any[]) => {
      const allArr = [...normalArr, ...otherArr];
      const otherResponses = otherArr.map(r => r.response);
      const responseOrder = allArr.map(r => r.response);
      // 점수 배열 생성 (normalArr만 점수, otherArr은 -1 또는 null)
      const scores = allArr.map(r => typeof r.score === 'number' ? r.score : -1);
      // scoreMap 생성
      const scoreMap = Object.fromEntries(allArr.map(r => [r.response, typeof r.score === 'number' ? r.score : -1]));
      const updatedTypes = questionTypes.map(qt =>
        qt.columnIndex === columnIndex
          ? { ...qt, otherResponses, responseOrder, scores, scoreMap }
          : qt
      );
      setQuestionTypes(updatedTypes);
      if (surveyData) {
        setSurveyData({ ...surveyData, questionTypes: updatedTypes });
      }
    };
    return (
      <table className="w-full text-xs border mt-2 mb-2">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-1">점수</th>
            <th className="p-1">응답 내용</th>
            <th className="p-1">기타응답</th>
            <th className="p-1">이동</th>
          </tr>
        </thead>
        <tbody>
          {normalResponses.map((r, idx) => (
            <tr key={r.response}>
              <td className="text-center">{r.score === -1 ? '-' : r.score}</td>
              <td>{r.response}</td>
              <td className="text-center">❌</td>
              <td className="text-center">
                <button onClick={() => moveToOther(idx)}>기타로</button>
              </td>
            </tr>
          ))}
          {otherResponses.map((r, idx) => (
            <tr key={r.response} className="bg-gray-50">
              <td className="text-center">-</td>
              <td>{r.response}</td>
              <td className="text-center">✅</td>
              <td className="text-center">
                <button onClick={() => moveToNormal(idx)}>일반으로</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  // 행렬형 문항 렌더링
  const renderMatrixQuestions = (questions: QuestionType[]) => {
    const groups = new Map<number, QuestionType[]>();
    questions.forEach(qt => {
      if (qt.matrixGroupId !== undefined) {
        if (!groups.has(qt.matrixGroupId)) {
          groups.set(qt.matrixGroupId, []);
        }
        groups.get(qt.matrixGroupId)?.push(qt);
      }
    });
    return Array.from(groups.entries()).map(([groupId, groupQuestions]) => {
      const firstQuestion = groupQuestions[0];
      const reps = getRepresentativeResponses(firstQuestion.columnIndex, firstQuestion.type);
      const normalResponses = reps.filter(item => !item.isOther);
      const otherResponses = reps.filter(item => item.isOther);
      return (
        <div key={groupId} className="mb-4 p-3 bg-white rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded text-xs font-medium ${typeColors.matrix}`}>
                {typeLabels.matrix}
              </span>
              <span className="text-xs text-gray-500">
                {groupQuestions.length}개 문항
              </span>
            </div>
            <select
              value={firstQuestion.type}
              onChange={(e) => handleTypeChange(firstQuestion.columnIndex, e.target.value as QuestionType['type'])}
              className="text-xs border rounded px-2 py-1"
            >
              {Object.entries(typeLabels).map(([type, label]) => (
                <option key={type} value={type}>{label}</option>
              ))}
            </select>
          </div>
          <div className="text-sm font-medium mb-1">{firstQuestion.commonPrefix}</div>
          <div className="text-xs text-gray-600 mb-2">
            {firstQuestion.differences?.map((diff: string, idx: number) => (
              <div key={idx} className="ml-4">• {diff}</div>
            ))}
          </div>
          <div className="flex flex-wrap gap-1 p-2 bg-gray-50 rounded min-h-[40px]">
            {reps.map((response, idx) => (
              <span key={idx} className={
                response.isOther
                  ? "text-xs px-2 py-0.5 rounded bg-gray-300 text-gray-700 select-none"
                  : "text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-800 select-none"
              }>
                {response.response}
              </span>
            ))}
          </div>
          {otherResponses.length > 0 && (
            <div className="mt-2">
              <div className="text-xs font-medium text-gray-500 mb-1">기타 응답</div>
              <div className="flex flex-wrap gap-1">
                {otherResponses.map((response, idx) => (
                  <span key={idx} className="text-xs px-2 py-0.5 rounded bg-gray-300 text-gray-700 select-none">
                    {response.response}
                  </span>
                ))}
              </div>
            </div>
          )}
          {firstQuestion.type === 'likert' || firstQuestion.type === 'matrix' && (
            <LikertEditTable columnIndex={firstQuestion.columnIndex} questionTypes={questionTypes} setQuestionTypes={setQuestionTypes} surveyData={surveyData} setSurveyData={setSurveyData} />
          )}
        </div>
      );
    });
  };

  // 일반 문항 렌더링
  const renderRegularQuestions = (questions: QuestionType[], type: QuestionType['type']) => {
    console.log('[디버그] 문항 유형 드롭다운 렌더링', type, type);
    return questions.map(qt => {
      const reps = getRepresentativeResponses(qt.columnIndex, type);
      const normalResponses = reps.filter(item => !item.isOther);
      const otherResponses = reps.filter(item => item.isOther);
      return (
        <div key={qt.columnIndex} className="mb-3 p-3 bg-white rounded-lg shadow">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeColors[type]}`}>
                {typeLabels[type]}
              </span>
              <span className="text-xs text-gray-500">
                {surveyData?.headers[qt.columnIndex]}
              </span>
            </div>
            <select
              value={qt.type}
              onChange={(e) => handleTypeChange(qt.columnIndex, e.target.value as QuestionType['type'])}
              className="text-xs border rounded px-2 py-1"
            >
              {Object.entries(typeLabels).map(([type, label]) => (
                <option key={type} value={type}>{label}</option>
              ))}
            </select>
          </div>
          <div className="text-sm mb-1">{surveyData?.questions[qt.columnIndex]}</div>
          {(type === 'likert' || type === 'matrix') && (
            <>
              <div className="flex flex-wrap gap-1 p-2 bg-gray-50 rounded min-h-[40px]">
                {reps.map((response, idx) => (
                  <span key={idx} className={
                    response.isOther
                      ? "text-xs px-2 py-0.5 rounded bg-gray-300 text-gray-700 select-none"
                      : "text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-800 select-none"
                  }>
                    {response.response}
                  </span>
                ))}
              </div>
              {otherResponses.length > 0 && (
                <div className="mt-2">
                  <div className="text-xs font-medium text-gray-500 mb-1">기타 응답</div>
                  <div className="flex flex-wrap gap-1">
                    {otherResponses.map((response, idx) => (
                      <span key={idx} className="text-xs px-2 py-0.5 rounded bg-gray-300 text-gray-700 select-none">
                        {response.response}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <LikertEditTable columnIndex={qt.columnIndex} questionTypes={questionTypes} setQuestionTypes={setQuestionTypes} surveyData={surveyData} setSurveyData={setSurveyData} />
            </>
          )}
          {type !== 'likert' && type !== 'matrix' && (
            <div className="flex flex-wrap gap-1">
              {normalResponses.map((response, idx) => (
                <span 
                  key={idx} 
                  className={`text-xs px-2 py-0.5 rounded ${
                    response.isOther 
                      ? 'bg-gray-300 text-gray-700' 
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {response.response}
                </span>
              ))}
            </div>
          )}
        </div>
      );
    });
  };

  useEffect(() => {
    console.log('[디버그] useEffect surveyData', surveyData);
    console.log('[디버그] useEffect questionTypes', questionTypes);
  }, [surveyData, questionTypes]);

  if (!surveyData) {
    navigate('/upload');
    return null;
  }

  console.log('[디버그] QuestionTypePage 렌더링', { surveyData, questionTypes });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold">문항 유형 검토</h1>
        <button
          onClick={() => {
            console.log('[검증2] 분석 시작 버튼 클릭 직전 surveyData.questionTypes:', surveyData.questionTypes);
            navigate('/analysis');
          }}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          분석 시작
        </button>
      </div>
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="space-y-6">
          {Object.entries(groupedQuestions).map(([type, questions]) => (
            <div key={type} className="bg-gray-50 p-4 rounded-lg">
              <h2 className="text-lg font-semibold mb-4">
                {typeLabels[type as QuestionType['type']]} ({questions.length}개)
              </h2>
              <div className="space-y-2">
                {type === 'matrix' 
                  ? renderMatrixQuestions(questions as QuestionType[])
                  : renderRegularQuestions(questions as QuestionType[], type as QuestionType['type'])}
              </div>
            </div>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
};

export default QuestionTypePage; 