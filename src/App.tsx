import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import UploadPage from './pages/UploadPage';
import QuestionTypePage from './pages/QuestionTypePage';
import AnalysisPage from './pages/AnalysisPage';
import ReportPage from './pages/ReportPage';

const App: React.FC = () => {
  // 분석 페이지용 상태
  const [analysisState, setAnalysisState] = useState({
    charts: [],
    selectedQuestions: [],
    selectedChartType: 'vertical',
    reportSelectedCharts: [], // 보고서로 보낼 그래프 다중 선택용
    // 필요시 추가
  });
  // 보고서 페이지용 상태
  const [reportState, setReportState] = useState({
    reportItems: [], // 보고서에 추가된 카드/설명/순서 등
  });

  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<UploadPage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/question-types" element={<QuestionTypePage />} />
          <Route path="/analysis" element={<AnalysisPage analysisState={analysisState} setAnalysisState={setAnalysisState} reportState={reportState} setReportState={setReportState} />} />
          <Route path="/report" element={<ReportPage reportState={reportState} setReportState={setReportState} analysisState={analysisState} setAnalysisState={setAnalysisState} />} />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;
