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
import WordCloudChart from './WordCloudChart';
import TopNList from './TopNList';
import ProgressOverlay from './ProgressOverlay';

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
  pdfExportMode?: boolean;
  gridColumns?: number;
  isReportMode?: boolean;
  hideTitle?: boolean;
  dataTable?: {
    headers: string[];
    data: any[];
    questionRowIndex?: number;
  };
  onTitleChange: (newTitle: string) => void;
  displayTexts?: string[];
}

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend, Title);
ChartJS.register(ChartDataLabels);

// 기타응답 전용 회색 (모든 그래프에서 동일하게 사용, 다른 팔레트에는 절대 포함 X)
const OTHER_GRAY = '#B0B0B0';

// 리커트/행렬형 전용 색상 (3점: 훨씬 옅은 노란색으로 변경)
const likertColors = [
  '#2563eb', // 매우만족(5점)
  '#60a5fa', // 만족(4점)
  '#FFF9C4', // 보통(3점) - 훨씬 옅은 노란색
  '#fca5a5', // 불만족(2점)
  '#f43f5e', // 매우불만족(1점)
];

// 행렬형 전용 컬러 팔레트 (채도 빠진 짙은 남색으로 통일)
const matrixColors = [
  '#1e293b', '#1e293b', '#1e293b', '#1e293b',
  '#1e293b', '#1e293b', '#1e293b', '#1e293b',
  '#1e293b', '#1e293b', '#1e293b', '#1e293b'
];

// 객관식 전용 컬러 팔레트 (비비드한 무지개 계열, 12단계)
const objectiveColors = [
  '#ef4444', // 선명한 빨강
  '#f97316', // 선명한 주황
  '#eab308', // 선명한 노랑
  '#22c55e', // 선명한 초록
  '#06b6d4', // 선명한 청록
  '#3b82f6', // 선명한 파랑
  '#8b5cf6', // 선명한 보라
  '#ec4899', // 선명한 핑크
  '#f59e0b', // 선명한 주황2
  '#10b981', // 선명한 민트
  '#6366f1', // 선명한 인디고
  '#84cc16'  // 선명한 라임
];

// 복수응답 전용 컬러 팔레트 (갈색~베이지~카키 계열 베리에이션, 12단계, 밝은색부터)
const multiSelectColors = [
  '#8b4513', // 새들 갈색 (가장 밝은)
  '#b8860b', // 다크골든로드
  '#daa520', // 골든로드 갈색
  '#d2691e', // 초콜릿 갈색
  '#cd853f', // 페루 갈색
  '#a0522d', // 시에나 갈색
  '#8b7355', // 베이지 갈색
  '#6b5b47', // 연한 갈색
  '#5d4e37', // 중간 갈색
  '#4b3a2f', // 현재 갈색
  '#3d2317', // 짙은 갈색
  '#2d1810'  // 매우 짙은 갈색 (가장 어두운)
];

// 기존 palette는 객관식에만 사용하도록 변경
const palette = objectiveColors;

// 숫자 3자리마다 콤마를 찍는 함수
function formatNumber(n: number) {
  return n.toLocaleString('ko-KR');
}

// 배경색에 따라 적절한 텍스트 색상(검/흰)을 반환하는 헬퍼 함수
function hexToRgb(hex: string) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

function getTextColorForBackground(hexColor: string) {
    if (!hexColor) return '#000';
    const rgb = hexToRgb(hexColor);
    if (!rgb) return '#000';
    const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
    return luminance > 0.6 ? '#000' : '#fff';
}

// 라벨 가공 함수 추가
function ellipsisLabel(label: string, max = 10) {
  return label.length > max ? label.slice(0, max) + '...' : label;
}

// 이미 '(텍스트)'가 포함된 라벨이면 중복 추가를 피하고, 없으면 "라벨 (텍스트)"로 합치는 헬퍼
function concatLabel(base: string, text: string) {
  if (!text) return base;
  const trimmed = base.trim();
  // 이미 괄호가 포함되어 있으면 그대로 사용
  if (/\(.+\)/.test(trimmed)) return trimmed;
  return `${trimmed} (${text})`;
}

// 팔레트에서 N개의 색상을 분산하여 추출하는 함수로 변경
function generateColorSet(n: number, palette: string[]): string[] {
  if (n <= 0) return [];
  const filteredPalette = palette.filter(c => c.toLowerCase() !== OTHER_GRAY.toLowerCase());
  const len = filteredPalette.length;
  if (len === 0) return Array(n).fill('#cccccc');

  const colors: string[] = [];
  if (n > len) {
    // 필요한 색상이 팔레트보다 많으면, 팔레트를 반복 사용
    for (let i = 0; i < n; i++) {
      colors.push(filteredPalette[i % len]);
    }
  } else {
    // 팔레트에서 필요한 개수만큼 건너뛰며 색상 선택
    const step = Math.floor(len / n);
    for (let i = 0; i < n; i++) {
      colors.push(filteredPalette[i * step]);
    }
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
  data: Array<{ label: string; value: number; isOther?: boolean; id?: string }>,
  respondentCount: number | undefined,
  matrixColors: string[],
  barThickness: number
) {
  const datasetData = data.map(d => d.value);
  const numDataPoints = data.filter(d => !d.isOther).length;
  const distributedColors = generateColorSet(numDataPoints, matrixColors);
  let colorIndex = 0;
  const backgroundColor = data.map(d => d.isOther ? OTHER_GRAY : distributedColors[colorIndex++]);
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
  data: Array<{ label: string; value: number; count?:number; isOther?: boolean; id?: string }>,
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
  const numDataPoints = data.filter(d => !d.isOther).length;
  let colorIndex = 0;

  if (questionType === 'multiple_select') {
    const sum = data.reduce((acc, d) => acc + d.value, 0);
    datasetData = sum ? data.map(v => Math.round((v.value / sum) * 1000) / 10) : data.map(() => 0);
    backgroundColor = data.map((d) => d.isOther ? OTHER_GRAY : generateColorSet(numDataPoints, multiSelectColors)[colorIndex++]);
  } else if (questionType === 'likert' || questionType === 'matrix') {
    datasetData = totalResponses ? data.map(v => Math.round((v.value / totalResponses) * 1000) / 10) : data.map(() => 0);
    backgroundColor = data.map((d, i) => d.isOther ? OTHER_GRAY : likertColors[i % likertColors.length]);
  } else {
    datasetData = totalResponses ? data.map(v => Math.round((v.value / totalResponses) * 1000) / 10) : data.map(() => 0);
    backgroundColor = data.map((d) => d.isOther ? OTHER_GRAY : generateColorSet(numDataPoints, objectiveColors)[colorIndex++]);
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
  data: Array<{ label: string; value: number; isOther?: boolean; id?: string }>,
  respondentCount: number | undefined,
  palette: string[],
  barThickness: number,
  barPercentage: number,
  categoryPercentage: number,
  displayTexts?: string[]
) {
  // labels: [질문 텍스트 1개]
  // datasets: 각 응답 옵션별로 하나씩, 값은 비율(%)
  const numDataPoints = data.filter(d => !d.isOther).length;
  const distributedColors = generateColorSet(numDataPoints, palette);
  let colorIndex = 0;
  return {
    labels: [''],
    datasets: data.map((d, index) => {
      let datasetLabel = d.label;
      if (displayTexts && displayTexts.length > index) {
        datasetLabel = concatLabel(d.label, displayTexts[index] || '');
      }
      return {
        label: datasetLabel,
        data: [d.value], // 비율(%) 그대로 사용
        backgroundColor: d.isOther ? OTHER_GRAY : distributedColors[colorIndex++],
        borderRadius: 0,
        barPercentage,
        categoryPercentage,
        barThickness,
      };
    })
  };
}

// barThickness 디폴트 계산 함수
function getDefaultBarThickness(chartType: ChartType, dataLen: number) {
  if (chartType === 'verticalStacked' || chartType === 'horizontalStacked') return 65;
  if (chartType === 'verticalMatrixStacked' || chartType === 'horizontalMatrixStacked') return 65;
  if (chartType === 'vertical' || chartType === 'horizontal') return 54;
  if (chartType === 'verticalMatrix' || chartType === 'horizontalMatrix') {
    // 데이터 개수에 따라 자동(최소 30, 최대 90, 300/개수)
    if (!dataLen || dataLen <= 0) return 54;
    return Math.max(30, Math.min(90, Math.floor(300 / dataLen)));
  }
  return 54;
}

// id가 없는 경우 자동으로 생성하는 함수
function withRowId(arr: Response[]): Response[] {
  return arr.map((item, index) => ({
    ...item,
    id: item.id || `row_${index}`
  }));
}

// --- 주관식 데이터에서 단어 빈도 추출 함수 ---
function extractWordCounts(data: Response[]): { text: string; value: number }[] {
  const wordMap: Record<string, number> = {};
  data.forEach(d => {
    // 한글, 영문 단어 단위로 분리
    const words = (d.label || '').split(/\s+/).map(w => w.trim()).filter(Boolean);
    words.forEach(word => {
      if (!word) return;
      wordMap[word] = (wordMap[word] || 0) + 1;
    });
  });
  return Object.entries(wordMap).map(([text, value]) => ({ text, value }));
}

function extractSentenceCounts(data: Response[]): { text: string; value: number }[] {
  const map: Record<string, number> = {};
  data.forEach(d => {
    const text = (d.label || '').trim();
    if (!text) return;
    map[text] = (map[text] || 0) + 1;
  });
  return Object.entries(map).map(([text, value]) => ({ text, value }));
}

// --- 행렬형 누적 비교 차트 데이터 생성 함수 ---
function getMatrixStackedChartData(
  data: Array<{ label: string; value: number; isOther?: boolean; id?: string }>,
  responseOrder: string[] | undefined,
  likertColors: string[],
  barThickness: number,
  displayTexts?: string[]
) {
  const subQuestions = new Set<string>();
  data.forEach(item => {
    const parts = item.label.split('_');
    if (parts.length >= 2) {
      subQuestions.add(parts[0]);
    }
  });
  const subQuestionsArray = Array.from(subQuestions);

  const likertResponsesArray = responseOrder || Array.from(new Set(data.map(item => {
    const parts = item.label.split('_');
    return parts.length >= 2 ? parts[1] : item.label;
  })));

  const totalsBySubQuestion: Record<string, number> = {};
  subQuestionsArray.forEach(sq => {
    totalsBySubQuestion[sq] = data
      .filter(d => d.label.startsWith(sq + '_'))
      .reduce((sum, item) => sum + item.value, 0);
  });

  const datasets = likertResponsesArray.map((likertResponse, likertIndex) => {
    const dataForThisDataset = subQuestionsArray.map((subQuestion) => {
      const fullLabel = `${subQuestion}_${likertResponse}`;
      const item = data.find(d => d.label === fullLabel);
      const totalForSubQuestion = totalsBySubQuestion[subQuestion];
      const percentage = item && totalForSubQuestion ? Math.round((item.value / totalForSubQuestion) * 100) : 0;
      return percentage;
    });

    // dataset의 label도 displayTexts가 있으면 점수 (텍스트) 형태로 생성
    let datasetLabel = likertResponse;
    if (displayTexts && displayTexts.length > likertIndex) {
      datasetLabel = concatLabel(likertResponse, displayTexts[likertIndex] || '');
    }

    return {
      label: datasetLabel,
      data: dataForThisDataset,
      backgroundColor: likertColors[likertIndex % likertColors.length],
      borderRadius: 0,
      barPercentage: 0.75,
      categoryPercentage: 0.85,
      barThickness,
    };
  });

  // subQuestions가 비어있으면 likertResponses를 labels로 사용
  let labels = subQuestionsArray.length > 0 ? subQuestionsArray : likertResponsesArray;
  
  // subQuestions가 비어있고 displayTexts가 있으면 점수 (텍스트) 형태로 라벨 생성
  if (subQuestionsArray.length === 0 && displayTexts && displayTexts.length === likertResponsesArray.length) {
    labels = likertResponsesArray.map((r, i) => {
      const cleanText = displayTexts[i] || '';
      return concatLabel(r, cleanText);
    });
  }

  const finalChartData = {
    labels,
    datasets
  };
  
  return finalChartData;
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
  pdfExportMode,
  gridColumns = 4,
  isReportMode = false,
  hideTitle = false,
  dataTable,
  onTitleChange,
  displayTexts,
}) => {
  const [dataTableOpen, setDataTableOpen] = useState(isReportMode);
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

  // 데이터 개수가 7개 이상이면 자동으로 두께를 줄임
  const getAutoBarThickness = (chartType: ChartType, dataLen: number) => {
    if ((chartType === 'vertical' || chartType === 'horizontal') && dataLen >= 7) {
      // 7개 이상이면 카드 영역에 맞게 40 이하로 자동 조정
      return Math.max(24, Math.floor(320 / dataLen));
    }
    if ((chartType === 'verticalStacked' || chartType === 'horizontalStacked' || chartType === 'verticalMatrixStacked' || chartType === 'horizontalMatrixStacked') && dataLen >= 7) {
      return Math.max(24, Math.floor(320 / dataLen));
    }
    return getDefaultBarThickness(chartType, dataLen);
  };

  const [barThickness, setBarThickness] = useState<number>(() => getAutoBarThickness(chartType, data?.length || 0));
  // 차트 유형/데이터 개수 변경 시 디폴트값 자동 적용
  React.useEffect(() => {
    setBarThickness(getAutoBarThickness(chartType, data?.length || 0));
  }, [chartType, data?.length]);

  // --- 차트 데이터 메모이제이션 ---
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

    let sortedData: Response[];

    if (questionType === 'multiple_select') {
      // 복수응답: '기타'를 제외하고 내림차순 정렬 후, '기타'를 맨 뒤에 붙임
      const otherItems = data.filter(d => d.isOther);
      const regularItems = data.filter(d => !d.isOther);
      regularItems.sort((a, b) => b.value - a.value);
      sortedData = [...regularItems, ...otherItems];
    } else {
      // 그 외의 경우 '기타' 항목을 맨 뒤로 정렬
      sortedData = [
        ...data.filter(d => !d.isOther),
        ...data.filter(d => d.isOther)
      ];
    }
    
    const finalSortedData = withRowId(sortedData);

    // displayTexts가 있으면 라벨을 '점수 (텍스트)' 형태로 합쳐서 사용
    let labels: string[];
    
    if (displayTexts && displayTexts.length === finalSortedData.length) {
      labels = finalSortedData.map((d, i) => {
        const cleanText = displayTexts[i] || '';
        return concatLabel(d.label, cleanText);
      });
    } else if (displayTexts && displayTexts.length > 0 && displayTexts.length === (finalSortedData.filter(d => !d.isOther).length)) {
      labels = [
        ...finalSortedData.filter(d => !d.isOther).map((d, i) => {
          const cleanText = displayTexts[i] || '';
          return concatLabel(d.label, cleanText);
        }),
        ...finalSortedData.filter(d => d.isOther).map(d => d.label)
      ];
    } else {
      labels = finalSortedData.map(d => d.label);
    }
    // 디버깅 로그 추가
    console.log('[ChartCard] 최종 labels:', labels);
    console.log('[ChartCard] displayTexts:', displayTexts);
    console.log('[ChartCard] finalSortedData:', finalSortedData);
    const values = finalSortedData.map(d => d.value);
    let backgroundColors;
    if (colors && colors.length > 0) {
      backgroundColors = colors.slice(0, finalSortedData.length);
    } else if (chartType === 'verticalMatrix' || chartType === 'horizontalMatrix') {
      backgroundColors = finalSortedData.map((d, i) => d.isOther ? OTHER_GRAY : matrixColors[i % matrixColors.length]);
    } else if (questionType === 'likert' || questionType === 'matrix') {
      backgroundColors = finalSortedData.map((d, i) => d.isOther ? OTHER_GRAY : likertColors[i % likertColors.length]);
    } else {
      backgroundColors = finalSortedData.map((d, i) => d.isOther ? OTHER_GRAY : generateColorSet(finalSortedData.length, objectiveColors)[i]);
    }

    return {
      labels,
      values,
      backgroundColors,
      sortedData: finalSortedData
    };
  }, [data, colors, questionType, chartType, displayTexts]);

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
          anchor: 'end' as const,
          align: 'end' as const,
          formatter: (value: number) => {
            if (value === undefined || value === null) return '';
            const rounded = Math.round(value * 10) / 10;
            return Number.isInteger(rounded) ? `${rounded}%` : `${rounded.toFixed(1)}%`;
          },
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

  // --- 차트 데이터 useMemo 분리 ---
  const [localTableData, setLocalTableData] = useState<Response[]>(() => withRowId(data));
  const [sortConfig, setSortConfig] = useState<{ key: 'label' | 'value' | 'percent'; direction: 'asc' | 'desc' } | null>(null);

  useEffect(() => {
    setLocalTableData(withRowId(data));
  }, [data]);

  // 정렬 함수
  const handleSort = (key: 'label' | 'value' | 'percent') => {
    setSortConfig(prev => {
      if (prev && prev.key === key) {
        // 같은 키면 방향 토글
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'desc' };
    });
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

  // 행 이동 함수 (localTableData의 실제 순서 기준으로 이동, sortedTableData는 화면 표시용)
  const moveRow = (sortedIdx: number, direction: -1 | 1) => {
    const row = sortedTableData[sortedIdx];
    const realIdx = localTableData.findIndex((r) => (r.id ?? '') === (row.id ?? ''));
    const to = realIdx + direction;
    if (to < 0 || to >= localTableData.length) return;
    const arr = [...localTableData];
    const [moved] = arr.splice(realIdx, 1);
    arr.splice(to, 0, moved);
    setLocalTableData(arr);
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

  // label에 id를 붙여 Chart.js에 넘기기 (차트 전용 데이터 사용)
  const chartLabels = chartData.sortedData.map(d => `${d.label}__${d.id ?? ''}`);

  // 총합 계산
  const totalResponses = useMemo(() => localTableData.reduce((sum: number, item: { value: number }) => sum + item.value, 0), [localTableData]);

  // getPercent 함수는 한 번만 선언하고, 모든 곳에서 재사용
  const getPercent = (val: number) => {
    if (!totalResponses || totalResponses === 0) return 0;
    return Math.round((val / totalResponses) * 1000) / 10;
  };

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

    // displayTexts가 적용된 라벨 생성
    const displayLabels = chartData.sortedData.map((d, i) =>
      displayTexts && displayTexts[i] ? concatLabel(d.label, displayTexts[i]) : d.label
    );

    // 데이터 레이블 설정: 차트 유형에 따라 분기
    const datalabelsConfig = {
      display: true,
      font: { weight: 'bold' as const },
      formatter: (value: number) => {
        if (value === undefined || value === null) return '';
        const rounded = Math.round(value * 10) / 10;
        return Number.isInteger(rounded) ? `${rounded}%` : `${rounded.toFixed(1)}%`;
      },
      ...(chartType === 'pie' || chartType === 'donut'
        ? {
            anchor: 'center' as const,
            align: 'center' as const,
            offset: 0,
            clamp: true,
            color: '#000',
          }
        : {
            anchor: 'end' as const,
            align: 'end' as const,
            color: '#000',
          }),
    };

    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: { enabled: true, padding: 10, backgroundColor: 'rgba(0, 0, 0, 0.8)' },
        title: { display: false },
        datalabels: datalabelsConfig,
      },
      ...(isBarType ? {
        indexAxis: chartType === 'vertical' || chartType === 'verticalStacked' || chartType === 'verticalMatrix' ? 'x' : 'y',
        scales: chartType === 'vertical' || chartType === 'verticalStacked' || chartType === 'verticalMatrix'
          ? {
              x: {
                grid: { display: true, drawOnChartArea: true, color: '#e5e7eb' },
                ticks: {
                  callback: (v: any, idx: number) => {
                    // displayTexts가 적용된 라벨 사용
                    const label = displayLabels[idx] || '';
                    return ellipsisLabel(label, 10);
                  },
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
                  callback: (v: any, idx: number) => {
                    const label = displayLabels[idx] || '';
                    return ellipsisLabel(label, 10);
                  },
                  maxRotation: 45,
                  minRotation: 0,
                  autoSkip: false,
                },
              },
            },
      } : {})
    };
  }, [chartType, chartData.labels, chartData.values, displayTexts]);

  const matrixChartDataConfig = useMemo(() => getMatrixChartData(chartData.sortedData, respondentCount, matrixColors, barThickness), [chartData.sortedData, respondentCount, barThickness]);
  const matrixStackedChartDataConfig = useMemo(() => {
    const config = getMatrixStackedChartData(data, responseOrder, likertColors, barThickness, displayTexts);
    console.log('[ChartCard] matrixStackedChartDataConfig:', config);
    return config;
  }, [data, responseOrder, likertColors, barThickness, displayTexts]);
  const generalChartDataConfig = useMemo(() => {
    // labels를 점수+텍스트 배열로 생성
    const labels = chartData.sortedData.map((d, i) =>
      displayTexts && displayTexts[i] ? concatLabel(d.label, displayTexts[i]) : d.label
    );
    const dataArr = chartData.sortedData.map(d => d.value);
    const base = getGeneralChartData(chartData.sortedData, questionType, respondentCount, palette, likertColors, generateColorSet, barThickness);
    const config = {
      ...base,
      labels,
      datasets: [{
        ...base.datasets[0],
        data: dataArr,
      }],
    };
    console.log('[ChartCard] generalChartDataConfig:', config);
    return config;
  }, [chartData.sortedData, questionType, respondentCount, barThickness, chartLabels, palette, likertColors, displayTexts]);
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
    
    // getStackedChartData 함수를 사용하여 올바른 누적 차트 데이터 생성
    const config = getStackedChartData(chartData.sortedData, respondentCount, colorSet, barThickness, barP, catP, displayTexts);
    console.log('[ChartCard] stackedChartDataConfig:', config);
    return config;
  }, [chartData.sortedData, respondentCount, questionType, barThickness, displayTexts, palette, likertColors, objectiveColors, multiSelectColors]);

  // --- 옵션 useMemo 분리 ---
  const matrixStackedChartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { 
        display: false,
      },
      tooltip: { enabled: true, padding: 10, backgroundColor: 'rgba(0, 0, 0, 0.8)' },
      title: { display: false },
      datalabels: {
        display: true,
        color: '#000',
        font: { weight: 'bold' },
        anchor: 'center',
        align: 'center',
        formatter: (value: number) => value === undefined || value === null ? '' : `${value.toFixed(2)}%`,
      }
    },
    indexAxis: chartType === 'verticalMatrixStacked' ? 'x' : 'y',
    scales: chartType === 'verticalMatrixStacked'
      ? {
          x: { 
            stacked: true, 
            grid: { display: true, color: '#e5e7eb' }, 
            ticks: { 
              display: true,
              maxRotation: 45,
              minRotation: 0
            } 
          },
          y: { 
            stacked: true, 
            beginAtZero: true, 
            max: 100, 
            ticks: { 
              display: true,
              callback: (v: any) => `${v}%` 
            } 
          },
        }
      : {
          x: { 
            stacked: true, 
            beginAtZero: true, 
            max: 100, 
            ticks: { 
              display: true,
              callback: (v: any) => `${v}%` 
            } 
          },
          y: { 
            stacked: true, 
            grid: { display: true, color: '#e5e7eb' }, 
            ticks: { 
              display: true,
              maxRotation: 45,
              minRotation: 0
            } 
          },
        },
  }), [chartType]);

  const stackedChartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { 
        display: false,
      },
      tooltip: { enabled: true, padding: 10, backgroundColor: 'rgba(0, 0, 0, 0.8)' },
      title: { display: false },
      datalabels: {
        display: true,
        color: '#000',
        font: { weight: 'bold' },
        anchor: 'center',
        align: 'center',
        formatter: (value: number) => value === undefined || value === null ? '' : `${value.toFixed(2)}%`,
      }
    },
    indexAxis: chartType === 'verticalStacked' ? 'x' : 'y',
    scales: chartType === 'verticalStacked'
      ? {
          x: { stacked: true, grid: { display: true, color: '#e5e7eb' }, ticks: { display: true } },
          y: { stacked: true, beginAtZero: true, max: 100, ticks: { display: true, callback: (v: any) => `${v}%` } },
        }
      : {
          x: { stacked: true, beginAtZero: true, max: 100, ticks: { display: true, callback: (v: any) => `${v}%` } },
          y: { stacked: true, grid: { display: true, color: '#e5e7eb' }, ticks: { display: true } },
        },
  }), [chartType]);

  const defaultThickness = getDefaultBarThickness(chartType, data?.length || 0);
  let barThicknessOptions = Array.from({length: 10}, (_, i) => 30 + i * 10); // [30,40,...,120]
  if (!barThicknessOptions.includes(defaultThickness)) {
    barThicknessOptions = [defaultThickness, ...barThicknessOptions];
  }

  // 차트 컴포넌트 렌더링
  // 차트 데이터가 바뀔 때마다 강제 리렌더링을 위해 key를 부여
  const chartKey = sortedTableData.map(d => d.id || '').join('-');
  const [isChartLoading, setIsChartLoading] = React.useState(false);
  const [chartProgress, setChartProgress] = React.useState(0);
  const [chartMsg, setChartMsg] = React.useState('');
  const [chartError, setChartError] = React.useState('');
  const [chartRendered, setChartRendered] = React.useState(false);

  // 워드클라우드/TopN 차트 렌더링 프로그레스 useEffect를 컴포넌트 최상단에서 관리
  React.useEffect(() => {
    if (questionType === 'open' && (chartType === 'wordcloud' as ChartType || chartType === 'topN' as ChartType)) {
      if (!isChartLoading && !chartRendered) {
        setIsChartLoading(true);
        setChartProgress(10);
        setChartMsg('주관식 데이터 처리 중...');
        setChartError('');
        const timer = setTimeout(() => {
          setChartProgress(80);
          setChartMsg('차트 시각화 중...');
          setTimeout(() => {
            setChartProgress(100);
            setIsChartLoading(false);
            setChartRendered(true);
          }, 400);
        }, 600);
        return () => clearTimeout(timer);
      }
    } else {
      setIsChartLoading(false);
      setChartRendered(false);
    }
  }, [questionType, chartType, data]);

  const renderChart = () => {
    const isMatrixChart = chartType === 'verticalMatrix' || chartType === 'horizontalMatrix';
    const isMatrixStackedChart = chartType === 'verticalMatrixStacked' || chartType === 'horizontalMatrixStacked';
    
    if (isMatrixChart) {
      return (
        <Bar
          key={chartKey}
          ref={chartRef}
          data={matrixChartDataConfig}
          options={matrixChartOptions as ChartOptions<'bar'>}
        />
      );
    }
    if (isMatrixStackedChart) {
      return (
        <>
          <Bar
            key={chartKey}
            ref={chartRef}
            data={matrixStackedChartDataConfig}
            options={matrixStackedChartOptions as ChartOptions<'bar'>}
          />
          {/* 커스텀 범례 */}
          {responseOrder && responseOrder.length > 0 && (
            <div className="flex justify-center items-center gap-4 mt-2 mb-2">
              {responseOrder.map((label, index) => {
                // displayTexts가 있으면 점수 (텍스트) 형태로 표시
                let legendLabel = label;
                if (displayTexts && displayTexts.length > index) {
                  const cleanText = displayTexts[index] || '';
                  legendLabel = concatLabel(label, cleanText);
                }
                
                return (
                  <div key={index} className="flex items-center gap-1">
                    <div 
                      className="w-3 h-3 rounded-sm"
                      style={{ backgroundColor: likertColors[index % likertColors.length] }}
                    />
                    <span className="text-xs text-gray-700">{legendLabel}</span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      );
    }
    if (chartType === 'verticalStacked' || chartType === 'horizontalStacked') {
      return (
        <Bar
          key={chartKey}
          ref={chartRef}
          data={stackedChartDataConfig}
          options={stackedChartOptions as ChartOptions<'bar'>}
        />
      );
    }
    if (chartType === 'vertical' || chartType === 'horizontal') {
      return (
        <Bar
          key={chartKey}
          ref={chartRef}
          data={generalChartDataConfig}
          options={generalChartOptions as ChartOptions<'bar'>}
        />
      );
    }
    if (chartType === 'pie') {
      return (
        <Pie
          key={chartKey}
          ref={chartRef}
          data={generalChartDataConfig}
          options={generalChartOptions as ChartOptions<'pie'>}
        />
      );
    }
    if (chartType === 'donut') {
      return (
        <Doughnut
          key={chartKey}
          ref={chartRef}
          data={generalChartDataConfig}
          options={generalChartOptions as ChartOptions<'doughnut'>}
        />
      );
    }
    if (questionType === 'open' && (chartType === 'wordcloud' as ChartType || chartType === 'topN' as ChartType)) {
      let sampledData = data;
      let isSampled = false;
      if (data.length > 5000) {
        // 5000개만 무작위 추출
        const shuffled = [...data].sort(() => Math.random() - 0.5);
        sampledData = shuffled.slice(0, 5000);
        isSampled = true;
      }
      // 차트는 프로그레스가 끝나야 렌더링
      if (isChartLoading) return <ProgressOverlay isOpen={true} progress={chartProgress} message={chartMsg} />;
      if (chartType === 'wordcloud') {
        const words = extractWordCounts(sampledData);
        return <>
          {isSampled && (
            <div className="text-xs text-yellow-700 text-center mb-2">데이터가 많아 5000개만 무작위로 시각화됩니다.</div>
          )}
          <WordCloudChart words={words} width={chartWidth} height={chartHeight} />
        </>;
      }
      if (chartType === 'topN') {
        const items = extractSentenceCounts(sampledData);
        return <>
          {isSampled && (
            <div className="text-xs text-yellow-700 text-center mb-2">데이터가 많아 5000개만 무작위로 시각화됩니다.</div>
          )}
          <TopNList items={items} topN={10} />
        </>;
      }
    }
    return null;
  };

  const chartMaxWidth = chartData.labels.length >= 7 ? 'max-w-[600px]' : 'max-w-[420px]';

  // 그리드 크기 변경 핸들러 수정
  const handleGridSizeChange = (direction: 'w' | 'h', delta: number) => {
    const newSize = { ...gridSize };
    if (direction === 'w') {
      newSize.w = Math.max(1, Math.min(gridColumns, gridSize.w + delta));
    } else {
      newSize.h = Math.max(1, Math.min(4, gridSize.h + delta));
    }
    onGridSizeChange(newSize);
  };

  const baseContainerClass = "flex flex-col h-full";
  const pdfContainerClass = "bg-transparent p-0 border-none shadow-none";
  const webContainerClass = "bg-white rounded-lg shadow-sm border border-gray-200 p-4 relative";

  const containerClasses = `${baseContainerClass} ${pdfExportMode ? pdfContainerClass : webContainerClass}`;

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editableTitle, setEditableTitle] = useState(question);
  
  // 질문행이 2 이상일 경우, 이전 행을 헤더로 사용
  const headerToShow = headers && questionRowIndex && questionRowIndex > 1
    ? headers[questionRowIndex - 2]
    : null;

  useEffect(() => {
    setEditableTitle(question);
  }, [question]);

  const handleTitleUpdate = () => {
    if (editableTitle.trim() === '') {
      setEditableTitle(question); // 비어있으면 원상복구
    } else {
      onTitleChange(editableTitle);
    }
    setIsEditingTitle(false);
  };

  // 커스텀 범례 렌더링 함수
  const renderCustomLegend = () => {
    if (
      chartType === 'verticalStacked' ||
      chartType === 'horizontalStacked' ||
      chartType === 'pie' ||
      chartType === 'donut'
    ) {
      let legendItems: { label: string; color: string }[] = [];
      if (chartType === 'pie' || chartType === 'donut') {
        const labels = generalChartDataConfig.labels || [];
        const colors = generalChartDataConfig.datasets[0]?.backgroundColor || [];
        legendItems = labels.map((label: string, i: number) => ({
          label,
          color: Array.isArray(colors) ? colors[i] : colors
        }));
      } else {
        legendItems = stackedChartDataConfig.datasets.map((ds: any) => ({
          label: ds.label,
          color: ds.backgroundColor
        }));
      }
      return (
        <div className="w-full overflow-x-auto">
          <div className="border border-gray-300 bg-white shadow-sm rounded px-4 py-2 w-fit mx-auto">
            <div className="flex flex-nowrap justify-center items-center gap-4">
              {legendItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-sm border border-gray-400"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs text-black whitespace-nowrap">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // 카드 및 그래프 높이/너비 동적 계산
  const chartHeight = 350 + (gridSize.h - 1) * 150; // h=1:350, h=2:500, h=3:650...
  const cardMinHeight = chartHeight + 250; // 카드 전체 높이(그래프+옵션+여백 등)
  const chartWidth = 420 + (gridSize.w - 1) * 180; // w=1:420, w=2:600, w=3:780...

  // 카드 및 그래프 렌더링
  return (
    <div 
      className={containerClasses}
      style={!pdfExportMode ? {
        gridColumn: `span ${gridSize.w}`,
        gridRow: `span ${gridSize.h}`,
      } : {}}
    >
      {/* 캡처 단위를 위해 모든 요소를 포함하는 div */}
      <div className="flex flex-col flex-1">
        {headerToShow && (
          <div className="text-sm font-semibold text-gray-600 mb-2 pb-2 border-b">
            {headerToShow}
          </div>
        )}
        {!hideTitle && (
          <div className="flex justify-between items-start mb-1">
            <div className="flex-1" onDoubleClick={() => !isReportMode && setIsEditingTitle(true)} title={isReportMode ? "" : "제목을 더블클릭하여 수정"}>
              {isEditingTitle ? (
                <textarea
                  value={editableTitle}
                  onChange={(e) => setEditableTitle(e.target.value)}
                  onBlur={handleTitleUpdate}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleTitleUpdate();
                    } else if (e.key === 'Escape') {
                      setIsEditingTitle(false);
                      setEditableTitle(question);
                    }
                  }}
                  className="w-full border rounded p-1 text-base font-bold bg-blue-50 resize-none"
                  autoFocus
                  rows={2}
                />
              ) : (
                <div className="text-base font-bold break-words cursor-pointer">{question}</div>
              )}
            </div>
          </div>
        )}
        {/* 총 응답 갯수: 제목 바로 아래 */}
        <div className="flex justify-end mb-2 -mt-1">
          <span className="text-xs text-gray-500">총 응답: {formatNumber(respondentCount || Math.round(data.reduce((sum, item) => sum + item.value, 0)))}개</span>
        </div>

        {/* --- 리커트 평균점수 표시 (개선된 버전) --- */}
        {questionType === 'likert' && avgScore !== undefined && avgScore !== null && (
          <div className="mb-3 mt-4 px-2">
            {/* 전체 막대의 컨테이너. 텍스트와 막대가 모두 이 안에 위치. */}
            <div className="relative w-full bg-gray-200 rounded-lg h-6 overflow-hidden">
              
              {/* 1. 배경 (회색 막대 + 검은색 텍스트) */}
              <div className="absolute inset-0 flex justify-center items-center">
                <span 
                  className={`text-sm font-bold ${
                    avgScore <= 2.3 ? 'text-black' : 'text-gray-800'
                  }`}
                >
                  평균 {avgScore.toFixed(2)}점
                </span>
              </div>

              {/* 2. 전경 (동적 색상 막대 + 흰색 텍스트) */}
              {/* 점수에 따라 색상이 동적으로 변경됨: 리커트 척도 그래프와 동일한 색상 사용 */}
              <div
                className="absolute top-0 left-0 h-full rounded-lg overflow-hidden"
                style={{ 
                  width: `${(avgScore / 5) * 100}%`,
                  backgroundColor: (() => {
                    // 리커트 척도 그래프와 동일한 색상 사용
                    if (avgScore <= 1.5) {
                      return '#f43f5e'; // 1점대: 매우불만족 색상
                    } else if (avgScore <= 2.5) {
                      return '#fca5a5'; // 2점대: 불만족 색상
                    } else if (avgScore <= 3.5) {
                      return '#60a5fa'; // 3점대: 만족 색상 (4점에 사용되는 연한 파란색)
                    } else {
                      return '#2563eb'; // 4점대: 매우만족 색상 (5점에 사용되는 진한 파란색)
                    }
                  })()
                }}
              >
                {/* 흰색 텍스트는 보이지 않는 컨테이너 너비를 기준으로 중앙 정렬되어, 검은 텍스트와 정확히 겹침 */}
                <div className="absolute inset-0 flex justify-center items-center" style={{ width: `calc(100% * 5 / ${avgScore || 1})`}}>
                    <span className="text-white text-sm font-bold whitespace-nowrap">
                      평균 {avgScore.toFixed(2)}점
                    </span>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* 차트 영역 */}
        <div className="mt-2 flex-1 flex items-center justify-center">
          <div className="mx-auto" style={{ height: chartHeight, width: chartWidth, minWidth: 320, maxWidth: '100%' }}>
            {renderChart()}
          </div>
        </div>

        {/* 커스텀 범례를 차트 하단에 한 번만 렌더링 */}
        {renderCustomLegend()}

        {/* 데이터 테이블 토글 */}
        {dataTableOpen && (
          <div className="mt-4 border-t pt-2 bg-transparent text-xs">
            <table className="w-full border text-xs">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-1 text-center">순서</th>
                  <th className="p-1 text-center">응답 항목
                    {!isReportMode && <button onClick={() => handleSort('label')} className="ml-1 text-gray-500">▲▼</button>}
                  </th>
                  <th className="p-1 text-center">응답갯수
                    {!isReportMode && <button onClick={() => handleSort('value')} className="ml-1 text-gray-500">▲▼</button>}
                  </th>
                  <th className="p-1 text-center">비율(%)
                    {!isReportMode && <button onClick={() => handleSort('percent')} className="ml-1 text-gray-500">▲▼</button>}
                  </th>
                  <th className="p-1 text-center">기타응답</th>
                  {!isReportMode && <th className="p-1 text-center">이동</th>}
                </tr>
              </thead>
              <tbody>
                {sortedTableData.map((row, idx) => {
                  // 복수응답일 경우, 비율 계산을 위한 총합은 모든 응답의 합
                  const totalForPercentage = questionType === 'multiple_select'
                    ? sortedTableData.reduce((sum, item) => sum + item.value, 0)
                    : totalResponses;
                  
                  const getCorrectPercent = (val: number) => {
                    if (!totalForPercentage || totalForPercentage === 0) return 0;
                    return Math.round((val / totalForPercentage) * 1000) / 10;
                  };

                  const percent = getCorrectPercent(row.value);

                  return (
                    <tr key={row.id}>
                      <td className="text-center">{idx + 1}</td>
                      <td className="text-center">
                        {!isReportMode ? (
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
                        ) : (
                          row.label
                        )}
                      </td>
                      <td className="text-center">
                        {!isReportMode ? (
                          <input
                            type="number"
                            className="border rounded px-1 py-0.5 w-16 text-right"
                            value={questionType === 'multiple_select' ? row.count : row.value}
                            min={0}
                            onChange={e => {
                              const newVal = Number(e.target.value);
                              const newData = [...localTableData];
                              const realIdx = localTableData.findIndex((r: { id: string }) => r.id === row.id);
                              const updatedRow = questionType === 'multiple_select'
                                ? { ...row, count: newVal, value: (newVal / totalForPercentage) * 100 }
                                : { ...row, value: newVal };
                              newData[realIdx] = updatedRow;
                              setLocalTableData(newData);
                            }}
                          />
                        ) : (
                          formatNumber(questionType === 'multiple_select' ? row.count : row.value)
                        )}
                      </td>
                      <td className="text-center">
                        {!isReportMode ? (
                          <input
                            type="number"
                            className="border rounded px-1 py-0.5 w-16 text-right"
                            value={percent}
                            min={0}
                            max={100}
                            step={0.1}
                            onChange={e => {
                              const newPercent = Number(e.target.value);
                              const newVal = Math.round((newPercent / 100) * totalForPercentage);
                              const newData = [...localTableData];
                              const realIdx = localTableData.findIndex((r: { id: string }) => r.id === row.id);
                              newData[realIdx] = { ...row, value: newVal };
                              setLocalTableData(newData);
                            }}
                          />
                        ) : (
                          `${percent}%`
                        )}
                      </td>
                      <td className="text-center">
                        {!isReportMode ? (
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
                        ) : (
                          row.isOther ? 'O' : ''
                        )}
                      </td>
                      {!isReportMode && (
                        <td className="text-center">
                          <button onClick={() => moveRow(idx, -1)} disabled={idx === 0} className="text-xs px-1">▲</button>
                          <button onClick={() => moveRow(idx, 1)} disabled={idx === sortedTableData.length - 1} className="text-xs px-1">▼</button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {/* 초기화 버튼 추가 */}
            {!isReportMode && (
              <div className="mt-2 flex justify-end">
                <button
                  className="text-xs bg-gray-200 text-gray-700 rounded px-2 py-0.5 hover:bg-blue-100"
                  onClick={() => setLocalTableData(withRowId(data))}
                >
                  초기화
                </button>
              </div>
            )}
          </div>
        )}

        {/* --- 옵션/버튼 영역: 분석 페이지(웹)에서만 보임 --- */}
        {!isReportMode && !pdfExportMode && (
          <div className="mt-auto pt-2">
            {/* 1줄(상단): 드롭다운 메뉴 + 순서변경 */}
            <div className="flex flex-row flex-wrap items-center gap-x-3 gap-y-1 mb-1">
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
                <option value="verticalMatrixStacked">세로 누적 비교(행렬형)</option>
                <option value="horizontalMatrixStacked">가로 누적 비교(행렬형)</option>
                {questionType === 'open' && <option value="wordcloud">워드 클라우드</option>}
                {questionType === 'open' && <option value="topN">상위 키워드/문장</option>}
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
              {/* ... (other options like y-axis, bar thickness) ... */}
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-500 font-semibold">순서:</span>
                {onMoveUp && <button onClick={onMoveUp} className="text-xs px-1 text-blue-500 hover:text-blue-700" title="위로 이동">▲</button>}
                {onMoveDown && <button onClick={onMoveDown} className="text-xs px-1 text-blue-500 hover:text-blue-700" title="아래로 이동">▼</button>}
              </div>
            </div>
            {/* 2줄(하단): 크기조절/삭제/데이터테이블 */}
            <div className="flex flex-row flex-wrap items-center gap-x-3 gap-y-1">
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-500 font-semibold">너비:</span>
                <button onClick={() => handleGridSizeChange('w', -1)} disabled={gridSize.w <= 1} className="px-1.5 py-0.5 border rounded-sm text-xs">-</button>
                <button onClick={() => handleGridSizeChange('w', 1)} disabled={gridSize.w >= gridColumns} className="px-1.5 py-0.5 border rounded-sm text-xs">+</button>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-500 font-semibold">높이:</span>
                <button onClick={() => handleGridSizeChange('h', -1)} disabled={gridSize.h <= 1} className="px-1.5 py-0.5 border rounded-sm text-xs">-</button>
                <button onClick={() => handleGridSizeChange('h', 1)} disabled={gridSize.h >= 4} className="px-1.5 py-0.5 border rounded-sm text-xs">+</button>
              </div>
              {onDelete && <button onClick={onDelete} className="text-xs px-1 text-red-500">삭제</button>}
              <button
                onClick={() => setDataTableOpen(open => !open)}
                className="text-xs bg-gray-100 text-gray-700 rounded px-2 py-0.5"
              >
                {dataTableOpen ? '테이블 닫기' : '테이블 열기'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChartCard; 