import React, { useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useSurveyStore from '../store/surveyStore';
import { QuestionTypeValue, ChartType, Question } from '../types';
import ChartCard from '../components/ChartCard';
import { findMatrixGroups } from '../utils/fileParser';

const QuestionTypePage: React.FC = () => {
  const navigate = useNavigate();
  const { surveyData, setSurveyData, updateQuestionType, updateQuestionData } = useSurveyStore();

  // 초기 데이터 로드 및 행렬형 그룹 처리
  useEffect(() => {
    if (!surveyData) {
      navigate('/');
      return;
    }

    // matrixGroups가 이미 있는 경우 업데이트하지 않음
    if (surveyData.matrixGroups) return;

    // 행렬형 그룹 찾기
    const matrixGroups = findMatrixGroups(surveyData.questions);
    
    // 행렬형 그룹이 있으면 업데이트
    if (matrixGroups.length > 0) {
      setSurveyData({
        ...surveyData,
        matrixGroups
      });
    }
  }, [surveyData, navigate, setSurveyData]);

  // 차트 타입 변경 핸들러
  const handleChartTypeChange = useCallback((questionId: string, chartType: ChartType) => {
    updateQuestionData(questionId, { chartType });
  }, [updateQuestionData]);

  // 질문 타입 변경 핸들러
  const handleQuestionTypeChange = useCallback((questionId: string, type: QuestionTypeValue) => {
    updateQuestionType(questionId, type);
  }, [updateQuestionType]);

  // 데이터 테이블 편집 핸들러
  const handleDataTableEdit = useCallback((questionId: string, data: any[]) => {
    updateQuestionData(questionId, { responses: data });
  }, [updateQuestionData]);

  // 그리드 크기 변경 핸들러
  const handleGridSizeChange = useCallback((questionId: string, size: { w: number; h: number }) => {
    updateQuestionData(questionId, { gridSize: size });
  }, [updateQuestionData]);

  // 질문 복제 핸들러
  const handleDuplicate = useCallback((questionId: string) => {
    if (!surveyData) return;

    const questionToDuplicate = surveyData.questions.find(q => q.id === questionId);
    if (!questionToDuplicate) return;

    const newQuestion = {
      ...questionToDuplicate,
      id: `${questionToDuplicate.id}_copy_${Date.now()}`,
      text: `${questionToDuplicate.text} (복사본)`
    };

    setSurveyData({
      ...surveyData,
      questions: [...surveyData.questions, newQuestion]
    });
  }, [surveyData, setSurveyData]);

  // 질문 삭제 핸들러
  const handleDelete = useCallback((questionId: string) => {
    if (!surveyData) return;

    setSurveyData({
      ...surveyData,
      questions: surveyData.questions.filter(q => q.id !== questionId)
    });
  }, [surveyData, setSurveyData]);

  // 행렬형 그룹 렌더링
  const renderMatrixGroups = useMemo(() => {
    if (!surveyData?.matrixGroups) return null;

    return surveyData.matrixGroups.map(group => (
      <div key={group.id} className="mb-8">
        <h2 className="text-xl font-bold mb-4">{group.title}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {group.questions.map(question => (
            <ChartCard
              key={question.id}
              questionIndex={question.id}
              question={question.text}
              questionType={question.type}
              chartType={question.chartType || 'vertical'}
              data={question.responses}
              onChartTypeChange={(type) => handleChartTypeChange(question.id, type)}
              onQuestionTypeChange={(type) => handleQuestionTypeChange(question.id, type)}
              onDataTableEdit={(data) => handleDataTableEdit(question.id, data)}
              gridSize={question.gridSize || { w: 1, h: 1 }}
              onGridSizeChange={(size) => handleGridSizeChange(question.id, size)}
              onDuplicate={() => handleDuplicate(question.id)}
              onDelete={() => handleDelete(question.id)}
              matrixTitle={group.title}
              responseOrder={question.responseOrder}
              scores={question.scores}
            />
          ))}
        </div>
      </div>
    ));
  }, [surveyData, handleChartTypeChange, handleQuestionTypeChange, handleDataTableEdit, handleGridSizeChange, handleDuplicate, handleDelete]);

  // 일반 질문 렌더링
  const renderQuestions = useMemo(() => {
    if (!surveyData) return null;

    const nonMatrixQuestions = surveyData.questions.filter(q => !q.matrixGroupId);
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {nonMatrixQuestions.map(question => (
          <ChartCard
            key={question.id}
            questionIndex={question.id}
            question={question.text}
            questionType={question.type}
            chartType={question.chartType || 'vertical'}
            data={question.responses}
            onChartTypeChange={(type) => handleChartTypeChange(question.id, type)}
            onQuestionTypeChange={(type) => handleQuestionTypeChange(question.id, type)}
            onDataTableEdit={(data) => handleDataTableEdit(question.id, data)}
            gridSize={question.gridSize || { w: 1, h: 1 }}
            onGridSizeChange={(size) => handleGridSizeChange(question.id, size)}
            onDuplicate={() => handleDuplicate(question.id)}
            onDelete={() => handleDelete(question.id)}
            responseOrder={question.responseOrder}
            scores={question.scores}
          />
        ))}
      </div>
    );
  }, [surveyData, handleChartTypeChange, handleQuestionTypeChange, handleDataTableEdit, handleGridSizeChange, handleDuplicate, handleDelete]);

  if (!surveyData) {
    return <div>로딩 중...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-2">{surveyData.title}</h1>
          <p className="text-gray-600">각 문항의 유형을 검토하고 필요한 경우 수정하세요.</p>
        </div>
        <button
          onClick={() => navigate('/analysis')}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          분석 페이지로 이동
        </button>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">행렬형 문항</h2>
        {renderMatrixGroups}
      </div>

      <div>
        <h2 className="text-xl font-bold mb-4">일반 문항</h2>
        {renderQuestions}
      </div>
    </div>
  );
};

export default QuestionTypePage; 