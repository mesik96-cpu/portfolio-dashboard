import Papa from 'papaparse';

const MAIN_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRBdBUzDghTVlAb1rlhElvsxn4lezcXqdQI1zJ73iVGubnmwNpxtu1pZt0baamVRJGfw4FAYOK49BYn/pub?gid=1111357939&single=true&output=csv";
const SETUP_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRBdBUzDghTVlAb1rlhElvsxn4lezcXqdQI1zJ73iVGubnmwNpxtu1pZt0baamVRJGfw4FAYOK49BYn/pub?gid=559054297&single=true&output=csv";

// Retry config
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3000; // 3s between retries

// Critical PLN columns that must NOT contain "Loading..."
const CRITICAL_COLS = [4, 10, 11, 12, 20, 21, 23];

// Helper to parse numbers like "6,839 ", "(4,556)", "(3.8%)"
function parseFinancialNumber(rawVal) {
  if (!rawVal) return 0;
  let str = rawVal.toString().trim();
  if (str === '--' || str === '#DIV/0!' || str === '#N/A' || str === 'Loading...') return 0;
  
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

// Check if a cell value is a "not yet loaded" placeholder
function isLoadingValue(val) {
  if (!val) return false;
  const s = val.toString().trim();
  return s === 'Loading...' || s === 'n/a';
}

// Fetch and parse CSV wrapper with cache-busting
async function fetchAndParseCSV(url) {
  // Add cache-busting param to avoid browser/CDN cache returning stale "Loading..." data
  const bustUrl = url + '&_t=' + Date.now();
  const response = await fetch(bustUrl);
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

// Extract data rows from raw CSV rows
function extractDataRows(mainRows) {
  const dataRows = [];
  let dataStarted = false;
  
  for (let i = 0; i < mainRows.length; i++) {
    const r = mainRows[i];
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
      if (!col1) continue; // Skip empty slot rows
      
      const quantity = parseFinancialNumber(r[4]);
      if (quantity === 0) continue; // Skip zero-quantity positions
      
      dataRows.push(r);
    }
  }
  
  return dataRows;
}

// Count how many critical cells still have "Loading..." in data rows
function countLoadingCells(dataRows) {
  let loadingCount = 0;
  const loadingTickers = [];
  
  for (const r of dataRows) {
    const ticker = (r[1] || '').trim();
    let hasLoading = false;
    
    for (const colIdx of CRITICAL_COLS) {
      if (isLoadingValue(r[colIdx])) {
        loadingCount++;
        hasLoading = true;
      }
    }
    
    if (hasLoading) {
      loadingTickers.push(ticker);
    }
  }
  
  return { loadingCount, loadingTickers };
}

// Sleep helper
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Progress callback type: (status: { attempt, maxAttempts, loadingCount, loadingTickers }) => void
let _onProgress = null;

export function setProgressCallback(cb) {
  _onProgress = cb;
}

export async function fetchPortfolioData() {
  // Setup sheet is stable (no GOOGLEFINANCE), fetch once
  const setupRows = await fetchAndParseCSV(SETUP_CSV_URL);
  
  // Build Ticker -> Name Mapping Dictionary
  const tickerNames = {};
  for (const r of setupRows) {
    if (!r[1] || typeof r[1] !== 'string') continue;
    const ticker = r[1].trim();
    if (ticker && ticker !== 'Stock / ETF Ticker Symbol' && r[5]) {
      const name = r[5].trim();
      if (name && name !== 'n/a') {
        tickerNames[ticker] = name;
      }
    }
  }

  // Retry loop for main data — keep trying until no "Loading..." cells
  let bestDataRows = null;
  let bestLoadingCount = Infinity;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const mainRows = await fetchAndParseCSV(MAIN_CSV_URL);
    const dataRows = extractDataRows(mainRows);
    const { loadingCount, loadingTickers } = countLoadingCells(dataRows);
    
    console.log(`[csvParser] Attempt ${attempt}/${MAX_RETRIES}: ${dataRows.length} positions, ${loadingCount} cells still loading`, 
      loadingTickers.length > 0 ? `(${loadingTickers.join(', ')})` : '');
    
    // Report progress to UI
    if (_onProgress) {
      _onProgress({ attempt, maxAttempts: MAX_RETRIES, loadingCount, loadingTickers });
    }
    
    // Keep the best result (fewest loading cells)
    if (loadingCount < bestLoadingCount) {
      bestLoadingCount = loadingCount;
      bestDataRows = dataRows;
    }
    
    // Perfect — all data loaded
    if (loadingCount === 0) {
      console.log(`[csvParser] ✓ All data clean on attempt ${attempt}`);
      break;
    }
    
    // Not perfect — wait and retry (unless last attempt)
    if (attempt < MAX_RETRIES) {
      console.log(`[csvParser] Waiting ${RETRY_DELAY_MS}ms before retry...`);
      await sleep(RETRY_DELAY_MS);
    } else {
      console.warn(`[csvParser] ⚠ Max retries reached. Using best result (${bestLoadingCount} cells still loading)`);
    }
  }
  
  // Parse the best data rows into final objects
  const parsedData = [];
  
  for (const r of bestDataRows) {
    const ticker = (r[1] || '').trim();
    const assetName = tickerNames[ticker] || ticker;
    
    parsedData.push({
      id: (r[0] || '').trim(),
      ticker: ticker,
      name: assetName,
      currency: r[2] ? r[2].trim() : "",
      category: r[3] ? r[3].trim() : "",
      quantity: parseFinancialNumber(r[4]),
      
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
      
      // Flag: true if any critical cell had "Loading..."
      hasLoadingValues: CRITICAL_COLS.some(c => isLoadingValue(r[c])),
    });
  }
  
  return parsedData;
}
