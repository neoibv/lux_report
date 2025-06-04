import React from 'react';

interface TopNListProps {
  items: { text: string; value: number }[];
  topN?: number;
}

// 단어 빈도 추출 함수 (불용어 제외 X, 단순 분리)
function extractKeywords(items: { text: string; value: number }[]): { text: string; value: number }[] {
  const wordMap: Record<string, number> = {};
  items.forEach(item => {
    // 한글, 영문 단어 단위로 분리 (구두점, 특수문자 제거)
    const words = item.text.replace(/[.,!?\-\"'()\[\]{}]/g, '').split(/\s+/).map(w => w.trim()).filter(Boolean);
    words.forEach(word => {
      if (!word) return;
      wordMap[word] = (wordMap[word] || 0) + item.value;
    });
  });
  return Object.entries(wordMap).map(([text, value]) => ({ text, value }));
}

const TopNList: React.FC<TopNListProps> = ({ items, topN = 10 }) => {
  const keywords = extractKeywords(items);
  const sorted = [...keywords].sort((a, b) => b.value - a.value).slice(0, topN);
  return (
    <div className="w-full max-w-md mx-auto">
      <table className="w-full border text-xs">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-1 text-center">순위</th>
            <th className="p-1 text-center">키워드</th>
            <th className="p-1 text-center">빈도</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((item, idx) => (
            <tr key={item.text}>
              <td className="text-center">{idx + 1}</td>
              <td className="text-center">{item.text}</td>
              <td className="text-center">{item.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TopNList; 