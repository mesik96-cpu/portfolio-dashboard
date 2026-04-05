import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const CATEGORY_COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];
const TICKER_COLORS = ['#0ea5e9', '#06b6d4', '#0284c7', '#2563eb', '#4f46e5', '#6366f1', '#7c3aed', '#9333ea', '#c026d3', '#db2777', '#e11d48', '#be123c', '#9f1239'];

const fmtMoney = (val) => new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 }).format(val);

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const pData = payload[0].payload;
    return (
      <div className="chart-tooltip" style={{ background: 'rgba(20,20,30,0.95)', padding: '10px 14px', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#fff', fontSize: '0.85rem', zIndex: 100 }}>
        <div style={{ fontWeight: '600', marginBottom: '4px' }}>{pData.name}</div>
        <div>Wartość: {fmtMoney(pData.value)}</div>
        {pData.percentage && <div style={{ opacity: 0.8 }}>Udział: {pData.percentage}%</div>}
      </div>
    );
  }
  return null;
};

// Customized Label to mimic Google Sheets:
// Draws standard outer label, but for large enough slices it could do inner. 
// We will stick to a clean, small outer label to prevent clipping, and use margins.
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name, value }) => {
  const RADIAN = Math.PI / 180;
  // Increase radius significantly so labels are pushed outside clearly
  const radius = outerRadius * 1.25; 
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  // For inner numeric value
  const innerR = innerRadius + (outerRadius - innerRadius) * 0.5;
  const innerX = cx + innerR * Math.cos(-midAngle * RADIAN);
  const innerY = cy + innerR * Math.sin(-midAngle * RADIAN);

  if (percent < 0.03) return null; // Hide labels for very small slices

  return (
    <g>
      {/* Inner numeric value (only if slice is large enough e.g. > 8%) */}
      {percent > 0.08 && (
        <text x={innerX} y={innerY} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize="0.7rem" fontWeight="500" opacity={0.9}>
          {fmtMoney(value)}
        </text>
      )}
      
      {/* Outer name and % */}
      <text x={x} y={y} fill="#c7c8d9" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="0.75rem">
        {name} ({(percent * 100).toFixed(1)}%)
      </text>
    </g>
  );
};

export function PortfolioChart({ data }) {
  if (!data || data.length === 0) return null;

  const categoryMap = {};
  let totalValue = 0;
  const allPositionsData = [];
  const plMap = {};
  let plTotal = 0;
  let restTotal = 0;

  data.forEach(item => {
    const val = item.marketValuePLN || 0;
    if (val > 0) {
      const cat = item.category || 'Pozostałe';
      
      categoryMap[cat] = (categoryMap[cat] || 0) + val;
      totalValue += val;
      
      const existingPos = allPositionsData.find(x => x.name === item.ticker);
      if (existingPos) {
        existingPos.value += val;
      } else {
        allPositionsData.push({ name: item.ticker, value: val });
      }

      if (cat === 'AKCJE POLSKIE') {
        plMap[item.ticker] = (plMap[item.ticker] || 0) + val;
        plTotal += val;
      } else if (cat !== 'ETF METALE') {
        restTotal += val;
      }
    }
  });

  const categoryChartData = Object.keys(categoryMap).map(cat => ({
    name: cat,
    value: categoryMap[cat],
    percentage: ((categoryMap[cat] / totalValue) * 100).toFixed(1)
  })).sort((a, b) => b.value - a.value);

  allPositionsData.sort((a, b) => b.value - a.value);

  const plChartData = Object.keys(plMap).map(ticker => ({
    name: ticker,
    value: plMap[ticker],
    percentage: ((plMap[ticker] / plTotal) * 100).toFixed(1)
  })).sort((a, b) => b.value - a.value);

  const plVsRestData = [
    { name: 'AKCJE POLSKIE', value: plTotal, percentage: ((plTotal / (plTotal+restTotal)) * 100).toFixed(1) },
    { name: 'RESZTA (BEZ METALI)', value: restTotal, percentage: ((restTotal / (plTotal+restTotal)) * 100).toFixed(1) }
  ].filter(d => d.value > 0);

  const ChartContainer = ({ title, chartData, colors }) => (
    <div className="chart-container fade-in" style={{ height: 320, background: 'rgba(20, 20, 30, 0.4)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', padding: '10px 0' }}>
      <h3 style={{ fontSize: '0.95rem', margin: '0 0 10px', color: '#c7c8d9', textAlign: 'center', fontWeight: '500' }}>{title}</h3>
      <ResponsiveContainer width="100%" height="90%">
        <PieChart margin={{ top: 20, right: 60, left: 60, bottom: 20 }}>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={45}
            outerRadius={75}
            paddingAngle={2}
            dataKey="value"
            stroke="none"
            label={renderCustomLabel}
            labelLine={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} opacity={0.85} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          {/* Recharts Legend configuration for smaller font and clean look */}
          <Legend wrapperStyle={{ fontSize: '0.7rem', color: '#9ca3af', opacity: 0.8 }} iconSize={8} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );

  return (
    // Force a 2x2 configuration with CSS Grid
    <div className="charts-wrapper" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px', marginBottom: '1.5rem' }}>
      <ChartContainer title="Główna struktura portfela (Kategorie)" chartData={categoryChartData} colors={CATEGORY_COLORS} />
      <ChartContainer title="Wszystkie pozycje w portfelu" chartData={allPositionsData} colors={TICKER_COLORS} />
      <ChartContainer title="Akcje Polskie" chartData={plChartData} colors={TICKER_COLORS} />
      <ChartContainer title="Akcje Polskie vs Zagranica (bez Metali)" chartData={plVsRestData} colors={['#ec4899', '#6366f1']} />
    </div>
  );
}
