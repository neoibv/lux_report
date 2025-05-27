import React from 'react';
import { QuestionType } from '../utils/fileParser';

interface QuestionTypeSelectorProps {
  question: string;
  type: QuestionType;
  onTypeChange: (type: QuestionType['type']) => void;
  onOptionsChange?: (options: string[]) => void;
}

const QuestionTypeSelector: React.FC<QuestionTypeSelectorProps> = ({
  question,
  type,
  onTypeChange,
  onOptionsChange
}) => {
  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onTypeChange(e.target.value as QuestionType['type']);
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
        <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
          문항 유형
        </label>
        <select
          id="type"
          value={type.type}
          onChange={handleTypeChange}
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
        >
          <option value="likert">리커트 척도</option>
          <option value="multiple">객관식</option>
          <option value="multiple_select">복수 응답</option>
          <option value="open">주관식</option>
          <option value="matrix">행렬형</option>
        </select>
      </div>

      {(type.type === 'multiple' || type.type === 'multiple_select') && (
        <div>
          <label htmlFor="options" className="block text-sm font-medium text-gray-700 mb-1">
            선택지 (한 줄에 하나씩 입력)
          </label>
          <textarea
            id="options"
            value={type.options?.join('\n') || ''}
            onChange={handleOptionsChange}
            rows={4}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="선택지 1&#10;선택지 2&#10;선택지 3"
          />
        </div>
      )}

      {type.type === 'likert' && (
        <div>
          <label htmlFor="scale" className="block text-sm font-medium text-gray-700 mb-1">
            척도 유형
          </label>
          <select
            id="scale"
            value={type.scale || 'satisfaction_5'}
            onChange={(e) => {
              // TODO: 척도 유형 변경 로직 구현
            }}
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