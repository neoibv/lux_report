import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useSurveyStore from '../store/surveyStore';
import ChartCard from '../components/ChartCard';
import { LIKERT_SCALES, LikertScale } from '../utils/likertScales';
import { ChartType, QuestionType, QuestionTypeValue } from '../types';

// 복수응답 문항의 '_Others'를 '기타'로 묶어 카운팅하는 분석용 데이터 생성 함수
function getProcessedRows(surveyData: any) {
  console.log('getProcessedRows - 입력 데이터:', surveyData);
  if (!surveyData) return [];
  const processedRows = surveyData.rows.map((row: any[]) => [...row]);
  console.log('getProcessedRows - 처리된 행:', processedRows);
  surveyData.questionTypes.forEach((qt: any) => {
    if (qt.type === 'multiple_select') {
      const colIdx = qt.columnIndex;
      processedRows.forEach((prow: any[], i: number) => {
        const cell = prow[colIdx];
        if (typeof cell === 'string') {
          // 복수응답 구분자 '@@'로 분리
          const parts = cell.split('@@').map(s => s.trim());
          // '_Others' 또는 'Others_'가 포함된 응답을 '기타'로 변환
          const mapped = parts.map(p => (p.includes('_Others') || p.startsWith('Others_')) ? '기타' : p);
          prow[colIdx] = mapped.join('@@');
        }
      });
    }
  });
  console.log('getProcessedRows - 최종 처리된 데이터:', processedRows);
  return processedRows;
}

const chartTypes = [
  { value: 'vertical', label: '세로 비율' },
  { value: 'horizontal', label: '가로 비율' },
  { value: 'verticalStacked', label: '세로 전체 누적' },
  { value: 'horizontalStacked', label: '가로 전체 누적' },
  { value: 'pie', label: '원형' },
  { value: 'donut', label: '도넛형' },
  { value: 'verticalMatrix', label: '세로 비율(행렬형)' },
  { value: 'horizontalMatrix', label: '가로 비율(행렬형)' },
];

// 유형별 라벨과 색상 정의 (QuestionTypePage.tsx와 동일하게)
const typeLabels = {
  likert: '리커트 척도',
  multiple: '객관식',
  open: '주관식',
  matrix: '행렬형',
  multiple_select: '복수 응답'
};
const typeColors = {
  likert: 'text-blue-800',
  multiple: 'text-green-800',
  open: 'text-yellow-800',
  matrix: 'text-purple-800',
  multiple_select: 'text-orange-800'
};

// 공통 prefix 찾기
const findCommonPrefix = (strings: string[]) => {
  if (strings.length === 0) return '';
  const first = strings[0];
  let prefix = '';
  for (let i = 0; i < first.length; i++) {
    if (strings.every(s => s[i] === first[i])) {
      prefix += first[i];
    } else {
      break;
    }
  }
  return prefix;
};

const AnalysisPage: React.FC = () => {
  const navigate = useNavigate();
  const { surveyData } = useSurveyStore();
  // [검증3] 분석 페이지 진입 시 로그
  if (surveyData) {
    console.log('[검증3] 분석 페이지 진입 시 surveyData.questionTypes:', surveyData.questionTypes);
  }
  const [search, setSearch] = useState('');
  const [selectedQuestions, setSelectedQuestions] = useState<number[]>([]);
  const [selectedChartType, setSelectedChartType] = useState<ChartType>('vertical');
  const [charts, setCharts] = useState<Array<{
    questionIndex: number;
    chartType: ChartType;
    questionType: QuestionType;
    gridSize: { w: number; h: number };
    data: Array<{ label: string; value: number; isOther?: boolean }>;
    colors?: string[];
    respondentCount: number;
    matrixTitle?: string;
    scoreMap?: Record<string, number>;
    responseOrder?: string[];
    scores?: number[];
    yMax: number;
    avgScore: number;
  }>>([]);

  if (!surveyData) {
    navigate('/upload');
    return null;
  }

  // 분석용 데이터: 복수응답 '_Others'를 '기타'로 변환
  const processedRows = getProcessedRows(surveyData);

  // 문항 필터링(검색)
  const filteredQuestions = surveyData.questions
    .map((q: any, idx: number) => ({ ...q, columnIndex: idx }))
    .filter((q: any) => {
      const qText = q.text || '';
      return qText.toLowerCase().includes(search.toLowerCase());
    });

  // 유형별로 그룹핑 (최신 type 기준)
  const groupedQuestions = filteredQuestions.reduce((acc: Record<string, any[]>, q: any) => {
    const type = q.type || 'multiple';
    if (!acc[type]) acc[type] = [];
    acc[type].push(q);
    return acc;
  }, {});

  // 그래프 생성
  const handleCreateCharts = () => {
    console.log('handleCreateCharts - 시작');
    console.log('handleCreateCharts - surveyData:', surveyData);
    console.log('handleCreateCharts - processedRows:', processedRows);
    console.log('handleCreateCharts - selectedQuestions:', selectedQuestions);
    
    // matrixGroupId별로 그룹핑
    const matrixGroups: Record<number, any[]> = {};
    surveyData.questionTypes?.forEach((qt: any) => {
      if (qt.type === 'matrix' && qt.matrixGroupId !== undefined) {
        if (!matrixGroups[qt.matrixGroupId]) matrixGroups[qt.matrixGroupId] = [];
        matrixGroups[qt.matrixGroupId].push(qt);
      }
    });

    const newCharts: any[] = [];
    const usedMatrixGroups = new Set<string>();

    selectedQuestions.forEach(qIdx => {
      // 항상 surveyData.questions에서 최신 정보 참조
      const q = surveyData.questions[qIdx];
      if (!q) return;
      const qt = { ...q, columnIndex: qIdx };

      // matrix 그룹 처리: type이 'matrix'인 경우에만 세트로 묶음
      if (qt.type === 'matrix' && qt.matrixGroupId !== undefined) {
        if (usedMatrixGroups.has(String(qt.matrixGroupId))) return;
        usedMatrixGroups.add(String(qt.matrixGroupId));
        const groupQs = Object.values(surveyData.questions)
          .filter((qq: any) => String(qq.matrixGroupId) === String(qt.matrixGroupId) && qq.type === 'matrix')
          .map((qq: any) => ({
            ...qq,
            columnIndex: Number(surveyData.questions.findIndex((x: any) => x.id === qq.id)),
            ...(qq.scores ? { scores: qq.scores } : {})
          }));
        // 공통 prefix 추출
        const questionTexts = groupQs.map((q: any) => q.text || '');
        const commonPrefix = findCommonPrefix(questionTexts);
        // 각 소문항별(문항별) 평균점수 계산 및 뒷부분 텍스트 추출
        const averages = groupQs.map((mq: any) => {
          const fullText = mq.text || '';
          const diff = fullText.startsWith(commonPrefix) ? fullText.slice(commonPrefix.length).trim() : fullText;
          const values = processedRows.map((row: any[]) => row[Number(mq.columnIndex)])
            .filter((v: any) => typeof v === 'string' && v.trim() !== '') as string[];
          // 자동 scoreMap 생성
          let scoreMap = mq.scoreMap;
          if (!scoreMap && mq.options && mq.options.length === 5) {
            scoreMap = mq.options.reduce((acc: any, opt: string, idx: number) => {
              acc[opt.trim().toLowerCase()] = 5 - idx;
              return acc;
            }, {});
          }
          let totalScore = 0, totalCount = 0;
          values.forEach(v => {
            const normV = v.trim().toLowerCase();
            if (!scoreMap || scoreMap[normV] === undefined) return; // 기타응답 제외
            const score = scoreMap[normV];
            totalScore += score;
            totalCount += 1;
          });
          if (scoreMap) {
            console.log('matrix scoreMap:', scoreMap);
            console.log('matrix 응답값:', values);
            console.log('matrix 평균점수:', totalCount > 0 ? Math.round((totalScore / totalCount) * 100) / 100 : 0);
          }
          return {
            label: diff,
            value: totalCount > 0 ? Math.round((totalScore / totalCount) * 100) / 100 : 0,
            ...(mq?.scores ? { scores: mq.scores } : {})
          };
        });
        // 응답자 수 계산(첫 소문항 기준)
        const respondentCount = processedRows.filter((row: any[]) => {
          const value = row[Number(groupQs[0].columnIndex)];
          return typeof value === 'string' && value.trim() !== '';
        }).length;
        // ChartCard에 전달 (matrix)
        let avgScore = averages[0].value;
        newCharts.push({
          questionIndex: `matrix_${qt.matrixGroupId}`,
          chartType: selectedChartType,
          questionType: { ...qt, type: 'matrix' },
          gridSize: { w: 1, h: 1 },
          data: averages, // [{label: 소문항, value: 평균점수}]
          respondentCount,
          matrixTitle: commonPrefix, // 제목
          yMax: 5, // y축 최대값
          ...(qt?.scores ? { scores: qt.scores } : {}),
          avgScore: avgScore // matrix는 개별 소문항별로 value에 평균점수 포함, 카드에서 value 사용
        });
        return;
      }

      // 일반 문항 처리 (type이 'matrix'가 아닌 경우, matrixGroupId가 남아있어도 여기로 분기)
      const questionType = (qt?.type || 'multiple') as QuestionTypeValue;
      let chartData: Array<{ label: string; value: number; isOther?: boolean }> = [];
      let respondentCount = 0;
      let responseOrder: string[] | undefined = undefined;
      let scores: number[] | undefined = undefined;
      let avgScore: number | undefined = undefined;

      if (questionType === 'multiple_select') {
        // 복수응답: 옵션별 value 합산, 기타응답 구분, 백분율 내림차순 정렬
        const values = processedRows.map((row: any[]) => row[qIdx])
          .filter((v: any) => typeof v === 'string' && v.trim() !== '') as string[];
        
        // 응답 카운트
        const counts: Record<string, number> = {};
        values.forEach(v => {
          if (v.includes('@@')) {
            v.split('@@').forEach(opt => {
              const trimmedOpt = opt.trim();
              if (trimmedOpt === '기타' || trimmedOpt.includes('_Others') || trimmedOpt.startsWith('Others_')) {
                counts['기타'] = (counts['기타'] || 0) + 1;
              } else {
                counts[trimmedOpt] = (counts[trimmedOpt] || 0) + 1;
              }
            });
          } else {
            if (v === '기타' || v.includes('_Others') || v.startsWith('Others_')) {
              counts['기타'] = (counts['기타'] || 0) + 1;
            } else {
              counts[v] = (counts[v] || 0) + 1;
            }
          }
        });

        // 백분율 계산 및 내림차순 정렬
        const total = Object.values(counts).reduce((sum, val) => sum + val, 0);
        chartData = Object.entries(counts)
          .map(([label, value]) => ({
            label,
            value: Math.round((value / total) * 1000) / 10, // 백분율로 변환
            isOther: label === '기타'
          }))
          .sort((a, b) => b.value - a.value); // 내림차순 정렬

        respondentCount = values.length;
        responseOrder = qt.options;
      } else if (questionType === 'likert') {
        // 리커트: 옵션별 value 합산, scoreMap, 평균점수
        const values = processedRows.map((row: any[]) => row[qIdx])
          .filter((v: any) => typeof v === 'string' && v.trim() !== '') as string[];
        const counts: Record<string, number> = {};
        // 자동 scoreMap 생성
        let scoreMap = qt.scoreMap;
        if (!scoreMap && qt.options && qt.options.length === 5) {
          scoreMap = qt.options.reduce((acc: any, opt: string, idx: number) => {
            acc[opt.trim().toLowerCase()] = 5 - idx;
            return acc;
          }, {});
        }
        values.forEach(v => {
          counts[v] = (counts[v] || 0) + 1;
        });
        // options 전체 기준으로 chartData 생성 (0건도 포함, isOther: false)
        const optionOrder: string[] = qt.options || (scoreMap ? Object.keys(scoreMap) : []);
        chartData = optionOrder.map((label: string) => {
          const normLabel = label.trim().toLowerCase();
          return {
            label,
            value: counts[label] || 0,
            isOther: false
          };
        });
        // 기타응답(실제 응답값 중 options에 없는 값) 별도 추가
        const etcResponses = Object.keys(counts).filter(v => !optionOrder.includes(v));
        etcResponses.forEach(v => {
          chartData.push({
            label: `기타(${v})`,
            value: counts[v],
            isOther: true
          });
        });
        // 평균 계산 (options/scoreMap 기준, 빈 응답값도 포함)
        let totalScore = 0, totalCount = 0;
        optionOrder.forEach(label => {
          const normLabel = label.trim().toLowerCase();
          const score = scoreMap ? scoreMap[normLabel] : undefined;
          const count = counts[label] || 0;
          if (typeof score === 'number') {
            totalScore += score * count;
            totalCount += count;
          }
        });
        avgScore = totalCount > 0 ? Math.round((totalScore / totalCount) * 100) / 100 : 0;
        respondentCount = values.length;
        responseOrder = optionOrder;
        scores = qt.scores;
      } else if (questionType === 'multiple') {
        // 객관식: 옵션별 value 합산
        const values = processedRows.map((row: any[]) => row[qIdx])
          .filter((v: any) => typeof v === 'string' && v.trim() !== '') as string[];
        
        const counts: Record<string, number> = {};
        values.forEach(v => {
          counts[v] = (counts[v] || 0) + 1;
        });

        chartData = (qt.options || []).map((label: string) => ({
          label,
          value: counts[label] || 0,
          isOther: false
        }));

        respondentCount = values.length;
        responseOrder = qt.options;
      } else if (questionType === 'open') {
        // 주관식: 응답자 수만 표시
        respondentCount = processedRows.filter((row: any[]) => {
          const value = row[qIdx];
          return typeof value === 'string' && value.trim() !== '';
        }).length;
        chartData = [];
      }

      newCharts.push({
        questionIndex: qIdx,
        chartType: selectedChartType, // 사용자가 선택한 차트 타입 사용
        questionType: { ...qt, type: questionType },
        gridSize: { w: 1, h: 1 },
        data: chartData,
        respondentCount,
        scoreMap: qt.scoreMap,
        responseOrder,
        scores,
        avgScore: avgScore // 평균점수 명시적으로 전달
      });
    });

    console.log('handleCreateCharts - 생성된 차트:', newCharts);
    setCharts(prev => [...prev, ...newCharts.filter(nc => !prev.some(c => c.questionIndex === nc.questionIndex))]);
  };

  // 그래프 삭제
  const handleDeleteChart = (qIdx: number) => {
    setCharts(prev => prev.filter(c => c.questionIndex !== qIdx));
  };

  // 그래프 유형 개별 변경
  const handleChartTypeChange = (qIdx: number, newType: ChartType) => {
    setCharts(prev => prev.map(c => c.questionIndex === qIdx ? { ...c, chartType: newType } : c));
  };

  // 문항 유형 변경
  const handleQuestionTypeChange = (qIdx: number, newType: QuestionType) => {
    setCharts(prev => prev.map(c => c.questionIndex === qIdx ? { ...c, questionType: newType } : c));
  };

  // 데이터 테이블 편집
  const handleDataTableEdit = (qIdx: number, newData: any[]) => {
    setCharts(prev => prev.map(c => c.questionIndex === qIdx ? { ...c, data: newData } : c));
  };

  // 카드 크기 변경
  const handleGridSizeChange = (qIdx: number, newSize: { w: number; h: number }) => {
    setCharts(prev => prev.map(c => c.questionIndex === qIdx ? { ...c, gridSize: newSize } : c));
  };

  // 카드 복제
  const handleDuplicateChart = (qIdx: number) => {
    const chartToDuplicate = charts.find(c => c.questionIndex === qIdx);
    if (chartToDuplicate) {
      const newChart = {
        ...chartToDuplicate,
        questionIndex: Date.now(), // 임시로 고유 ID 생성
      };
      setCharts(prev => [...prev, newChart]);
    }
  };

  // 보고서로 이동(목업)
  const handleMoveToReport = (qIdx: number) => {
    // TODO: 보고서 영역에 추가하는 로직 구현
    alert('보고서로 이동: ' + (surveyData.questions[qIdx] || '')); 
  };

  // 개별 문항 선택 함수 복구
  const handleSelectOne = (colIdx: number) => {
    setSelectedQuestions(prev => prev.includes(colIdx) ? prev.filter(i => i !== colIdx) : [...prev, colIdx]);
  };

  // 전체 선택(주관식 제외) 체크박스 상태
  const nonSubjectiveIndexes = filteredQuestions.filter(qt => qt.type !== 'open').map(qt => qt.columnIndex);
  const allNonSubjectiveSelected = nonSubjectiveIndexes.length > 0 && nonSubjectiveIndexes.every(idx => selectedQuestions.includes(idx));
  const handleSelectAllNonSubjective = () => {
    if (allNonSubjectiveSelected) {
      setSelectedQuestions(prev => prev.filter(idx => !nonSubjectiveIndexes.includes(idx)));
    } else {
      setSelectedQuestions(nonSubjectiveIndexes);
    }
  };

  return (
    <div className="flex w-screen absolute left-0 top-[64px] min-h-[calc(100vh-64px)] bg-gray-50">
      <div className="flex w-screen px-4 py-4 gap-4">
        {/* 좌측: 문항 선택 패널 */}
        <aside className="w-[520px] bg-white rounded-lg shadow p-4 flex flex-col h-[calc(100vh-64px)]">
          <div className="mb-4">
            <h2 className="text-lg font-bold mb-2">문항 선택</h2>
            <p className="text-sm text-gray-600 mb-4">분석할 문항을 선택하고 그래프를 생성하세요.</p>
          </div>
          
          {/* 그래프 설정/생성 영역 */}
          <div className="flex items-center gap-2 mb-4">
            <select
              value={selectedChartType}
              onChange={e => setSelectedChartType(e.target.value as ChartType)}
              className="border rounded px-2 py-1 text-sm flex-1"
            >
              {chartTypes.map(ct => (
                <option key={ct.value} value={ct.value}>{ct.label}</option>
              ))}
            </select>
            <button
              onClick={handleCreateCharts}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
              disabled={selectedQuestions.length === 0}
            >
              그래프 생성
            </button>
            <button
              onClick={() => setCharts([])}
              className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-xs"
              disabled={charts.length === 0}
            >
              전체 삭제
            </button>
          </div>

          <input
            type="text"
            className="w-full mb-2 px-2 py-1 border rounded text-sm"
            placeholder="질문 검색..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          
          {/* 전체 선택(주관식 제외) 체크박스 */}
          <div className="flex items-center mb-2">
            <input
              type="checkbox"
              checked={allNonSubjectiveSelected}
              onChange={handleSelectAllNonSubjective}
              className="mr-2"
            />
            <span className="text-sm">전체 선택(주관식 제외)</span>
          </div>

          <div className="flex-1 overflow-y-auto">
            {Object.entries(groupedQuestions).map(([type, questions]) => {
              const t = type as keyof typeof typeLabels;
              let qs = questions as any[];
              // 행렬형(matrix) 문항은 matrixGroupId별로 묶어서 표현
              if (t === 'matrix') {
                // matrixGroupId별로 그룹핑
                const matrixGroups: Record<number, any[]> = {};
                qs.forEach(qt => {
                  if (qt.matrixGroupId !== undefined) {
                    if (!matrixGroups[qt.matrixGroupId]) matrixGroups[qt.matrixGroupId] = [];
                    matrixGroups[qt.matrixGroupId].push(qt);
                  }
                });
                return (
                  <div key={type} className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeColors[t]}`}>{typeLabels[t]}</span>
                      <span className="text-xs text-gray-500">{qs.length}개</span>
                    </div>
                    {Object.entries(matrixGroups).map(([groupId, groupQs]) => {
                      // 그룹 전체 선택 여부
                      const allGroupSelected = groupQs.every((qt: any) => selectedQuestions.includes(qt.columnIndex));
                      const handleGroupSelect = () => {
                        if (allGroupSelected) {
                          setSelectedQuestions(prev => prev.filter(idx => !groupQs.some((qt: any) => qt.columnIndex === idx)));
                        } else {
                          setSelectedQuestions(prev => [
                            ...prev,
                            ...groupQs.map((qt: any) => qt.columnIndex).filter(idx => !prev.includes(idx))
                          ]);
                        }
                      };
                      // 공통 접두사(문항 유형 검토에서 저장된 commonPrefix) 추출
                      const questionTexts = groupQs.map((qt: any) => surveyData.questions[qt.columnIndex]?.text || '');
                      const commonPrefix = findCommonPrefix(questionTexts);
                      return (
                        <div key={groupId} className="mb-2 ml-2 border-l-4 border-purple-200 pl-2">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-purple-700 font-semibold">{commonPrefix}</span>
                            <input
                              type="checkbox"
                              checked={allGroupSelected}
                              onChange={handleGroupSelect}
                              className="ml-2"
                            />
                            <span className="text-xs text-gray-500">세트 전체 선택</span>
                          </div>
                          {groupQs.map((qt: any) => {
                            // commonPrefix 제외 뒷부분만 추출
                            const fullText = surveyData.questions[qt.columnIndex]?.text || '';
                            let diff = fullText.startsWith(commonPrefix) ? fullText.slice(commonPrefix.length).trim() : fullText;
                            if (!diff) diff = fullText;
                            return (
                              <div key={qt.columnIndex} className="flex items-center mb-1 ml-4">
                                <input
                                  type="checkbox"
                                  checked={selectedQuestions.includes(qt.columnIndex)}
                                  readOnly
                                  disabled
                                  style={{ opacity: 0.5, pointerEvents: 'none' }}
                                />
                                <span
                                  className={`text-sm truncate cursor-pointer ${typeColors[t]}`}
                                  title={fullText}
                                  style={{ maxWidth: '600px', width: '90%', display: 'inline-block', verticalAlign: 'middle' }}
                                >
                                  {diff}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                );
              }
              // ... 나머지 유형 기존대로 ...
              // 그룹 전체 선택 여부
              const allGroupSelected = qs.length > 0 && qs.every(qt => selectedQuestions.includes(qt.columnIndex));
              const handleGroupSelect = () => {
                if (allGroupSelected) {
                  setSelectedQuestions(prev => prev.filter(idx => !qs.some(qt => qt.columnIndex === idx)));
                } else {
                  setSelectedQuestions(prev => [
                    ...prev,
                    ...qs.map(qt => qt.columnIndex).filter(idx => !prev.includes(idx))
                  ]);
                }
              };
              return (
                <div key={type} className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeColors[t]}`}>{typeLabels[t]}</span>
                    <span className="text-xs text-gray-500">{qs.length}개</span>
                    <input
                      type="checkbox"
                      checked={allGroupSelected}
                      onChange={handleGroupSelect}
                      className="ml-2"
                    />
                    <span className="text-xs text-gray-500">전체 선택</span>
                  </div>
                  {qs.map((qt) => (
                    <div key={qt.columnIndex} className="flex items-center mb-1 ml-4">
                      <input
                        type="checkbox"
                        checked={selectedQuestions.includes(qt.columnIndex)}
                        onChange={() => handleSelectOne(qt.columnIndex)}
                      />
                      <span
                        className={`text-sm truncate cursor-pointer ${typeColors[t]}`}
                        title={surveyData.questions[qt.columnIndex]?.text || ''}
                        style={{ maxWidth: '600px', width: '90%', display: 'inline-block', verticalAlign: 'middle' }}
                      >
                        {surveyData.questions[qt.columnIndex]?.text || ''}
                      </span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </aside>

        {/* 우측: 그래프 결과 영역 */}
        <main className="flex-1 bg-white rounded-lg shadow p-4 flex flex-col min-w-0 h-[calc(100vh-64px)]">
          <div className="mb-4">
            <h2 className="text-lg font-bold">그래프 결과</h2>
            <p className="text-sm text-gray-600">생성된 그래프가 여기에 표시됩니다.</p>
          </div>
          
          {/* 그래프 결과/카드 영역 */}
          <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {charts.map(c => (
              <div
                key={c.questionIndex}
                style={{
                  gridColumn: `span ${c.gridSize.w}`,
                  gridRow: `span ${c.gridSize.h * 2}`
                }}
              >
                <ChartCard
                  key={c.questionIndex}
                  questionIndex={String(c.questionIndex)}
                  question={surveyData.questions[c.questionIndex]?.text || `문항 ${c.questionIndex + 1}`}
                  questionType={c.questionType.type as QuestionTypeValue}
                  chartType={c.chartType}
                  data={c.data}
                  colors={c.colors}
                  respondentCount={c.respondentCount}
                  onChartTypeChange={(newType) => handleChartTypeChange(c.questionIndex, newType)}
                  onQuestionTypeChange={(newType) => handleQuestionTypeChange(c.questionIndex, { ...c.questionType, type: newType as QuestionTypeValue })}
                  onDataTableEdit={(newData) => handleDataTableEdit(c.questionIndex, newData)}
                  gridSize={c.gridSize}
                  onGridSizeChange={(newSize) => handleGridSizeChange(c.questionIndex, newSize)}
                  onDuplicate={() => handleDuplicateChart(c.questionIndex)}
                  onDelete={() => handleDeleteChart(c.questionIndex)}
                  avgScore={c.avgScore}
                />
              </div>
            ))}
            {charts.length === 0 && (
              <div className="col-span-full text-center text-gray-400 py-12">
                <p className="mb-2">생성된 그래프가 없습니다.</p>
                <p className="text-sm">왼쪽 패널에서 문항을 선택하고 그래프를 생성해주세요.</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AnalysisPage; 