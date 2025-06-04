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
  headers?: string[];
  questionRowIndex?: number;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend, Title);
ChartJS.register(ChartDataLabels);

// 기타응답 전용 회색 (모든 그래프에서 동일하게 사용, 다른 팔레트에는 절대 포함 X)
const OTHER_GRAY = '#B0B0B0';

// 리커트/행렬형 전용 색상 (기존 유지)
const likertColors = [
  '#2563eb', // 매우만족(5점)
  '#60a5fa', // 만족(4점)
  '#fef08a', // 보통(3점)
  '#fca5a5', // 불만족(2점)
  '#f43f5e', // 매우불만족(1점)
];

// 행렬형 전용 컬러 팔레트 (녹색/민트/청록 계열, 회색 제외)
const matrixColors = [
  '#43E97B', // 연두
  '#38F9D7', // 청록
  '#00B894', // 진한 민트
  '#00CEC9', // 밝은 청록
  '#0984E3', // 선명한 파랑
  '#6C5CE7', // 보라
  '#00BFAE', // 진한 청록
  '#1DE9B6', // 밝은 민트
];

// 객관식 전용 컬러 팔레트 (보라/핑크/남색/자주/청보라 등, 회색 제외)
const objectiveColors = [
  '#8E44AD', // 진보라
  '#6C3483', // 자주
  '#BB8FCE', // 연보라
  '#F1948A', // 연핑크
  '#D35400', // 진한 오렌지
  '#F7CA18', // 노랑
  '#5D6D7E', // 남색
  '#154360', // 진한 남색
];

// 복수응답 전용 컬러 팔레트 (오렌지/노랑/갈색/베이지/레드오렌지 등, 회색 제외)
const multiSelectColors = [
  '#F39C12', // 오렌지
  '#E67E22', // 진한 오렌지
  '#CA6F1E', // 갈색
  '#F6E58D', // 연노랑
  '#F9CA24', // 노랑
  '#F8C471', // 베이지
  '#B9770E', // 진한 갈색
  '#FAD7A0', // 연베이지
];

// 기존 palette는 객관식에만 사용하도록 변경
const palette = objectiveColors;

// 숫자 3자리마다 콤마를 찍는 함수
function formatNumber(n: number) {
  return n.toLocaleString('ko-KR');
}

// 라벨 가공 함수 추가
function ellipsisLabel(label: string, max = 10) {
  return label.length > max ? label.slice(0, max) + '...' : label;
}

// 기존 palette가 부족할 때 자동으로 색상 생성
function generateColorSet(n: number, baseColors: string[]) {
  // baseColors에서 OTHER_GRAY를 제외하고 n개만큼 반복
  const filtered = baseColors.filter(c => c.toLowerCase() !== OTHER_GRAY.toLowerCase());
  const colors = [];
  for (let i = 0; i < n; i++) {
    colors.push(filtered[i % filtered.length]);
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

// --- 데이터 가공 함수 분리 ---
function getMatrixChartData(
  data: Array<{ label: string; value: number; isOther?: boolean; id: string }>,
  respondentCount: number | undefined,
  matrixColors: string[],
  barThickness: number
) {
  const datasetData = data.map(d => d.value);
  const backgroundColor = data.map((d, i) => d.isOther ? OTHER_GRAY : matrixColors[i % matrixColors.length]);
  return {
    labels: data.map(d => d.label),
    datasets: [{
      data: datasetData,
      backgroundColor,
      borderRadius: 0,
      barPercentage: 0.75,
      categoryPercentage: 0.85,
      barThickness,
    }]
  };
}

function getGeneralChartData(
  data: Array<{ label: string; value: number; isOther?: boolean; id: string }>,
  questionType: QuestionTypeValue,
  respondentCount: number | undefined,
  palette: string[],
  likertColors: string[],
  generateColorSet: (n: number, baseColors: string[]) => string[],
  barThickness: number
) {
  const totalResponses = respondentCount !== undefined ? respondentCount : Math.round(data.reduce((sum, item) => sum + item.value, 0));
  let datasetData: number[] = [];
  let backgroundColor: string[] = [];
  if (questionType === 'multiple_select') {
    const sum = data.reduce((acc, d) => acc + d.value, 0);
    datasetData = sum ? data.map(v => Math.round((v.value / sum) * 1000) / 10) : data.map(() => 0);
    backgroundColor = data.map((d, i) => d.isOther ? OTHER_GRAY : generateColorSet(data.length, multiSelectColors)[i]);
  } else if (questionType === 'likert' || questionType === 'matrix') {
    datasetData = totalResponses ? data.map(v => Math.round((v.value / totalResponses) * 1000) / 10) : data.map(() => 0);
    backgroundColor = data.map((d, i) => d.isOther ? OTHER_GRAY : likertColors[i % likertColors.length]);
  } else {
    datasetData = totalResponses ? data.map(v => Math.round((v.value / totalResponses) * 1000) / 10) : data.map(() => 0);
    backgroundColor = data.map((d, i) => d.isOther ? OTHER_GRAY : generateColorSet(data.length, objectiveColors)[i]);
  }
  return {
    labels: data.map(d => d.label),
    datasets: [{
      data: datasetData,
      backgroundColor,
      borderRadius: 0,
      barPercentage: 0.75,
      categoryPercentage: 0.85,
      barThickness,
    }]
  };
}

// --- 스택형(전체 누적) 차트 데이터 생성 함수 ---
function getStackedChartData(
  data: Array<{ label: string; value: number; isOther?: boolean; id: string }>,
  respondentCount: number | undefined,
  palette: string[],
  barThickness: number,
  barPercentage: number,
  categoryPercentage: number
) {
  // labels: [질문 텍스트 1개]
  // datasets: 각 응답 옵션별로 하나씩, 값은 비율(%)
  const total = respondentCount || data.reduce((a, b) => a + b.value, 0);
  return {
    labels: [''], // x축(세로) 또는 y축(가로)에 카테고리 1개만
    datasets: data.map((d, i) => ({
      label: d.label,
      data: [total ? Math.round((d.value / total) * 1000) / 10 : 0],
      backgroundColor: d.isOther ? OTHER_GRAY : palette[i % palette.length],
      borderRadius: 0,
      barPercentage,
      categoryPercentage,
      barThickness,
    }))
  };
}

// barThickness 디폴트 계산 함수
function getDefaultBarThickness(chartType: ChartType, dataLen: number) {
  if (chartType === 'verticalStacked' || chartType === 'horizontalStacked') return 65;
  if (chartType === 'vertical' || chartType === 'horizontal') return 54;
  if (chartType === 'verticalMatrix' || chartType === 'horizontalMatrix') {
    // 데이터 개수에 따라 자동(최소 30, 최대 90, 300/개수)
    if (!dataLen || dataLen <= 0) return 54;
    return Math.max(30, Math.min(90, Math.floor(300 / dataLen)));
  }
  return 54;
}

// 고유 id 부여 함수
function withRowId(arr: Array<{ label: string; value: number; isOther?: boolean; id?: string }>): Array<{ label: string; value: number; isOther?: boolean; id: string }> {
  return arr.map((d, i) => ({ ...d, id: d.id ?? `row_${i}` }));
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
  headers,
  questionRowIndex,
  onMoveUp,
  onMoveDown,
}) => {
  const [dataTableOpen, setDataTableOpen] = useState(false);
  const chartRef = useRef<any>(null);
  // --- y축 최대값 상태 (모든 Bar 계열) ---
  const getDefaultYMax = () => {
    if (questionType === 'multiple' || questionType === 'likert') return 100;
    return 'auto';
  };
  const [customYMax, setCustomYMax] = useState<'auto' | 100 | 50>(getDefaultYMax());
  // questionType이 바뀔 때 디폴트값도 갱신
  React.useEffect(() => {
    setCustomYMax(getDefaultYMax());
  }, [questionType]);

  const [barThickness, setBarThickness] = useState<number>(() => getDefaultBarThickness(chartType, data?.length || 0));
  // 차트 유형/데이터 개수 변경 시 디폴트값 자동 적용
  React.useEffect(() => {
    setBarThickness(getDefaultBarThickness(chartType, data?.length || 0));
  }, [chartType, data?.length]);

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
      backgroundColors = sortedData.map((d, i) => d.isOther ? OTHER_GRAY : matrixColors[i % matrixColors.length]);
    } else if (questionType === 'likert' || questionType === 'matrix') {
      backgroundColors = sortedData.map((d, i) => d.isOther ? OTHER_GRAY : likertColors[i % likertColors.length]);
    } else {
      backgroundColors = sortedData.map((d, i) => d.isOther ? OTHER_GRAY : generateColorSet(sortedData.length, objectiveColors)[i]);
    }

    return {
      labels,
      values,
      backgroundColors,
      sortedData
    };
  }, [data, colors, questionType, chartType]);

  // --- 옵션 useMemo 분리 ---
  const matrixChartOptions = useMemo(() => {
    const maxValue = chartData.values.length > 0 ? Math.max(...chartData.values) : 5;
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
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { enabled: true, padding: 10, backgroundColor: 'rgba(0, 0, 0, 0.8)' },
        title: { display: false },
        datalabels: {
          display: true,
          color: '#000',
          font: { weight: 'bold' },
          anchor: 'end',
          align: 'top',
          formatter: (value: number) => value === undefined || value === null ? '' : formatNumber(value),
        }
      },
      indexAxis: chartType === 'verticalMatrix' ? 'x' : 'y',
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
  }, [chartType, chartData.labels, chartData.values]);

  const generalChartOptions = useMemo(() => {
    // Bar 계열일 때 y축 최대값 동적 적용
    let yMax = 100;
    const isBarType = chartType === 'vertical' || chartType === 'horizontal' || chartType === 'verticalStacked' || chartType === 'horizontalStacked' || chartType === 'verticalMatrix' || chartType === 'horizontalMatrix';
    if (isBarType) {
      if (customYMax === 'auto') {
        const maxVal = Math.max(...chartData.values, 0);
        yMax = Math.ceil(maxVal * 1.1 / 10) * 10; // 최대값+10%에서 10단위 올림
        if (yMax < 10) yMax = 10;
      } else {
        yMax = customYMax;
      }
    }
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: chartType === 'pie' || chartType === 'donut',
          position: 'bottom',
          labels: { boxWidth: 12, padding: 15 }
        },
        tooltip: { enabled: true, padding: 10, backgroundColor: 'rgba(0, 0, 0, 0.8)' },
        title: { display: false },
        datalabels: {
          display: true,
          color: '#000',
          font: { weight: 'bold' },
          anchor: 'end',
          align: 'top',
          formatter: (value: number) => value === undefined || value === null ? '' : `${formatNumber(value)}%`,
        }
      },
      ...(isBarType ? {
        indexAxis: chartType === 'vertical' || chartType === 'verticalStacked' || chartType === 'verticalMatrix' ? 'x' : 'y',
        scales: chartType === 'vertical' || chartType === 'verticalStacked' || chartType === 'verticalMatrix'
          ? {
              x: {
                grid: { display: true, drawOnChartArea: true, color: '#e5e7eb' },
                ticks: {
                  callback: (v: any, idx: number) => ellipsisLabel(chartData.labels[idx], 10),
                  maxRotation: 45,
                  minRotation: 0,
                  autoSkip: false,
                },
              },
              y: { beginAtZero: true, max: yMax, ticks: { callback: (v: any) => `${v}%` } },
            }
          : {
              x: { beginAtZero: true, max: yMax, ticks: { callback: (v: any) => `${v}%` } },
              y: {
                grid: { display: true, drawOnChartArea: true, color: '#e5e7eb' },
                ticks: {
                  callback: (v: any, idx: number) => ellipsisLabel(chartData.labels[idx], 10),
                  maxRotation: 45,
                  minRotation: 0,
                  autoSkip: false,
                },
              },
            },
      } : {})
    };
  }, [chartType, chartData.labels, chartData.values, questionType, customYMax]);

  // --- 차트 데이터 useMemo 분리 ---
  const [localTableData, setLocalTableData] = useState<Array<{ label: string; value: number; isOther?: boolean; id: string }>>(() => withRowId(data));
  // 실제 차트에 반영되는 데이터
  const [applyTableData, setApplyTableData] = useState<Array<{ label: string; value: number; isOther?: boolean; id: string }>>(() => withRowId(data));
  // localTableData가 바뀔 때마다 applyTableData도 동기화
  useEffect(() => {
    setApplyTableData(localTableData);
  }, [localTableData]);

  // 정렬 상태
  const [sortConfig, setSortConfig] = useState<{ key: 'label' | 'value' | 'percent'; direction: 'asc' | 'desc' } | null>(null);

  // 총합 계산
  const totalResponses = useMemo(() => localTableData.reduce((sum: number, item: { value: number }) => sum + item.value, 0), [localTableData]);

  // getPercent 함수는 한 번만 선언하고, 모든 곳에서 재사용
  const getPercent = (val: number) => {
    if (!totalResponses || totalResponses === 0) return 0;
    return Math.round((val / totalResponses) * 1000) / 10;
  };

  // 정렬 함수
  const handleSort = (key: 'label' | 'value' | 'percent') => {
    setSortConfig(prev => {
      if (prev && prev.key === key) {
        // 같은 키면 방향 토글
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'desc' };
    });
    // 정렬 후 바로 applyTableData 업데이트
    const sorted = [...localTableData];
    if (key === 'percent') {
      sorted.sort((a, b) => getPercent(a.value) - getPercent(b.value));
    } else {
      sorted.sort((a, b) => {
        if (key === 'label') return a.label.localeCompare(b.label);
        return a.value - b.value;
      });
    }
    if (sortConfig?.direction === 'desc') sorted.reverse();
    setLocalTableData(sorted);
  };

  // 실제 정렬된 데이터
  const sortedTableData = useMemo(() => {
    if (!sortConfig) return localTableData;
    const sorted = [...localTableData];
    if (sortConfig.key === 'percent') {
      sorted.sort((a, b) => getPercent(a.value) - getPercent(b.value));
    } else {
      sorted.sort((a, b) => {
        if (sortConfig.key === 'label') return a.label.localeCompare(b.label);
        return a.value - b.value;
      });
    }
    if (sortConfig.direction === 'desc') sorted.reverse();
    return sorted;
  }, [localTableData, sortConfig]);

  // 행 이동 함수 (localTableData의 실제 순서 기준으로 이동, sortedTableData는 화면 표시용)
  const moveRow = (sortedIdx: number, direction: -1 | 1) => {
    const row = sortedTableData[sortedIdx];
    const realIdx = localTableData.findIndex((r: { id: string }) => r.id === row.id);
    const to = realIdx + direction;
    if (to < 0 || to >= localTableData.length) return;
    const arr = [...localTableData];
    const [moved] = arr.splice(realIdx, 1);
    arr.splice(to, 0, moved);
    setLocalTableData(arr);
  };

  // 그래프 데이터 생성도 applyTableData만 사용
  const matrixChartDataConfig = useMemo(() => getMatrixChartData(applyTableData, respondentCount, matrixColors, barThickness), [applyTableData, respondentCount, barThickness]);
  const generalChartDataConfig = useMemo(() => getGeneralChartData(applyTableData, questionType, respondentCount, palette, likertColors, generateColorSet, barThickness), [applyTableData, questionType, respondentCount, barThickness]);
  const stackedChartDataConfig = useMemo(() => {
    let colorSet = palette;
    if (questionType === 'likert' || questionType === 'matrix') {
      colorSet = likertColors;
    } else if (questionType === 'multiple') {
      colorSet = objectiveColors;
    } else if (questionType === 'multiple_select') {
      colorSet = multiSelectColors;
    }
    const barP = 0.45, catP = 0.51;
    return getStackedChartData(applyTableData, respondentCount, colorSet, barThickness, barP, catP);
  }, [applyTableData, respondentCount, questionType, barThickness]);

  // --- 옵션 useMemo 분리 ---
  const stackedChartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'bottom', labels: { boxWidth: 12, padding: 15 } },
      tooltip: { enabled: true, padding: 10, backgroundColor: 'rgba(0, 0, 0, 0.8)' },
      title: { display: false },
      datalabels: {
        display: true,
        color: '#000',
        font: { weight: 'bold' },
        anchor: 'center',
        align: 'center',
        formatter: (value: number) => value === undefined || value === null ? '' : `${formatNumber(value)}%`,
      }
    },
    indexAxis: chartType === 'verticalStacked' ? 'x' : 'y',
    scales: chartType === 'verticalStacked'
      ? {
          x: { stacked: true, grid: { display: true, color: '#e5e7eb' }, ticks: { display: false } },
          y: { stacked: true, beginAtZero: true, max: 100, ticks: { callback: (v: any) => `${v}%` } },
        }
      : {
          x: { stacked: true, beginAtZero: true, max: 100, ticks: { callback: (v: any) => `${v}%` } },
          y: { stacked: true, grid: { display: true, color: '#e5e7eb' }, ticks: { display: false } },
        },
  }), [chartType]);

  const defaultThickness = getDefaultBarThickness(chartType, data?.length || 0);
  let barThicknessOptions = Array.from({length: 10}, (_, i) => 30 + i * 10); // [30,40,...,120]
  if (!barThicknessOptions.includes(defaultThickness)) {
    barThicknessOptions = [defaultThickness, ...barThicknessOptions];
  }

  // 차트 컴포넌트 렌더링
  console.log('chartDataConfig', generalChartDataConfig);
  console.log('props.data', data);
  if (generalChartDataConfig.datasets && generalChartDataConfig.datasets[0]) {
    console.log('chartDataConfig.datasets[0].data', generalChartDataConfig.datasets[0].data);
  }
  const renderChart = () => {
    const isMatrixChart = chartType === 'verticalMatrix' || chartType === 'horizontalMatrix';
    if (isMatrixChart) {
      return (
        <Bar
          ref={chartRef}
          data={matrixChartDataConfig}
          options={matrixChartOptions as ChartOptions<'bar'>}
        />
      );
    }
    if (chartType === 'verticalStacked' || chartType === 'horizontalStacked') {
      return (
        <Bar
          ref={chartRef}
          data={stackedChartDataConfig}
          options={stackedChartOptions as ChartOptions<'bar'>}
        />
      );
    }
    if (chartType === 'vertical' || chartType === 'horizontal') {
      return (
        <Bar
          ref={chartRef}
          data={generalChartDataConfig}
          options={generalChartOptions as ChartOptions<'bar'>}
        />
      );
    }
    if (chartType === 'pie') {
      return (
        <Pie
          ref={chartRef}
          data={generalChartDataConfig}
          options={generalChartOptions as ChartOptions<'pie'>}
        />
      );
    }
    if (chartType === 'donut') {
      return (
        <Doughnut
          ref={chartRef}
          data={generalChartDataConfig}
          options={generalChartOptions as ChartOptions<'doughnut'>}
        />
      );
    }
    return null;
  };

  const chartMaxWidth = chartData.labels.length >= 7 ? 'max-w-[600px]' : 'max-w-[420px]';

  // 카드 및 그래프 높이/너비 동적 계산
  const baseHeight = 350;
  const chartHeight = baseHeight + (gridSize.h - 1) * 150; // h=1:350, h=2:500, h=3:650...
  const cardMinHeight = chartHeight + 250; // 카드 전체 높이(그래프+옵션+여백 등)
  const baseWidth = 420;
  const chartWidth = baseWidth + (gridSize.w - 1) * 180; // w=1:420, w=2:600, w=3:780...

  // 그래프 렌더링 버튼 클릭 시 localTableData를 applyTableData로 복사만 함
  const handleRenderChart = () => {
    setApplyTableData([...localTableData]);
  };

  // 모든 차트 타입에서 카드 레이아웃을 반환하도록 통일
  return (
    <div className="bg-white border border-gray-300 rounded-lg shadow-lg ring-2 ring-blue-200 p-4 flex flex-col" style={{ minHeight: cardMinHeight }}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          {/* 헤더 정보가 있을 때만 제목 윗줄에 작게 표시 */}
          {(() => {
            let header = null;
            if (typeof questionRowIndex === 'number' && questionRowIndex > 0 && headers && headers[Number(questionIndex)]) {
              header = headers[Number(questionIndex)];
            }
            return header ? <div className="text-xs text-gray-500 mb-1">[{header}]</div> : null;
          })()}
          <h3 className="text-lg font-semibold break-words">
            {(() => {
              // matrix chart는 기존대로
              if (chartType === 'verticalMatrix' || chartType === 'horizontalMatrix') {
                if (matrixTitle && matrixTitle.trim().length > 0) return matrixTitle;
                if (data && data.length > 0) {
                  const labels = data.map(d => (typeof d.label === 'string' ? d.label : ''));
                  const prefix = findCommonPrefix(labels);
                  if (prefix.length > 10) return prefix;
                }
                return '제목 없음';
              }
              // 일반 chart: 헤더 정보 붙이기
              return question;
            })()}
          </h3>
        </div>
        {/* 총 응답 갯수: 제목 아래, 오른쪽 정렬, 작은 크기 */}
      </div>
      <div className="flex justify-end mb-2 -mt-2">
        <span className="text-xs text-gray-500">총 응답: {formatNumber(respondentCount || Math.round(data.reduce((sum, item) => sum + item.value, 0)))}개</span>
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
        <div className="mx-auto" style={{ height: chartHeight, width: chartWidth, minWidth: 320, maxWidth: '100%' }}>
          {renderChart()}
        </div>
      </div>
      {/* --- 옵션/버튼 영역: 항상 카드 하단에 --- */}
      {/* 1줄(상단): 드롭다운 메뉴 + 순서변경 */}
      <div className="flex flex-row flex-wrap items-center gap-1 mt-auto mb-1">
        <select
          value={chartType}
          onChange={e => onChartTypeChange(e.target.value as ChartType)}
          className="border rounded px-1 py-0.5 text-[11px]"
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
          className="border rounded px-1 py-0.5 text-[11px]"
        >
          <option value="likert">리커트 척도</option>
          <option value="multiple">객관식</option>
          <option value="multiple_select">복수응답</option>
          <option value="open">주관식</option>
          <option value="matrix">행렬형</option>
        </select>
        {(chartType === 'vertical' || chartType === 'horizontal' || chartType === 'verticalStacked' || chartType === 'horizontalStacked' || chartType === 'verticalMatrix' || chartType === 'horizontalMatrix') && (
          <div className="flex items-center gap-1 text-[11px]">
            <span>y축</span>
            <select
              value={customYMax}
              onChange={e => setCustomYMax(e.target.value as 'auto' | 100 | 50)}
              className="border rounded px-1 py-0.5 text-[11px]"
            >
              <option value="auto">자동</option>
              <option value={100}>100</option>
              <option value={50}>50</option>
            </select>
            <span>막대 두께</span>
            <select
              value={barThickness}
              onChange={e => setBarThickness(Number(e.target.value))}
              className="border rounded px-1 py-0.5 text-[11px]"
            >
              {barThicknessOptions.map(val => (
                <option
                  key={val}
                  value={val}
                  style={val === defaultThickness ? { color: '#2563eb', fontWeight: 600 } : {}}
                >
                  {val}px{val === defaultThickness ? ' (원본)' : ''}
                </option>
              ))}
            </select>
          </div>
        )}
        {/* 순서 변경 버튼 */}
        {onMoveUp && <button onClick={onMoveUp} className="text-xs px-1 text-blue-500 hover:text-blue-700" title="카드 위로 이동">▲</button>}
        {onMoveDown && <button onClick={onMoveDown} className="text-xs px-1 text-blue-500 hover:text-blue-700" title="카드 아래로 이동">▼</button>}
      </div>
      {/* 2줄(하단): 크기조절/삭제/데이터테이블 */}
      <div className="flex flex-row flex-wrap items-center gap-1 mb-1">
        <button onClick={() => onGridSizeChange({ ...gridSize, w: gridSize.w - 1 })} className="text-xs px-1">◀</button>
        <button onClick={() => onGridSizeChange({ ...gridSize, w: gridSize.w + 1 })} className="text-xs px-1">▶</button>
        <button onClick={() => onGridSizeChange({ ...gridSize, h: gridSize.h - 1 })} className="text-xs px-1">▲</button>
        <button onClick={() => onGridSizeChange({ ...gridSize, h: gridSize.h + 1 })} className="text-xs px-1">▼</button>
        {onDelete && <button onClick={onDelete} className="text-xs px-1 text-red-500">삭제</button>}
        <button
          onClick={() => setDataTableOpen(open => !open)}
          className="text-xs bg-gray-100 text-gray-700 rounded px-2 py-0.5"
        >
          {dataTableOpen ? '데이터 테이블 닫기' : '데이터 테이블 열기'}
        </button>
        {/* 그래프 렌더링 버튼 */}
        <div className="mb-1 font-semibold flex justify-between items-center">
          <span>데이터 테이블 (편집 가능)</span>
          <div className="flex flex-row items-center gap-1">
            <button
              className="px-2 py-0.5 text-xs bg-blue-200 rounded hover:bg-blue-300"
              onClick={handleRenderChart}
            >
              그래프 렌더링
            </button>
            <button
              className="px-2 py-0.5 text-xs bg-gray-200 rounded hover:bg-gray-300"
              onClick={() => setLocalTableData(withRowId(data))}
            >
              (초기화)
            </button>
          </div>
        </div>
      </div>
      {/* 데이터 테이블 토글 */}
      {dataTableOpen && (
        <div className="mt-2 border rounded bg-gray-50 p-2 text-xs">
          <table className="w-full border text-xs">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-1">순서</th>
                <th className="p-1">응답 항목
                  <button onClick={() => handleSort('label')} className="ml-1 text-gray-500">▲▼</button>
                </th>
                <th className="p-1">응답갯수
                  <button onClick={() => handleSort('value')} className="ml-1 text-gray-500">▲▼</button>
                </th>
                <th className="p-1">비율(%)
                  <button onClick={() => handleSort('percent')} className="ml-1 text-gray-500">▲▼</button>
                </th>
                <th className="p-1">기타응답</th>
                <th className="p-1">이동</th>
              </tr>
            </thead>
            <tbody>
              {sortedTableData.map((row, idx) => {
                const percent = getPercent(row.value);
                return (
                  <tr key={row.id}>
                    <td>{idx + 1}</td>
                    <td>
                      <input
                        className="border rounded px-1 py-0.5 w-full"
                        value={row.label}
                        onChange={e => {
                          const newData = [...localTableData];
                          const realIdx = localTableData.findIndex((r: { id: string }) => r.id === row.id);
                          newData[realIdx] = { ...row, label: e.target.value };
                          setLocalTableData(newData);
                        }}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="border rounded px-1 py-0.5 w-16 text-right"
                        value={row.value}
                        min={0}
                        onChange={e => {
                          const newVal = Number(e.target.value);
                          const newData = [...localTableData];
                          const realIdx = localTableData.findIndex((r: { id: string }) => r.id === row.id);
                          newData[realIdx] = { ...row, value: newVal };
                          setLocalTableData(newData);
                        }}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="border rounded px-1 py-0.5 w-16 text-right"
                        value={percent}
                        min={0}
                        max={100}
                        step={0.1}
                        onChange={e => {
                          const newPercent = Number(e.target.value);
                          const newVal = Math.round((newPercent / 100) * totalResponses);
                          const newData = [...localTableData];
                          const realIdx = localTableData.findIndex((r: { id: string }) => r.id === row.id);
                          newData[realIdx] = { ...row, value: newVal };
                          setLocalTableData(newData);
                        }}
                      />
                    </td>
                    <td className="text-center">
                      <input
                        type="checkbox"
                        checked={!!row.isOther}
                        onChange={e => {
                          const newData = [...localTableData];
                          const realIdx = localTableData.findIndex((r: { id: string }) => r.id === row.id);
                          newData[realIdx] = { ...row, isOther: e.target.checked };
                          setLocalTableData(newData);
                        }}
                      />
                    </td>
                    <td>
                      <button onClick={() => moveRow(idx, -1)} disabled={idx === 0} className="text-xs px-1">▲</button>
                      <button onClick={() => moveRow(idx, 1)} disabled={idx === sortedTableData.length - 1} className="text-xs px-1">▼</button>
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