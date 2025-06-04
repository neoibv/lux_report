import React from 'react';
import ReactWordcloud from 'react-wordcloud';

interface WordCloudChartProps {
  words: { text: string; value: number }[];
  width?: number;
  height?: number;
}

const WordCloudChart: React.FC<WordCloudChartProps> = ({ words, width = 400, height = 300 }) => {
  const options = {
    rotations: 1,
    rotationAngles: [0, 0] as [number, number],
    fontSizes: [16, 48] as [number, number],
    enableTooltip: true,
    deterministic: false,
    scale: 'sqrt' as const,
  };
  return (
    <div style={{ width, height }}>
      <ReactWordcloud words={words} options={options} />
    </div>
  );
};

export default WordCloudChart; 