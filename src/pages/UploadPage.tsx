import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FileUpload from '../components/FileUpload';
import QuestionRowSelector from '../components/QuestionRowSelector';
import { parseFile } from '../utils/fileParser';
import useSurveyStore from '../store/surveyStore';
import * as XLSX from 'xlsx';
import { QuestionTypeValue, SurveyData, QuestionType, Question } from '../types';

const UploadPage: React.FC = () => {
  const navigate = useNavigate();
  const { setSurveyData, setLoading, setError } = useSurveyStore();
  const [previewData, setPreviewData] = useState<string[][]>([]);
  const [selectedQuestionRow, setSelectedQuestionRow] = useState(1);
  const [currentFile, setCurrentFile] = useState<File | null>(null);

  const handleFileSelect = async (file: File) => {
    try {
      setCurrentFile(file);
      setLoading(true);

      // 파일 미리보기 데이터 로드
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
          
          // 최대 5행까지만 미리보기
          const preview = jsonData.slice(0, 5).map((row: any) => 
            row.map((cell: any) => String(cell || ''))
          );
          setPreviewData(preview);
        } catch (error) {
          setError('파일 미리보기를 불러오는 중 오류가 발생했습니다.');
        } finally {
          setLoading(false);
        }
      };

      if (file.name.endsWith('.csv')) {
        reader.readAsText(file);
      } else {
        reader.readAsBinaryString(file);
      }
    } catch (error) {
      setError('파일을 읽는 중 오류가 발생했습니다.');
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!currentFile) return;

    try {
      setLoading(true);
      const data = await parseFile(currentFile, selectedQuestionRow);
      
      // 문항 유형 정보를 포함하여 questions 배열 생성
      const questions: Question[] = data.questions.map((text: string, index: number) => {
        const questionType = data.questionTypes.find((qt: QuestionType) => qt.columnIndex === index);
        return {
          id: `q${index}`,
          text,
          type: questionType?.type || 'multiple' as QuestionTypeValue,
          responses: [],
          matrixGroupId: questionType?.matrixGroupId?.toString(),
          matrixTitle: questionType?.commonPrefix,
          scale: questionType?.scale,
          options: questionType?.options,
          scoreMap: questionType?.scoreMap
        };
      });

      // 행렬형 문항 그룹 생성
      const matrixGroups = new Map<string, { id: string; title: string; questions: Question[] }>();
      questions.forEach(question => {
        if (question.matrixGroupId) {
          if (!matrixGroups.has(question.matrixGroupId)) {
            matrixGroups.set(question.matrixGroupId, {
              id: question.matrixGroupId,
              title: question.matrixTitle || question.matrixGroupId,
              questions: []
            });
          }
          matrixGroups.get(question.matrixGroupId)?.questions.push(question);
        }
      });

      const surveyData: SurveyData = {
        questions,
        headers: data.headers || [],
        rows: data.rows || [],
        questionTypes: data.questionTypes || [],
        questionRowIndex: data.questionRowIndex,
        title: '설문조사',
        description: '설문조사 결과',
        totalResponses: data.rows?.length || 0,
        matrixGroups: Array.from(matrixGroups.values())
      };

      setSurveyData(surveyData);
      navigate('/question-types');
    } catch (error) {
      setError(error instanceof Error ? error.message : '파일 처리 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            설문 데이터 업로드
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            CSV 또는 Excel 파일을 업로드하여 설문 데이터를 분석하세요
          </p>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <FileUpload onFileUpload={handleFileSelect} />
          </div>

          {previewData.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <QuestionRowSelector
                totalRows={previewData.length}
                selectedRow={selectedQuestionRow}
                onRowChange={setSelectedQuestionRow}
                previewData={previewData}
              />
              
              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleUpload}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  분석 시작
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UploadPage; 