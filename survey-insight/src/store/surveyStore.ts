import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { SurveyData, QuestionTypeValue, Question } from '../types';

interface SurveyState {
  surveyData: SurveyData | null;
  isLoading: boolean;
  error: string | null;
  setSurveyData: (data: SurveyData | ((prev: SurveyData | null) => SurveyData)) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  updateQuestionType: (questionId: string, type: QuestionTypeValue) => void;
  updateQuestionData: (questionId: string, data: Partial<Question>) => void;
  resetSurvey: () => void;
}

const useSurveyStore = create<SurveyState>()(
  devtools(
    (set) => ({
      surveyData: null,
      isLoading: false,
      error: null,

      setSurveyData: (data) => set((state) => ({
        surveyData: typeof data === 'function' ? data(state.surveyData) : data
      })),

      setLoading: (loading) => set({ isLoading: loading }),

      setError: (error) => set({ error }),

      updateQuestionType: (questionId, type) => set((state) => {
        if (!state.surveyData) return state;
        
        const updatedQuestions = state.surveyData.questions.map((q: Question) => 
          q.id === questionId ? { ...q, type } : q
        );

        return {
          surveyData: {
            ...state.surveyData,
            questions: updatedQuestions
          }
        };
      }),

      updateQuestionData: (questionId, data) => set((state) => {
        if (!state.surveyData) return state;
        
        const updatedQuestions = state.surveyData.questions.map((q: Question) => 
          q.id === questionId ? { ...q, ...data } : q
        );

        return {
          surveyData: {
            ...state.surveyData,
            questions: updatedQuestions
          }
        };
      }),

      resetSurvey: () => set({
        surveyData: null,
        isLoading: false,
        error: null
      })
    }),
    {
      name: 'survey-store',
      enabled: process.env.NODE_ENV === 'development'
    }
  )
);

export default useSurveyStore; 