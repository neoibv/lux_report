export type ChartType = 'vertical' | 'horizontal' | 'verticalStacked' | 'horizontalStacked' | 'pie' | 'donut' | 'verticalMatrix' | 'horizontalMatrix' | 'verticalMatrixStacked' | 'horizontalMatrixStacked' | 'wordcloud' | 'topN'; 

export interface Response {
  id?: string;
  label: string;
  value: number;
  count?: number;
  isOther?: boolean;
} 