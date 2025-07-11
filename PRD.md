# Survey Insight - 설문 데이터 분석 및 시각화 도구

## 0. 아키텍처 검토 규칙

### 0.1 작업 수행 전 필수 검토 사항
1. **SOLID 원칙 준수 여부**
   - 단일 책임 원칙 (SRP): 각 컴포넌트/함수는 하나의 책임만 가짐
   - 개방-폐쇄 원칙 (OCP): 기존 코드 수정 없이 확장 가능
   - 리스코프 치환 원칙 (LSP): 일관된 인터페이스 유지
   - 인터페이스 분리 원칙 (ISP): 최소한의 의존성
   - 의존성 역전 원칙 (DIP): 추상화된 의존성

2. **성능 최적화 고려사항**
   - 코드 스플리팅 적용
   - 지연 로딩 구현
   - 메모이제이션 활용
   - 가상화 렌더링 적용

3. **작업 원칙 준수 여부**
   - 기존 기능 보존 및 하위 호환성 유지
   - 모든 변경사항 문서화
   - TypeScript 타입 정의 철저히 관리
   - 테스트 코드 작성
   - 변경 전 영향 분석 수행
   - 코드 리뷰 프로세스 준수

4. **변경 관리 프로세스 준수**
   - 기존 기능 변경/삭제 시 사전 승인 필수
   - 변경 요청 시 영향 범위 및 대안 제시
   - 전역 상태(Zustand) 변경 시 신중한 접근
   - Pull Request를 통한 코드 리뷰 의무화

### 0.2 변경 요청 시 필수 포함 사항
1. 변경 사유 및 목적
2. 영향 받는 기능 목록
3. 성능 영향 분석
4. 하위 호환성 보장 방안
5. 테스트 계획
6. 문서화 계획

### 0.3 작업 수행 전 체크리스트
- [ ] 아키텍처 원칙 준수 여부 확인
- [ ] 기존 기능 영향도 분석
- [ ] 성능 최적화 가능성 검토
- [ ] 문서화 필요성 확인
- [ ] 테스트 코드 작성 계획 수립

## 1. 제품 개요

Survey Insight는 설문 데이터를 효율적으로 분석하고 시각화할 수 있는 웹 기반 도구입니다. 엑셀/CSV 형식의 설문 데이터를 업로드하여 자동으로 문항 유형을 분류하고, 다양한 차트를 통해 직관적인 데이터 분석을 제공합니다.

## 2. 핵심 가치 제안

- **자동화된 문항 분류**: AI 기반 문항 유형 자동 감지
- **직관적인 시각화**: 다양한 차트 타입을 통한 데이터 인사이트 도출
- **유연한 데이터 처리**: 다양한 설문 형식 지원 및 커스터마이징
- **실시간 분석**: 즉각적인 데이터 처리와 시각화

## 3. 주요 기능 상세

### 3.1 데이터 입력 및 전처리
- **파일 업로드**
  - 지원 형식: XLSX, CSV
  - 드래그 앤 드롭 인터페이스
  - 대용량 파일 처리 지원
  - 파일 형식 자동 감지

- **데이터 전처리**
  - 헤더 행 자동 감지
  - 결측치 처리
  - 데이터 정규화
  - 특수문자 처리

### 3.2 문항 유형 자동 분류
- **지원하는 문항 유형**
  - 리커트 척도 (5점/동의도)
  - 객관식
  - 주관식
  - 행렬형 문항
  - 복수응답

- **자동 분류 로직**
  - 리커트 척도: 응답 패턴, 키워드, 점수 기반 감지
  - 행렬형: 공통 접두사 기반 그룹화
  - 복수응답: 구분자(@@) 기반 옵션 분리

### 3.3 문항 관리 및 편집
- **문항 유형 수정**
  - 드롭다운을 통한 수동 변경
  - 일괄 변경 기능
  - 변경 이력 추적

- **응답 관리**
  - 리커트/행렬형: 응답 순서 변경
  - 기타 응답 처리
  - 응답 그룹화/병합

- **문항 순서 관리**
  - 드래그 앤 드롭 인터페이스
  - 일괄 순서 변경
  - 순서 저장/복원

### 3.4 데이터 분석 및 시각화
- **차트 타입**
  - 막대 그래프 (세로/가로)
  - 파이 차트
  - 도넛 차트
  - 리커트 평균/비율 차트

- **차트 커스터마이징**
  - 색상 테마
  - 레이블 포맷
  - 축 설정
  - 범례 위치
  - 애니메이션 효과
  - 차트 타입 변경
  - 개별 차트 삭제
  - 전체 차트 삭제

- **분석 기능**
  - 문항 검색
  - 유형별 그룹화
  - 다중 문항 선택

### 3.5 상태 관리
- **전역 상태 관리**
  - Zustand 기반 상태 관리
  - 실시간 데이터 동기화
  - 변경사항 자동 저장

- **데이터 지속성**
  - 로컬 스토리지 활용
  - 세션 관리
  - 자동 백업

## 4. 기술 스택

### 4.1 프론트엔드
- React 18.2.0
- TypeScript 4.9.5
- Tailwind CSS 3.4.1
- Chart.js 4.4.1
- react-beautiful-dnd 13.1.1
- Zustand 4.5.0

### 4.2 개발 도구
- ESLint
- Prettier
- TypeScript
- Vite

### 4.3 실행 및 빌드 안내
- 개발 서버 실행:
  ```bash
  npm run dev
  ```
- 배포 빌드:
  ```bash
  npm run build
  ```
- 환경변수는 반드시 `VITE_` 접두사로 사용해야 함 (예: `VITE_API_URL`)

## 5. 아키텍처 및 설계 원칙

### 5.1 SOLID 원칙 적용
- **단일 책임 원칙 (SRP)**
  - 컴포넌트별 명확한 책임 분리
  - 유틸리티 함수 모듈화

- **개방-폐쇄 원칙 (OCP)**
  - 확장 가능한 차트 시스템
  - 플러그인 기반 아키텍처

- **리스코프 치환 원칙 (LSP)**
  - 일관된 컴포넌트 인터페이스
  - 타입 안정성 보장

- **인터페이스 분리 원칙 (ISP)**
  - 최소한의 의존성
  - 명확한 API 설계

- **의존성 역전 원칙 (DIP)**
  - 추상화된 의존성
  - 테스트 용이성

### 5.2 성능 최적화
- 코드 스플리팅
- 지연 로딩
- 메모이제이션
- 가상화 렌더링

### 5.3 작업 원칙 및 가이드라인

#### 5.3.1 기능 구현 원칙
- **기존 기능 보존 및 하위 호환성 유지**:
  - 이미 구현이 완료된 기능은 어떠한 경우에도 삭제하거나 임의로 수정할 수 없습니다.
  - 기능 개선이 필요한 경우, 기존 기능의 동작 방식과 사용자 경험을 최대한 보존해야 하며, 반드시 하위 호환성을 보장해야 합니다.
  - 중대한 변경이 불가피할 경우, 반드시 사전 승인을 받아야 합니다.

- **기능 문서화**:
  - 모든 구현된 기능은 이 PRD에 명시된 형식(✅ 구현됨, 🚧 진행중, �� 계획)에 따라 정확하게 상태를 표시하고, 기능에 대한 상세 설명을 함께 작성해야 합니다.
  - 기능 변경 시 관련 문서도 함께 업데이트해야 합니다.

- **코드 품질 관리**:
  - TypeScript 타입 정의를 철저히 관리하고, 컴포넌트 재사용성을 고려해야 합니다.
  - 테스트 코드 작성을 필수로 합니다.

#### 5.3.2 변경 관리 프로세스
- **변경 요청 및 승인**:
  - 기존 기능의 변경, 삭제, 또는 이미 구현된 디자인/로직 수정이 필요한 경우, 반드시 담당자(또는 PM)에게 변경 요청을 하고 명시적인 승인을 받아야 합니다.
  - 승인 없이 기존 기능을 변경하거나 삭제하는 것은 엄격히 금지됩니다.
  - 변경 요청 시, 변경의 필요성, 예상되는 영향 범위, 그리고 대안을 명확히 제시해야 합니다.

- **의존성 및 영향 분석**:
  - 어떤 기능을 개발하거나 수정하기 전에, 해당 작업이 다른 기능이나 모듈에 미칠 수 있는 잠재적 영향을 철저히 분석해야 합니다.
  - 특히 전역 상태(Zustand)에 영향을 미칠 수 있는 변경은 신중하게 접근하고, 관련된 모든 컴포넌트와 로직을 검토해야 합니다.

- **코드 리뷰 의무화**:
  - 모든 기능 추가 및 변경 사항은 Pull Request를 통해 제출되어야 하며, 담당자의 코드 리뷰 승인을 받은 후에만 병합할 수 있습니다.
  - 코드 리뷰 시, 변경 내용의 정확성, 기존 기능과의 호환성, 그리고 전반적인 코드 품질을 중점적으로 확인합니다.

#### 5.3.3 현재 구현 상태
- **문항 유형** ✅
  - 리커트 척도 (5점/동의도)
  - 객관식
  - 주관식
  - 행렬형 문항
  - 복수응답

- **차트 타입** ✅
  - 막대 그래프 (세로/가로)
  - 파이 차트
  - 도넛 차트
  - 리커트 평균/비율 차트

- **차트 커스터마이징** ✅
  - 색상 테마
  - 레이블 포맷
  - 축 설정
  - 범례 위치
  - 애니메이션 효과
  - 차트 타입 변경
  - 개별/전체 차트 삭제

- **분석 기능** ✅
  - 문항 검색
  - 유형별 그룹화
  - 다중 문항 선택

## 6. 향후 개발 계획

### 6.1 단기 목표 (1-2개월)
- 보고서 생성 기능
- PDF/이미지 내보내기
- 차트 커스터마이징 기능 확장

### 6.2 중기 목표 (3-6개월)
- 교차 분석 기능
- 워드 클라우드
- 고급 필터링
- API 연동

### 6.3 장기 목표 (6개월 이상)
- 실시간 협업
- AI 기반 인사이트
- 커스텀 템플릿
- 확장성 있는 플러그인 시스템

## 7. 라이선스

MIT License

## 8. 기여 방법

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 9. 연락처

- 이메일: jurapj@nexon.co.kr
- GitHub: [neoibv](https://github.com/neoibv)