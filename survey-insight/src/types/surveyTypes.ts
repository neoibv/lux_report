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
} 