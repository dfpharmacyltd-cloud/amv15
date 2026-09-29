import React from 'react';
import { LinearityData, ThemeFormat } from '../types';
import { formatNum, formatInt } from '../services/mathUtils';
import { TrendingUp, Activity } from 'lucide-react';

interface LinearityChartProps {
  linearity: LinearityData;
  theme: ThemeFormat;
  approxRt: string;
  activeSubstance: string;
}

export const LinearityChart: React.FC<LinearityChartProps> = ({
  linearity,
  theme,
  approxRt,
  activeSubstance,
}) => {
  const levels = linearity?.levels || [];
  if (levels.length === 0) return null;
  const reg = linearity.regression;

  // Chart dimensions
  const width = 500;
  const height = 220;
  const padding = { top: 20, right: 30, bottom: 40, left: 65 };

  const minX = Math.min(...levels.map((l) => l.concentration)) * 0.8;
  const maxX = Math.max(...levels.map((l) => l.concentration)) * 1.1;
  const minY = 0;
  const maxY = Math.max(...levels.map((l) => l.meanArea)) * 1.15;

  const scaleX = (x: number) =>
    padding.left + ((x - minX) / (maxX - minX)) * (width - padding.left - padding.right);
  const scaleY = (y: number) =>
    height - padding.bottom - ((y - minY) / (maxY - minY)) * (height - padding.top - padding.bottom);

  // Line endpoints
  const x1 = minX;
  const y1 = reg.slope * x1 + reg.yIntercept;
  const x2 = maxX;
  const y2 = reg.slope * x2 + reg.yIntercept;

  const lineColor = theme === 'blue' ? '#1F4E79' : '#18181B';
  const pointColor = theme === 'blue' ? '#2563EB' : '#3F3F46';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 my-4">
      {/* 1. Linearity Calibration Plot */}
      <div className="bg-white border border-zinc-200 rounded-lg p-3 shadow-2xs">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-900">
            <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
            <span>Linearity Calibration Curve (ICH Q2(R2))</span>
          </div>
          <span className="text-[11px] font-mono text-zinc-600 bg-zinc-100 px-1.5 py-0.5 rounded">
            r = {formatNum(reg.correlationR, 5)} | r² = {formatNum(reg.rSquared, 4)}
          </span>
        </div>

        <div className="w-full overflow-x-auto">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto text-xs font-mono">
            {/* Gridlines */}
            {[0.25, 0.5, 0.75, 1.0].map((frac, idx) => {
              const yVal = maxY * frac;
              const yPos = scaleY(yVal);
              return (
                <g key={idx}>
                  <line
                    x1={padding.left}
                    y1={yPos}
                    x2={width - padding.right}
                    y2={yPos}
                    stroke="#E4E4E7"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={padding.left - 8}
                    y={yPos + 4}
                    textAnchor="end"
                    fill="#71717A"
                    fontSize="9"
                  >
                    {(yVal / 1000000).toFixed(1)}M
                  </text>
                </g>
              );
            })}

            {/* Axes */}
            <line
              x1={padding.left}
              y1={height - padding.bottom}
              x2={width - padding.right}
              y2={height - padding.bottom}
              stroke="#71717A"
              strokeWidth="1.2"
            />
            <line
              x1={padding.left}
              y1={padding.top}
              x2={padding.left}
              y2={height - padding.bottom}
              stroke="#71717A"
              strokeWidth="1.2"
            />

            {/* Regression Line */}
            <line
              x1={scaleX(x1)}
              y1={scaleY(y1)}
              x2={scaleX(x2)}
              y2={scaleY(y2)}
              stroke={lineColor}
              strokeWidth="2"
            />

            {/* Data Points */}
            {levels.map((l, i) => {
              const cx = scaleX(l.concentration);
              const cy = scaleY(l.meanArea);
              return (
                <g key={i}>
                  <circle
                    cx={cx}
                    cy={cy}
                    r="4.5"
                    fill={pointColor}
                    stroke="#FFFFFF"
                    strokeWidth="1.5"
                  />
                  <text x={cx} y={cy - 8} textAnchor="middle" fill="#27272A" fontSize="9" fontWeight="600">
                    {l.levelPercent}%
                  </text>
                </g>
              );
            })}

            {/* Axis Titles */}
            <text
              x={width / 2}
              y={height - 8}
              textAnchor="middle"
              fill="#52525B"
              fontSize="10"
              fontWeight="600"
            >
              Concentration (µg/mL)
            </text>
            <text
              x={14}
              y={height / 2}
              textAnchor="middle"
              fill="#52525B"
              fontSize="10"
              fontWeight="600"
              transform={`rotate(-90 14 ${height / 2})`}
            >
              Peak Area (µV·s)
            </text>
          </svg>
        </div>

        <div className="mt-1 flex items-center justify-between text-[11px] text-zinc-600 font-mono bg-zinc-50 p-1.5 rounded border border-zinc-200">
          <span>
            Equation: y = {formatNum(reg.slope, 1)}x + {formatNum(reg.yIntercept, 0)}
          </span>
          <span>Bias: {formatNum(reg.yInterceptBiasPercent, 2)}%</span>
        </div>
      </div>

      {/* 2. HPLC Chromatographic Simulation Overlay */}
      <div className="bg-white border border-zinc-200 rounded-lg p-3 shadow-2xs">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-900">
            <Activity className="w-3.5 h-3.5 text-emerald-600" />
            <span>Simulated HPLC Chromatogram (Specificity & Purity)</span>
          </div>
          <span className="text-[11px] font-mono text-zinc-600 bg-zinc-100 px-1.5 py-0.5 rounded">
            RT ≈ {approxRt}
          </span>
        </div>

        <div className="w-full overflow-x-auto">
          <svg viewBox="0 0 500 220" className="w-full h-auto text-xs font-mono">
            {/* Baseline */}
            <line x1="40" y1="180" x2="480" y2="180" stroke="#71717A" strokeWidth="1.5" />
            <line x1="40" y1="30" x2="40" y2="180" stroke="#71717A" strokeWidth="1.5" />

            {/* Time markers on x-axis */}
            {[0, 2, 4, 6, 8, 10, 12].map((min) => {
              const xPos = 40 + (min / 12) * 440;
              return (
                <g key={min}>
                  <line x1={xPos} y1="180" x2={xPos} y2="185" stroke="#71717A" />
                  <text x={xPos} y="198" textAnchor="middle" fill="#71717A" fontSize="9">
                    {min} min
                  </text>
                </g>
              );
            })}

            {/* Blank / Placebo flat line with minor solvent front injection dip */}
            <path
              d="M 40 180 Q 70 180, 80 178 T 100 181 T 130 180 L 480 180"
              fill="none"
              stroke="#D4D4D8"
              strokeWidth="1.5"
              strokeDasharray="4 2"
            />

            {/* Analyte Chromatographic Peak Gaussian shape around RT 6.5 min (x ~ 278) */}
            {/* Center ~ 40 + (6.5/12)*440 = 278 */}
            <path
              d="M 40 180 L 230 180 C 255 180, 268 50, 278 45 C 288 50, 301 180, 326 180 L 480 180"
              fill="rgba(37, 99, 235, 0.1)"
              stroke={lineColor}
              strokeWidth="2"
            />

            {/* Peak Label */}
            <text x="278" y="38" textAnchor="middle" fill="#18181B" fontSize="10" fontWeight="700">
              {activeSubstance} (RT: {approxRt})
            </text>
            <text x="278" y="24" textAnchor="middle" fill="#059669" fontSize="9" fontWeight="600">
              Purity Angle &lt; Threshold (Purity Passed)
            </text>

            {/* Solvent Front Peak */}
            <path
              d="M 85 180 C 95 180, 98 150, 102 150 C 106 150, 109 180, 118 180"
              fill="none"
              stroke="#9CA3AF"
              strokeWidth="1"
            />
            <text x="102" y="142" textAnchor="middle" fill="#9CA3AF" fontSize="8">
              Solvent Void
            </text>
          </svg>
        </div>

        <div className="mt-1 flex items-center justify-between text-[11px] text-zinc-600 font-mono bg-zinc-50 p-1.5 rounded border border-zinc-200">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-0.5 bg-blue-700 inline-block"></span> Standard / Sample
            </span>
            <span className="flex items-center gap-1 text-zinc-400">
              <span className="w-2.5 h-0.5 border-b border-dashed border-zinc-400 inline-block"></span> Placebo / Blank
            </span>
          </div>
          <span className="text-emerald-700 font-semibold">Resolution Passed</span>
        </div>
      </div>
    </div>
  );
};
