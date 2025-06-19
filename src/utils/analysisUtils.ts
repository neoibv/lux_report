export function generateCrossAnalysisData(
  processedRows: any[][],
  xAxisQuestion: string,
  yAxisQuestions: string[],
  questionTypes: any[],
  chartType: 'crossAnalysis' | 'crossAnalysisStacked'
) {
  // x축 문항의 응답 옵션들
  const xAxisOptions = questionTypes[parseInt(xAxisQuestion)]?.options || [];
  
  // y축 문항들의 데이터 준비
  const yAxisData = yAxisQuestions.map(yQIdx => {
    const questionType = questionTypes[parseInt(yQIdx)]?.type;
    const options = questionTypes[parseInt(yQIdx)]?.options || [];
    const scores = questionTypes[parseInt(yQIdx)]?.scores || [];
    
    // x축 옵션별로 y축 문항의 응답 데이터 수집
    const dataByXOption = xAxisOptions.map(xOption => {
      // x축 옵션에 해당하는 행들만 필터링
      const filteredRows = processedRows.filter(row => row[parseInt(xAxisQuestion)] === xOption);
      
      if (questionType === 'likert' || questionType === 'matrix') {
        // 평균 점수 계산
        const totalScore = filteredRows.reduce((sum, row) => {
          const value = row[parseInt(yQIdx)];
          const score = scores[options.indexOf(value)] || 0;
          return sum + score;
        }, 0);
        return {
          value: filteredRows.length > 0 ? totalScore / filteredRows.length : 0,
          count: filteredRows.length
        };
      } else {
        // 응답 빈도 계산
        const counts = options.map(option => 
          filteredRows.filter(row => row[parseInt(yQIdx)] === option).length
        );
        return {
          counts,
          total: filteredRows.length
        };
      }
    });

    return {
      questionIndex: parseInt(yQIdx),
      questionType,
      options,
      scores,
      dataByXOption
    };
  });

  return {
    xAxisOptions,
    yAxisData
  };
} 