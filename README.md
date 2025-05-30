# Survey Insight

설문 데이터 자동 분류 및 시각화 웹앱

## 주요 기능
- 설문 문항 자동 유형 분류(리커트, 행렬형, 객관식, 복수응답 등)
- 문항별/세트별 그래프 및 통계 자동 생성
- 리커트 스코어 매핑 및 평균점수 계산
- 기타응답, 미응답 옵션 처리 등

## 설치 및 실행

### 1. 의존성 설치
```bash
npm install
```

### 2. 개발 서버 실행
```bash
npm start
```

## 프로젝트 구조
```
survey-insight/
  ├── src/
  │   ├── components/    # 재사용 가능한 UI 컴포넌트
  │   ├── pages/        # 페이지 컴포넌트
  │   ├── store/        # 상태 관리
  │   ├── types/        # TypeScript 타입 정의
  │   └── utils/        # 유틸리티 함수
  ├── public/           # 정적 파일
  ├── package.json      # 프로젝트 설정 및 의존성
  ├── tsconfig.json     # TypeScript 설정
  ├── tailwind.config.js # Tailwind CSS 설정
  ├── PRD.md           # 제품 요구사항 문서
  └── README.md        # 프로젝트 문서
```

## 기술 스택
- React + TypeScript
- Tailwind CSS
- Chart.js
- Zustand (상태 관리)

## 기타
- 자세한 제품 요구사항은 [PRD.md](./PRD.md)를 참고해주세요.
- 문의: your-email@example.com 