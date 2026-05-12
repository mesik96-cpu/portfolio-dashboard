import Papa from 'papaparse';

const MAIN_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRBdBUzDghTVlAb1rlhElvsxn4lezcXqdQI1zJ73iVGubnmwNpxtu1pZt0baamVRJGfw4FAYOK49BYn/pub?gid=1111357939&single=true&output=csv";
const SETUP_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRBdBUzDghTVlAb1rlhElvsxn4lezcXqdQI1zJ73iVGubnmwNpxtu1pZt0baamVRJGfw4FAYOK49BYn/pub?gid=559054297&single=true&output=csv";

// Helper to parse numbers like "6,839 ", "(4,556)", "(3.8%)"
function parseFinancialNumber(rawVal) {
  if (!rawVal) return 0;
  let str = rawVal.toString().trim();
  if (str === '--' || str === '#DIV/0!' || str === '#N/A') return 0;
  
  let isNegative = false;
  if (str.startsWith('(') && str.endsWith(')')) {
    isNegative = true;
    str = str.substring(1, str.length - 1);
  }
  
  // Remove commas, percent signs, and currency symbols
  str = str.replace(/[,%$" ]/g, '');
  let num = parseFloat(str);
  if (isNaN(num)) return 0;
  
  return isNegative ? -num : num;
}

// Fetch and parse CSV wrapper
async function fetchAndParseCSV(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Nie udało się pobrać arkusza z adresu: " + url);
  const text = await response.text();
  
  return new Promise((resolve, reject) => {
    Papa.parse(text, {
      skipEmptyLines: true,
      complete: (results) => resolve(results.data),
      error: (err) => reject(err)
    });
  });
}

export async function fetchPortfolioData() {
  // Fetch both spreadsheets concurrently
  const [mainRows, setupRows] = await Promise.all([
    fetchAndParseCSV(MAIN_CSV_URL),
    fetchAndParseCSV(SETUP_CSV_URL)
  ]);

  // 1. Build Ticker -> Name Mapping Dictionary
  const tickerNames = {};
  for (const r of setupRows) {
    if (!r[1] || typeof r[1] !== 'string') continue;
    const ticker = r[1].trim();
    // Rudimentary check to ensure it's an actual ticker row from the Setup tab
    if (ticker && ticker !== 'Stock / ETF Ticker Symbol' && r[5]) {
      const name = r[5].trim();
      if (name && name !== 'n/a') {
        tickerNames[ticker] = name;
      }
    }
  }

  // 2. Parse Main Data
  const parsedData = [];
  let dataStarted = false;
  
  for (let i = 0; i < mainRows.length; i++) {
    const r = mainRows[i];
    
    // Data rows usually start with an ID in column 0 (e.g. "1", "2")
    // and a ticker in column 1 (e.g. "FRA:EUNY")
    const col0 = r[0] ? r[0].trim() : "";
    const col1 = r[1] ? r[1].trim() : "";
    
    if (!dataStarted) {
      if (/^\d+/.test(col0) && col1) {
        dataStarted = true;
      } else {
        continue;
      }
    }
    
    if (dataStarted) {
      if (!col1) continue; // Skip empty slot rows (no ticker)
      
      const quantity = parseFinancialNumber(r[4]);
      if (quantity === 0) continue; // Skip positions with zero quantity
      
      const ticker = col1;
      
      // Fallback name if missing or 'n/a'
      const assetName = tickerNames[ticker] || ticker;

      parsedData.push({
        id: col0,
        ticker: ticker,
        name: assetName,
        currency: r[2] ? r[2].trim() : "",
        category: r[3] ? r[3].trim() : "",
        quantity: quantity,
        
        // Local Currency - TOTALS
        costBaseLocal: parseFinancialNumber(r[10]),
        marketValueLocal: parseFinancialNumber(r[11]), 
        unrealizedGainLocal: parseFinancialNumber(r[12]),
        unrealizedGainPctLocal: parseFinancialNumber(r[13]) / 100, 
        
        // PLN Currency - TOTALS
        costBasePLN: parseFinancialNumber(r[20]),
        marketValuePLN: parseFinancialNumber(r[21]),
        unrealizedGainPLN: parseFinancialNumber(r[23]),
        unrealizedGainPctPLN: parseFinancialNumber(r[24]) / 100,
        
        // Dividends
        dividendsPLN: parseFinancialNumber(r[25]),
      });
    }
  }
  
  return parsedData;
}
