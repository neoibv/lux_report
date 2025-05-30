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

### 2. 환경변수 파일 생성
- `.env.example` 파일을 참고해 `.env` 파일을 만드세요.

### 3. 개발 서버 실행
```bash
npm start
```

## 폴더 구조
```
survey-insight/
  ├── src/
  │   ├── components/
  │   ├── pages/
  │   ├── store/
  │   ├── types.ts
  │   └── utils/
  ├── package.json
  ├── .gitignore
  └── README.md
```

## 환경변수
- `.env.example` 파일 참고
- 실제 `.env`는 직접 생성(민감정보는 업로드 금지)

## 기타
- node_modules, build 결과물 등은 업로드하지 않습니다.
- 문의: your-email@example.com 