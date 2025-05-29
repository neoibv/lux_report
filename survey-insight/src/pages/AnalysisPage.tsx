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
          // '_Others'가 포함된 응답을 '기타'로 변환
          const mapped = parts.map(p => p.includes('_Others') ? '기타' : p);
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
  }>>([]);

  if (!surveyData) {
    navigate('/upload');
    return null;
  }

  // 분석용 데이터: 복수응답 '_Others'를 '기타'로 변환
  const processedRows = getProcessedRows(surveyData);

  // 문항 필터링(검색)
  const filteredQuestions = surveyData.questionTypes?.filter((qt: any) => {
    const qText = surveyData.questions[qt.columnIndex]?.text || '';
    return qText.toLowerCase().includes(search.toLowerCase());
  }) || [];

  // 유형별로 그룹핑
  const groupedQuestions = filteredQuestions.reduce((acc: Record<string, any[]>, qt: any) => {
    const type = qt.type || 'multiple';
    if (!acc[type]) acc[type] = [];
    acc[type].push(qt);
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
    const usedMatrixGroups = new Set<number>();

    selectedQuestions.forEach(qIdx => {
      const qt = surveyData.questionTypes?.find((qt: any) => qt.columnIndex === qIdx);
      // [검증4] 차트 생성 시 해당 문항 데이터 로그
      console.log('[검증4] 차트 생성 시 해당 문항 데이터:', qt);
      if (!qt) return;
      // matrix 그룹 처리
      if (qt.type === 'matrix' && qt.matrixGroupId !== undefined) {
        if (usedMatrixGroups.has(qt.matrixGroupId)) return; // 이미 처리한 그룹은 스킵
        usedMatrixGroups.add(qt.matrixGroupId);
        const groupQs = matrixGroups[qt.matrixGroupId];
        // 1. groupQs의 전체 질문 텍스트 배열
        const questionTexts = groupQs.map((q: any) => surveyData.questions[q.columnIndex]?.text || '');
        // 2. 공통 prefix 직접 추출
        const commonPrefix = findCommonPrefix(questionTexts);
        // 3. diff(뒷부분) 추출 (fallback 개선)
        const diffs = questionTexts.map(q => {
          const diff = q.slice(commonPrefix.length).trim();
          // diff가 너무 짧거나, 공통 prefix와 동일하면 전체 질문 사용
          return (!diff || diff === commonPrefix.trim()) ? q : diff;
        });
        // 각 문항별 평균점수 계산 및 디버깅
        const data = groupQs.map((mq: any, idx: number) => {
          const allValues = processedRows.map((row: any[]) => row[mq.columnIndex]).filter((v: any) => typeof v === 'string' && v.trim() !== '') as string[];
          // 1. scoreMap이 있으면 그걸 우선 사용
          const scoreMap = mq.scoreMap;
          let sum = 0, cnt = 0;
          if (scoreMap) {
            allValues.forEach((v: string) => {
              const score = scoreMap[v];
              if (typeof score === 'number' && score > 0) {
                sum += score;
                cnt++;
              }
            });
          } else if (mq.scale && LIKERT_SCALES[mq.scale]) {
            // scale이 명확히 지정된 경우 해당 리커트 유형의 responses/scores를 사용
            const scaleObj = LIKERT_SCALES[mq.scale];
            allValues.forEach((v: string) => {
              const idx = scaleObj.responses.indexOf(v);
              if (idx !== -1) {
                sum += scaleObj.scores[idx];
                cnt++;
              }
              // 매칭되지 않는 값은 평균에서 제외(기타응답)
            });
          } else {
            // 2. responseOrder와 scores가 있으면 그것을 사용
            if (mq.responseOrder && mq.scores) {
              const tempScoreMap = Object.fromEntries(
                mq.responseOrder.map((resp: string, i: number) => [resp, mq.scores[i]])
              );
              allValues.forEach((v: string) => {
                const score = tempScoreMap[v];
                if (typeof score === 'number' && score > 0) {
                  sum += score;
                  cnt++;
                }
              });
            } else {
              // 3. LIKERT_SCALES 추정 fallback
              const scale = LIKERT_SCALES.find(s => s.responses.every(r => mq.options?.includes(r)));
              if (scale) {
                allValues.forEach((v: string) => {
                  // 숫자형 응답 처리 (예: "5 (매우 만족)")
                  const numericMatch = v.match(/^(\d+)\s*\(([^)]+)\)$/);
                  if (numericMatch) {
                    const [_, num, desc] = numericMatch;
                    const matchingResponse = scale.responses.find(r => r.includes(desc.trim()));
                    if (matchingResponse) {
                      const scoreIndex = scale.responses.indexOf(matchingResponse);
                      if (scoreIndex !== -1) {
                        sum += scale.scores[scoreIndex];
                        cnt++;
                      }
                    }
                  } else {
                    const scoreIndex = scale.responses.indexOf(v);
                    if (scoreIndex !== -1) {
                      sum += scale.scores[scoreIndex];
                      cnt++;
                    }
                  }
                });
              }
              // 4. 숫자형 응답 처리
              if (cnt === 0 && allValues.length > 0) {
                allValues.forEach((v: string) => {
                  const num = parseFloat(v.replace(/[^0-9.]/g, ''));
                  if (!isNaN(num) && num >= 1 && num <= 5) {
                    sum += num;
                    cnt++;
                  }
                });
              }
            }
          }
          return {
            ...mq,
            averageScore: cnt > 0 ? sum / cnt : 0
          };
        });
        // matrixRespondentCount: 첫 문항의 응답자 수
        const matrixRespondentCount = groupQs.length > 0
          ? processedRows.filter((row: any[]) => {
              const value = row[groupQs[0].columnIndex];
              return typeof value === 'string' && value.trim() !== '';
            }).length
          : 0;
        // diff가 모두 60자 이상(설명문)인 경우 차트 생성하지 않음(단, 응답 데이터가 없을 때만)
        const isAllDiffLong = diffs.every(d => d.length >= 60);
        // 모든 value가 0이거나 응답 데이터가 없고, diff가 모두 설명문(60자 이상)일 때만 차트 생성하지 않음
        if ((data.every(d => d.averageScore === 0) || matrixRespondentCount === 0) && isAllDiffLong) {
          console.warn(`[matrix] 차트 생성 제외: 응답 데이터 없음 + diff가 모두 설명문`, groupQs, data, diffs);
          return;
        }
        newCharts.push({
          questionIndex: `matrix_${qt.matrixGroupId}`,
          chartType: 'verticalMatrix',
          questionType: 'matrix',
          gridSize: { w: 1, h: 1 },
          data,
          colors: undefined,
          respondentCount: matrixRespondentCount,
          matrixTitle: commonPrefix
        });
      } else {
        // 일반 문항 기존대로
        const questionType = (qt?.type || 'multiple') as QuestionTypeValue;
        let chartData: Array<{ label: string; value: number; isOther?: boolean }> = [];
        let chartColors: string[] | undefined = undefined;
        let respondentCount = 0;

        if (questionType === 'multiple' || questionType === 'multiple_select') {
          const options = new Set<string>();
          let otherCount = 0;
          processedRows.forEach((row: any[]) => {
            const value = row[qIdx];
            if (typeof value === 'string' && value.trim() !== '') {
              if (value.toLowerCase().startsWith('기타:')) {
                otherCount++;
              } else {
                options.add(value);
              }
            }
          });

          chartData = Array.from(options).map(option => ({
            label: option,
            value: processedRows.filter((row: any[]) => row[qIdx] === option).length
          }));

          if (otherCount > 0) {
            chartData.push({
              label: '기타',
              value: otherCount,
              isOther: true
            });
          }

          respondentCount = processedRows.filter((row: any[]) => {
            const value = row[qIdx];
            return typeof value === 'string' && value.trim() !== '';
          }).length;
        } else if (questionType === 'likert') {
          const allValues = processedRows.map((row: any[]) => row[qIdx]).filter((v: any) => typeof v === 'string' && v.trim() !== '') as string[];
          const scoreMap = qt.scoreMap;
          const counts: Record<string, number> = {};

          allValues.forEach(value => {
            const score = scoreMap?.[value] || parseInt(value);
            if (!isNaN(score)) {
              counts[value] = (counts[value] || 0) + 1;
            }
          });

          chartData = Object.entries(counts).map(([label, value]) => ({
            label,
            value
          }));

          respondentCount = allValues.length;
        } else if (questionType === 'open') {
          respondentCount = processedRows.filter((row: any[]) => {
            const value = row[qIdx];
            return typeof value === 'string' && value.trim() !== '';
          }).length;
        }
        newCharts.push({
          questionIndex: qIdx,
          chartType: selectedChartType,
          questionType,
          gridSize: { w: 1, h: 1 },
          data: chartData,
          colors: chartColors,
          respondentCount
        });
      }
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
                      const commonPrefix = groupQs[0]?.commonPrefix || '';
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
                            const prefix = groupQs[0]?.commonPrefix || '';
                            let diff = fullText.startsWith(prefix) ? fullText.slice(prefix.length).trim() : fullText;
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