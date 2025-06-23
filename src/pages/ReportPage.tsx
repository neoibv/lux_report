import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import ChartCard from '../components/ChartCard';
import useSurveyStore from '../store/surveyStore';
import { ChartType, QuestionTypeValue } from '../types';
import ReactDOM from 'react-dom';

interface ReportPageProps {
  reportState: any;
  setReportState: React.Dispatch<React.SetStateAction<any>>;
  analysisState: any;
  setAnalysisState: React.Dispatch<React.SetStateAction<any>>;
}

const ReportPage: React.FC<ReportPageProps> = ({ reportState, setReportState, analysisState, setAnalysisState }) => {
  const navigate = useNavigate();
  const { surveyData } = useSurveyStore();
  const [reportCharts] = useSurveyStore(state => [state.reportCharts]);
  const [gridColumns, setGridColumns] = useState(3);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const pdfPreviewRef = useRef<HTMLDivElement>(null);

  // 보고서 페이지용 핸들러 함수들
  const handleChartTypeChange = (questionIndex: string, newType: ChartType) => {
    setReportState((prev: any) => ({
      ...prev,
      reportItems: prev.reportItems.map((item: any) =>
        item.questionIndex === questionIndex ? { ...item, chartType: newType } : item
      )
    }));
  };

  const handleQuestionTypeChange = (questionIndex: string, newType: QuestionTypeValue) => {
    setReportState((prev: any) => ({
      ...prev,
      reportItems: prev.reportItems.map((item: any) =>
        item.questionIndex === questionIndex ? { 
          ...item, 
          questionType: { ...item.questionType, type: newType } 
        } : item
      )
    }));
  };

  const handleQuestionChange = (questionIndex: string, newQuestion: string) => {
    setReportState((prev: any) => ({
      ...prev,
      reportItems: prev.reportItems.map((item: any) =>
        item.questionIndex === questionIndex ? { 
          ...item, 
          question: newQuestion 
        } : item
      )
    }));
  };

  const handleDataTableEdit = (questionIndex: string, newData: any[]) => {
    setReportState((prev: any) => ({
      ...prev,
      reportItems: prev.reportItems.map((item: any) =>
        item.questionIndex === questionIndex ? { ...item, data: newData } : item
      )
    }));
  };

  const handleGridSizeChange = (questionIndex: string, newSize: { w: number; h: number }) => {
    setReportState((prev: any) => ({
      ...prev,
      reportItems: prev.reportItems.map((item: any) =>
        item.questionIndex === questionIndex ? { ...item, gridSize: newSize } : item
      )
    }));
  };

  const handleDuplicate = (questionIndex: string) => {
    const itemToDuplicate = reportState.reportItems.find((item: any) => item.questionIndex === questionIndex);
    if (itemToDuplicate) {
      const newItem = {
        ...itemToDuplicate,
        questionIndex: `${itemToDuplicate.questionIndex}_${Date.now()}`, // 고유 ID 생성
      };
      setReportState((prev: any) => ({
        ...prev,
        reportItems: [...prev.reportItems, newItem]
      }));
    }
  };

  const handleDelete = (questionIndex: string) => {
    setReportState((prev: any) => ({
      ...prev,
      reportItems: prev.reportItems.filter((item: any) => item.questionIndex !== questionIndex)
    }));
  };

  const handleMoveUp = (questionIndex: string) => {
    setReportState((prev: any) => {
      const idx = prev.reportItems.findIndex((item: any) => item.questionIndex === questionIndex);
      if (idx <= 0) return prev;
      const newItems = [...prev.reportItems];
      [newItems[idx - 1], newItems[idx]] = [newItems[idx], newItems[idx - 1]];
      return { ...prev, reportItems: newItems };
    });
  };

  const handleMoveDown = (questionIndex: string) => {
    setReportState((prev: any) => {
      const idx = prev.reportItems.findIndex((item: any) => item.questionIndex === questionIndex);
      if (idx === -1 || idx >= prev.reportItems.length - 1) return prev;
      const newItems = [...prev.reportItems];
      [newItems[idx], newItems[idx + 1]] = [newItems[idx + 1], newItems[idx]];
      return { ...prev, reportItems: newItems };
    });
  };

  // PDF 전용 뷰: 카드 프레임 없이 헤더/제목/그래프/데이터테이블만 렌더링
  const PDFExportView: React.FC<{ items: any[], gridColumns: number }> = ({ items, gridColumns }) => (
    <div 
      ref={pdfPreviewRef}
      style={{ 
        width: '100%', 
        background: '#fff', 
        padding: '20px',
        minHeight: '100vh'
      }}
    >
      <div 
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${gridColumns}, 1fr)`,
          gap: '16px',
          width: '100%'
        }}
      >
        {items.map((item, idx) => (
          <div
            key={`pdf-${item.questionIndex}`}
            id={`pdf-export-${item.questionIndex}`}
            style={{ 
              background: 'transparent', 
              boxShadow: 'none', 
              border: 'none',
              padding: '8px',
              minHeight: 'fit-content'
            }}
          >
            <ChartCard
              questionIndex={String(item.questionIndex)}
              question={item.question || `문항 ${item.questionIndex}`}
              questionType={item.questionType?.type || item.questionType}
              chartType={item.chartType}
              data={item.data}
              colors={item.colors}
              respondentCount={item.respondentCount}
              avgScore={item.avgScore}
              headers={item.headers}
              questionRowIndex={item.questionRowIndex}
              gridSize={item.gridSize}
              gridColumns={gridColumns}
              pdfExportMode={true}
              isReportMode={true}
              hideTitle={false}
              onChartTypeChange={() => {}}
              onQuestionTypeChange={() => {}}
              onDataTableEdit={() => {}}
              onGridSizeChange={() => {}}
              onDuplicate={() => {}}
              onDelete={() => {}}
              onMoveUp={() => {}}
              onMoveDown={() => {}}
            />
          </div>
        ))}
      </div>
    </div>
  );

  const handlePreview = () => {
    setIsPreviewOpen(true);
  };

  // PDF 다운로드 함수: 그리드 레이아웃 유지
  const handleDownloadPDF = async () => {
    const previewElement = pdfPreviewRef.current;
    if (!previewElement) {
      alert('미리보기 요소를 찾을 수 없습니다.');
      return;
    }

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const contentWidth = pageWidth - margin * 2;
    const colCount = gridColumns;
    const gap = 8;
    const cardWidth = (contentWidth - gap * (colCount - 1)) / colCount;
    let y = margin;
    let col = 0;
    
    const chartElements = Array.from(previewElement.querySelectorAll('[id^="pdf-export-"]')) as HTMLElement[];

    for (let i = 0; i < chartElements.length; i++) {
      const el = chartElements[i];
      try {
        const canvas = await html2canvas(el, { scale: 1.5, backgroundColor: '#fff', useCORS: true });
        const imgData = canvas.toDataURL('image/jpeg', 0.9);
        const imgProps = pdf.getImageProperties(imgData);
        
        const imgHeight = (imgProps.height * cardWidth) / imgProps.width;

        if (y + imgHeight > pageHeight - margin) {
          pdf.addPage();
          y = margin;
          col = 0;
        }

        const x = margin + col * (cardWidth + gap);
        pdf.addImage(imgData, 'JPEG', x, y, cardWidth, imgHeight, undefined, 'FAST');

        col++;
        if (col >= colCount) {
          col = 0;
          // 이 부분은 최대 높이 기준으로 y를 증가시켜야 하지만, 일단은 개별 높이로 처리
          y += imgHeight + gap; 
        }

      } catch (error) {
        console.error('Error capturing element for PDF:', el, error);
      }
    }

    pdf.save('설문_보고서.pdf');
  };

  if (!surveyData) {
    navigate('/upload');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-2 px-2 w-screen">
      <div>
        <div className="text-center mb-6 flex flex-col md:flex-row md:items-center md:justify-between px-4 md:px-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">보고서 생성</h1>
            <p className="text-lg text-gray-600">분석 결과를 보고서로 만들어보세요</p>
          </div>
          <div className="flex items-center gap-4 mt-4 md:mt-0">
            <div className="flex items-center gap-2">
              <label htmlFor="gridColumns" className="text-sm font-medium text-gray-700">열 수:</label>
              <select
                id="gridColumns"
                value={gridColumns}
                onChange={(e) => setGridColumns(Number(e.target.value))}
                className="block w-20 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value={2}>2열</option>
                <option value={3}>3열</option>
                <option value={4}>4열</option>
                <option value={5}>5열</option>
              </select>
            </div>
            <button
              onClick={handleDownloadPDF}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              disabled={reportState.reportItems.length === 0}
            >
              PDF로 다운로드
            </button>
            <button
              onClick={handlePreview}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              disabled={reportState.reportItems.length === 0}
            >
              PDF 미리보기
            </button>
            <button
              onClick={() => setReportState((prev: any) => ({ ...prev, reportItems: [] }))}
              className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
              disabled={reportState.reportItems.length === 0}
            >
              그래프 전체 삭제
            </button>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-2">
          {reportState.reportItems.length === 0 ? (
            <p className="text-gray-600">보고서에 추가된 그래프가 없습니다.</p>
          ) : (
            <div 
              className="grid gap-4 p-2"
              style={{
                gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))`
              }}
            >
              {reportState.reportItems.map((item: any, idx: number) => {
                console.log('보고서에서 ChartCard로 전달되는 item:', JSON.stringify(item, null, 2));
                return (
                  <div
                    key={item.questionIndex}
                    id={`pdf-export-${item.questionIndex}`}
                    className="border rounded-lg p-4 relative bg-gray-50 flex flex-col"
                    style={{
                      gridColumn: `span ${Math.min(item.gridSize?.w || 1, gridColumns)}`,
                      gridRow: `span ${item.gridSize?.h || 1}`
                    }}
                  >
                    <ChartCard
                      questionIndex={String(item.questionIndex)}
                      question={item.question || `문항 ${item.questionIndex}`}
                      questionType={item.questionType?.type || item.questionType}
                      chartType={item.chartType}
                      data={item.data}
                      colors={item.colors}
                      respondentCount={item.respondentCount}
                      avgScore={item.avgScore}
                      headers={item.headers}
                      questionRowIndex={item.questionRowIndex}
                      gridSize={item.gridSize}
                      gridColumns={gridColumns}
                      pdfExportMode={false}
                      isReportMode={true}
                      hideTitle={false}
                      onChartTypeChange={(newType) => handleChartTypeChange(item.questionIndex, newType)}
                      onQuestionTypeChange={(newType) => {
                        if (typeof newType === 'string' && !['likert', 'multiple', 'multiple_select', 'open', 'matrix'].includes(newType)) {
                          handleQuestionChange(item.questionIndex, newType);
                        } else {
                          handleQuestionTypeChange(item.questionIndex, newType as QuestionTypeValue);
                        }
                      }}
                      onDataTableEdit={(newData) => handleDataTableEdit(item.questionIndex, newData)}
                      onGridSizeChange={(newSize) => handleGridSizeChange(item.questionIndex, newSize)}
                      onDuplicate={() => handleDuplicate(item.questionIndex)}
                      onDelete={() => handleDelete(item.questionIndex)}
                      onMoveUp={() => handleMoveUp(item.questionIndex)}
                      onMoveDown={() => handleMoveDown(item.questionIndex)}
                    />
                    <div className="flex gap-1 mt-auto">
                      <button onClick={() => {
                        if (idx > 0) {
                          handleMoveUp(item.questionIndex);
                        }
                      }} disabled={idx === 0} className="text-xs px-2 py-1 bg-gray-200 rounded">▲</button>
                      <button onClick={() => {
                        if (idx < reportState.reportItems.length - 1) {
                          handleMoveDown(item.questionIndex);
                        }
                      }} disabled={idx === reportState.reportItems.length - 1} className="text-xs px-2 py-1 bg-gray-200 rounded">▼</button>
                      <button onClick={() => {
                        handleDelete(item.questionIndex);
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
        </div>
      </div>
      {/* PDF 미리보기 모달 */}
      {isPreviewOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[95vw] h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">PDF 미리보기 ({gridColumns}열)</h2>
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-auto border rounded bg-gray-50">
              <PDFExportView items={reportState.reportItems} gridColumns={gridColumns} />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                닫기
              </button>
              <button
                onClick={handleDownloadPDF}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                PDF 다운로드
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportPage; 