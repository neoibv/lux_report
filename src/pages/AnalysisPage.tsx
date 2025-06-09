import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useSurveyStore from '../store/surveyStore';
import ChartCard from '../components/ChartCard';
import { LIKERT_SCALES, LikertScale } from '../utils/likertScales';
import { ChartType, QuestionType, QuestionTypeValue } from '../types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import ProgressOverlay from '../components/ProgressOverlay';

// 복수응답 문항의 '_Others'를 '기타'로 묶어 카운팅하는 분석용 데이터 생성 함수
function getProcessedRows(surveyData: any) {
  console.log('getProcessedRows - 입력 데이터:', surveyData);
  if (!surveyData) return [];
  const processedRows = surveyData.rows.map((row: any[]) => [...row]);
  console.log('getProcessedRows - 처리된 행:', processedRows);
  surveyData.questionTypes.forEach((qt: any) => {
    if (qt.type === 'multiple_select') {
      const colIdx = qt.columnIndex;
      processedRows.forEach((prow: any[], i: any) => {
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
  { value: 'wordcloud', label: '워드 클라우드 (주관식)' },
  { value: 'topN', label: '상위 키워드/문장 (주관식)' },
];

// 유형별 라벨과 색상 정의 (QuestionTypePage.tsx와 동일하게)
const typeLabels = {
  likert: '리커트 척도',
  multiple: '객관식',
  matrix: '행렬형',
  multiple_select: '복수 응답',
  open: '주관식'
};
const typeColors = {
  likert: { text: 'text-blue-800', border: 'border-blue-200', bg: 'bg-blue-50' },
  multiple: { text: 'text-green-800', border: 'border-green-200', bg: 'bg-green-50' },
  matrix: { text: 'text-purple-800', border: 'border-purple-200', bg: 'bg-purple-50' },
  multiple_select: { text: 'text-orange-800', border: 'border-orange-200', bg: 'bg-orange-50' },
  open: { text: 'text-yellow-800', border: 'border-yellow-200', bg: 'bg-yellow-50' }
};

// 문항 유형 표시 순서 정의
const typeOrder = ['likert', 'multiple', 'matrix', 'multiple_select', 'open'];

// 공통 prefix 찾기 (글자 단위, fallback용)
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

interface AnalysisState {
  selectedQuestions: number[];
  charts: any[];
  selectedChartType: ChartType;
  reportSelectedCharts: (string | number)[];
}

interface AnalysisPageProps {
  analysisState: AnalysisState;
  setAnalysisState: React.Dispatch<React.SetStateAction<AnalysisState>>;
  reportState: any;
  setReportState: React.Dispatch<React.SetStateAction<any>>;
}

const AnalysisPage: React.FC<AnalysisPageProps> = ({ analysisState, setAnalysisState, reportState, setReportState }) => {
  const navigate = useNavigate();
  const { surveyData } = useSurveyStore();
  // [검증3] 분석 페이지 진입 시 로그
  if (surveyData) {
    console.log('[검증3] 분석 페이지 진입 시 surveyData.questionTypes:', surveyData.questionTypes);
  }
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [gridColumns, setGridColumns] = useState(4); // 기본값 4열

  // 컴포넌트 마운트 시 모든 그룹을 접힌 상태로 초기화
  useEffect(() => {
    const initialExpandedState = typeOrder.reduce((acc, type) => {
      acc[type] = false;
      return acc;
    }, {} as Record<string, boolean>);
    setExpandedGroups(initialExpandedState);
  }, []);

  if (!surveyData) {
    navigate('/upload');
    return null;
  }

  // 분석용 데이터: 복수응답 '_Others'를 '기타'로 변환
  const processedRows = getProcessedRows(surveyData);

  // 문항 필터링(검색)
  const filteredQuestions = surveyData.questions
    .map((q: any, idx: any) => ({ ...q, columnIndex: idx }))
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

  // selectedQuestions 중복 제거를 위한 useEffect
  useEffect(() => {
    if (analysisState.selectedQuestions.length !== new Set(analysisState.selectedQuestions).size) {
      setAnalysisState((prev: AnalysisState) => ({
        ...prev,
        selectedQuestions: Array.from(new Set(prev.selectedQuestions))
      }));
    }
  }, [analysisState.selectedQuestions]);

  // 전체 선택(주관식, 행렬형 제외) 체크박스 상태
  const nonSubjectiveIndexes = filteredQuestions.filter(qt => qt.type !== 'open' && qt.type !== 'matrix').map(qt => qt.columnIndex);
  const allNonSubjectiveSelected = nonSubjectiveIndexes.length > 0 && nonSubjectiveIndexes.every(idx => analysisState.selectedQuestions.includes(idx));
  const handleSelectAllNonSubjective = () => {
    if (allNonSubjectiveSelected) {
      setAnalysisState((prev: AnalysisState) => ({
        ...prev,
        selectedQuestions: prev.selectedQuestions.filter((idx: number) => !nonSubjectiveIndexes.includes(idx))
      }));
    } else {
      setAnalysisState((prev: AnalysisState) => ({
        ...prev,
        selectedQuestions: [
          ...prev.selectedQuestions,
          ...nonSubjectiveIndexes.filter((idx: number) => !prev.selectedQuestions.includes(idx))
        ]
      }));
    }
  };

  // 그래프 생성
  const handleCreateCharts = () => {
    setIsLoading(true);
    setProgress(0);
    setProgressMsg('그래프 데이터 준비 중...');
    console.log('handleCreateCharts - 시작');
    console.log('handleCreateCharts - surveyData:', surveyData);
    console.log('handleCreateCharts - processedRows:', processedRows);
    console.log('handleCreateCharts - selectedQuestions:', analysisState.selectedQuestions);
    
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

    const total = analysisState.selectedQuestions.length;
    let done = 0;
    analysisState.selectedQuestions.forEach(qIdx => {
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
        // 안내문(첫 줄) 추출 및 공통 안내문 판별
        const firstLines = groupQs.map((q: any) => (q.text || '').split(/\r?\n/)[0].trim());
        let matrixTitle = '';
        if (firstLines.length > 0 && firstLines.every(line => line === firstLines[0] && line.length > 0)) {
          matrixTitle = firstLines[0];
        } else {
          // 글자 단위 공통 prefix(10자 이상)
          const prefix = findCommonPrefix(groupQs.map((q: any) => q.text || ''));
          if (prefix.length > 10) {
            matrixTitle = prefix;
          } else {
            matrixTitle = '제목 없음';
          }
        }
        // 각 소문항별(문항별) 평균점수 계산 및 뒷부분 텍스트 추출
        const averages = groupQs.map((mq: any) => {
          const fullText = mq.text || '';
          const diff = fullText.startsWith(matrixTitle) ? fullText.slice(matrixTitle.length).trim() : fullText;
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
          chartType: analysisState.selectedChartType,
          questionType: { ...qt, type: 'matrix' },
          gridSize: { w: 1, h: 1 },
          data: averages, // [{label: 소문항, value: 평균점수}]
          respondentCount,
          matrixTitle, // 제목
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
        // 주관식: 모든 응답 텍스트를 data에 넣되, 5000개 초과 시 무작위 5000개만 추출
        let values = processedRows.map((row: any[]) => row[qIdx])
          .filter((v: any) => typeof v === 'string' && v.trim() !== '') as string[];
        if (values.length > 5000) {
          const shuffled = [...values].sort(() => Math.random() - 0.5);
          values = shuffled.slice(0, 5000);
        }
        chartData = values.map((v: string) => ({
          label: v,
          value: 1
        }));
        respondentCount = values.length;
      }

      newCharts.push({
        questionIndex: qIdx,
        chartType: analysisState.selectedChartType, // 사용자가 선택한 차트 타입 사용
        questionType: { ...qt, type: questionType },
        gridSize: { w: 1, h: 1 },
        data: chartData,
        respondentCount,
        scoreMap: qt.scoreMap,
        responseOrder,
        scores,
        avgScore: avgScore // 평균점수 명시적으로 전달
      });
      done++;
      setProgress(Math.round((done / total) * 100));
      setProgressMsg(`그래프 생성 중... (${done}/${total})`);
    });

    console.log('handleCreateCharts - 생성된 차트:', newCharts);
    setAnalysisState(prev => ({ ...prev, charts: [...prev.charts, ...newCharts.filter(nc => !prev.charts.some(c => c.questionIndex === nc.questionIndex))] }));
    // 그래프 생성 후 선택 해제
    setAnalysisState(prev => ({ ...prev, selectedQuestions: [] }));
    setProgress(100);
    setProgressMsg('그래프 생성 완료');
    setTimeout(() => setIsLoading(false), 500);
  };

  // 그래프 삭제
  const handleDeleteChart = (qIdx: any) => {
    setAnalysisState(prev => ({ ...prev, charts: prev.charts.filter(c => c.questionIndex !== qIdx) }));
  };

  // 그래프 유형 개별 변경
  const handleChartTypeChange = (qIdx: any, newType: ChartType) => {
    setAnalysisState(prev => ({
      ...prev,
      charts: prev.charts.map(c =>
        c.questionIndex === qIdx ? { ...c, chartType: newType } : c
      )
    }));
  };

  // 문항 유형 변경
  const handleQuestionTypeChange = (qIdx: any, newType: QuestionType) => {
    setAnalysisState(prev => ({ ...prev, charts: prev.charts.map(c => c.questionIndex === qIdx ? { ...c, questionType: newType } : c) }));
  };

  // 데이터 테이블 편집
  const handleDataTableEdit = (qIdx: any, newData: any[]) => {
    setAnalysisState(prev => ({ ...prev, charts: prev.charts.map(c => c.questionIndex === qIdx ? { ...c, data: newData } : c) }));
  };

  // 카드 크기 변경
  const handleGridSizeChange = (qIdx: any, newSize: { w: number; h: number }) => {
    setAnalysisState(prev => ({ ...prev, charts: prev.charts.map(c => c.questionIndex === qIdx ? { ...c, gridSize: newSize } : c) }));
  };

  // 카드 복제
  const handleDuplicateChart = (qIdx: any) => {
    const chartToDuplicate = analysisState.charts.find(c => c.questionIndex === qIdx);
    if (chartToDuplicate) {
      const newChart = {
        ...chartToDuplicate,
        questionIndex: Date.now(), // 임시로 고유 ID 생성
      };
      setAnalysisState(prev => ({ ...prev, charts: [...prev.charts, newChart] }));
    }
  };

  // 보고서로 이동(목업)
  const handleMoveToReport = (qIdx: any) => {
    const chart = analysisState.charts.find((c: any) => String(c.questionIndex) === String(qIdx));
    if (!chart) return;

    // 데이터 테이블 정보 포함
    const dataTable = {
      headers: chart.headers || [],
      data: chart.data || [],
      questionRowIndex: chart.questionRowIndex
    };

    setReportState((prev: any) => ({
      ...prev,
      reportItems: [
        ...prev.reportItems,
        {
          ...chart,
          gridSize: chart.gridSize || { w: 1, h: 1 },
          dataTable,
          description: ''
        }
      ]
    }));
  };

  // 개별 문항 선택 함수 복구
  const handleSelectOne = (colIdx: any) => {
    setAnalysisState(prev => ({ ...prev, selectedQuestions: prev.selectedQuestions.includes(colIdx) ? prev.selectedQuestions.filter(i => i !== colIdx) : [...prev.selectedQuestions, colIdx] }));
  };

  // 이미 그래프로 렌더링된 문항인지 확인하는 함수
  const isQuestionRendered = (columnIndex: any) => {
    const question = surveyData.questions[columnIndex];
    if (question?.type === 'matrix' && question?.matrixGroupId !== undefined) {
      return analysisState.charts.some(c => String(c.questionIndex) === `matrix_${question.matrixGroupId}`);
    }
    return analysisState.charts.some(c => String(c.questionIndex) === String(columnIndex));
  };

  // 텍스트 색상 결정 함수
  const getQuestionTextColor = (type: keyof typeof typeColors, columnIndex: any) => {
    const baseColor = typeColors[type];
    if (isQuestionRendered(columnIndex)) {
      return 'text-gray-400'; // 이미 렌더링된 문항은 회색으로
    }
    return baseColor;
  };

  // 카드 위치 이동 함수
  const moveChart = (qIdx: any, direction: 'up' | 'down') => {
    setAnalysisState(prev => {
      const idx = prev.charts.findIndex(c => c.questionIndex === qIdx);
      if (idx === -1) return prev;
      const newCharts = [...prev.charts];
      if (direction === 'up' && idx > 0) {
        [newCharts[idx - 1], newCharts[idx]] = [newCharts[idx], newCharts[idx - 1]];
      } else if (direction === 'down' && idx < prev.charts.length - 1) {
        [newCharts[idx], newCharts[idx + 1]] = [newCharts[idx + 1], newCharts[idx]];
      }
      return { ...prev, charts: newCharts };
    });
  };

  // 반드시 surveyData 선언 이후에 위치
  const getHeaderForColumn = (colIdx: any) => {
    if (!surveyData || !surveyData.headers || typeof surveyData.questionRowIndex !== 'number') return null;
    if (surveyData.questionRowIndex > 0 && surveyData.headers[colIdx]) {
      return surveyData.headers[colIdx];
    }
    return null;
  };

  // PDF 다운로드 함수: 각 카드별 실제 DOM을 캡처하여 3열 그리드로 PDF에 배치 (gridSize 반영)
  const handleDownloadPDF = async () => {
    const selectedCharts = analysisState.charts.filter((c: any) => analysisState.reportSelectedCharts.includes(c.questionIndex));
    if (selectedCharts.length === 0) return;

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - margin * 2;
    const colCount = 3;
    const gap = 8; // 카드 간격(mm)
    const cardWidth = (contentWidth - gap * (colCount - 1)) / colCount;

    // 3열 그리드의 각 셀 점유 상태를 관리
    let grid = [] as number[][]; // [row][col] = 1(점유)
    let y = margin;
    let row = 0;
    let maxRowHeight = 0;

    for (let i = 0; i < selectedCharts.length; i++) {
      const chart = selectedCharts[i];
      const chartId = `pdf-export-${chart.questionIndex}`;
      const exportElem = document.getElementById(chartId);
      if (!exportElem) continue;

      const gridW = chart.gridSize?.w || 1;
      const gridH = chart.gridSize?.h || 1;
      const imgW = cardWidth * gridW + gap * (gridW - 1);

      const canvas = await html2canvas(exportElem, { scale: 2, backgroundColor: '#fff', useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const imgProps = pdf.getImageProperties(imgData);
      // 원본 비율 유지, gridH만큼 높이 확장
      const baseImgH = (imgProps.height * imgW) / imgProps.width;
      const imgH = baseImgH * gridH;

      // 현재 row에서 연속 gridW만큼 비어있는 col 찾기
      let col = 0;
      let found = false;
      while (!found) {
        // grid[row]가 없으면 초기화
        if (!grid[row]) grid[row] = Array(colCount).fill(0);
        // col~col+gridW-1까지 비어있는지 확인
        if (col + gridW <= colCount && grid[row].slice(col, col + gridW).every(v => v === 0)) {
          found = true;
          // 점유 표시
          for (let k = 0; k < gridW; k++) grid[row][col + k] = 1;
        } else {
          col++;
          if (col > colCount - 1) {
            // 다음 row로
            row++;
            y += maxRowHeight + gap;
            col = 0;
            maxRowHeight = 0;
          }
        }
      }

      // 페이지 넘김 처리
      if (y + imgH > pageHeight - margin) {
        pdf.addPage();
        y = margin;
        row = 0;
        col = 0;
        grid = [];
        maxRowHeight = 0;
        // 다시 col~col+gridW-1 찾기
        if (!grid[row]) grid[row] = Array(colCount).fill(0);
        for (let k = 0; k < gridW; k++) grid[row][col + k] = 1;
      }

      const x = margin + col * (cardWidth + gap);
      pdf.addImage(imgData, 'PNG', x, y, imgW, imgH);
      if (imgH > maxRowHeight) maxRowHeight = imgH;
    }

    pdf.save('분석_그래프.pdf');
  };

  // 그리드 컬럼 수 변경 핸들러
  const handleGridColumnsChange = (columns: number) => {
    setGridColumns(columns);
  };

  return (
    <div className="flex w-screen absolute left-0 top-[64px] min-h-[calc(100vh-64px)] bg-gray-50">
      <ProgressOverlay isOpen={isLoading} progress={progress} message={progressMsg} />
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
              value={analysisState.selectedChartType}
              onChange={e => setAnalysisState(prev => ({ ...prev, selectedChartType: e.target.value as ChartType }))}
              className="border rounded px-2 py-1 text-sm flex-1"
            >
              {chartTypes.map(ct => {
                // 주관식용 옵션은 주관식 문항 선택 시에만 활성화
                const isSubjective = ct.value === 'wordcloud' || ct.value === 'topN';
                // 현재 선택된 문항이 모두 주관식일 때만 활성화
                let allSelectedAreOpen = false;
                if (analysisState.selectedQuestions.length > 0 && surveyData) {
                  allSelectedAreOpen = analysisState.selectedQuestions.every(idx => surveyData.questions[idx]?.type === 'open');
                }
                return (
                  <option key={ct.value} value={ct.value} disabled={isSubjective && !allSelectedAreOpen}>
                    {ct.label}
                  </option>
                );
              })}
            </select>
            <button
              onClick={handleCreateCharts}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
              disabled={analysisState.selectedQuestions.length === 0}
            >
              그래프 생성
            </button>
            <button
              onClick={() => setAnalysisState(prev => ({ ...prev, charts: [] }))}
              className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-xs"
              disabled={analysisState.charts.length === 0}
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
          
          {/* 전체 선택(주관식, 행렬형 제외) 체크박스 */}
          <div className="flex items-center mb-2">
            <input
              type="checkbox"
              checked={allNonSubjectiveSelected}
              onChange={handleSelectAllNonSubjective}
              className="mr-2"
            />
            <span className="text-sm">전체 선택(주관식, 행렬형 제외)</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4">
            {typeOrder.map(type => {
              const questions = groupedQuestions[type] || [];
              if (questions.length === 0) return null;
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
                  <div key={type} className={`rounded-lg border-2 ${typeColors[t].border} ${typeColors[t].bg} p-3`}>
                    <div className="flex items-center gap-2 mb-3">
                      <div 
                        className="flex items-center gap-2 cursor-pointer flex-1"
                        onClick={() => setExpandedGroups(prev => ({ ...prev, [type]: !prev[type] }))}
                      >
                        <span className={`text-base font-semibold ${typeColors[t].text}`}>{typeLabels[t]}</span>
                        <span className="text-xs text-gray-500">{qs.length}개</span>
                        <span className="ml-auto">
                          {expandedGroups[type] ? '▼' : '▶'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <input
                          type="checkbox"
                          checked={qs.length > 0 && qs.every(qt => analysisState.selectedQuestions.includes(qt.columnIndex))}
                          onChange={() => {
                            if (qs.length > 0) {
                              const allSelected = qs.every(qt => analysisState.selectedQuestions.includes(qt.columnIndex));
                              if (allSelected) {
                                setAnalysisState((prev: AnalysisState) => ({
                                  ...prev,
                                  selectedQuestions: prev.selectedQuestions.filter(idx => !qs.some(qt => qt.columnIndex === idx))
                                }));
                              } else {
                                setAnalysisState((prev: AnalysisState) => ({
                                  ...prev,
                                  selectedQuestions: [
                                    ...prev.selectedQuestions,
                                    ...qs.map(qt => qt.columnIndex).filter(idx => !prev.selectedQuestions.includes(idx))
                                  ]
                                }));
                              }
                            }
                          }}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-xs text-gray-500">전체 선택</span>
                      </div>
                    </div>
                    {expandedGroups[type] && (
                      <>
                        {Object.entries(matrixGroups).map(([groupId, groupQs]) => {
                          // 그룹 전체 선택 여부
                          const allGroupSelected = groupQs.every((qt: any) => analysisState.selectedQuestions.includes(qt.columnIndex));
                          const handleGroupSelect = () => {
                            if (allGroupSelected) {
                              setAnalysisState((prev: AnalysisState) => ({
                                ...prev,
                                selectedQuestions: prev.selectedQuestions.filter(idx => !groupQs.some((qt: any) => qt.columnIndex === idx))
                              }));
                            } else {
                              setAnalysisState((prev: AnalysisState) => ({
                                ...prev,
                                selectedQuestions: [
                                  ...prev.selectedQuestions,
                                  ...groupQs.map((qt: any) => qt.columnIndex).filter(idx => !prev.selectedQuestions.includes(idx))
                                ]
                              }));
                            }
                          };
                          // 공통 접두사(문항 유형 검토에서 저장된 commonPrefix) 추출
                          const questionTexts = groupQs.map((qt: any) => surveyData.questions[qt.columnIndex]?.text || '');
                          const commonPrefix = findCommonPrefix(questionTexts);
                          return (
                            <div key={groupId} className="ml-4 mb-2">
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={allGroupSelected}
                                  onChange={handleGroupSelect}
                                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm font-medium text-gray-700">{commonPrefix || `그룹 ${groupId}`}</span>
                              </div>
                              <div className="ml-6 mt-1 space-y-1">
                                {groupQs.map((qt: any) => {
                                  const fullText = surveyData.questions[qt.columnIndex]?.text || '';
                                  let diff = fullText.startsWith(commonPrefix) ? fullText.slice(commonPrefix.length).trim() : fullText;
                                  if (!diff) diff = fullText;
                                  return (
                                    <div key={qt.columnIndex} className="flex items-center gap-2">
                                      <input
                                        type="checkbox"
                                        checked={analysisState.selectedQuestions.includes(qt.columnIndex)}
                                        onChange={() => handleSelectOne(qt.columnIndex)}
                                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                      />
                                      <span className="text-sm text-gray-600">
                                        {getHeaderForColumn(qt.columnIndex) && (
                                          <span className="text-xs text-gray-500 mr-1">[{getHeaderForColumn(qt.columnIndex)}]</span>
                                        )}
                                        {diff}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </>
                    )}
                  </div>
                );
              }
              return (
                <div key={type} className={`rounded-lg border-2 ${typeColors[t].border} ${typeColors[t].bg} p-3`}>
                  <div className="flex items-center gap-2 mb-3">
                    <div 
                      className="flex items-center gap-2 cursor-pointer flex-1"
                      onClick={() => setExpandedGroups(prev => ({ ...prev, [type]: !prev[type] }))}
                    >
                      <span className={`text-base font-semibold ${typeColors[t].text}`}>{typeLabels[t]}</span>
                      <span className="text-xs text-gray-500">{qs.length}개</span>
                      <span className="ml-auto">
                        {expandedGroups[type] ? '▼' : '▶'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <input
                        type="checkbox"
                        checked={qs.length > 0 && qs.every(qt => analysisState.selectedQuestions.includes(qt.columnIndex))}
                        onChange={() => {
                          if (qs.length > 0) {
                            const allSelected = qs.every(qt => analysisState.selectedQuestions.includes(qt.columnIndex));
                            if (allSelected) {
                              setAnalysisState((prev: AnalysisState) => ({
                                ...prev,
                                selectedQuestions: prev.selectedQuestions.filter(idx => !qs.some(qt => qt.columnIndex === idx))
                              }));
                            } else {
                              setAnalysisState((prev: AnalysisState) => ({
                                ...prev,
                                selectedQuestions: [
                                  ...prev.selectedQuestions,
                                  ...qs.map(qt => qt.columnIndex).filter(idx => !prev.selectedQuestions.includes(idx))
                                ]
                              }));
                            }
                          }
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-xs text-gray-500">전체 선택</span>
                    </div>
                  </div>
                  {expandedGroups[type] && (
                    <div className="space-y-2">
                      {qs.map((qt: any) => (
                        <div key={qt.columnIndex} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={analysisState.selectedQuestions.includes(qt.columnIndex)}
                            onChange={() => handleSelectOne(qt.columnIndex)}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-600">
                            {surveyData.questions[qt.columnIndex]?.text || `문항 ${qt.columnIndex}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </aside>

        {/* 우측: 그래프 결과 영역 */}
        <main className="flex-1 bg-white rounded-lg shadow p-4 flex flex-col min-w-0 h-[calc(100vh-64px)]">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">그래프 결과</h2>
              <p className="text-sm text-gray-600">생성된 그래프가 여기에 표시됩니다.</p>
            </div>
            <div className="flex items-center gap-4">
              {/* 그리드 레이아웃 선택 */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">그리드 레이아웃:</span>
                <select
                  value={gridColumns}
                  onChange={(e) => handleGridColumnsChange(Number(e.target.value))}
                  className="border rounded px-2 py-1 text-sm"
                >
                  <option value={2}>2열</option>
                  <option value={3}>3열</option>
                  <option value={4}>4열</option>
                </select>
              </div>
              <button
                onClick={handleDownloadPDF}
                className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-xs"
                disabled={analysisState.reportSelectedCharts.length === 0}
              >
                PDF로 다운로드
              </button>
            </div>
          </div>
          
          {/* 그래프 결과/카드 영역 */}
          <div className="flex items-center mb-2">
            <input
              type="checkbox"
              className="mr-2"
              checked={analysisState.charts.length > 0 && analysisState.charts.every((c: any) => analysisState.reportSelectedCharts.includes(c.questionIndex))}
              onChange={() => {
                const allSelected = analysisState.charts.length > 0 && analysisState.charts.every((c: any) => analysisState.reportSelectedCharts.includes(c.questionIndex));
                if (allSelected) {
                  setAnalysisState((prev: AnalysisState) => ({ ...prev, reportSelectedCharts: [] }));
                } else {
                  setAnalysisState((prev: AnalysisState) => ({ ...prev, reportSelectedCharts: prev.charts.map((c: any) => c.questionIndex) }));
                }
              }}
            />
            <span className="text-sm mr-4">전체 선택</span>
            <button
              className="px-3 py-1 bg-blue-500 text-white rounded disabled:bg-gray-300 mr-2"
              disabled={analysisState.reportSelectedCharts.length === 0}
              onClick={() => {
                const selectedCharts = analysisState.charts.filter((c: any) => analysisState.reportSelectedCharts.includes(c.questionIndex));
                setReportState((prev: any) => ({
                  ...prev,
                  reportItems: [
                    ...prev.reportItems,
                    ...selectedCharts.map((c: any) => ({
                      ...c,
                      description: '',
                      question: surveyData.questions[c.questionIndex]?.text || '',
                      headers: surveyData.headers || [],
                      questionRowIndex: surveyData.questionRowIndex
                    }))
                  ]
                }));
                setAnalysisState((prev: AnalysisState) => ({ ...prev, reportSelectedCharts: [] }));
              }}
            >
              보고서로 보내기
            </button>
            <span className="text-sm text-gray-500">선택된 그래프: {analysisState.reportSelectedCharts.length}개</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            <div 
              className="grid gap-4"
              style={{
                gridTemplateColumns: `repeat(${gridColumns}, 1fr)`
              }}
            >
              {analysisState.charts.map((c: any) => {
                const isSelected = analysisState.reportSelectedCharts.includes(c.questionIndex);
                return (
                  <div
                    id={`pdf-export-${c.questionIndex}`}
                    key={c.questionIndex}
                    style={{
                      gridColumn: `span ${Math.min(c.gridSize.w, gridColumns)}`,
                      gridRow: `span ${c.gridSize.h}`
                    }}
                    className={`relative`}
                  >
                    <ChartCard
                      questionIndex={String(c.questionIndex)}
                      question={surveyData.questions[c.questionIndex]?.text || `문항 ${c.questionIndex + 1}`}
                      questionType={c.questionType.type as QuestionTypeValue}
                      chartType={c.chartType}
                      data={c.data}
                      colors={c.colors}
                      respondentCount={c.respondentCount}
                      avgScore={c.avgScore}
                      headers={surveyData.headers}
                      questionRowIndex={surveyData.questionRowIndex}
                      gridSize={c.gridSize}
                      gridColumns={gridColumns}
                      onChartTypeChange={(newType) => handleChartTypeChange(c.questionIndex, newType)}
                      onQuestionTypeChange={(newType) => handleQuestionTypeChange(c.questionIndex, { ...c.questionType, type: newType as QuestionTypeValue })}
                      onDataTableEdit={(newData) => handleDataTableEdit(c.questionIndex, newData)}
                      onGridSizeChange={(newSize) => handleGridSizeChange(c.questionIndex, newSize)}
                      onDuplicate={() => handleDuplicateChart(c.questionIndex)}
                      onDelete={() => handleDeleteChart(c.questionIndex)}
                      onMoveUp={() => moveChart(c.questionIndex, 'up')}
                      onMoveDown={() => moveChart(c.questionIndex, 'down')}
                    />
                  </div>
                );
              })}
              {analysisState.charts.length === 0 && (
                <div className="col-span-full text-center text-gray-400 py-12">
                  <p className="mb-2">생성된 그래프가 없습니다.</p>
                  <p className="text-sm">왼쪽 패널에서 문항을 선택하고 그래프를 생성해주세요.</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AnalysisPage;