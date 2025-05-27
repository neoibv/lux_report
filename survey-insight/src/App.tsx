import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import UploadPage from './pages/UploadPage';
import QuestionTypePage from './pages/QuestionTypePage';
import AnalysisPage from './pages/AnalysisPage';
import ReportPage from './pages/ReportPage';

const App: React.FC = () => {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<UploadPage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/question-types" element={<QuestionTypePage />} />
          <Route path="/analysis" element={<AnalysisPage />} />
          <Route path="/report" element={<ReportPage />} />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;
