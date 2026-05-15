import React, { useMemo } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts';
import './HistoryChart.css';

export function HistoryChart({ data }) {
  const normalizedData = useMemo(() => {
    if (!data || data.length === 0) return [];

    // Base values from the first day to calculate percentage changes
    const basePortfolio = data[0].portfolioValue;
    const baseSP500 = data[0].sp500;
    const baseAllWorld = data[0].allWorld;

    return data.map(point => {
      // Avoid division by zero
      const portfolioPct = basePortfolio ? ((point.portfolioValue - basePortfolio) / basePortfolio) * 100 : 0;
      const sp500Pct = baseSP500 ? ((point.sp500 - baseSP500) / baseSP500) * 100 : 0;
      const allWorldPct = baseAllWorld ? ((point.allWorld - baseAllWorld) / baseAllWorld) * 100 : 0;

      return {
        ...point,
        portfolioPct: Number(portfolioPct.toFixed(2)),
        sp500Pct: Number(sp500Pct.toFixed(2)),
        allWorldPct: Number(allWorldPct.toFixed(2)),
      };
    });
  }, [data]);

  if (!normalizedData || normalizedData.length === 0) {
    return (
      <div className="history-chart-container empty">
        <p>Brak danych historycznych do wyświetlenia.</p>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip" style={{
          backgroundColor: 'rgba(20, 20, 30, 0.9)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '10px',
          borderRadius: '8px',
          color: '#fff',
          boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
        }}>
          <p className="label" style={{ margin: '0 0 8px 0', fontWeight: 'bold' }}>{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color, margin: '4px 0', fontSize: '0.9rem' }}>
              {entry.name}: {entry.value > 0 ? '+' : ''}{entry.value}%
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="history-chart-card fade-in">
      <div className="chart-header">
        <h3>Wzrost Wartości Portfela vs Indeksy</h3>
        <p>Zmiana procentowa od początku śledzenia</p>
      </div>
      
      <div className="chart-wrapper" style={{ width: '100%', height: 350 }}>
        <ResponsiveContainer>
          <LineChart
            data={normalizedData}
            margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
            <XAxis 
              dataKey="date" 
              stroke="rgba(255,255,255,0.5)" 
              tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} 
              tickMargin={10}
            />
            <YAxis 
              stroke="rgba(255,255,255,0.5)" 
              tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} 
              tickFormatter={(value) => `${value}%`}
              domain={['auto', 'auto']}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ paddingTop: '15px' }} />
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.3)" />
            
            <Line 
              type="monotone" 
              dataKey="portfolioPct" 
              name="Mój Portfel" 
              stroke="#6366f1" 
              strokeWidth={3}
              dot={{ r: 3, fill: '#6366f1' }}
              activeDot={{ r: 6 }} 
            />
            <Line 
              type="monotone" 
              dataKey="sp500Pct" 
              name="S&P 500" 
              stroke="#34d399" 
              strokeWidth={2}
              dot={false}
            />
            <Line 
              type="monotone" 
              dataKey="allWorldPct" 
              name="All-World (VWRA)" 
              stroke="#f59e0b" 
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
