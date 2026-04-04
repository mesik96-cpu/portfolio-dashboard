import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';

const CATEGORY_COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];
const TICKER_COLORS = ['#0ea5e9', '#06b6d4', '#0284c7', '#2563eb', '#4f46e5', '#6366f1', '#7c3aed', '#9333ea', '#c026d3', '#db2777', '#e11d48', '#be123c', '#9f1239'];

const fmtMoney = (val) => new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 }).format(val);

const renderLabel = ({ name, percent }) => {
  if (percent < 0.02) return '';
  return `${name} (${(percent * 100).toFixed(1)}%)`;
};

export function PortfolioChart({ data }) {
  if (!data || data.length === 0) return null;

  // 1. Główna struktura portfela (Kategorie)
  const categoryMap = {};
  let totalValue = 0;

  // 2. Wszystkie pozycje w jednym wykresie
  const allPositionsData = [];

  // 3. Akcje polskie
  const plMap = {};
  let plTotal = 0;

  // 4. Akcje polskie vs reszta (bez ETF Metale)
  let restTotal = 0;

  data.forEach(item => {
    const val = item.marketValuePLN || 0;
    if (val > 0) {
      const cat = item.category || 'Pozostałe';
      
      // 1. Kategorie
      categoryMap[cat] = (categoryMap[cat] || 0) + val;
      totalValue += val;
      
      // 2. Wszystkie pozycje
      const existingPos = allPositionsData.find(x => x.name === item.ticker);
      if (existingPos) {
        existingPos.value += val;
      } else {
        allPositionsData.push({ name: item.ticker, value: val });
      }

      // 3 & 4. Pl Akcje i Reszta
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
    value: categoryMap[cat]
  })).sort((a, b) => b.value - a.value);

  allPositionsData.sort((a, b) => b.value - a.value);

  const plChartData = Object.keys(plMap).map(ticker => ({
    name: ticker,
    value: plMap[ticker]
  })).sort((a, b) => b.value - a.value);

  const plVsRestData = [
    { name: 'AKCJE POLSKIE', value: plTotal },
    { name: 'RESZTA (BEZ METALI)', value: restTotal }
  ].filter(d => d.value > 0);

  const ChartContainer = ({ title, data, colors }) => (
    <div className="chart-container fade-in" style={{ height: 450, background: 'rgba(20, 20, 30, 0.6)', backdropFilter: 'blur(12px)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', padding: '20px' }}>
      <h3 style={{ fontSize: '1.1rem', margin: '0 0 20px', color: '#e0e7ff', textAlign: 'center' }}>{title}</h3>
      <ResponsiveContainer width="100%" height="85%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={110}
            paddingAngle={2}
            dataKey="value"
            stroke="none"
            label={renderLabel}
            labelLine={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1 }}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Legend style={{ paddingTop: '20px' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );

  return (
    <div className="charts-wrapper" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px', marginBottom: '2rem' }}>
      <ChartContainer title="Główna struktura portfela (Kategorie)" data={categoryChartData} colors={CATEGORY_COLORS} />
      <ChartContainer title="Wszystkie pozycje" data={allPositionsData} colors={TICKER_COLORS} />
      <ChartContainer title="Akcje Polskie" data={plChartData} colors={TICKER_COLORS} />
      <ChartContainer title="Akcje Polskie vs Reszta (bez Metali)" data={plVsRestData} colors={['#ec4899', '#6366f1']} />
    </div>
  );
}
