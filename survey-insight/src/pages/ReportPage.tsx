import React from 'react';
import { useNavigate } from 'react-router-dom';
import useSurveyStore from '../store/surveyStore';

const ReportPage: React.FC = () => {
  const navigate = useNavigate();
  const { surveyData } = useSurveyStore();

  if (!surveyData) {
    navigate('/upload');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            보고서 생성
          </h1>
          <p className="text-lg text-gray-600">
            분석 결과를 보고서로 만들어보세요
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600">
            보고서 생성 기능 구현 중입니다...
          </p>
        </div>

        <div className="mt-6 flex justify-end space-x-4">
          <button
            onClick={() => navigate('/analysis')}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            이전
          </button>
          <button
            onClick={() => {}}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            보고서 다운로드
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportPage; 