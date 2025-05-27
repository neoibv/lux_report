import { create } from 'zustand';
import { SurveyData } from '../utils/fileParser';

interface SurveyState {
  surveyData: SurveyData | null;
  isLoading: boolean;
  error: string | null;
  setSurveyData: (data: SurveyData) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const useSurveyStore = create<SurveyState>((set) => ({
  surveyData: null,
  isLoading: false,
  error: null,
  setSurveyData: (data) => set({ surveyData: data, error: null }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error, isLoading: false }),
  reset: () => set({ surveyData: null, isLoading: false, error: null })
}));

export default useSurveyStore; 