import Papa from 'papaparse';

const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRBdBUzDghTVlAb1rlhElvsxn4lezcXqdQI1zJ73iVGubnmwNpxtu1pZt0baamVRJGfw4FAYOK49BYn/pub?gid=1111357939&single=true&output=csv";

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

export async function fetchPortfolioData() {
  const response = await fetch(SHEET_CSV_URL);
  if (!response.ok) throw new Error("Nie udało się pobrać arkusza");
  
  const csvText = await response.text();
  
  return new Promise((resolve, reject) => {
    Papa.parse(csvText, {
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data;
        const parsedData = [];
        
        let dataStarted = false;
        
        for (let i = 0; i < rows.length; i++) {
          const r = rows[i];
          
          // Data rows usually start with an ID in column 0 (e.g. "1", "2")
          // and a ticker in column 1 (e.g. "FRA:EUNY")
          const col0 = r[0] ? r[0].trim() : "";
          const col1 = r[1] ? r[1].trim() : "";
          
          if (!dataStarted) {
            // Find the start of the data (after the 'Total' or empty rows)
            // We know data lines start with a digit in the first column
            if (/^\d+/.test(col0) && col1) {
              dataStarted = true;
            } else {
              continue; // Skip header lines
            }
          }
          
          if (dataStarted) {
            // If we hit empty rows or summaries at the bottom, break if no ticker
            if (!col1) break;
            
            // Map the standard columns based on the CSV structure we saw:
            // 0: ID
            // 1: Stock / ETF Ticker Symbol
            // 2: Currency
            // 3: Investment Category
            // 4: Quantity of Units
            // 5: Cost Base (Local)
            // 6: Market Value (GF)
            // 7: Market Value (Manual)
            // 8: Unrealized Gain (Local)
            // 9: Unrealized Gain % (Local)
            // ...
            // We are primarily interested in the PLN totals, which seem to be further down the row.
            // Let's grab the basic local values first.
            
            // Wait, there are PLN sections further right.
            // Let's use the local columns for now, and see where PLN is.
            // In the header dump:
            // "In Local Currency (not converted)" -> cols 6-9
            // "In PLN Currency ()" -> cols 10-13
            // 10: Cost Base (PLN)
            // 11: Market Value (PLN)
            // 12: Unrealized Gain (PLN)
            // 13: Unrealized Gain - % (PLN)
            
            const quantity = parseFinancialNumber(r[4]);
            
            // 1. Pomijaj pozycje jeśli ilość jednostek wynosi 0
            if (quantity === 0) continue;
            
            parsedData.push({
              id: col0,
              ticker: col1,
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
        resolve(parsedData);
      },
      error: (err) => reject(err)
    });
  });
}
