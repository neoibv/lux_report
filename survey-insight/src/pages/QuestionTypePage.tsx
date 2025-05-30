import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useSurveyStore from '../store/surveyStore';
import { QuestionTypeValue, Question } from '../types';
import QuestionTypeSelector from '../components/QuestionTypeSelector';

// 문항 유형별 색상 정의
const typeColors = {
  matrix: {
    border: 'border-purple-200',
    text: 'text-purple-800',
    title: 'text-purple-900'
  },
  multiple: {
    border: 'border-green-200',
    text: 'text-green-800',
    title: 'text-green-900'
  },
  likert: {
    border: 'border-blue-200',
    text: 'text-blue-800',
    title: 'text-blue-900'
  },
  multiple_select: {
    border: 'border-orange-200',
    text: 'text-orange-800',
    title: 'text-orange-900'
  },
  open: {
    border: 'border-yellow-200',
    text: 'text-yellow-800',
    title: 'text-yellow-900'
  }
};

interface MatrixGroup {
  id: string;
  title: string;
  questions: Question[];
}

const QuestionTypePage: React.FC = () => {
  const navigate = useNavigate();
  const { surveyData, setSurveyData } = useSurveyStore();
  const [matrixQuestions, setMatrixQuestions] = useState<MatrixGroup[]>([]);
  const [multipleQuestions, setMultipleQuestions] = useState<Question[]>([]);
  const [likertQuestions, setLikertQuestions] = useState<Question[]>([]);
  const [multipleSelectQuestions, setMultipleSelectQuestions] = useState<Question[]>([]);
  const [openQuestions, setOpenQuestions] = useState<Question[]>([]);

  useEffect(() => {
    if (!surveyData) {
      navigate('/');
      return;
    }

    // 행렬형 문항과 일반 문항 분리
    const matrixGroups = surveyData.matrixGroups || [];
    const generalQuestions = surveyData.questions.filter(q => !q.matrixGroupId);

    // 일반 문항을 유형별로 분류
    const multiple = generalQuestions.filter(q => q.type === 'multiple');
    const likert = generalQuestions.filter(q => q.type === 'likert');
    const multipleSelect = generalQuestions.filter(q => q.type === 'multiple_select');
    const open = generalQuestions.filter(q => q.type === 'open');

    setMatrixQuestions(matrixGroups);
    setMultipleQuestions(multiple);
    setLikertQuestions(likert);
    setMultipleSelectQuestions(multipleSelect);
    setOpenQuestions(open);
  }, [surveyData, navigate]);

  const handleQuestionTypeChange = (questionId: string, newType: QuestionTypeValue) => {
    if (!surveyData) return;

    const updatedQuestions = surveyData.questions.map(q => 
      q.id === questionId ? { ...q, type: newType } : q
    );

    setSurveyData({
      ...surveyData,
      questions: updatedQuestions
    });
  };

  // 행렬형 세트 내 소문항 유형 변경 시 분리 로직 추가
  const handleMatrixQuestionTypeChange = (groupId: string, questionId: string, newType: QuestionTypeValue) => {
    if (!surveyData) return;
    // 1. 해당 matrixGroup에서 문항 제거
    const updatedMatrixGroups = (surveyData.matrixGroups || []).map(group => {
      if (group.id !== groupId) return group;
      return {
        ...group,
        questions: group.questions.filter(q => q.id !== questionId)
      };
    }).filter(group => group.questions.length > 0); // 문항이 0개인 세트는 제거

    // 2. 해당 문항을 일반 문항으로 이동(type만 변경)
    const updatedQuestions = surveyData.questions.map(q =>
      q.id === questionId ? { ...q, type: newType, matrixGroupId: undefined } : q
    );

    setSurveyData({
      ...surveyData,
      matrixGroups: updatedMatrixGroups,
      questions: updatedQuestions
    });
  };

  const handleContinue = () => {
    navigate('/analysis');
  };

  // 응답 옵션을 표시하는 컴포넌트
  const ResponseOptions = ({ question }: { question: Question }) => {
    if (!question.options || question.options.length === 0) return null;

    // 복수응답의 경우 기타응답 구분
    if (question.type === 'multiple_select') {
      const questionType = surveyData?.questionTypes.find(
        (qt) => qt.columnIndex === parseInt(question.id.substring(1))
      );
      const otherResponses = questionType?.otherResponses || [];
      const mainOptions = question.options.filter(opt => !otherResponses.includes(opt));

      return (
        <div className="mt-1 text-sm">
          <div>
            <span className="font-medium text-gray-700">주요 응답: </span>
            <div className="mt-1 flex flex-wrap gap-1">
              {mainOptions.map((option: string, index: number) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {option}
                </span>
              ))}
            </div>
          </div>
          {otherResponses.length > 0 && (
            <div className="mt-2">
              <span className="font-medium text-gray-700">기타 응답: </span>
              <div className="mt-1">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                  {otherResponses.length}건
                </span>
              </div>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="mt-1 text-sm">
        <span className="font-medium text-gray-700">응답 옵션: </span>
        <div className="mt-1 flex flex-wrap gap-1">
          {question.options.map((option: string, index: number) => (
            <span
              key={index}
              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
            >
              {option}
            </span>
          ))}
        </div>
      </div>
    );
  };

  // 행렬형 문항 그룹의 응답 옵션을 표시하는 컴포넌트
  const MatrixResponseOptions = ({ group }: { group: MatrixGroup }) => {
    if (!group.questions[0]?.options || group.questions[0].options.length === 0) return null;

    return (
      <div className="mt-1 text-sm">
        <span className="font-medium text-gray-700">응답 옵션: </span>
        <div className="mt-1 flex flex-wrap gap-1">
          {group.questions[0].options.map((option: string, index: number) => (
            <span
              key={index}
              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
            >
              {option}
            </span>
          ))}
        </div>
      </div>
    );
  };

  const renderQuestionList = (questions: Question[], title: string, type: QuestionTypeValue) => {
    if (questions.length === 0) return null;
    const colors = typeColors[type];

    return (
      <div className="mb-8">
        <h2 className={`text-xl font-semibold mb-4 ${colors.title}`}>{title}</h2>
        <div className={`bg-white rounded-lg shadow p-6 ${colors.border} border-2`}>
          <div className="space-y-6">
            {questions.map(question => (
              <div key={question.id} className="flex items-start justify-between">
                <div className="flex-1">
                  <p className={`${colors.text}`}>{question.text}</p>
                  <ResponseOptions question={question} />
                </div>
                <div className="ml-4">
                  <QuestionTypeSelector
                    questionType={question.type}
                    onTypeChange={(type) => handleQuestionTypeChange(question.id, type)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  if (!surveyData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            문항 유형 검토
          </h1>
          <p className="text-lg text-gray-600">
            각 문항의 유형을 확인하고 필요한 경우 수정하세요
          </p>
          <button
            onClick={handleContinue}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-base font-semibold shadow"
          >
            분석 페이지로 이동
          </button>
        </div>

        {matrixQuestions.length > 0 && (
          <div className="mb-8">
            <h2 className={`text-xl font-semibold mb-4 ${typeColors.matrix.title}`}>행렬형 문항</h2>
            <div className="space-y-6">
              {matrixQuestions.map(group => (
                <div key={group.id} className={`bg-white rounded-lg shadow p-6 ${typeColors.matrix.border} border-2`}>
                  <h3 className={`text-lg font-medium mb-4 ${typeColors.matrix.text}`}>{group.title}</h3>
                  <MatrixResponseOptions group={group} />
                  <div className="mt-4 space-y-4">
                    {group.questions.map(question => (
                      <div key={question.id} className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className={typeColors.matrix.text}>{question.text}</p>
                        </div>
                        <div className="ml-4">
                          <QuestionTypeSelector
                            questionType={question.type}
                            onTypeChange={(type) => handleMatrixQuestionTypeChange(group.id, question.id, type)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {renderQuestionList(multipleQuestions, '객관식 문항', 'multiple')}
        {renderQuestionList(likertQuestions, '리커트 문항', 'likert')}
        {renderQuestionList(multipleSelectQuestions, '복수응답 문항', 'multiple_select')}
        {renderQuestionList(openQuestions, '주관식 문항', 'open')}
      </div>
    </div>
  );
};

export default QuestionTypePage; 