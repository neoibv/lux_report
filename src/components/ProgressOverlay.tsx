import React from 'react';

interface ProgressOverlayProps {
  isOpen: boolean;
  progress?: number; // 0~100
  message?: string;
}

const ProgressOverlay: React.FC<ProgressOverlayProps> = ({ isOpen, progress = 0, message }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 flex flex-col items-center shadow-lg min-w-[300px]">
        <div className="mb-4">
          <svg className="animate-spin h-8 w-8 text-blue-500" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
          <div className="bg-blue-500 h-3 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
        <div className="text-sm text-gray-700 mb-1">{message || '진행 중...'}</div>
        <div className="text-xs text-gray-500">{progress}%</div>
      </div>
    </div>
  );
};

export default ProgressOverlay; 