import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import ChartCard from '../components/ChartCard';
import useSurveyStore from '../store/surveyStore';
import { ChartType, QuestionTypeValue } from '../types';

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
  const [gridColumns, setGridColumns] = useState(4); // 기본값 4열

  // @ts-ignore
  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: '설문 보고서',
    removeAfterPrint: true,
    onBeforeGetContent: () => Promise.resolve(),
    onAfterPrint: () => {}
  });

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

  // PDF 다운로드 함수: 각 카드별 실제 DOM을 캡처하여 3열 그리드로 PDF에 배치 (gridSize 반영)
  const handleDownloadPDF = async () => {
    if (!reportState.reportItems || reportState.reportItems.length === 0) return;
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - margin * 2;
    const colCount = gridColumns;
    const gap = 8; // 카드 간격(mm)
    const cardWidth = (contentWidth - gap * (colCount - 1)) / colCount;
    let grid = [] as number[][]; // [row][col] = 1(점유)
    let y = margin;
    let row = 0;
    let maxRowHeight = 0;
    for (let i = 0; i < reportState.reportItems.length; i++) {
      const item = reportState.reportItems[i];
      const chartId = `pdf-export-${item.questionIndex}`;
      const exportElem = document.getElementById(chartId);
      if (!exportElem) continue;
      const gridW = item.gridSize?.w || 1;
      const gridH = item.gridSize?.h || 1;
      const imgW = cardWidth * gridW + gap * (gridW - 1);
      const canvas = await html2canvas(exportElem, { scale: 2, backgroundColor: '#fff', useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const imgProps = pdf.getImageProperties(imgData);
      const baseImgH = (imgProps.height * imgW) / imgProps.width;
      const imgH = baseImgH * gridH;
      let col = 0;
      let found = false;
      while (!found) {
        if (!grid[row]) grid[row] = Array(colCount).fill(0);
        if (col + gridW <= colCount && grid[row].slice(col, col + gridW).every(v => v === 0)) {
          found = true;
          for (let k = 0; k < gridW; k++) grid[row][col + k] = 1;
        } else {
          col++;
          if (col > colCount - 1) {
            row++;
            y += maxRowHeight + gap;
            col = 0;
            maxRowHeight = 0;
          }
        }
      }
      if (y + imgH > pageHeight - margin) {
        pdf.addPage();
        y = margin;
        row = 0;
        col = 0;
        grid = [];
        maxRowHeight = 0;
        if (!grid[row]) grid[row] = Array(colCount).fill(0);
        for (let k = 0; k < gridW; k++) grid[row][col + k] = 1;
      }
      const x = margin + col * (cardWidth + gap);
      pdf.addImage(imgData, 'PNG', x, y, imgW, imgH);
      if (imgH > maxRowHeight) maxRowHeight = imgH;
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
              onClick={() => setReportState((prev: any) => ({ ...prev, reportItems: [] }))}
              className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
              disabled={reportState.reportItems.length === 0}
            >
              그래프 전체 삭제
            </button>
          </div>
        </div>
        <div ref={printRef} className="bg-white rounded-lg shadow p-2">
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
    </div>
  );
};

export default ReportPage; 