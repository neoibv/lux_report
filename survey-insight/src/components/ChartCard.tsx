import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Title,
  ChartOptions,
  ChartData,
} from 'chart.js';
import { Bar, Pie, Doughnut } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { ChartType, QuestionTypeValue, Response } from '../types';

interface ChartCardProps {
  questionIndex: string;
  question: string;
  questionType: QuestionTypeValue;
  chartType: ChartType;
  data: Response[];
  onChartTypeChange: (type: ChartType) => void;
  onQuestionTypeChange: (type: QuestionTypeValue) => void;
  onDataTableEdit: (data: Response[]) => void;
  gridSize: { w: number; h: number };
  onGridSizeChange: (size: { w: number; h: number }) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  colors?: string[];
  respondentCount?: number;
  matrixTitle?: string;
  scoreMap?: Record<string, number>;
  responseOrder?: string[];
  scores?: number[];
}

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend, Title);
ChartJS.register(ChartDataLabels);

const palette = [
  '#1597B6', // 공격수
  '#1CB5E0', // 미드필더
  '#7F7FD5', // 수비수
  '#B224EF', // 잘 모르겠음
  '#F15BB5', // GK
  '#E0E0E0', // 기타응답(회색)
];

// 리커트/행렬형 전용 색상 (이미지 기준)
const likertColors = [
  '#2563eb', // 매우만족(5점)
  '#60a5fa', // 만족(4점)
  '#fef08a', // 보통(3점)
  '#fca5a5', // 불만족(2점)
  '#f43f5e', // 매우불만족(1점)
];

// 숫자 3자리마다 콤마를 찍는 함수
function formatNumber(n: number) {
  return n.toLocaleString('ko-KR');
}

// 라벨 가공 함수 추가
function ellipsisLabel(label: string, max = 10) {
  return label.length > max ? label.slice(0, max) + '...' : label;
}

// 기존 palette가 부족할 때 자동으로 색상 생성
function generateColorSet(n: number) {
  const colors = [];
  for (let i = 0; i < n; i++) {
    colors.push(`hsl(${(i * 360) / n}, 70%, 60%)`);
  }
  return colors;
}

const ChartCard: React.FC<ChartCardProps> = ({
  questionIndex,
  question,
  questionType,
  chartType,
  data,
  onChartTypeChange,
  onQuestionTypeChange,
  onDataTableEdit,
  gridSize,
  onGridSizeChange,
  onDuplicate,
  onDelete,
  colors,
  respondentCount,
  matrixTitle,
  scoreMap,
  responseOrder,
  scores
}) => {
  const [dataTableOpen, setDataTableOpen] = useState(false);
  const chartRef = useRef<any>(null);

  // 차트 데이터 메모이제이션
  const chartData = useMemo(() => {
    const sortedData = [
      ...data.filter(d => !d.isOther),
      ...data.filter(d => d.isOther)
    ];
    const labels = sortedData.map(d => d.label);
    const values = sortedData.map(d => d.value);
    const backgroundColors = colors
      ? colors.slice(0, sortedData.length)
      : (questionType === 'likert' || questionType === 'matrix')
        ? sortedData.map((d, i) => d.isOther ? '#E0E0E0' : likertColors[i % likertColors.length])
        : sortedData.map((d, i) => d.isOther ? '#E0E0E0' : generateColorSet(sortedData.length)[i]);

    return {
      labels,
      values,
      backgroundColors,
      sortedData
    };
  }, [data, colors, questionType]);

  // 차트 옵션 메모이제이션
  const chartOptions = useMemo(() => {
    const isMatrixChart = chartType === 'verticalMatrix' || chartType === 'horizontalMatrix';
    const baseOptions: ChartOptions<'bar' | 'pie' | 'doughnut'> = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { 
          display: chartType === 'pie' || chartType === 'donut',
          position: 'bottom',
          labels: {
            boxWidth: 12,
            padding: 15
          }
        },
        tooltip: { 
          enabled: true,
          padding: 10,
          backgroundColor: 'rgba(0, 0, 0, 0.8)'
        },
        title: { display: false },
        datalabels: {
          display: true,
          color: '#000',
          font: {
            weight: 'bold' as const
          },
          anchor: 'end',
          align: 'top',
          formatter: (value: number) => {
            if (value === undefined || value === null) return '';
            return isMatrixChart ? formatNumber(value) : `${formatNumber(value)}%`;
          }
        }
      }
    };

    if (chartType === 'vertical' || chartType === 'horizontal') {
      return {
        ...baseOptions,
        indexAxis: chartType === 'vertical' ? 'x' as const : 'y' as const,
        scales: chartType === 'vertical'
          ? {
              x: {
                grid: {
                  display: true,
                  drawOnChartArea: true,
                  color: '#e5e7eb',
                },
                ticks: {
                  callback: (v: any, idx: number) => ellipsisLabel(chartData.labels[idx], 10),
                  maxRotation: 45,
                  minRotation: 0,
                  autoSkip: false,
                },
              },
              y: { beginAtZero: true, max: 100, ticks: { callback: (v: any) => `${v}%` } },
            }
          : {
              x: { beginAtZero: true, max: 100, ticks: { callback: (v: any) => `${v}%` } },
              y: {
                grid: {
                  display: true,
                  drawOnChartArea: true,
                  color: '#e5e7eb',
                },
                ticks: {
                  callback: (v: any, idx: number) => ellipsisLabel(chartData.labels[idx], 10),
                  maxRotation: 45,
                  minRotation: 0,
                  autoSkip: false,
                },
              },
            },
      };
    }

    if (chartType === 'verticalMatrix' || chartType === 'horizontalMatrix') {
      return {
        ...baseOptions,
        indexAxis: chartType === 'verticalMatrix' ? 'x' as const : 'y' as const,
        scales: chartType === 'verticalMatrix'
          ? {
              x: { grid: { display: false } },
              y: {
                beginAtZero: true,
                min: 0,
                max: 5,
                ticks: { stepSize: 1, callback: (v: any) => v },
              },
            }
          : {
              x: {
                beginAtZero: true,
                min: 0,
                max: 5,
                ticks: { stepSize: 1, callback: (v: any) => v },
              },
              y: { grid: { display: false } },
            },
      };
    }

    return baseOptions;
  }, [chartType, chartData.labels]);

  // 차트 데이터 메모이제이션
  const chartDataConfig = useMemo(() => {
    const isMatrixChart = chartType === 'verticalMatrix' || chartType === 'horizontalMatrix';
    return {
      labels: chartData.labels,
      datasets: [{
        data: chartData.values,
        backgroundColor: chartData.backgroundColors,
        borderRadius: 0,
        barPercentage: 0.75,
        categoryPercentage: 0.85,
      }]
    };
  }, [chartType, chartData]);

  // 차트 컴포넌트 렌더링
  const renderChart = () => {
    if (chartType === 'vertical' || chartType === 'horizontal') {
      return (
        <Bar
          ref={chartRef}
          data={chartDataConfig}
          options={chartOptions as ChartOptions<'bar'>}
        />
      );
    }
    
    if (chartType === 'verticalMatrix' || chartType === 'horizontalMatrix') {
      return (
        <Bar
          ref={chartRef}
          data={chartDataConfig}
          options={chartOptions as ChartOptions<'bar'>}
        />
      );
    }

    if (chartType === 'pie') {
      return (
        <Pie
          ref={chartRef}
          data={chartDataConfig}
          options={chartOptions as ChartOptions<'pie'>}
        />
      );
    }

    if (chartType === 'donut') {
      return (
        <Doughnut
          ref={chartRef}
          data={chartDataConfig}
          options={chartOptions as ChartOptions<'doughnut'>}
        />
      );
    }

    return null;
  };

  // 차트 인스턴스 정리
  useEffect(() => {
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, []);

  // 차트 타입이나 데이터가 변경될 때 차트 업데이트
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.destroy();
    }
  }, [chartType, data, questionType]);

  // 실제 응답 인원수: props로 받거나, 없으면 value 합의 반올림(Math.round)
  const totalResponses = respondentCount !== undefined ? respondentCount : Math.round(data.reduce((sum, item) => sum + item.value, 0));

  // 백분율 변환 함수
  function toPercent(val: number) {
    // 복수응답은 전체 응답 수가 아니라 value의 합을 100%로
    if (questionType === 'multiple_select') {
      const sum = data.reduce((acc, d) => acc + d.value, 0);
      if (!sum) return 0;
      return Math.round((val / sum) * 1000) / 10;
    } else {
      if (!totalResponses || totalResponses === 0) return 0;
      return Math.round((val / totalResponses) * 1000) / 10;
    }
  }

  // 리커트/행렬형 평균 계산 (기타응답 제외)
  let avgScore: number | null = null;
  if ((questionType === 'likert' || questionType === 'matrix') && data.length > 0) {
    // 1. scoreMap이 있으면 그걸 우선 사용
    let map: Record<string, number> | undefined = scoreMap;
    if (!map && responseOrder && scores && responseOrder.length === scores.length) {
      map = Object.fromEntries(responseOrder.map((resp, i) => [resp, scores[i]]));
    }
    let sum = 0, cnt = 0;
    if (map) {
      data.filter(d => !d.isOther).forEach(d => {
        const score = map![d.label];
        if (typeof score === 'number' && score > 0) {
          sum += score * d.value;
          cnt += d.value;
        }
      });
    } else {
      // fallback: 기존 방식
      const scoreMapDefault: Record<string, number> = {
        '매우 만족': 5,
        '만족': 4,
        '보통': 3,
        '불만족': 2,
        '매우 불만족': 1,
        '5': 5, '4': 4, '3': 3, '2': 2, '1': 1
      };
      data.filter(d => !d.isOther).forEach(d => {
        const score = scoreMapDefault[d.label] ?? parseInt(d.label);
        if (!isNaN(score)) {
          sum += score * d.value;
          cnt += d.value;
        }
      });
    }
    if (cnt > 0) avgScore = Math.round((sum / cnt) * 100) / 100;
  }

  // 차트 데이터 변환 (백분율 or 점수)
  const isMatrixChart = chartType === 'verticalMatrix' || chartType === 'horizontalMatrix';
  const chartValues = isMatrixChart ? chartData.values : chartData.values.map(d => toPercent(d));

  const chartMaxWidth = chartData.labels.length >= 7 ? 'max-w-[600px]' : 'max-w-[420px]';

  // 모든 차트 타입에서 카드 레이아웃을 반환하도록 통일
  return (
    <div className="bg-white border border-gray-300 rounded-lg shadow-lg ring-2 ring-blue-200 p-4 flex flex-col" style={{ minHeight: 600 }}>
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-semibold break-words">{matrixTitle || question}</h3>
        <div className="text-sm text-gray-600">
          총 응답: {formatNumber(totalResponses)}개
        </div>
      </div>
      {/* 평균 점수 표기 (리커트/행렬형) */}
      {questionType === 'likert' && avgScore !== null && (
        <div className={`w-full ${chartMaxWidth} mx-auto`}>
          <div className="mb-2 text-blue-700 font-bold text-base text-center">
            평균 점수: {avgScore} / 5점
          </div>
          <div className="bg-blue-100 rounded h-3 mb-2">
            <div
              className="bg-blue-500 h-3 rounded"
              style={{ width: `${(avgScore / 5) * 100}%`, transition: 'width 0.5s' }}
            />
          </div>
        </div>
      )}
      {/* 차트 영역 */}
      <div className="mt-4 flex-1 flex items-center justify-center">
        <div className={`w-full h-[350px] mx-auto ${chartMaxWidth}`}>
          {renderChart()}
        </div>
      </div>
      {/* --- 옵션/버튼 영역: 항상 카드 하단에 --- */}
      <div className="flex flex-col md:flex-row md:items-center gap-2 mt-auto">
        <div className="flex gap-2">
          <select
            value={chartType}
            onChange={e => onChartTypeChange(e.target.value as ChartType)}
            className="border rounded px-2 py-1 text-xs"
          >
            <option value="vertical">세로 비율</option>
            <option value="horizontal">가로 비율</option>
            <option value="verticalStacked">세로 전체 누적</option>
            <option value="horizontalStacked">가로 전체 누적</option>
            <option value="pie">원형</option>
            <option value="donut">도넛형</option>
            <option value="verticalMatrix">세로 비율(행렬형)</option>
            <option value="horizontalMatrix">가로 비율(행렬형)</option>
          </select>
          <select
            value={questionType}
            onChange={e => onQuestionTypeChange(e.target.value as QuestionTypeValue)}
            className="border rounded px-2 py-1 text-xs"
          >
            <option value="likert">리커트 척도</option>
            <option value="multiple">객관식</option>
            <option value="multiple_select">복수응답</option>
            <option value="open">주관식</option>
            <option value="matrix">행렬형</option>
          </select>
        </div>
        <div className="flex gap-1">
          <button onClick={() => onGridSizeChange({ ...gridSize, w: gridSize.w - 1 })} className="text-xs px-1">◀</button>
          <button onClick={() => onGridSizeChange({ ...gridSize, w: gridSize.w + 1 })} className="text-xs px-1">▶</button>
          <button onClick={() => onGridSizeChange({ ...gridSize, h: gridSize.h - 1 })} className="text-xs px-1">▲</button>
          <button onClick={() => onGridSizeChange({ ...gridSize, h: gridSize.h + 1 })} className="text-xs px-1">▼</button>
          {onDuplicate && <button onClick={onDuplicate} className="text-xs px-1 text-blue-500">복제</button>}
          {onDelete && <button onClick={onDelete} className="text-xs px-1 text-red-500">삭제</button>}
        </div>
        <button
          onClick={() => setDataTableOpen(open => !open)}
          className="text-xs bg-gray-100 text-gray-700 rounded px-2 py-0.5"
        >
          {dataTableOpen ? '데이터 테이블 닫기' : '데이터 테이블 열기'}
        </button>
      </div>
      {/* 데이터 테이블 토글 */}
      {dataTableOpen && (
        <div className="mt-2 border rounded bg-gray-50 p-2 text-xs">
          <div className="mb-1 font-semibold">데이터 테이블 (편집 가능)</div>
          <table className="w-full border text-xs">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-1">응답 항목</th>
                <th className="p-1">응답갯수</th>
                <th className="p-1">비율(%)</th>
                <th className="p-1">기타응답</th>
              </tr>
            </thead>
            <tbody>
              {chartData.sortedData.map((row, idx) => (
                <tr key={row.label}>
                  <td>
                    <input
                      className="border rounded px-1 py-0.5 w-full"
                      value={row.label}
                      onChange={e => {
                        const newData = [...chartData.sortedData];
                        newData[idx] = { ...row, label: e.target.value };
                        onDataTableEdit(newData);
                      }}
                    />
                  </td>
                  <td>{formatNumber(row.value)}</td>
                  <td>{
                    (questionType === 'open')
                      ? '-' : `${formatNumber(toPercent(row.value))}%`
                  }</td>
                  <td className="text-center">
                    <input
                      type="checkbox"
                      checked={!!row.isOther}
                      onChange={e => {
                        const newData = [...chartData.sortedData];
                        newData[idx] = { ...row, isOther: e.target.checked };
                        onDataTableEdit(newData);
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ChartCard; 