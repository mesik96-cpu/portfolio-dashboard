import { useState, useEffect } from 'react'
import { fetchPortfolioData } from './utils/csvParser'
import { DataTable } from './components/DataTable'
import { PortfolioChart } from './components/PortfolioChart'
import { Briefcase, TrendingUp, AlertCircle, RefreshCw, Lock } from 'lucide-react'
import './App.css'

function App() {
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Custom Filters:
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'pl' | 'foreign'

  const handlePinSubmit = (e) => {
    e.preventDefault()
    if (pinInput === '1953') {
      setIsAuthorized(true)
    } else {
      alert('Nieprawidłowy PIN')
      setPinInput('')
    }
  }

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const parsedData = await fetchPortfolioData()
      setData(parsedData)
    } catch (err) {
      console.error(err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    const interval = setInterval(() => {
      loadData()
    }, 5 * 60 * 1000)
    
    return () => clearInterval(interval)
  }, [])

  // Apply filtering
  const filteredData = data.filter(item => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'pl') return item.category === 'AKCJE POLSKIE';
    if (activeFilter === 'metals') return item.category === 'ETF METALE';
    if (activeFilter === 'foreign') return item.category !== 'AKCJE POLSKIE' && item.category !== 'ETF METALE';
    return true;
  });

  const totalValue = filteredData.reduce((sum, item) => sum + (item.marketValuePLN || 0), 0)
  const totalCost = filteredData.reduce((sum, item) => sum + (item.costBasePLN || 0), 0)
  const totalProfit = filteredData.reduce((sum, item) => sum + (item.unrealizedGainPLN || 0), 0)
  const profitPct = totalCost > 0 ? (totalValue - totalCost) / totalCost : 0

  const fmtMoney = (val) => new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val || 0)
  const fmtPct = (val) => new Intl.NumberFormat('pl-PL', { style: 'percent', minimumFractionDigits: 2 }).format(val || 0)

  if (!isAuthorized) {
    return (
      <div className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div className="kpi-card highlight" style={{ maxWidth: '400px', width: '100%', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <Lock size={48} style={{ margin: '0 auto', color: '#6366f1' }} />
          <h2 style={{ margin: 0, color: '#f3f4f6' }}>Autoryzacja</h2>
          <p style={{ margin: 0, color: '#9ca3af', fontSize: '0.9rem' }}>Wprowadź kod PIN aby wyświetlić portfel</p>
          <form onSubmit={handlePinSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <input 
              type="password" 
              autoFocus
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="Twój PIN"
              style={{ padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: '1.2rem', textAlign: 'center' }}
            />
            <button type="submit" className="btn-refresh" style={{ justifyContent: 'center', padding: '12px' }}>
              Wejdź
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="app-container fade-in">
      <header className="app-header">
        <div className="header-title">
          <Briefcase className="logo-icon" />
          <h1>Portfel - papiery notowane</h1>
        </div>
        <button className="btn-refresh" onClick={loadData} disabled={loading}>
          <RefreshCw className={loading ? "spin" : ""} size={16} />
          <span>Odśwież</span>
        </button>
      </header>

      <main className="app-main">
        {error && (
          <div className="error-card">
            <AlertCircle size={20} />
            <span>Błąd ładowania danych z Arkusza: {error}</span>
          </div>
        )}

        {loading && data.length === 0 ? (
          <div className="loading-spinner">
            <div className="spinner"></div>
            Wczytywanie analizy portfela...
          </div>
        ) : (
          <>
            {/* KPI Section */}
            <div className="kpi-grid fade-in">
              <div className="kpi-card">
                <div className="kpi-label">Wartość Portfela</div>
                <div className="kpi-value">{fmtMoney(totalValue)}</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-label">Zainwestowano</div>
                <div className="kpi-value">{fmtMoney(totalCost)}</div>
              </div>
              <div className="kpi-card highlight">
                <div className="kpi-label">Niezrealizowany Zysk / Strata</div>
                <div className={`kpi-value ${totalProfit >= 0 ? "positive" : "negative"}`}>
                  {totalProfit > 0 ? "+" : ""}{fmtMoney(totalProfit)}
                </div>
                <div className={`kpi-trend ${totalProfit >= 0 ? "positive" : "negative"}`}>
                  <TrendingUp size={14} />
                  {totalProfit > 0 ? "+" : ""}{fmtPct(profitPct)}
                </div>
              </div>
            </div>

            {/* Filter Controls (replaces standard Pivot controls) */}
            <div className="pivot-controls" style={{ marginBottom: '1.5rem', justifyContent: 'center' }}>
              <button 
                className={`btn-pivot ${activeFilter === 'all' ? 'active' : ''}`}
                onClick={() => setActiveFilter('all')}
              >
                Wszystkie
              </button>
              <button 
                className={`btn-pivot ${activeFilter === 'pl' ? 'active' : ''}`}
                onClick={() => setActiveFilter('pl')}
              >
                Akcje Polskie
              </button>
              <button 
                className={`btn-pivot ${activeFilter === 'metals' ? 'active' : ''}`}
                onClick={() => setActiveFilter('metals')}
              >
                Metale
              </button>
              <button 
                className={`btn-pivot ${activeFilter === 'foreign' ? 'active' : ''}`}
                onClick={() => setActiveFilter('foreign')}
              >
                Zagranica (bez metali)
              </button>
            </div>

            {/* Desktop Dashboard Layout: Charts -> Table. Mobile: Table -> Charts */}
            <div className="content-layout">
              <div className="charts-section">
                <PortfolioChart data={data} activeFilter={activeFilter} />
              </div>
              
              <div className="table-section">
                <DataTable data={filteredData} />
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

export default App
