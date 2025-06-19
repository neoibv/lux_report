import React from 'react';
import { Bar } from 'react-chartjs-2';
import { ChartData, ChartOptions } from 'chart.js';

interface CrossAnalysisChartProps {
  data: {
    xAxisOptions: string[];
    yAxisData: {
      questionIndex: number;
      questionType: string;
      options: string[];
      scores: number[];
      dataByXOption: {
        value?: number;
        count?: number;
        counts?: number[];
        total: number;
      }[];
    }[];
  };
  chartType: 'crossAnalysis' | 'crossAnalysisStacked';
  showAverageScore: boolean;
}

const CrossAnalysisChart: React.FC<CrossAnalysisChartProps> = ({
  data,
  chartType,
  showAverageScore
}) => {
  const chartData: ChartData<'bar'> = {
    labels: data.xAxisOptions,
    datasets: data.yAxisData.map((yData, index) => ({
      label: `문항 ${yData.questionIndex + 1}`,
      data: yData.dataByXOption.map(d => {
        if (showAverageScore) {
          return d.value || 0;
        } else if (d.counts) {
          return d.counts.reduce((sum, count) => sum + count, 0);
        } else {
          return d.count || 0;
        }
      }),
      backgroundColor: `hsla(${(index * 360) / data.yAxisData.length}, 70%, 50%, 0.7)`,
      borderColor: `hsla(${(index * 360) / data.yAxisData.length}, 70%, 50%, 1)`,
      borderWidth: 1,
      stack: chartType === 'crossAnalysisStacked' ? 'stack0' : undefined
    }))
  };

  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        stacked: chartType === 'crossAnalysisStacked',
        title: {
          display: true,
          text: '응답 옵션'
        }
      },
      y: {
        stacked: chartType === 'crossAnalysisStacked',
        title: {
          display: true,
          text: showAverageScore ? '평균 점수' : '응답자 수'
        }
      }
    },
    plugins: {
      tooltip: {
        callbacks: {
          label: (context) => {
            const datasetIndex = context.datasetIndex;
            const dataIndex = context.dataIndex;
            const yData = data.yAxisData[datasetIndex];
            const value = yData.dataByXOption[dataIndex];
            
            if (showAverageScore) {
              return `${yData.questionIndex + 1}번 문항: ${value.value?.toFixed(2) || 0}점`;
            } else if (value.counts) {
              const total = value.counts.reduce((sum, count) => sum + count, 0);
              return `${yData.questionIndex + 1}번 문항: ${total}명`;
            } else {
              return `${yData.questionIndex + 1}번 문항: ${value.count || 0}명`;
            }
          }
        }
      }
    }
  };

  return (
    <div style={{ height: '400px', width: '100%' }}>
      <Bar data={chartData} options={options} />
    </div>
  );
};

export default CrossAnalysisChart; 