import React from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

interface QuestionRowSelectorProps {
  totalRows: number;
  selectedRow: number;
  onRowChange: (rowIndex: number) => void;
  previewData: string[][];
}

const QuestionRowSelector: React.FC<QuestionRowSelectorProps> = ({
  totalRows,
  selectedRow,
  onRowChange,
  previewData
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">질문 행 선택</h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onRowChange(Math.max(0, selectedRow - 1))}
            disabled={selectedRow === 0}
            className="p-1 rounded-full hover:bg-gray-100 disabled:opacity-50"
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
          <span className="text-sm text-gray-600">
            {selectedRow + 1}번째 행
          </span>
          <button
            onClick={() => onRowChange(Math.min(totalRows - 1, selectedRow + 1))}
            disabled={selectedRow === totalRows - 1}
            className="p-1 rounded-full hover:bg-gray-100 disabled:opacity-50"
          >
            <ChevronRightIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-4">
        <div className="space-y-2">
          {previewData.map((row, rowIndex) => (
            <div
              key={rowIndex}
              className={`p-2 rounded ${
                rowIndex === selectedRow
                  ? 'bg-blue-100 border border-blue-300'
                  : 'hover:bg-gray-100'
              }`}
              onClick={() => onRowChange(rowIndex)}
            >
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-500 w-8">
                  {rowIndex + 1}
                </span>
                <div className="flex-1 overflow-x-auto">
                  <div className="flex space-x-2">
                    {row.map((cell, cellIndex) => (
                      <span
                        key={cellIndex}
                        className="text-sm text-gray-600 whitespace-nowrap"
                      >
                        {cell}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default QuestionRowSelector; 