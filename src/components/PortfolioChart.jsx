import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

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

// Customized Label to mimic Google Sheets
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name, value }) => {
  const RADIAN = Math.PI / 180;
  // Push outer label far enough to not overlap pie, but not so far it cuts off
  const radius = outerRadius * 1.35; 
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  // Inner numeric value coordinate
  const innerR = innerRadius + (outerRadius - innerRadius) * 0.5;
  const innerX = cx + innerR * Math.cos(-midAngle * RADIAN);
  const innerY = cy + innerR * Math.sin(-midAngle * RADIAN);

  if (percent < 0.02) return null; // Complete hide for < 2% to keep cleanly 

  return (
    <g>
      {/* Inner numeric rectangle/text for very large slices to match Google Sheets exactly */}
      {percent > 0.06 && (
        <text x={innerX} y={innerY} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize="0.75rem" fontWeight="600" opacity={0.95} pointerEvents="none">
          {fmtMoney(value)}
        </text>
      )}
      
      {/* Outer label */}
      <text x={x} y={y} fill="#e2e8f0" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="0.75rem" fontWeight="500">
        {name} ({(percent * 100).toFixed(1)}%)
      </text>
    </g>
  );
};

export function PortfolioChart({ data, activeFilter }) {
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
    { name: 'ZAGRANICA', value: restTotal, percentage: ((restTotal / (plTotal+restTotal)) * 100).toFixed(1) }
  ].filter(d => d.value > 0);

  const ChartContainer = ({ title, chartData, colors }) => (
    <div className="chart-container fade-in" style={{ height: 350, background: 'rgba(20, 20, 30, 0.4)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', padding: '10px 0', flex: 1, minWidth: '300px' }}>
      <h3 style={{ fontSize: '0.85rem', margin: '0 0 5px', color: '#9ca3af', textAlign: 'center', fontWeight: '500' }}>{title}</h3>
      <ResponsiveContainer width="100%" height="95%">
        {/* Increased margins so external labels never clip */}
        <PieChart margin={{ top: 20, right: 90, left: 90, bottom: 20 }}>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius="35%"
            outerRadius="65%"
            dataKey="value"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={1}
            isAnimationActive={false} /* Disabled intro animation for cleaner snappy load */
            label={renderCustomLabel}
            labelLine={{ stroke: 'rgba(255,255,255,0.4)', strokeWidth: 1 }}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} opacity={0.9} />
            ))}
          </Pie>
          {/* Instant tooltip, no animation/sliding issues */}
          <Tooltip content={<CustomTooltip />} isAnimationActive={false} />
          {/* Legend Removed */}
        </PieChart>
      </ResponsiveContainer>
    </div>
  );

  return (
    // Filter conditional logic on the charts displayed
    <div className="charts-wrapper" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '15px', marginBottom: '1.5rem' }}>
      {(activeFilter === 'all') && (
        <>
          <ChartContainer title="Główna struktura portfela (Kategorie)" chartData={categoryChartData} colors={CATEGORY_COLORS} />
          <ChartContainer title="Struktura wszystkich pozycji" chartData={allPositionsData} colors={TICKER_COLORS} />
        </>
      )}
      {(activeFilter === 'pl') && (
        <ChartContainer title="Akcje Polskie" chartData={plChartData} colors={TICKER_COLORS} />
      )}
      {(activeFilter === 'foreign') && (
        <ChartContainer title="Zagranica (bez Metali)" chartData={plVsRestData} colors={['#ec4899', '#6366f1']} />
      )}
    </div>
  );
}
