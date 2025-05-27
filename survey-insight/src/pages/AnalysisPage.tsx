import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useSurveyStore from '../store/surveyStore';

// 복수응답 문항의 '_Others'를 '기타'로 묶어 카운팅하는 분석용 데이터 생성 함수
function getProcessedRows(surveyData: any) {
  if (!surveyData) return [];
  const processedRows = surveyData.rows.map((row: any[]) => [...row]);
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
  return processedRows;
}

const chartTypes = [
  { value: 'bar', label: '막대그래프' },
  { value: 'pie', label: '파이차트' },
  { value: 'doughnut', label: '도넛차트' },
  { value: 'horizontalBar', label: '가로 막대' },
  { value: 'likert', label: '리커트 평균/비율' },
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

const AnalysisPage: React.FC = () => {
  const navigate = useNavigate();
  const { surveyData } = useSurveyStore();
  const [search, setSearch] = useState('');
  const [selectedQuestions, setSelectedQuestions] = useState<number[]>([]);
  const [selectedChartType, setSelectedChartType] = useState(chartTypes[0].value);
  const [charts, setCharts] = useState<any[]>([]); // {questionIndex, chartType}

  if (!surveyData) {
    navigate('/upload');
    return null;
  }

  // 분석용 데이터: 복수응답 '_Others'를 '기타'로 변환
  const processedRows = getProcessedRows(surveyData);

  // 문항 필터링(검색)
  const filteredQuestions = surveyData.questionTypes.filter((qt: any) => {
    const qText = surveyData.questions[qt.columnIndex] || '';
    return qText.toLowerCase().includes(search.toLowerCase());
  });

  // 유형별로 그룹핑
  const groupedQuestions = filteredQuestions.reduce((acc: any, qt: any) => {
    if (!acc[qt.type]) acc[qt.type] = [];
    acc[qt.type].push(qt);
    return acc;
  }, {});

  // 그래프 생성
  const handleCreateCharts = () => {
    const newCharts = selectedQuestions.map(qIdx => ({ questionIndex: qIdx, chartType: selectedChartType }));
    setCharts(prev => [...prev, ...newCharts.filter(nc => !prev.some(c => c.questionIndex === nc.questionIndex))]);
  };

  // 그래프 삭제
  const handleDeleteChart = (qIdx: number) => {
    setCharts(prev => prev.filter(c => c.questionIndex !== qIdx));
  };
  const handleDeleteAllCharts = () => setCharts([]);

  // 그래프 유형 개별 변경
  const handleChartTypeChange = (qIdx: number, newType: string) => {
    setCharts(prev => prev.map(c => c.questionIndex === qIdx ? { ...c, chartType: newType } : c));
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
      <div className="flex w-screen px-0 py-4 gap-4">
        {/* 좌측: 문항 선택 패널 */}
        <aside className="w-[520px] bg-white rounded-lg shadow p-4 flex flex-col h-[calc(100vh-64px)] mr-4">
          <div className="mb-2 font-bold text-lg">문항 선택</div>
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
                            const fullText = surveyData.questions[qt.columnIndex] || '';
                            const prefix = groupQs[0]?.commonPrefix || '';
                            let diff = fullText.startsWith(prefix) ? fullText.slice(prefix.length).trim() : fullText;
                            if (!diff) diff = fullText; // 혹시라도 접두사와 완전히 일치하면 전체 표시
                            return (
                              <div key={qt.columnIndex} className="flex items-center mb-1 ml-4">
                                <input
                                  type="checkbox"
                                  checked={selectedQuestions.includes(qt.columnIndex)}
                                  onChange={() => handleSelectOne(qt.columnIndex)}
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
                        title={surveyData.questions[qt.columnIndex]}
                        style={{ maxWidth: '600px', width: '90%', display: 'inline-block', verticalAlign: 'middle' }}
                      >
                        {surveyData.questions[qt.columnIndex]}
                      </span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </aside>

        {/* 우측: 그래프 설정/생성/결과 */}
        <main className="flex-1 bg-white rounded-lg shadow p-4 flex flex-col min-w-0 h-[calc(100vh-64px)]">
          {/* 그래프 설정/생성 영역 */}
          <div className="flex items-center gap-4 mb-4">
            <select
              value={selectedChartType}
              onChange={e => setSelectedChartType(e.target.value)}
              className="border rounded px-2 py-1 text-sm"
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
              onClick={handleDeleteAllCharts}
              className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-xs ml-2"
              disabled={charts.length === 0}
            >
              전체 그래프 삭제
            </button>
          </div>

          {/* 그래프 결과/카드 영역 */}
          <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {charts.map(c => (
              <div key={c.questionIndex} className="bg-white rounded shadow p-4 flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold text-sm truncate" title={surveyData.questions[c.questionIndex]}>
                    {surveyData.questions[c.questionIndex]}
                  </div>
                  <button
                    onClick={() => handleDeleteChart(c.questionIndex)}
                    className="text-xs text-red-500 hover:underline ml-2"
                  >
                    삭제
                  </button>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700">{surveyData.questionTypes.find(qt => qt.columnIndex === c.questionIndex)?.type}</span>
                  <select
                    value={c.chartType}
                    onChange={e => handleChartTypeChange(c.questionIndex, e.target.value)}
                    className="border rounded px-2 py-1 text-xs"
                  >
                    {chartTypes.map(ct => (
                      <option key={ct.value} value={ct.value}>{ct.label}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleMoveToReport(c.questionIndex)}
                    className="text-xs bg-green-100 text-green-700 rounded px-2 py-0.5 ml-auto"
                  >
                    보고서로 이동
                  </button>
                </div>
                {/* 그래프/차트 실제 렌더링은 추후 구현 */}
                <div className="flex-1 flex items-center justify-center text-gray-400 text-sm border rounded bg-gray-50 min-h-[120px]">
                  (그래프 미리보기)
                </div>
              </div>
            ))}
            {charts.length === 0 && (
              <div className="col-span-full text-center text-gray-400 py-12">생성된 그래프가 없습니다.</div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AnalysisPage; 