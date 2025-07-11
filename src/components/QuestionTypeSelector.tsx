import React from 'react';
import { QuestionTypeValue } from '../types';

interface QuestionTypeSelectorProps {
  questionType: QuestionTypeValue;
  onTypeChange: (type: QuestionTypeValue) => void;
}

const QuestionTypeSelector: React.FC<QuestionTypeSelectorProps> = ({ questionType, onTypeChange }) => {
  const QUESTION_TYPE_OPTIONS = [
    { value: 'likert', label: '리커트 척도' },
    { value: 'multiple', label: '객관식' },
    { value: 'open', label: '주관식' },
    { value: 'matrix', label: '행렬형' },
    { value: 'multiple_select', label: '복수응답' },
    { value: 'skip', label: '분석에서 생략' },
  ];

  return (
    <select
      value={questionType}
      onChange={(e) => onTypeChange(e.target.value as QuestionTypeValue)}
      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
    >
      {QUESTION_TYPE_OPTIONS.map(type => (
        <option key={type.value} value={type.value}>
          {type.label}
        </option>
      ))}
    </select>
  );
};

export default QuestionTypeSelector; 