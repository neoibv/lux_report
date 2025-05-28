// LIKERT_SCALES: original.html 기준 다양한 리커트 유형 정의
export interface LikertScale {
  id: string;
  name: string;
  positive_keywords: string[];
  negative_keywords: string[];
  intensifiers: string[];
  responses: string[];
  scores: number[];
  colors: string[];
}

export const LIKERT_SCALES: LikertScale[] = [
  {
    id: 'satisfaction_5',
    name: '5점 만족도 (매우 만족 ~ 매우 불만족)',
    positive_keywords: ['만족'],
    negative_keywords: ['불만족'],
    intensifiers: ['매우', '다소', '약간', '전혀', '별로'],
    responses: ['매우 만족', '만족', '보통', '불만족', '매우 불만족'],
    scores: [5, 4, 3, 2, 1],
    colors: ['#2563eb', '#60a5fa', '#fef08a', '#fca5a5', '#f43f5e']
  },
  {
    id: 'agreement_5',
    name: '5점 동의도 (매우 그렇다 ~ 전혀 아니다)',
    positive_keywords: ['그렇다', '동의한다', '동의'],
    negative_keywords: ['아니다', '동의하지 않는다'],
    intensifiers: ['매우', '다소', '약간', '전혀', '별로'],
    responses: ['매우 그렇다', '그렇다', '보통이다', '아니다', '전혀 아니다'],
    scores: [5, 4, 3, 2, 1],
    colors: ['#2563eb', '#60a5fa', '#fef08a', '#fca5a5', '#f43f5e']
  },
  {
    id: 'agreement_5_v2',
    name: '5점 동의도 (매우 그렇다 ~ 전혀 그렇지 않다)',
    positive_keywords: ['그렇다', '동의한다', '동의'],
    negative_keywords: ['그렇지 않다', '동의하지 않는다'],
    intensifiers: ['매우', '다소', '약간', '전혀', '별로'],
    responses: ['매우 그렇다', '그렇다', '보통', '그렇지 않다', '전혀 그렇지 않다'],
    scores: [5, 4, 3, 2, 1],
    colors: ['#2563eb', '#60a5fa', '#fef08a', '#fca5a5', '#f43f5e']
  },
  {
    id: 'agreement_5_v3',
    name: '5점 동의도 (매우 동의함 ~ 전혀 동의하지 않음)',
    positive_keywords: ['동의함', '동의한다'],
    negative_keywords: ['동의하지 않음', '동의하지 않는다'],
    intensifiers: ['매우', '다소', '전혀'],
    responses: ['매우 동의함', '다소 동의함', '보통', '다소 동의하지 않음', '전혀 동의하지 않음'],
    scores: [5, 4, 3, 2, 1],
    colors: ['#2563eb', '#60a5fa', '#fef08a', '#fca5a5', '#f43f5e']
  },
  {
    id: 'improvement_5',
    name: '5점 변화 (눈에 띄게 더 좋아짐 ~ 눈에 띄게 더 나빠짐)',
    positive_keywords: ['좋아짐', '좋아졌다'],
    negative_keywords: ['나빠짐', '나빠졌다'],
    intensifiers: ['눈에 띄게', '미미하게', '다소', '거의'],
    responses: ['눈에 띄게 더 좋아짐', '미미하게 더 좋아짐', '거의 변함 없음', '미미하게 더 나빠짐', '눈에 띄게 더 나빠짐'],
    scores: [5, 4, 3, 2, 1],
    colors: ['#2563eb', '#60a5fa', '#fef08a', '#fca5a5', '#f43f5e']
  }
]; 