import React from 'react';
import { ChartResponse, QuestionTypeKey } from '../types';

interface DataTableProps {
  data: ChartResponse[];
  questionType: QuestionTypeKey;
  respondentCount: number;
  showAverageScore?: boolean;
}

export const DataTable: React.FC<DataTableProps> = ({
  data,
  questionType,
  respondentCount,
  showAverageScore = false
}) => {
  const sortedData = [...data].sort((a, b) => b.value - a.value);
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              응답
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              빈도
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              비율
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sortedData.map((item) => {
            const percentage = ((item.value / total) * 100).toFixed(1);
            return (
              <tr key={item.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {item.text}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {item.value}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {percentage}%
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot className="bg-gray-50">
          <tr>
            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
              합계
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
              {total}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
              100%
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}; 