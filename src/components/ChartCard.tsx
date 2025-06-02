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
  avgScore?: number | null;
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

// 행렬형 전용 컬러 팔레트 (예시)
const matrixColors = [
  '#7F7FD5', // 보라
  '#86A8E7', // 연보라
  '#91EAE4', // 민트
  '#F7971E', // 주황
  '#FFD200', // 노랑
  '#F44369', // 핑크
  '#43E97B', // 연두
  '#38F9D7', // 청록
  '#E0E0E0', // 기타응답(회색)
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

// 공통 prefix 추출 함수 (fallback용)
function findCommonPrefix(strings: string[]) {
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
  scores,
  avgScore,
}) => {
  const [dataTableOpen, setDataTableOpen] = useState(false);
  const chartRef = useRef<any>(null);

  // 차트 데이터 메모이제이션
  const chartData = useMemo(() => {
    // 데이터가 없는 경우 빈 배열 반환
    if (!data || data.length === 0) {
      return {
        labels: [],
        values: [],
        backgroundColors: [],
        sortedData: []
      };
    }

    const sortedData = [
      ...data.filter(d => !d.isOther),
      ...data.filter(d => d.isOther)
    ];

    // 데이터가 없는 경우 빈 배열 반환
    if (sortedData.length === 0) {
      return {
        labels: [],
        values: [],
        backgroundColors: [],
        sortedData: []
      };
    }

    const labels = sortedData.map(d => d.label);
    const values = sortedData.map(d => d.value);
    
    // 색상 설정
    let backgroundColors;
    if (colors && colors.length > 0) {
      backgroundColors = colors.slice(0, sortedData.length);
    } else if (chartType === 'verticalMatrix' || chartType === 'horizontalMatrix') {
      backgroundColors = sortedData.map((d, i) => d.isOther ? '#E0E0E0' : matrixColors[i % matrixColors.length]);
    } else if (questionType === 'likert' || questionType === 'matrix') {
      backgroundColors = sortedData.map((d, i) => d.isOther ? '#E0E0E0' : likertColors[i % likertColors.length]);
    } else {
      backgroundColors = sortedData.map((d, i) => d.isOther ? '#E0E0E0' : generateColorSet(sortedData.length)[i]);
    }

    return {
      labels,
      values,
      backgroundColors,
      sortedData
    };
  }, [data, colors, questionType, chartType]);

  // 차트 옵션 메모이제이션
  const chartOptions = useMemo(() => {
    const isMatrixChart = chartType === 'verticalMatrix' || chartType === 'horizontalMatrix';
    const maxValue = chartData.values.length > 0 ? Math.max(...chartData.values) : 5;

    // stepSize 자동 계산 함수
    function getStepSize(max: number) {
      if (max <= 10) return 1;
      if (max <= 50) return 5;
      if (max <= 100) return 10;
      if (max <= 500) return 50;
      if (max <= 1000) return 100;
      if (max <= 5000) return 500;
      return Math.ceil(max / 10);
    }
    const stepSize = getStepSize(maxValue);

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
          formatter: (value: number, context: any) => {
            if (value === undefined || value === null) return '';
            // 행렬형 차트는 값만, 그 외는 기존대로
            if (chartType === 'verticalMatrix' || chartType === 'horizontalMatrix') {
              return formatNumber(value);
            } else {
              const label = chartData.labels[context.dataIndex];
              const shortLabel = ellipsisLabel(label, 10);
              return `${shortLabel}: ${formatNumber(value)}%`;
            }
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
              x: {
                grid: { display: false },
                ticks: {
                  callback: (v: any, idx: number) => ellipsisLabel(chartData.labels[idx], 10),
                  maxRotation: 45,
                  minRotation: 0,
                  autoSkip: false,
                },
              },
              y: {
                beginAtZero: true,
                min: 0,
                max: Math.max(5, maxValue),
                ticks: { stepSize, callback: (v: any) => v },
              },
            }
          : {
              x: {
                beginAtZero: true,
                min: 0,
                max: Math.max(5, maxValue),
                ticks: { stepSize, callback: (v: any) => v },
              },
              y: {
                grid: { display: false },
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

    return baseOptions;
  }, [chartType, chartData.labels, chartData.values]);

  // 차트 데이터 메모이제이션
  const chartDataConfig = useMemo(() => {
    const isMatrixChart = chartType === 'verticalMatrix' || chartType === 'horizontalMatrix';
    if (!chartData.labels.length) {
      return {
        labels: [],
        datasets: [{
          data: [],
          backgroundColor: [],
          borderRadius: 0,
          barPercentage: 0.75,
          categoryPercentage: 0.85,
        }]
      };
    }

    // 실제 응답 인원수: props로 받거나, 없으면 value 합의 반올림(Math.round)
    const totalResponses = respondentCount !== undefined ? respondentCount : Math.round(data.reduce((sum, item) => sum + item.value, 0));

    // 문항 유형별 데이터/색상/비율 처리
    let datasetData: number[] = [];
    let backgroundColor: string[] = [];
    if (questionType === 'multiple_select') {
      // 복수응답: value 합 기준 100% 비율, 기타응답은 회색
      const sum = data.reduce((acc, d) => acc + d.value, 0);
      datasetData = sum ? chartData.values.map(v => Math.round((v / sum) * 1000) / 10) : chartData.values.map(() => 0);
      backgroundColor = chartData.sortedData.map((d, i) => d.isOther ? '#E0E0E0' : palette[i % palette.length]);
    } else if (chartType === 'verticalMatrix' || chartType === 'horizontalMatrix') {
      // 행렬형: 실제 값(점수 등) 그대로, 전용 컬러 팔레트
      datasetData = chartData.values;
      backgroundColor = chartData.sortedData.map((d, i) => d.isOther ? '#E0E0E0' : matrixColors[i % matrixColors.length]);
    } else if (questionType === 'likert' || questionType === 'matrix') {
      // 리커트: 응답자 수 기준 100% 비율, likertColors, 기타응답은 회색
      datasetData = totalResponses ? chartData.values.map(v => Math.round((v / totalResponses) * 1000) / 10) : chartData.values.map(() => 0);
      backgroundColor = chartData.sortedData.map((d, i) => d.isOther ? '#E0E0E0' : likertColors[i % likertColors.length]);
    } else {
      // 객관식 등 기타: 응답자 수 기준 100% 비율, 자동 색상
      datasetData = totalResponses ? chartData.values.map(v => Math.round((v / totalResponses) * 1000) / 10) : chartData.values.map(() => 0);
      backgroundColor = chartData.sortedData.map((d, i) => d.isOther ? '#E0E0E0' : generateColorSet(chartData.sortedData.length)[i]);
    }

    return {
      labels: chartData.labels,
      datasets: [{
        data: datasetData,
        backgroundColor,
        borderRadius: 0,
        barPercentage: 0.75,
        categoryPercentage: 0.85,
      }]
    };
  }, [chartType, chartData, data, questionType, respondentCount]);

  // 차트 컴포넌트 렌더링
  console.log('chartDataConfig', chartDataConfig);
  console.log('props.data', data);
  if (chartDataConfig.datasets && chartDataConfig.datasets[0]) {
    console.log('chartDataConfig.datasets[0].data', chartDataConfig.datasets[0].data);
  }
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

  const chartMaxWidth = chartData.labels.length >= 7 ? 'max-w-[600px]' : 'max-w-[420px]';

  // 모든 차트 타입에서 카드 레이아웃을 반환하도록 통일
  return (
    <div className="bg-white border border-gray-300 rounded-lg shadow-lg ring-2 ring-blue-200 p-4 flex flex-col" style={{ minHeight: 600 }}>
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-semibold break-words">
          {(chartType === 'verticalMatrix' || chartType === 'horizontalMatrix') ? (() => {
            // 1. matrixTitle이 있으면 그대로
            if (matrixTitle && matrixTitle.trim().length > 0) return matrixTitle;
            // 2. data의 첫 label에서 \n 앞(안내문) 추출
            if (data && data.length > 0 && typeof data[0].label === 'string') {
              const firstLabel = data[0].label;
              const firstLine = firstLabel.split(/\r?\n/)[0].trim();
              if (firstLine.length > 10) return firstLine;
            }
            // 3. 글자 단위 공통 prefix(10자 이상)
            if (data && data.length > 1) {
              const prefix = findCommonPrefix(data.map(d => d.label));
              if (prefix.length > 10) return prefix;
            }
            // 4. 그래도 없으면
            return '제목 없음';
          })() : question}
        </h3>
        <div className="text-sm text-gray-600">
          총 응답: {formatNumber(respondentCount || Math.round(data.reduce((sum, item) => sum + item.value, 0)))}개
        </div>
      </div>
      {/* 평균 점수 표기 (리커트만) */}
      {questionType === 'likert' && typeof avgScore === 'number' && (
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
              {chartData.sortedData.map((row, idx) => {
                const totalResponses = respondentCount !== undefined ? respondentCount : Math.round(data.reduce((sum, item) => sum + item.value, 0));
                const toPercent = (val: number) => {
                  if (questionType === 'multiple_select') {
                    const sum = data.reduce((acc, d) => acc + d.value, 0);
                    if (!sum) return 0;
                    return Math.round((val / sum) * 1000) / 10;
                  } else {
                    if (!totalResponses || totalResponses === 0) return 0;
                    return Math.round((val / totalResponses) * 1000) / 10;
                  }
                };
                return (
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
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ChartCard; 