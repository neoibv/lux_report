export type QuestionTypeValue = 'multiple' | 'multiple_select' | 'open' | 'likert' | 'matrix';

export interface QuestionType {
  columnIndex: number;
  type: QuestionTypeValue;
  matrixGroupId?: number;
  commonPrefix?: string;
  scale?: 'satisfaction_5' | 'agreement_5';
  options?: string[];
  otherResponses?: string[];
  scoreMap?: Record<string, number>;
}

export type ChartType = 'vertical' | 'horizontal' | 'pie' | 'donut' | 'verticalMatrix' | 'horizontalMatrix' | 'verticalStacked' | 'horizontalStacked' | 'verticalMatrixStacked' | 'horizontalMatrixStacked' | 'wordcloud' | 'topN';

export interface Question {
  id: string;
  text: string;
  type: QuestionTypeValue;
  responses: any[];
  matrixGroupId?: string;
  matrixTitle?: string;
  scale?: string;
  options?: string[];
  scoreMap?: Record<string, number>;
  scores?: number[];
  displayTexts?: string[];
}

export interface Response {
  label: string;
  value: number;
  isOther?: boolean;
  id?: string;
  count?: number;
}

export interface SurveyData {
  questions: Question[];
  headers: string[];
  rows: any[][];
  questionTypes: any[];
  questionRowIndex: number;
  title: string;
  description: string;
  totalResponses: number;
  matrixGroups?: { id: string; title: string; questions: Question[] }[];
}

export interface ChartData {
  labels: string[];
  values: number[];
  backgroundColor: string[];
  sortedData?: {
    labels: string[];
    values: number[];
  };
}

export interface ChartOptions {
  responsive: boolean;
  plugins: {
    datalabels: {
      display: boolean;
      color: string;
      font: {
        weight: 'bold' | 'normal';
      };
      formatter: (value: number) => string;
    };
    tooltip: {
      enabled: boolean;
    };
  };
  scales?: {
    x?: {
      stacked?: boolean;
      ticks?: {
        callback: (value: number) => string;
      };
    };
    y?: {
      stacked?: boolean;
      ticks?: {
        callback: (value: number) => string;
      };
    };
  };
} 