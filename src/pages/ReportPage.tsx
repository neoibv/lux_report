import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useSurveyStore from '../store/surveyStore';
import ChartCard from '../components/ChartCard';
import { useReactToPrint } from 'react-to-print';

interface ReportPageProps {
  reportState: any;
  setReportState: React.Dispatch<React.SetStateAction<any>>;
  analysisState: any;
  setAnalysisState: React.Dispatch<React.SetStateAction<any>>;
}

const ReportPage: React.FC<ReportPageProps> = ({ reportState, setReportState, analysisState, setAnalysisState }) => {
  const navigate = useNavigate();
  const { surveyData } = useSurveyStore();
  const printRef = useRef<HTMLDivElement>(null);
  // @ts-ignore
  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: '설문 보고서',
    removeAfterPrint: true,
    onBeforeGetContent: () => Promise.resolve(),
    onAfterPrint: () => {}
  });

  if (!surveyData) {
    navigate('/upload');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-2 px-0 w-screen flex justify-start items-start">
      <div className="">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">보고서 생성</h1>
          <p className="text-lg text-gray-600">분석 결과를 보고서로 만들어보세요</p>
        </div>
        <div ref={printRef} className="bg-white rounded-lg shadow p-2">
          {reportState.reportItems.length === 0 ? (
            <p className="text-gray-600">보고서에 추가된 그래프가 없습니다.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {reportState.reportItems.map((item: any, idx: number) => {
                const base = analysisState.charts.find((c: any) => String(c.questionIndex) === String(item.questionIndex)) || {};
                const question = item.question || base.question || '';
                const headers = item.headers || base.headers || [];
                const questionRowIndex = item.questionRowIndex ?? base.questionRowIndex;
                let headerText = '';
                if (headers && typeof questionRowIndex === 'number' && questionRowIndex > 0 && headers[Number(item.questionIndex)]) {
                  headerText = headers[Number(item.questionIndex)];
                }
                return (
                  <div key={item.questionIndex} className="border rounded-lg p-4 relative bg-gray-50 flex flex-col">
                    {(headerText || question) && (
                      <div className="mb-2">
                        {headerText && <div className="text-xs text-gray-500 mb-1">[{headerText}]</div>}
                        {question && <div className="text-base font-bold">{question}</div>}
                      </div>
                    )}
                    <ChartCard
                      questionIndex={String(item.questionIndex)}
                      question={question}
                      questionType={item.questionType?.type}
                      chartType={item.chartType}
                      data={item.data}
                      colors={item.colors}
                      respondentCount={item.respondentCount}
                      gridSize={item.gridSize || { w: 1, h: 1 }}
                      avgScore={item.avgScore}
                      headers={headers}
                      questionRowIndex={questionRowIndex}
                      onChartTypeChange={() => {}}
                      onQuestionTypeChange={() => {}}
                      onDataTableEdit={() => {}}
                      onGridSizeChange={() => {}}
                      onDuplicate={() => {}}
                      onDelete={() => {}}
                      onMoveUp={() => {}}
                      onMoveDown={() => {}}
                    />
                    <textarea
                      className="w-full border rounded p-2 text-sm mb-2 mt-2"
                      rows={2}
                      placeholder="이 그래프에 대한 설명을 입력하세요..."
                      value={item.description || ''}
                      onChange={e => {
                        setReportState((prev: any) => {
                          const arr = [...prev.reportItems];
                          arr[idx] = { ...arr[idx], description: e.target.value };
                          return { ...prev, reportItems: arr };
                        });
                      }}
                    />
                    <div className="flex gap-1 mt-auto">
                      <button onClick={() => {
                        if (idx > 0) {
                          setReportState((prev: any) => {
                            const arr = [...prev.reportItems];
                            [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
                            return { ...prev, reportItems: arr };
                          });
                        }
                      }} disabled={idx === 0} className="text-xs px-2 py-1 bg-gray-200 rounded">▲</button>
                      <button onClick={() => {
                        if (idx < reportState.reportItems.length - 1) {
                          setReportState((prev: any) => {
                            const arr = [...prev.reportItems];
                            [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
                            return { ...prev, reportItems: arr };
                          });
                        }
                      }} disabled={idx === reportState.reportItems.length - 1} className="text-xs px-2 py-1 bg-gray-200 rounded">▼</button>
                      <button onClick={() => {
                        setReportState((prev: any) => ({ ...prev, reportItems: prev.reportItems.filter((_: any, i: number) => i !== idx) }));
                      }} className="text-xs px-2 py-1 bg-red-200 text-red-700 rounded">삭제</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="mt-6 flex justify-end space-x-4">
          <button
            onClick={() => navigate('/analysis')}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            이전
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            보고서 다운로드
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportPage; 