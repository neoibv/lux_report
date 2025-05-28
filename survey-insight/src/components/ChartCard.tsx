import React, { useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Title,
} from 'chart.js';
import { Bar, Pie, Doughnut } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { ChartType, QuestionType } from '../types';

interface ChartCardProps {
  questionIndex: number | string;
  question: string;
  questionType: QuestionType;
  chartType: ChartType;
  data: { label: string; value: number; isOther?: boolean }[];
  onChartTypeChange: (chartType: ChartType) => void;
  onQuestionTypeChange: (questionType: QuestionType) => void;
  onDataTableEdit: (data: any[]) => void;
  gridSize: { w: number; h: number };
  onGridSizeChange: (size: { w: number; h: number }) => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  colors?: string[];
  respondentCount?: number;
  matrixTitle?: string;
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
  matrixTitle
}) => {
  const [dataTableOpen, setDataTableOpen] = useState(false);

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

  // 복수응답은 value 기준 내림차순 정렬
  const sortedData = questionType === 'multiple_select'
    ? [...data].sort((a, b) => b.value - a.value)
    : data;

  // 차트 데이터 변환 (백분율)
  const percentValues = sortedData.map(d => toPercent(d.value));
  const labels = sortedData.map(d => d.label);
  const backgroundColors = colors
    ? colors.slice(0, sortedData.length)
    : (questionType === 'likert' || questionType === 'matrix')
      ? likertColors.slice(0, sortedData.length)
      : sortedData.map((d, i) => d.isOther ? '#E0E0E0' : palette[i % (palette.length - 1)]);

  // 카드 크기 조절 예시 (좌/우/상/하 버튼)
  const handleResize = (dir: 'w+' | 'w-' | 'h+' | 'h-') => {
    if (dir === 'w+') onGridSizeChange({ ...gridSize, w: gridSize.w + 1 });
    if (dir === 'w-' && gridSize.w > 1) onGridSizeChange({ ...gridSize, w: gridSize.w - 1 });
    if (dir === 'h+') onGridSizeChange({ ...gridSize, h: gridSize.h + 1 });
    if (dir === 'h-' && gridSize.h > 1) onGridSizeChange({ ...gridSize, h: gridSize.h - 1 });
  };

  // 리커트/행렬형 평균 계산
  let avgScore: number | null = null;
  if ((questionType === 'likert' || questionType === 'matrix') && data.length > 0) {
    // label이 1~5점(혹은 5~1점)일 때만 평균 계산
    const scoreMap: Record<string, number> = {
      '매우 만족': 5,
      '만족': 4,
      '보통': 3,
      '불만족': 2,
      '매우 불만족': 1,
      '5': 5, '4': 4, '3': 3, '2': 2, '1': 1
    };
    let sum = 0, cnt = 0;
    data.forEach(d => {
      const score = scoreMap[d.label] ?? parseInt(d.label);
      if (!isNaN(score)) {
        sum += score * d.value;
        cnt += d.value;
      }
    });
    if (cnt > 0) avgScore = Math.round((sum / cnt) * 100) / 100;
  }

  // 공통 차트 옵션
  const commonOptions = {
    responsive: true,
    plugins: {
      legend: { display: chartType === 'pie' || chartType === 'donut' },
      tooltip: { enabled: true },
      title: { display: false },
      // @ts-ignore
      datalabels: {
        display: true,
        color: '#000000',
        font: { weight: 'bold' },
        formatter: (value: number) => `${value}%`,
      },
    },
  };

  // 차트별 데이터/옵션
  let chartEl = null;
  if (chartType === 'vertical' || chartType === 'horizontal') {
    const isLikert = questionType === 'likert' || questionType === 'matrix';
    chartEl = (
      <Bar
        data={{
          labels,
          datasets: [
            {
              data: percentValues,
              backgroundColor: backgroundColors,
              borderRadius: 0, // 각진 모서리
            },
          ],
        }}
        options={{
          ...commonOptions,
          indexAxis: chartType === 'vertical' ? 'x' : 'y',
          plugins: {
            ...commonOptions.plugins,
            // @ts-ignore
            datalabels: {
              ...commonOptions.plugins.datalabels,
              anchor: 'end',
              align: 'top',
              formatter: (value: number) => `${formatNumber(value)}%`,
            }
          },
          scales: chartType === 'vertical'
            ? {
                x: { grid: { display: false } },
                y: { beginAtZero: true, max: 100, ticks: { callback: (v: any) => `${v}%` } },
              }
            : {
                x: { beginAtZero: true, max: 100, ticks: { callback: (v: any) => `${v}%` } },
                y: { grid: { display: false } },
              },
        }}
      />
    );
  } else if (chartType === 'verticalStacked' || chartType === 'horizontalStacked') {
    const isLikert = questionType === 'likert' || questionType === 'matrix';
    chartEl = (
      <Bar
        data={{
          labels: [''],
          datasets: [
            {
              data: percentValues,
              label: '',
              stack: 'stack1',
              borderRadius: 0, // 각진 모서리
            },
          ],
        }}
        options={{
          ...commonOptions,
          indexAxis: chartType === 'verticalStacked' ? 'x' : 'y',
          plugins: {
            ...commonOptions.plugins,
            // @ts-ignore
            datalabels: {
              ...commonOptions.plugins.datalabels,
              anchor: 'end',
              align: 'end',
              formatter: (value: number) => `${formatNumber(value)}%`,
            }
          },
          scales: chartType === 'verticalStacked'
            ? {
                x: { stacked: true, grid: { display: false } },
                y: { stacked: true, beginAtZero: true, max: 100, ticks: { callback: (v: any) => `${v}%` } },
              }
            : {
                x: { stacked: true, beginAtZero: true, max: 100, ticks: { callback: (v: any) => `${v}%` } },
                y: { stacked: true, grid: { display: false } },
              },
        }}
      />
    );
  } else if (chartType === 'pie') {
    chartEl = (
      <Pie
        data={{
          labels,
          datasets: [
            {
              data: percentValues,
              backgroundColor: backgroundColors,
            },
          ],
        }}
        // @ts-ignore
        options={{
          ...commonOptions,
          plugins: {
            ...commonOptions.plugins,
            // @ts-ignore
            datalabels: {
              ...commonOptions.plugins.datalabels,
              formatter: (value: number) => `${formatNumber(value)}%`,
            }
          }
        }}
      />
    );
  } else if (chartType === 'donut') {
    chartEl = (
      <Doughnut
        data={{
          labels,
          datasets: [
            {
              data: percentValues,
              backgroundColor: backgroundColors,
            },
          ],
        }}
        // @ts-ignore
        options={{
          ...commonOptions,
          plugins: {
            ...commonOptions.plugins,
            // @ts-ignore
            datalabels: {
              ...commonOptions.plugins.datalabels,
              formatter: (value: number) => `${formatNumber(value)}%`,
            }
          }
        }}
      />
    );
  } else if (chartType === 'verticalMatrix' || chartType === 'horizontalMatrix') {
    const matrixLabels = data.map(d => d.label);
    const matrixValues = data.map(d => d.value);
    // 총 응답: 각 문항별 응답 개수(동일하다고 가정, 첫 문항 기준)
    const matrixRespondentCount = respondentCount !== undefined ? respondentCount : undefined;
    chartEl = (
      <Bar
        data={{
          labels: matrixLabels,
          datasets: [
            {
              data: matrixValues,
              backgroundColor: colors ? colors.slice(0, data.length) : palette.slice(0, data.length),
              borderRadius: 0,
            },
          ],
        }}
        options={{
          responsive: true,
          plugins: {
            legend: { display: false },
            tooltip: { enabled: true },
            title: { display: false },
            // @ts-ignore
            datalabels: {
              display: true,
              color: '#000',
              font: { weight: 'bold' },
              anchor: 'end',
              align: 'top',
              formatter: (value: number) => value.toFixed(2),
            },
          },
          indexAxis: chartType === 'verticalMatrix' ? 'x' : 'y',
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
        }}
      />
    );
    // 제목/총응답 오버라이드
    return (
      <div className="bg-white p-4 rounded-lg shadow" style={{ minHeight: 600 }}>
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-semibold">{matrixTitle}</h3>
          <div className="text-sm text-gray-600">
            총 응답: {matrixRespondentCount !== undefined ? formatNumber(matrixRespondentCount) : '-'}개
          </div>
        </div>
        <div className="mt-4 flex-1 flex items-center justify-center min-h-[400px]">
          <div style={{ width: '100%', height: '100%' }}>
            {chartEl}
          </div>
        </div>
        {/* --- 기능 버튼/드롭다운을 하단으로 이동 --- */}
        <div className="flex flex-col md:flex-row md:items-center gap-2 mt-4">
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
              onChange={e => onQuestionTypeChange(e.target.value as QuestionType)}
              className="border rounded px-2 py-1 text-xs"
            >
              <option value="likert">리커트 척도</option>
              <option value="multiple">객관식</option>
              <option value="multiple_select">복수 응답</option>
              <option value="open">주관식</option>
              <option value="matrix">행렬형</option>
            </select>
          </div>
          <div className="flex gap-1">
            <button onClick={() => handleResize('w-')} className="text-xs px-1">◀</button>
            <button onClick={() => handleResize('w+')} className="text-xs px-1">▶</button>
            <button onClick={() => handleResize('h-')} className="text-xs px-1">▲</button>
            <button onClick={() => handleResize('h+')} className="text-xs px-1">▼</button>
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
                  <th className="p-1">평균점수</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row, idx) => (
                  <tr key={row.label}>
                    <td>{row.label}</td>
                    <td>{row.value.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  } else {
    chartEl = (
      <div className="bg-white p-4 rounded-lg shadow" style={{ minHeight: 600 }}>
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-semibold break-words">
            {question}
          </h3>
          <div className="text-sm text-gray-600">
            총 응답: {formatNumber(totalResponses)}개
          </div>
        </div>
        {/* 평균 점수 표기 (리커트/행렬형) */}
        {(questionType === 'likert' || questionType === 'matrix') && avgScore !== null && (
          <div className="mb-2 text-blue-700 font-bold text-base text-center">
            평균 점수: {avgScore} / 5점
          </div>
        )}
        {/* 차트 영역 */}
        <div className="mt-4 flex-1 flex items-center justify-center min-h-[400px]">
          <div style={{ width: '100%', height: '100%' }}>
            {chartEl}
          </div>
        </div>
        {/* --- 기능 버튼/드롭다운을 하단으로 이동 --- */}
        <div className="flex flex-col md:flex-row md:items-center gap-2 mt-4">
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
            </select>
            <select
              value={questionType}
              onChange={e => onQuestionTypeChange(e.target.value as QuestionType)}
              className="border rounded px-2 py-1 text-xs"
            >
              <option value="likert">리커트 척도</option>
              <option value="multiple">객관식</option>
              <option value="multiple_select">복수 응답</option>
              <option value="open">주관식</option>
              <option value="matrix">행렬형</option>
            </select>
          </div>
          <div className="flex gap-1">
            <button onClick={() => handleResize('w-')} className="text-xs px-1">◀</button>
            <button onClick={() => handleResize('w+')} className="text-xs px-1">▶</button>
            <button onClick={() => handleResize('h-')} className="text-xs px-1">▲</button>
            <button onClick={() => handleResize('h+')} className="text-xs px-1">▼</button>
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
                  <th className="p-1">비율(%)</th>
                  <th className="p-1">기타응답</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row, idx) => (
                  <tr key={row.label}>
                    <td>
                      <input
                        className="border rounded px-1 py-0.5 w-full"
                        value={row.label}
                        onChange={e => {
                          const newData = [...data];
                          newData[idx] = { ...row, label: e.target.value };
                          onDataTableEdit(newData);
                        }}
                      />
                    </td>
                    <td>
                      <input
                        className="border rounded px-1 py-0.5 w-16 text-right"
                        type="number"
                        min={0}
                        max={100}
                        step={0.1}
                        value={row.value}
                        onChange={e => {
                          const newData = [...data];
                          newData[idx] = { ...row, value: parseFloat(e.target.value) };
                          onDataTableEdit(newData);
                        }}
                      />
                    </td>
                    <td className="text-center">
                      <input
                        type="checkbox"
                        checked={!!row.isOther}
                        onChange={e => {
                          const newData = [...data];
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
  }

  return chartEl;
};

export default ChartCard; 