# Survey Insight (Frontend)

이 폴더는 설문 데이터 자동 분류 및 시각화 웹앱의 프론트엔드 소스입니다.

## 주요 기능
- 설문 문항 자동 유형 분류 및 시각화
- 리커트/행렬형/객관식 등 다양한 문항 지원
- 평균점수, 기타응답, 미응답 등 고도화된 통계 처리

## 설치 및 실행

### 1. 의존성 설치
```bash
npm install
```

### 2. 환경변수 파일 생성
- `.env.example` 참고, 실제 값은 `.env`에 입력

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
  │   ├── types/
  │   ├── types.ts
  │   └── utils/
  ├── package.json
  ├── .gitignore
  └── README.md
```

## 환경변수
- `.env.example` 참고 (API 주소 등)
- 실제 `.env`는 직접 생성

## 기타
- node_modules, build 등은 업로드하지 않습니다. 