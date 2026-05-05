/**
 * T-143: 가벼운 SVG 라인 차트 — 외부 차트 라이브러리 의존성 없이.
 *
 * recharts/chart.js 의존성 추가는 첫 화면 1개 차트엔 과합. 본 컴포넌트는
 * 단일 시리즈 라인 + 점 + Y 축 라벨 정도. 향후 차트 다양화 필요 시
 * recharts 도입 검토.
 */
import React from 'react';

interface TrendLineChartProps {
  labels: string[]; // x 축 라벨 (각 점에 매칭)
  values: number[];
  /** 단위 표기 (예: "%", "장") — Y 축 max 라벨 옆에 붙음 */
  unit?: string;
  /** 점 / 라인 색 */
  color?: string;
  /** 차트 높이 (px) */
  height?: number;
}

const TrendLineChart: React.FC<TrendLineChartProps> = ({
  labels,
  values,
  unit = '',
  color = '#2563eb',
  height = 160,
}) => {
  if (values.length === 0) {
    return <div className="text-sm text-gray-400 text-center py-8">데이터 없음</div>;
  }

  const W = 600;
  const H = height;
  const PAD_L = 40;
  const PAD_R = 12;
  const PAD_T = 12;
  const PAD_B = 28;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;

  const max = Math.max(1, ...values);
  const min = 0;
  const yScale = (v: number) => PAD_T + innerH - ((v - min) / (max - min)) * innerH;
  const xScale = (i: number) =>
    values.length === 1
      ? PAD_L + innerW / 2
      : PAD_L + (i / (values.length - 1)) * innerW;

  const points = values.map((v, i) => `${xScale(i)},${yScale(v)}`).join(' ');

  // Y 축 grid 4 단계
  const yTicks = 4;
  const yMarks = Array.from({ length: yTicks + 1 }, (_, i) => (max / yTicks) * i);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      className="w-full"
      role="img"
    >
      {/* Y grid */}
      {yMarks.map((m, i) => {
        const y = yScale(m);
        return (
          <g key={i}>
            <line
              x1={PAD_L}
              x2={W - PAD_R}
              y1={y}
              y2={y}
              stroke="#e5e7eb"
              strokeWidth={1}
            />
            <text
              x={PAD_L - 6}
              y={y + 4}
              fontSize="11"
              textAnchor="end"
              fill="#6b7280"
            >
              {Number.isInteger(m) ? m : m.toFixed(1)}
              {i === yMarks.length - 1 && unit ? unit : ''}
            </text>
          </g>
        );
      })}

      {/* 라인 */}
      <polyline
        fill="none"
        stroke={color}
        strokeWidth={2}
        points={points}
      />
      {/* 점 */}
      {values.map((v, i) => (
        <circle
          key={i}
          cx={xScale(i)}
          cy={yScale(v)}
          r={3.5}
          fill={color}
        >
          <title>{`${labels[i]}: ${v}${unit}`}</title>
        </circle>
      ))}

      {/* X 축 라벨 — 6개 이상이면 짝수 인덱스만 표기 (혼잡 방지) */}
      {labels.map((lab, i) => {
        const skip = labels.length > 6 && i % 2 !== 0 && i !== labels.length - 1;
        if (skip) return null;
        return (
          <text
            key={i}
            x={xScale(i)}
            y={H - PAD_B + 16}
            fontSize="11"
            textAnchor="middle"
            fill="#6b7280"
          >
            {lab.replace(/^\d{4}-/, '')}
          </text>
        );
      })}
    </svg>
  );
};

export default TrendLineChart;
