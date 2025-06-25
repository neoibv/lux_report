export interface QuestionType {
  columnIndex: number;
  type: 'likert' | 'multiple' | 'open' | 'matrix' | 'multiple_select';
  options?: string[];
  scale?: 'satisfaction_5' | 'agreement_5';
  otherResponses?: string[];
  matrixGroupId?: number;
  commonPrefix?: string;
  differences?: string[];
  responseOrder?: string[];
  scoreMap?: { [key: string]: number };
  displayTexts?: string[]; // 리커트 라벨 텍스트
  // displayTexts는 Question 타입에서만 사용 (src/types.ts 참고)
}

export type QuestionTypeValue =
  | 'likert'
  | 'multiple'
  | 'open'
  | 'matrix'
  | 'multiple_select'
  | 'skip'; // 분석에서 생략 