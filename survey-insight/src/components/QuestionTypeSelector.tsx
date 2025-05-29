import React from 'react';
import { QuestionType } from '../types/surveyTypes';

interface QuestionTypeSelectorProps {
  question: string;
  columnIndex: number;
  type: QuestionType['type'];
  scale?: QuestionType['scale'];
  options?: string[];
  onChange: (columnIndex: number, type: QuestionType['type']) => void;
  onOptionsChange?: (options: string[]) => void;
}

const QuestionTypeSelector: React.FC<QuestionTypeSelectorProps> = ({
  question,
  columnIndex,
  type,
  scale,
  options,
  onChange,
  onOptionsChange
}) => {
  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(columnIndex, e.target.value as QuestionType['type']);
  };

  const handleOptionsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (onOptionsChange) {
      const options = e.target.value
        .split('\n')
        .map(option => option.trim())
        .filter(option => option.length > 0);
      onOptionsChange(options);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          문항
        </label>
        <p className="text-gray-900">{question}</p>
      </div>

      <div>
        <label htmlFor="type" className="block text-sm font-medium text-gray-700">
          문항 유형
        </label>
        <select
          id="type"
          value={type}
          onChange={handleTypeChange}
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
        >
          <option value="multiple">객관식</option>
          <option value="multiple_select">복수 응답</option>
          <option value="likert">리커트 척도</option>
          <option value="open">주관식</option>
        </select>
      </div>

      {(type === 'multiple' || type === 'multiple_select') && options && (
        <div>
          <label htmlFor="options" className="block text-sm font-medium text-gray-700 mb-1">
            보기 목록
          </label>
          <textarea
            id="options"
            value={options.join('\n')}
            onChange={(e) => onOptionsChange?.(e.target.value.split('\n').filter(Boolean))}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            rows={5}
          />
        </div>
      )}

      {type === 'likert' && (
        <div>
          <label htmlFor="scale" className="block text-sm font-medium text-gray-700 mb-1">
            리커트 척도 유형
          </label>
          <select
            id="scale"
            value={scale}
            onChange={(e) => onChange(columnIndex, type)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            <option value="satisfaction_5">5점 만족도</option>
            <option value="agreement_5">5점 동의도</option>
          </select>
        </div>
      )}
    </div>
  );
};

export default QuestionTypeSelector; 