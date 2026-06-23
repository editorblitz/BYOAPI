// Candlestick Chart Generator
// Ported from the standalone candle.html.
// Futures still come from the public Google Sheet; spot prices now come from
// the app's authenticated NGI proxy (/api/quick-charts?type=daily-highlow)
// instead of the external ngi-proxy.onrender.com workaround.

// ── Log drawer (matches sibling quick-charts pages) ─────────────────
function logMsg(msg) {
  const time = new Date().toLocaleTimeString();
  const html = `<div class="border-l-2 border-slate-700 pl-2 mb-1 hover:bg-slate-800"><span class="text-slate-500 mr-2">[${time}]</span>${msg}</div>`;
  const c = document.getElementById('logContent');
  if (c) { c.insertAdjacentHTML('beforeend', html); c.scrollTop = c.scrollHeight; }
  const last = document.getElementById('lastLogMsg');
  if (last) last.textContent = msg;
}

function setupLogToggle() {
  const toggle = document.getElementById('logToggle');
  const drawer = document.getElementById('logDrawer');
  const arrow = document.getElementById('logArrow');
  if (!toggle) return;
  toggle.addEventListener('click', () => {
    const isOpen = drawer.style.height !== '0px' && drawer.style.height !== '';
    if (isOpen) {
      drawer.style.height = '0';
      arrow.style.transform = 'rotate(0deg)';
    } else {
      drawer.style.height = '16rem';
      arrow.style.transform = 'rotate(180deg)';
    }
  });
}

// ── Intraday override state ─────────────────────────────────────────
let intradayFutures = null;   // { date, o, h, l, c } or null
let intradayHenryHub = null;  // { date, low, high, avg } or null

function getIntradayDate() {
  const el = document.getElementById('intradayDate');
  const v = el ? el.value : '';
  if (!v) return new Date();
  const parts = v.split('-');
  return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
}

function applyIntradayFutures() {
  const o = parseFloat(document.getElementById('intraFutOpen').value);
  const h = parseFloat(document.getElementById('intraFutHigh').value);
  const l = parseFloat(document.getElementById('intraFutLow').value);
  const c = parseFloat(document.getElementById('intraFutLast').value);
  const statusEl = document.getElementById('intradayFuturesStatus');
  if ([o, h, l, c].some(isNaN)) {
    if (statusEl) statusEl.textContent = 'Enter Open, High, Low, and Last to apply.';
    return;
  }
  intradayFutures = { date: getIntradayDate(), o, h, l, c };
  if (statusEl) statusEl.textContent = 'Futures intraday applied for ' + intradayFutures.date.toLocaleDateString() + '.';
  generateChart();
}

function clearIntradayFutures() {
  intradayFutures = null;
  ['intraFutOpen', 'intraFutHigh', 'intraFutLow', 'intraFutLast'].forEach(function(id) {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  const statusEl = document.getElementById('intradayFuturesStatus');
  if (statusEl) statusEl.textContent = '';
  generateChart();
}

function applyIntradayHenryHub() {
  const high = parseFloat(document.getElementById('intraSpotHigh').value);
  const low = parseFloat(document.getElementById('intraSpotLow').value);
  const avg = parseFloat(document.getElementById('intraSpotAvg').value);
  const statusEl = document.getElementById('intradaySpotStatus');
  if ([high, low, avg].some(isNaN)) {
    if (statusEl) statusEl.textContent = 'Enter High, Low, and Average to apply.';
    return;
  }
  intradayHenryHub = { date: getIntradayDate(), low, high, avg };
  if (statusEl) statusEl.textContent = 'Henry Hub spot intraday applied for ' + intradayHenryHub.date.toLocaleDateString() + '.';
  generateChart();
}

function clearIntradayHenryHub() {
  intradayHenryHub = null;
  ['intraSpotHigh', 'intraSpotLow', 'intraSpotAvg'].forEach(function(id) {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  const statusEl = document.getElementById('intradaySpotStatus');
  if (statusEl) statusEl.textContent = '';
  generateChart();
}

function mergeIntradayFutures(rows) {
  if (!intradayFutures) return rows;
  const target = intradayFutures.date.getTime();
  const result = rows.slice();
  const idx = result.findIndex(function(d) { return d.date.getTime() === target; });
  const row = { date: intradayFutures.date, o: intradayFutures.o, h: intradayFutures.h, l: intradayFutures.l, c: intradayFutures.c };
  if (idx >= 0) result[idx] = row;
  else { result.push(row); result.sort(function(a, b) { return a.date - b.date; }); }
  return result;
}

function mergeIntradayHenryHub(rows) {
  if (!intradayHenryHub) return rows;
  const target = intradayHenryHub.date.getTime();
  const result = rows.slice();
  const idx = result.findIndex(function(d) { return d.date.getTime() === target; });
  const row = { date: intradayHenryHub.date, low: intradayHenryHub.low, high: intradayHenryHub.high, avg: intradayHenryHub.avg };
  if (idx >= 0) result[idx] = row;
  else { result.push(row); result.sort(function(a, b) { return a.date - b.date; }); }
  return result;
}

// ── Logo loading ────────────────────────────────────────────────────
// Defer the first render until sample data is loaded so users don't see a
// transient "no data" error flash if the logo loads first.
let logoImg = null;
let _initDataReady = false;
const img = new Image();
img.onload = function() { logoImg = img; if (_initDataReady) generateChart(); };
img.onerror = function() { setStatus('Logo not found — chart will render without it.'); if (_initDataReady) generateChart(); };
img.src = '/static/images/ngi_logo.png';

// ── Default data: futures from Google Sheets, cash from in-app API ──
const FUTURES_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/1PMoI0ybhj2BsEv6nsIOyyjCW_rSTVYv44OsOO2PlcbA/export?format=csv&gid=0';
const PRIMARY_SPOT_LOCATION_CODE = 'SLAHH';
const PRIMARY_SPOT_LOCATION_NAME = 'Henry Hub';
const PRIMARY_SPOT_LOOKBACK_YEARS = 10;
const SPOT_PRIMARY_LOCATIONS = [
  { code: 'SLAHH', name: 'Henry Hub' },
];
const SPOT_SECONDARY_LOCATIONS = [
  { code: 'MCWCCITY', name: 'Chicago Citygate' },
];
const SPOT_SLOT_STYLES = {
  spot1: { line: '#0891b2', area: '#0891b2', lineWidth: 1.5 },
  spot2: { line: '#d97706', area: '#d97706', lineWidth: 1.15 },
  manual: { line: '#0891b2', area: '#0891b2', lineWidth: 1.5 },
};
const DEFAULT_TITLE_PRIMARY_SPOT = "NGI's Henry Hub Daily Gas Price and NYMEX Prompt Month Futures";
const DEFAULT_TITLE_MULTI_SPOT = "NGI's Daily Spot Gas Prices and NYMEX Prompt Month Futures";
const DEFAULT_TITLE_FUTURES_ONLY = "NYMEX Prompt Month Futures";
let futuresDataSourceLabel = '';
let futuresDataLoadWarning = '';
let cashDataSourceLabel = 'NGI API';
let spotLoadPromise = null;
let floatingStatusTimer = null;
const spotSeriesState = {
  cache: {},
  slots: {
    spot1: { key: 'spot1', locationCode: PRIMARY_SPOT_LOCATION_CODE, locationName: PRIMARY_SPOT_LOCATION_NAME, isLoading: false, lastError: '' },
    spot2: { key: 'spot2', locationCode: '', locationName: '', isLoading: false, lastError: '' }
  }
};

async function fetchCsv(path) {
  const r = await fetch(path, { cache: 'no-cache' });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const text = await r.text();
  if (!text.trim()) throw new Error('Empty CSV');
  return text;
}

async function fetchJsonWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(function() { controller.abort(); }, timeoutMs);
  try {
    const response = await fetch(url, { cache: 'no-cache', signal: controller.signal });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    return await response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

function setSpotLoadStatus(msg, isError) {
  const el = document.getElementById('spotLoadStatus');
  if (!el) return;
  el.textContent = msg || '';
  el.className = 'status' + (isError ? ' error' : '');
}

function setSpotButtonLoading(isLoading) {
  const btn = document.getElementById('loadHenryHubSpotBtn');
  if (!btn) return;
  btn.disabled = isLoading;
  btn.textContent = isLoading ? 'Loading Spot Data...' : 'Reload Selected Spot API';
}

function parseFlexibleDate(rawValue) {
  const value = (rawValue || '').trim();
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(value + 'T00:00:00');
    return isNaN(date.getTime()) ? null : date;
  }
  const parts = value.split('/');
  if (parts.length === 3) {
    const date = new Date(parseInt(parts[2], 10), parseInt(parts[0], 10) - 1, parseInt(parts[1], 10));
    return isNaN(date.getTime()) ? null : date;
  }
  return null;
}

function formatIsoDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

function formatUsDate(d) {
  return (d.getMonth() + 1) + '/' + d.getDate() + '/' + d.getFullYear();
}

function formatCoverageDate(d) { return d ? formatIsoDate(d) : ''; }

function findSpotLocation(code) {
  return SPOT_PRIMARY_LOCATIONS.concat(SPOT_SECONDARY_LOCATIONS).find(function(location) {
    return location.code === code;
  }) || null;
}

function getSpotCacheEntry(locationCode) {
  return locationCode ? spotSeriesState.cache[locationCode] || null : null;
}

function setSpotSlot(slotKey, locationCode) {
  const slot = spotSeriesState.slots[slotKey];
  const location = findSpotLocation(locationCode);
  slot.locationCode = location ? location.code : '';
  slot.locationName = location ? location.name : '';
  slot.lastError = '';
}

function getFuturesDateExtent() {
  const futuresRows = parseCSV(document.getElementById('csvInput').value);
  if (futuresRows.length === 0) return null;
  return { start: futuresRows[0].date, end: futuresRows[futuresRows.length - 1].date };
}

// Build the URL for the app's authenticated spot history endpoint.
// Returns daily highs/lows/averages for one location — same data shape the
// previous proxy normalizer produced.
function buildSpotApiUrl(locationCode, startDate, endDate) {
  return '/api/quick-charts?type=daily-highlow' +
    '&location=' + encodeURIComponent(locationCode) +
    '&start_date=' + encodeURIComponent(formatIsoDate(startDate)) +
    '&end_date=' + encodeURIComponent(formatIsoDate(endDate));
}

function normalizeSpotApiData(response) {
  if (!response || !Array.isArray(response.dates)) {
    throw new Error('Unexpected API response format.');
  }
  const byTradeDate = new Map();
  for (let i = 0; i < response.dates.length; i++) {
    const tradeDate = parseFlexibleDate(response.dates[i]);
    const avg = parseFloat(response.averages ? response.averages[i] : NaN);
    const high = parseFloat(response.highs ? response.highs[i] : NaN);
    const low = parseFloat(response.lows ? response.lows[i] : NaN);
    if (!tradeDate || [avg, high, low].some(isNaN)) continue;
    byTradeDate.set(formatIsoDate(tradeDate), { date: tradeDate, low, high, avg });
  }
  return Array.from(byTradeDate.values()).sort(function(a, b) { return a.date - b.date; });
}

function buildCashCsvText(rows) {
  const lines = ['Date\tLow\tHigh\tAverage'];
  for (const row of rows) {
    lines.push([
      formatUsDate(row.date),
      '$' + row.low.toFixed(3),
      '$' + row.high.toFixed(3),
      '$' + row.avg.toFixed(3)
    ].join('\t'));
  }
  return lines.join('\n');
}

function getSpotCoverageWarnings(cutoffDate) {
  const warnings = [];
  if (!cutoffDate) return warnings;
  for (const slotKey of ['spot1', 'spot2']) {
    const slot = spotSeriesState.slots[slotKey];
    const cacheEntry = getSpotCacheEntry(slot.locationCode);
    if (!cacheEntry || !cacheEntry.coverageStart) continue;
    if (cutoffDate < cacheEntry.coverageStart) {
      warnings.push(slot.locationName + ' starts later than the selected range.');
    }
  }
  return warnings;
}

function refreshSpotCoverageNotice(cutoffDate) {
  if (cashDataSourceLabel === 'manual') {
    setSpotLoadStatus('Cash data source: manual textarea.', false);
    return;
  }
  const activeSlots = ['spot1', 'spot2'].map(function(slotKey) {
    const slot = spotSeriesState.slots[slotKey];
    return { slot: slot, cacheEntry: getSpotCacheEntry(slot.locationCode) };
  }).filter(function(entry) { return !!entry.slot.locationCode; });

  if (activeSlots.length === 0) { setSpotLoadStatus('No spot series selected.', false); return; }

  for (const entry of activeSlots) {
    if (entry.slot.lastError) { setSpotLoadStatus(entry.slot.lastError, true); return; }
    if (entry.slot.isLoading) return;
  }
  if (activeSlots.some(function(e) { return !e.cacheEntry || !e.cacheEntry.coverageStart; })) {
    setSpotLoadStatus('Spot data source: NGI API.', false);
    return;
  }
  const coverageText = activeSlots.map(function(entry) {
    return entry.slot.locationName + ' (' +
      formatCoverageDate(entry.cacheEntry.coverageStart) + ' to ' +
      formatCoverageDate(entry.cacheEntry.coverageEnd) + ')';
  }).join(' | ');
  const warnings = getSpotCoverageWarnings(cutoffDate);
  let msg = 'Spot data loaded by trade date: ' + coverageText + '.';
  if (warnings.length > 0) msg += ' ' + warnings.join(' ');
  setSpotLoadStatus(msg, warnings.length > 0);
}

async function loadSpotSeriesForSlot(slotKey, forceReload) {
  const slot = spotSeriesState.slots[slotKey];
  if (!slot.locationCode) return true;
  const existing = getSpotCacheEntry(slot.locationCode);
  if (!forceReload && existing && existing.rows.length > 0) return true;

  const futuresExtent = getFuturesDateExtent();
  const endDate = futuresExtent ? new Date(futuresExtent.end) : new Date();
  const startDate = new Date(endDate);
  startDate.setFullYear(startDate.getFullYear() - PRIMARY_SPOT_LOOKBACK_YEARS);
  startDate.setDate(startDate.getDate() + 1);

  slot.isLoading = true;
  slot.lastError = '';
  setSpotButtonLoading(true);
  setSpotLoadStatus('Loading ' + slot.locationName + ' spot history from NGI API...', false);
  showFloatingStatus('Loading ' + slot.locationName + ' spot prices...', false);
  logMsg('Loading ' + slot.locationName + ' (' + slot.locationCode + ') spot history...');

  try {
    const apiUrl = buildSpotApiUrl(slot.locationCode, startDate, endDate);
    const rawData = await fetchJsonWithTimeout(apiUrl, 45000);
    if (rawData && rawData.error) throw new Error(rawData.error);
    const rows = normalizeSpotApiData(rawData);
    if (rows.length === 0) throw new Error('No spot rows returned from API.');

    spotSeriesState.cache[slot.locationCode] = {
      locationCode: slot.locationCode,
      locationName: slot.locationName,
      rows: rows,
      coverageStart: rows[0].date,
      coverageEnd: rows[rows.length - 1].date,
    };
    logMsg('Loaded ' + rows.length + ' rows for ' + slot.locationName + '.');
    return true;
  } catch (err) {
    slot.lastError = 'Could not load ' + slot.locationName + ' spot prices. ' + err.message;
    setSpotLoadStatus(slot.lastError, true);
    showFloatingStatus(slot.locationName + ' spot price load failed.', true);
    hideFloatingStatus(2500);
    logMsg('Spot load failed for ' + slot.locationName + ': ' + err.message);
    return false;
  } finally {
    slot.isLoading = false;
    setSpotButtonLoading(false);
  }
}

function syncCashTextareaFromPrimarySpot() {
  const slot = spotSeriesState.slots.spot1;
  const cacheEntry = getSpotCacheEntry(slot.locationCode);
  if (cacheEntry && cacheEntry.rows.length > 0) {
    document.getElementById('cashInput').value = buildCashCsvText(cacheEntry.rows);
  }
}

async function loadSelectedSpotSeries(forceReload) {
  if (spotLoadPromise) return spotLoadPromise;
  spotLoadPromise = (async function() {
    try {
      const results = [];
      for (const slotKey of ['spot1', 'spot2']) {
        results.push(await loadSpotSeriesForSlot(slotKey, forceReload));
      }
      cashDataSourceLabel = 'NGI API cache';
      syncCashTextareaFromPrimarySpot();
      refreshSpotCoverageNotice(null);
      if (_initDataReady) generateChart();
      if (results.every(Boolean)) hideFloatingStatus(1200);
      return results.every(Boolean);
    } finally {
      spotLoadPromise = null;
    }
  })();
  return spotLoadPromise;
}

async function loadHenryHubSpotHistory(forceReload) { return loadSelectedSpotSeries(forceReload); }

async function loadFuturesData() {
  const futuresEl = document.getElementById('csvInput');
  showFloatingStatus('Updating chart data...', false);
  try {
    futuresEl.value = await fetchCsv(FUTURES_SHEET_CSV_URL);
    futuresDataSourceLabel = 'Google Sheet';
    futuresDataLoadWarning = '';
    logMsg('Loaded Nymex futures from Google Sheet.');
    return true;
  } catch (sheetError) {
    futuresEl.value = '';
    futuresDataSourceLabel = '';
    futuresDataLoadWarning = 'Google Sheet load failed: ' + sheetError.message;
    setStatus(futuresDataLoadWarning, true);
    showFloatingStatus('Chart data update failed.', true);
    logMsg('Futures load failed: ' + sheetError.message);
    return false;
  }
}

async function loadDefaultData() {
  const cashEl = document.getElementById('cashInput');
  setStatus('Loading Nymex futures from Google Sheet...');
  showFloatingStatus('Updating chart data...', false);
  setSpotLoadStatus('Preparing cash data...', false);

  try {
    localStorage.removeItem('candlestick_csv');
    localStorage.removeItem('candlestick_cash_csv');
  } catch (e) {}

  cashEl.value = '';
  cashDataSourceLabel = 'NGI API';
  await loadFuturesData();

  _initDataReady = true;
  if (!document.getElementById('csvInput').value) {
    setStatus('No futures data — check the Google Sheet sharing settings.', true);
    return;
  }
  generateChart();
  loadSelectedSpotSeries(false);
}

async function reloadFuturesFromSheet() {
  setStatus('Reloading Nymex futures from Google Sheet...');
  showFloatingStatus('Updating chart data...', false);
  const loaded = await loadFuturesData();
  if (loaded) generateChart();
}

async function handleChicagoCitygateToggle() {
  const checkbox = document.getElementById('showChicagoCitygate');
  if (!checkbox) return;
  const nextCode = checkbox.checked ? 'MCWCCITY' : '';
  setSpotSlot('spot2', nextCode);
  syncTitleToSpotSelection();
  cashDataSourceLabel = Object.keys(spotSeriesState.cache).length > 0 || nextCode ? 'NGI API cache' : 'NGI API';
  refreshSpotCoverageNotice(null);
  if (nextCode) await loadSelectedSpotSeries(false);
  else if (_initDataReady) generateChart();
}

function syncTitleToSpotSelection() {
  const titleEl = document.getElementById('chartTitle');
  if (!titleEl) return;
  const showFuturesEl = document.getElementById('showFutures');
  const showSpotEl = document.getElementById('showSpot');
  const showChicagoEl = document.getElementById('showChicagoCitygate');
  const showFutures = showFuturesEl ? showFuturesEl.checked : true;
  const showSpot = showSpotEl ? showSpotEl.checked : true;
  const showChicago = showChicagoEl ? showChicagoEl.checked : false;

  let target;
  if (showFutures && !showSpot && !showChicago) target = DEFAULT_TITLE_FUTURES_ONLY;
  else if (showChicago) target = DEFAULT_TITLE_MULTI_SPOT;
  else target = DEFAULT_TITLE_PRIMARY_SPOT;

  const knownTitles = [DEFAULT_TITLE_PRIMARY_SPOT, DEFAULT_TITLE_MULTI_SPOT, DEFAULT_TITLE_FUTURES_ONLY];
  if (knownTitles.indexOf(titleEl.value) !== -1 && titleEl.value !== target) {
    titleEl.value = target;
  }
}

// ── Color schemes ───────────────────────────────────────────────────
const DEFAULT_SPOT_LINE = '#0891b2';
const DEFAULT_SPOT_AREA = '#0891b2';

const SCHEMES = {
  editorRedGreen:    { bullish:'#4db37f', bearish:'#df5959', bearishStroke:'#df5959', wick:null, spotLine:DEFAULT_SPOT_LINE, spotArea:DEFAULT_SPOT_AREA },
  ngiBlueEditorRed:  { bullish:'#3b82c4', bearish:'#df5959', bearishStroke:'#df5959', wick:null, spotLine:DEFAULT_SPOT_LINE, spotArea:DEFAULT_SPOT_AREA },
};

function hexToRgba(hex, alpha) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
}

function getSpotAreaAlpha() {
  const el = document.getElementById('spotOpacity');
  const v = el ? parseFloat(el.value) : 0.18;
  return isNaN(v) ? 0.18 : v;
}

function resolveScheme() {
  const val = document.getElementById('colorScheme').value;
  if (val === 'custom') {
    const matchWick = document.getElementById('customMatchWick').checked;
    return {
      bullish:       document.getElementById('customBullish').value,
      bearish:       document.getElementById('customBearish').value,
      bearishStroke: document.getElementById('customBearishStroke').value,
      wick:          matchWick ? null : document.getElementById('customWick').value,
      spotLine:      document.getElementById('customSpotLine').value,
      spotArea:      document.getElementById('customSpotArea').value,
    };
  }
  return SCHEMES[val] || SCHEMES.editorRedGreen;
}

// ── Constants matching dailypricechart.html styling ─────────────────
const FONT = 'Arial, sans-serif';
const COLOR_TITLE = '#003A50';
const COLOR_ACCENT = '#003A50';
const COLOR_AXIS = 'black';
const COLOR_GRID = '#D3D3D3';
const COLOR_SOURCE = 'black';

// ── Helpers ─────────────────────────────────────────────────────────
function setStatus(msg, isError) {
  const el = document.getElementById('status');
  if (!el) return;
  el.textContent = msg;
  el.className = 'status' + (isError ? ' error' : '');
}

function showFloatingStatus(msg, isError) {
  const el = document.getElementById('floatingStatus');
  if (!el) return;
  clearTimeout(floatingStatusTimer);
  el.textContent = msg || '';
  el.className = 'floating-status visible' + (isError ? ' error' : '');
}

function hideFloatingStatus(delayMs) {
  const el = document.getElementById('floatingStatus');
  if (!el) return;
  clearTimeout(floatingStatusTimer);
  const applyHide = function() { el.className = 'floating-status'; el.textContent = ''; };
  if (delayMs && delayMs > 0) floatingStatusTimer = setTimeout(applyHide, delayMs);
  else applyHide();
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatDateLabel(d) {
  const day = String(d.getDate()).padStart(2, '0');
  return day + '-' + MONTHS[d.getMonth()] + '-' + d.getFullYear();
}

function formatPrice(p) { return '$' + p.toFixed(3); }

function calculateInterval(min, max) {
  const range = max - min;
  if (range > 100) return 20;
  if (range > 50) return 10;
  if (range > 20) return 5;
  if (range > 8) return 2;
  if (range > 4) return 1;
  if (range > 2) return 0.5;
  return 0.25;
}

// ── CSV Parsers ─────────────────────────────────────────────────────
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/).filter(l => l.trim());
  if (lines.length === 0) return [];
  const data = [];
  for (let i = 0; i < lines.length; i++) {
    const parts = lines[i].split(/[\t,]/).map(s => s.trim());
    if (parts.length < 5) continue;
    const first = parts[0];
    if (/comdty|date|open|high/i.test(first) || isNaN(parseFloat(parts[1]))) continue;
    const dp = first.split('/');
    if (dp.length !== 3) continue;
    const date = new Date(parseInt(dp[2]), parseInt(dp[0]) - 1, parseInt(dp[1]));
    if (isNaN(date.getTime())) continue;
    const o = parseFloat(parts[1]);
    const h = parseFloat(parts[2]);
    const l = parseFloat(parts[3]);
    const c = parseFloat(parts[4]);
    if ([o,h,l,c].some(isNaN)) continue;
    data.push({ date, o, h, l, c });
  }
  return data;
}

function parseCashCSV(text) {
  const lines = text.trim().split(/\r?\n/).filter(l => l.trim());
  if (lines.length === 0) return [];
  const data = [];
  for (let i = 0; i < lines.length; i++) {
    const clean = lines[i].replace(/\$/g, '').trim();
    let parts = clean.split(/[\t,]+/).map(s => s.trim()).filter(s => s);
    if (parts.length < 4) parts = clean.split(/\s+/).filter(s => s);
    if (parts.length < 4) continue;
    const first = parts[0];
    if (/date|trade|low|high|average/i.test(first)) continue;
    const date = parseFlexibleDate(first);
    if (!date) continue;
    const low = parseFloat(parts[1]);
    const high = parseFloat(parts[2]);
    const avg = parseFloat(parts[3]);
    if ([low, high, avg].some(isNaN)) continue;
    data.push({ date, low, high, avg });
  }
  return data;
}

function getVisibleSpotSeries(cutoffDate, upperDate) {
  if (!document.getElementById('showSpot').checked) return [];
  if (cashDataSourceLabel === 'manual') {
    const rows = mergeIntradayHenryHub(parseCashCSV(document.getElementById('cashInput').value)).filter(function(d) {
      if (cutoffDate && d.date < cutoffDate) return false;
      if (upperDate && d.date > upperDate) return false;
      return true;
    });
    if (rows.length === 0) return [];
    return [{ slotKey: 'manual', name: 'Spot (Range / Avg)', rows: rows, style: SPOT_SLOT_STYLES.manual, genericSingleLabel: true }];
  }
  const series = [];
  for (const slotKey of ['spot1', 'spot2']) {
    const slot = spotSeriesState.slots[slotKey];
    if (!slot.locationCode) continue;
    const cacheEntry = getSpotCacheEntry(slot.locationCode);
    if (!cacheEntry || !cacheEntry.rows || cacheEntry.rows.length === 0) continue;
    const isHenryHub = slotKey === 'spot1' && slot.locationCode === PRIMARY_SPOT_LOCATION_CODE;
    const sourceRows = isHenryHub ? mergeIntradayHenryHub(cacheEntry.rows) : cacheEntry.rows;
    const rows = sourceRows.filter(function(d) {
      if (cutoffDate && d.date < cutoffDate) return false;
      if (upperDate && d.date > upperDate) return false;
      return true;
    });
    if (rows.length === 0) continue;
    series.push({ slotKey, name: slot.locationName, rows, style: SPOT_SLOT_STYLES[slotKey], genericSingleLabel: false });
  }
  return series;
}

function shouldUseGenericSingleSpotLabel(visibleSpotSeries) {
  if (visibleSpotSeries.length !== 1) return false;
  const series = visibleSpotSeries[0];
  if (series.genericSingleLabel) return true;
  return (
    series.slotKey === 'spot1' &&
    series.name === PRIMARY_SPOT_LOCATION_NAME &&
    !spotSeriesState.slots.spot2.locationCode
  );
}

// ── Chart Renderer ──────────────────────────────────────────────────
function generateChart() {
  const csv = document.getElementById('csvInput').value;
  const data = mergeIntradayFutures(parseCSV(csv));
  if (data.length === 0) {
    setStatus('No valid data rows found. Check CSV format.', true);
    return;
  }

  const rangeRaw = document.getElementById('displayRange').value;
  let visibleData;
  let cutoffDate = null;
  let upperDate = null;
  if (rangeRaw === 'custom') {
    const fromStr = document.getElementById('dateFrom').value;
    const toStr = document.getElementById('dateTo').value;
    const fromDate = fromStr ? new Date(fromStr + 'T00:00:00') : null;
    const toDate = toStr ? new Date(toStr + 'T23:59:59') : null;
    cutoffDate = fromDate;
    upperDate = toDate;
    visibleData = data.filter(d => {
      if (fromDate && d.date < fromDate) return false;
      if (toDate && d.date > toDate) return false;
      return true;
    });
    if (visibleData.length === 0) visibleData = data;
  } else {
    const rangeVal = parseInt(rangeRaw);
    if (rangeVal > 0 && data.length > 0) {
      const lastDate = data[data.length - 1].date;
      cutoffDate = new Date(lastDate);
      cutoffDate.setDate(cutoffDate.getDate() - rangeVal);
      visibleData = data.filter(d => d.date >= cutoffDate);
      if (visibleData.length === 0) visibleData = data;
    } else {
      visibleData = data;
    }
  }

  const visibleSpotSeries = getVisibleSpotSeries(cutoffDate, upperDate);

  const scheme = resolveScheme();
  const title = document.getElementById('chartTitle').value || '';
  const source = document.getElementById('sourceText').value || '';
  const noteOn = document.getElementById('showNote') && document.getElementById('showNote').checked;
  const noteRaw = document.getElementById('noteText') ? document.getElementById('noteText').value : '';
  const note = noteOn ? (noteRaw || '').trim() : '';

  const canvas = document.getElementById('chart');
  const ctx = canvas.getContext('2d');
  const DPR = 2;
  const W = canvas.width / DPR;
  const H = canvas.height / DPR;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

  const marginLeft = 16;
  const marginRight = 15;
  const logoInset = 6;  // keep the NGI logo's right edge inside the underline's right end
  const hasMA = document.querySelectorAll('.ma-check:checked').length > 0;
  const priceLevels = getPriceLevels();
  const hasLevels = priceLevels.length > 0;
  const levelOffset = document.getElementById('levelOffset').checked && hasMA && hasLevels;
  let rightPad = 28;
  if (levelOffset) rightPad = 170;
  else if (hasLevels) rightPad = 100;
  else if (hasMA) rightPad = 70;
  const showSpot = document.getElementById('showSpot').checked && visibleSpotSeries.length > 0;
  const showFutures = document.getElementById('showFutures').checked;
  const pad = { top: showSpot ? 88 : 72, right: rightPad, bottom: note ? 130 : 112, left: 96 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  if (logoImg) {
    const logoH = 32;
    const logoW = logoImg.width * (logoH / logoImg.height);
    ctx.drawImage(logoImg, W - marginRight - logoInset - logoW, 8, logoW, logoH);
  }

  ctx.fillStyle = COLOR_TITLE;
  ctx.font = 'bold 22px ' + FONT;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(title, marginLeft, 10);

  ctx.strokeStyle = COLOR_ACCENT;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(marginLeft, 48);
  ctx.lineTo(W - marginRight, 48);
  ctx.stroke();

  if (showSpot) {
    const legendY = 60;
    const legendH = 14;
    const legendFont = '15px ' + FONT;
    const cw = 7;
    const bandW = 30;
    const legendGap = 20;

    ctx.font = legendFont;
    const futuresLabelW = ctx.measureText('Futures').width;
    const spotLegendLabels = shouldUseGenericSingleSpotLabel(visibleSpotSeries)
      ? ['Spot (Range / Avg)']
      : visibleSpotSeries.map(function(series) { return series.name; });
    const futuresItemW = cw + 2 + cw + 5 + futuresLabelW;
    const spotItemWidths = spotLegendLabels.map(function(label) {
      return bandW + 5 + ctx.measureText(label).width;
    });
    const totalSpotLegendW = spotItemWidths.reduce(function(sum, itemW) { return sum + itemW; }, 0) +
      Math.max(0, spotItemWidths.length - 1) * legendGap;
    const totalLegendW = (showFutures ? futuresItemW + legendGap : 0) + totalSpotLegendW;
    let legendX = (W - totalLegendW) / 2;

    if (showFutures) {
      ctx.fillStyle = scheme.bullish;
      ctx.fillRect(legendX, legendY, cw, legendH);
      legendX += cw + 2;
      ctx.fillStyle = scheme.bearish;
      ctx.fillRect(legendX, legendY, cw, legendH);
      if (scheme.bearishStroke) {
        ctx.strokeStyle = scheme.bearishStroke;
        ctx.lineWidth = 1;
        ctx.strokeRect(legendX, legendY, cw, legendH);
      }
      legendX += cw + 5;
      ctx.fillStyle = COLOR_AXIS;
      ctx.font = legendFont;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('Futures', legendX, legendY + legendH / 2);
      legendX += futuresLabelW + legendGap;
    }

    for (let si = 0; si < visibleSpotSeries.length; si++) {
      const series = visibleSpotSeries[si];
      const label = spotLegendLabels[si];
      ctx.fillStyle = hexToRgba(series.style.area, getSpotAreaAlpha());
      ctx.fillRect(legendX, legendY, bandW, legendH);
      ctx.strokeStyle = series.style.line;
      ctx.lineWidth = series.style.lineWidth || 1.5;
      ctx.beginPath();
      ctx.moveTo(legendX, legendY + legendH / 2);
      ctx.lineTo(legendX + bandW, legendY + legendH / 2);
      ctx.stroke();
      legendX += bandW + 5;
      ctx.fillStyle = COLOR_AXIS;
      ctx.font = legendFont;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, legendX, legendY + legendH / 2);
      legendX += ctx.measureText(label).width + legendGap;
    }
  }

  const futuresFirstDate = visibleData[0].date.getTime();
  const futuresLastDate = visibleData[visibleData.length - 1].date.getTime();
  let rawMin = Infinity, rawMax = -Infinity;
  if (showFutures) {
    for (const d of visibleData) {
      if (d.l < rawMin) rawMin = d.l;
      if (d.h > rawMax) rawMax = d.h;
    }
  }
  for (const series of visibleSpotSeries) {
    for (const d of series.rows) {
      const t = d.date.getTime();
      if (t < futuresFirstDate || t > futuresLastDate) continue;
      if (d.low < rawMin) rawMin = d.low;
      if (d.high > rawMax) rawMax = d.high;
    }
  }
  if (!isFinite(rawMin) || !isFinite(rawMax)) {
    rawMin = Infinity; rawMax = -Infinity;
    for (const d of visibleData) {
      if (d.l < rawMin) rawMin = d.l;
      if (d.h > rawMax) rawMax = d.h;
    }
  }

  const yAxisMode = document.querySelector('input[name="yaxis"]:checked').value;
  let minP, maxP, interval;
  if (yAxisMode === 'manual' && document.getElementById('yMin').value && document.getElementById('yMax').value) {
    minP = parseFloat(document.getElementById('yMin').value);
    maxP = parseFloat(document.getElementById('yMax').value);
    if (isNaN(minP) || isNaN(maxP) || minP >= maxP) {
      interval = calculateInterval(rawMin, rawMax);
      minP = Math.floor(rawMin / interval) * interval;
      maxP = Math.ceil(rawMax / interval) * interval;
    } else {
      interval = calculateInterval(minP, maxP);
      minP = Math.floor(minP / interval) * interval;
      maxP = Math.ceil(maxP / interval) * interval;
    }
  } else {
    interval = calculateInterval(rawMin, rawMax);
    minP = Math.floor(rawMin / interval) * interval;
    maxP = Math.ceil(rawMax / interval) * interval;
    document.getElementById('yMin').value = minP;
    document.getElementById('yMax').value = maxP;
  }

  const yIntervalMode = document.querySelector('input[name="yinterval"]:checked').value;
  if (yIntervalMode === 'manual' && document.getElementById('yInterval').value) {
    const manualInterval = parseFloat(document.getElementById('yInterval').value);
    if (!isNaN(manualInterval) && manualInterval > 0) {
      interval = manualInterval;
      minP = Math.floor(minP / interval) * interval;
      maxP = Math.ceil(maxP / interval) * interval;
    }
  }
  if (yIntervalMode === 'auto') {
    document.getElementById('yInterval').value = interval;
  }

  const priceToY = p => pad.top + chartH - ((p - minP) / (maxP - minP)) * chartH;

  const gridSteps = Math.round((maxP - minP) / interval);
  for (let i = 0; i <= gridSteps; i++) {
    const price = minP + interval * i;
    const y = priceToY(price);
    ctx.strokeStyle = COLOR_GRID;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(W - pad.right, y);
    ctx.stroke();
    ctx.fillStyle = COLOR_AXIS;
    ctx.font = '14px ' + FONT;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(formatPrice(price), pad.left - 2, y);
  }

  ctx.save();
  ctx.fillStyle = COLOR_AXIS;
  ctx.font = 'bold 13px ' + FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const yCenter = pad.top + chartH / 2;
  ctx.translate(marginLeft, yCenter);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('$US/MMBtu', 0, 0);
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.rect(pad.left, pad.top, chartW, chartH);
  ctx.clip();

  const n = visibleData.length;
  const gap = chartW / n;
  const firstDate = visibleData[0].date.getTime();
  const lastDate = visibleData[n - 1].date.getTime();
  const dateSpan = lastDate - firstDate;

  const visibleSpotPlots = visibleSpotSeries.map(function(series) {
    const points = [];
    for (const row of series.rows) {
      const t = row.date.getTime();
      if (t < firstDate || t > lastDate || dateSpan === 0) continue;
      const x = pad.left + (chartW * (t - firstDate) / dateSpan);
      points.push({ x, low: row.low, high: row.high, avg: row.avg });
    }
    return { name: series.name, style: series.style, points: points };
  }).filter(function(series) { return series.points.length > 0; });

  for (const series of visibleSpotPlots) {
    if (series.points.length <= 1) continue;
    ctx.fillStyle = hexToRgba(series.style.area, getSpotAreaAlpha());
    ctx.beginPath();
    ctx.moveTo(series.points[0].x, priceToY(series.points[0].high));
    for (let i = 1; i < series.points.length; i++) {
      ctx.lineTo(series.points[i].x, priceToY(series.points[i].high));
    }
    for (let i = series.points.length - 1; i >= 0; i--) {
      ctx.lineTo(series.points[i].x, priceToY(series.points[i].low));
    }
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = series.style.line;
    ctx.lineWidth = series.style.lineWidth || 1.5;
    ctx.beginPath();
    ctx.moveTo(series.points[0].x, priceToY(series.points[0].avg));
    for (let i = 1; i < series.points.length; i++) {
      ctx.lineTo(series.points[i].x, priceToY(series.points[i].avg));
    }
    ctx.stroke();
  }
  const candleW = Math.max(1, Math.min(gap * 0.7, 12));

  if (showFutures) {
    for (let i = 0; i < n; i++) {
      const d = visibleData[i];
      const x = pad.left + gap * i + gap / 2;
      const bullish = d.c >= d.o;
      const bodyColor = bullish ? scheme.bullish : scheme.bearish;
      const wickColor = scheme.wick || bodyColor;
      ctx.strokeStyle = wickColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, priceToY(d.h));
      ctx.lineTo(x, priceToY(d.l));
      ctx.stroke();
      const top = priceToY(Math.max(d.o, d.c));
      const bot = priceToY(Math.min(d.o, d.c));
      const bodyH = Math.max(1, bot - top);
      ctx.fillStyle = bodyColor;
      ctx.fillRect(x - candleW / 2, top, candleW, bodyH);
      if (!bullish && scheme.bearishStroke) {
        ctx.strokeStyle = scheme.bearishStroke;
        ctx.lineWidth = 1;
        ctx.strokeRect(x - candleW / 2, top, candleW, bodyH);
      }
    }
  }

  const MA_COLORS = { 20: '#9333ea', 50: '#ec4899', 100: '#475569', 200: '#003A50' };
  const selectedMAs = Array.from(document.querySelectorAll('.ma-check:checked')).map(cb => parseInt(cb.value));
  const visibleStartIdx = data.length - visibleData.length;

  const maLabels = [];

  for (const period of selectedMAs) {
    const color = MA_COLORS[period] || '#888';
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    let started = false;
    let lastY = 0;
    for (let i = 0; i < n; i++) {
      const fullIdx = visibleStartIdx + i;
      if (fullIdx < period - 1) continue;
      let sum = 0;
      for (let j = fullIdx - period + 1; j <= fullIdx; j++) sum += data[j].c;
      const ma = sum / period;
      const x = pad.left + gap * i + gap / 2;
      const y = priceToY(ma);
      lastY = y;
      if (!started) { ctx.moveTo(x, y); started = true; }
      else { ctx.lineTo(x, y); }
    }
    ctx.stroke();
    if (started) maLabels.push({ y: lastY, color: color, text: period + 'd MA' });
  }

  if (maLabels.length > 1) {
    const minGap = 14;
    maLabels.sort((a, b) => a.y - b.y);
    for (let pass = 0; pass < 10; pass++) {
      let moved = false;
      for (let i = 1; i < maLabels.length; i++) {
        const overlap = minGap - (maLabels[i].y - maLabels[i-1].y);
        if (overlap > 0) {
          maLabels[i-1].y -= overlap / 2;
          maLabels[i].y += overlap / 2;
          moved = true;
        }
      }
      if (!moved) break;
    }
  }

  ctx.restore();
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

  for (const lbl of maLabels) {
    ctx.fillStyle = lbl.color;
    ctx.font = 'bold 12px ' + FONT;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(lbl.text, W - pad.right + 6, lbl.y);
  }

  if (priceLevels.length > 0) {
    const LEVEL_COLOR = '#000000';
    const lineX = levelOffset ? W - pad.right + 70 : W - pad.right + 4;
    const fullLine = document.getElementById('levelFullLine').checked;
    for (const lvl of priceLevels) {
      const y = priceToY(lvl.price);
      if (y >= pad.top - 8 && y <= pad.top + chartH + 8) {
        ctx.font = 'bold 11px ' + FONT;
        const labelW = ctx.measureText(lvl.label).width;
        if (fullLine) {
          ctx.strokeStyle = LEVEL_COLOR;
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 3]);
          ctx.beginPath();
          ctx.moveTo(pad.left, y);
          ctx.lineTo(W - pad.right, y);
          ctx.stroke();
          ctx.setLineDash([]);
        } else {
          const lineLen = Math.max(labelW + 8, 40);
          const lineMidX = lineX + labelW / 2;
          ctx.strokeStyle = LEVEL_COLOR;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(lineMidX - lineLen / 2, y);
          ctx.lineTo(lineMidX + lineLen / 2, y);
          ctx.stroke();
        }
        ctx.fillStyle = LEVEL_COLOR;
        ctx.textAlign = 'left';
        if (fullLine) {
          ctx.textBaseline = 'middle';
          ctx.fillText(lvl.label, lineX, y);
        } else {
          ctx.textBaseline = 'bottom';
          ctx.fillText(lvl.label, lineX, y - 3);
        }
      }
    }
  }

  const numLabels = 13;
  const yBase = pad.top + chartH;
  for (let li = 0; li < numLabels; li++) {
    const x = pad.left + (chartW * li / (numLabels - 1));
    const i = Math.min(n - 1, Math.max(0, Math.round((x - pad.left - gap / 2) / gap)));
    const d = visibleData[i];
    ctx.strokeStyle = COLOR_GRID;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, yBase);
    ctx.lineTo(x, yBase + 4);
    ctx.stroke();
    ctx.save();
    ctx.translate(x, yBase + 6);
    ctx.rotate(-Math.PI / 4);
    ctx.fillStyle = COLOR_AXIS;
    ctx.font = '14px ' + FONT;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText(formatDateLabel(d.date), 0, 0);
    ctx.restore();
  }

  ctx.strokeStyle = COLOR_GRID;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad.left, pad.top + chartH);
  ctx.lineTo(W - pad.right, pad.top + chartH);
  ctx.stroke();

  _chartGeom = { pad: pad, chartW: chartW, chartH: chartH, firstDate: firstDate, lastDate: lastDate, minP: minP, maxP: maxP };
  captureChartBaseSnapshot();
  drawAnnotations(ctx);

  if (source) {
    const sourceY = H - 1;
    const colonIdx = source.indexOf(':');
    if (colonIdx > 0) {
      const boldPart = source.substring(0, colonIdx + 1);
      const restPart = source.substring(colonIdx + 1);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.font = 'bold 15px ' + FONT;
      ctx.fillStyle = COLOR_SOURCE;
      const boldWidth = ctx.measureText(boldPart).width;
      ctx.fillText(boldPart, marginLeft, sourceY);
      ctx.font = '15px ' + FONT;
      ctx.fillText(restPart, marginLeft + boldWidth, sourceY);
    } else {
      ctx.font = '15px ' + FONT;
      ctx.fillStyle = COLOR_SOURCE;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText(source, marginLeft, sourceY);
    }
  }

  if (note) {
    const noteY = source ? H - 20 : H - 1;
    const colonIdx = note.indexOf(':');
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = COLOR_SOURCE;
    if (colonIdx > 0) {
      const boldPart = note.substring(0, colonIdx + 1);
      const restPart = note.substring(colonIdx + 1);
      ctx.font = 'bold 13px ' + FONT;
      const boldWidth = ctx.measureText(boldPart).width;
      ctx.fillText(boldPart, marginLeft, noteY);
      ctx.font = '13px ' + FONT;
      ctx.fillText(restPart, marginLeft + boldWidth, noteY);
    } else {
      ctx.font = '13px ' + FONT;
      ctx.fillText(note, marginLeft, noteY);
    }
  }

  const candleMsg = showFutures ? (n + ' of ' + data.length + ' candles') : 'Futures hidden';
  const cashCount = visibleSpotPlots.reduce(function(sum, series) { return sum + series.points.length; }, 0);
  const cashMsg = cashCount > 0 ? ' + ' + cashCount + ' spot points' : '';
  const sourceMsg = futuresDataSourceLabel ? ' Futures source: ' + futuresDataSourceLabel + '.' : '';
  const cashSourceMsg = cashDataSourceLabel ? ' Spot source: ' + cashDataSourceLabel + '.' : '';
  setStatus(candleMsg + cashMsg + '.' + sourceMsg + cashSourceMsg + futuresDataLoadWarning);
  refreshSpotCoverageNotice(cutoffDate);
  hideFloatingStatus(1200);
  captureChartSnapshot();
}

// ── WebP Download ───────────────────────────────────────────────────
// Export at the editor's spec: 5.75 in wide @ 144 ppi = 828 px, 16:9 (828 x 466).
// The on-screen canvas renders at 2x (1656 x 932) for a crisp retina preview, so
// downscale it into an offscreen 828 x 466 canvas before encoding the WebP.
const EXPORT_WIDTH = 828;
const EXPORT_HEIGHT = 466;

function downloadWebP() {
  const canvas = document.getElementById('chart');
  const out = document.createElement('canvas');
  out.width = EXPORT_WIDTH;
  out.height = EXPORT_HEIGHT;
  const octx = out.getContext('2d');
  octx.imageSmoothingEnabled = true;
  octx.imageSmoothingQuality = 'high';
  octx.drawImage(canvas, 0, 0, EXPORT_WIDTH, EXPORT_HEIGHT);
  out.toBlob(function(blob) {
    if (!blob) {
      setStatus('WebP export failed — your browser may not support it.', true);
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const title = document.getElementById('chartTitle').value.replace(/[^a-zA-Z0-9_\- ]/g, '').trim().replace(/\s+/g, '_');
    const now = new Date();
    const dateStamp = (now.getMonth()+1) + '-' + now.getDate() + '-' + now.getFullYear();
    a.download = (title || 'chart') + '_' + dateStamp + '.webp';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setStatus('Downloaded ' + a.download);
    logMsg('Exported ' + a.download);
  }, 'image/webp', 0.92);
}

function toggleNote() {
  const show = document.getElementById('showNote').checked;
  document.getElementById('noteText').style.display = show ? 'block' : 'none';
  generateChart();
}

function toggleYAxis() {
  const manual = document.querySelector('input[name="yaxis"][value="manual"]').checked;
  document.getElementById('yaxisManual').style.display = manual ? 'block' : 'none';
  generateChart();
}

function toggleYInterval() {
  const manual = document.querySelector('input[name="yinterval"][value="manual"]').checked;
  document.getElementById('yintervalManual').style.display = manual ? 'block' : 'none';
  generateChart();
}

// ── Price levels management ──────────────────────────────────────────
let priceLevelCounter = 0;

function addPriceLevel(price, label) {
  priceLevelCounter++;
  const id = 'pl-' + priceLevelCounter;
  const container = document.getElementById('priceLevels');
  const row = document.createElement('div');
  row.id = id;
  row.style.cssText = 'display:flex;align-items:center;gap:4px;margin-bottom:4px;';
  row.innerHTML =
    '<input type="number" step="0.01" placeholder="Price" style="width:60px;padding:2px 4px;border:1px solid #cbd5e1;border-radius:4px;font-size:11px;" class="pl-price" value="' + (price || '') + '">' +
    '<input type="text" placeholder="Label" style="width:100px;padding:2px 4px;border:1px solid #cbd5e1;border-radius:4px;font-size:11px;" class="pl-label" value="' + (label || '') + '">' +
    '<button type="button" data-pl-remove="' + id + '" style="font-size:10px;padding:1px 5px;border:1px solid #cbd5e1;border-radius:3px;background:#f8fafc;color:#94a3b8;cursor:pointer;line-height:1;">&times;</button>';
  container.appendChild(row);
  row.querySelector('.pl-price').addEventListener('change', generateChart);
  row.querySelector('.pl-label').addEventListener('input', generateChart);
  row.querySelector('button[data-pl-remove]').addEventListener('click', function() { removePriceLevel(id); });
  generateChart();
}

function removePriceLevel(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
  generateChart();
}

function getPriceLevels() {
  const levels = [];
  const rows = document.querySelectorAll('#priceLevels > div');
  for (const row of rows) {
    const price = parseFloat(row.querySelector('.pl-price').value);
    const label = row.querySelector('.pl-label').value.trim();
    if (!isNaN(price) && label) levels.push({ price, label });
  }
  return levels;
}

// ── Freeform annotations ────────────────────────────────────────────
let annotations = [];
let annotationMode = null;
let annotationFirstPoint = null;
let annotationCounter = 0;
let _chartGeom = null;

function getCanvasLogicalPos(evt) {
  const canvas = document.getElementById('chart');
  const rect = canvas.getBoundingClientRect();
  // Logical drawing size is the backing store divided by the render DPR (2).
  const logicalW = canvas.width / 2;
  const logicalH = canvas.height / 2;
  const scaleX = rect.width > 0 ? logicalW / rect.width : 1;
  const scaleY = rect.height > 0 ? logicalH / rect.height : 1;
  return { x: (evt.clientX - rect.left) * scaleX, y: (evt.clientY - rect.top) * scaleY };
}

function canvasToData(canvasX, canvasY) {
  if (!_chartGeom) return null;
  const g = _chartGeom;
  const cx = Math.max(g.pad.left, Math.min(g.pad.left + g.chartW, canvasX));
  const cy = Math.max(g.pad.top, Math.min(g.pad.top + g.chartH, canvasY));
  const span = g.lastDate - g.firstDate;
  const dateMs = span === 0 ? g.firstDate : g.firstDate + ((cx - g.pad.left) / g.chartW) * span;
  const price = g.minP + ((g.pad.top + g.chartH - cy) / g.chartH) * (g.maxP - g.minP);
  return { date: dateMs, price: price };
}

function dataToCanvas(dateMs, price) {
  if (!_chartGeom) return null;
  const g = _chartGeom;
  const span = g.lastDate - g.firstDate;
  const x = span === 0 ? g.pad.left : g.pad.left + g.chartW * ((dateMs - g.firstDate) / span);
  const y = g.pad.top + g.chartH - ((price - g.minP) / (g.maxP - g.minP)) * g.chartH;
  return { x, y };
}

function setAnnotationMode(mode) {
  const wasPreviewing = annotationFirstPoint !== null;
  if (annotationMode === mode) mode = null;
  annotationMode = mode;
  annotationFirstPoint = null;
  const buttonIds = { line: 'drawLineBtn', arrow: 'drawArrowBtn', label: 'addLabelBtn' };
  for (const m in buttonIds) {
    const btn = document.getElementById(buttonIds[m]);
    if (btn) btn.classList.toggle('active', annotationMode === m);
  }
  const canvas = document.getElementById('chart');
  if (canvas) canvas.style.cursor = annotationMode ? 'crosshair' : 'default';
  updateAnnotationHint();
  if (wasPreviewing && !mode) generateChart();
}

function updateAnnotationHint() {
  const hint = document.getElementById('annotationHint');
  if (!hint) return;
  if (!annotationMode) {
    hint.textContent = annotations.length > 0
      ? annotations.length + ' annotation' + (annotations.length === 1 ? '' : 's') + ' on chart'
      : 'Click a tool, then click on the chart';
  } else if (annotationMode === 'label') {
    hint.textContent = 'Click where to place the label';
  } else if (annotationFirstPoint) {
    hint.textContent = 'Click the second point (Esc to cancel)';
  } else {
    hint.textContent = 'Click the first point (Esc to cancel)';
  }
}

function handleCanvasClick(evt) {
  if (!annotationMode || !_chartGeom) return;
  const pos = getCanvasLogicalPos(evt);
  const data = canvasToData(pos.x, pos.y);
  if (!data) return;
  const color = document.getElementById('annotationColor').value;
  if (annotationMode === 'label') {
    showPromptPopup({
      message: 'Label text', placeholder: 'e.g. Support', x: evt.clientX, y: evt.clientY,
      onSubmit: function(text) {
        if (text && text.trim()) {
          annotations.push({ id: ++annotationCounter, type: 'label', x1: data.date, y1: data.price, text: text.trim(), color });
          saveAnnotations();
        }
        setAnnotationMode(null);
        generateChart();
      },
      onCancel: function() { setAnnotationMode(null); },
    });
    return;
  }
  if (annotationFirstPoint === null) {
    annotationFirstPoint = data;
    updateAnnotationHint();
    return;
  }
  annotations.push({
    id: ++annotationCounter, type: annotationMode,
    x1: annotationFirstPoint.date, y1: annotationFirstPoint.price,
    x2: data.date, y2: data.price, color,
  });
  annotationFirstPoint = null;
  saveAnnotations();
  setAnnotationMode(null);
  generateChart();
}

function drawArrowhead(ctx, x1, y1, x2, y2, color) {
  const headLen = 11;
  const angle = Math.atan2(y2 - y1, x2 - x1);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 7), y2 - headLen * Math.sin(angle - Math.PI / 7));
  ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 7), y2 - headLen * Math.sin(angle + Math.PI / 7));
  ctx.closePath();
  ctx.fill();
}

function drawAnnotations(ctx) {
  if (annotations.length === 0 || !_chartGeom) return;
  const g = _chartGeom;
  ctx.save();
  ctx.beginPath();
  ctx.rect(g.pad.left, g.pad.top, g.chartW, g.chartH);
  ctx.clip();
  for (const a of annotations) {
    const start = dataToCanvas(a.x1, a.y1);
    if (!start) continue;
    if (a.type === 'label') {
      ctx.font = 'bold 13px ' + FONT;
      const textW = ctx.measureText(a.text).width;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
      ctx.fillRect(start.x - 4, start.y - 9, textW + 8, 18);
      ctx.fillStyle = a.color;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(a.text, start.x, start.y);
      continue;
    }
    const end = dataToCanvas(a.x2, a.y2);
    if (!end) continue;
    ctx.strokeStyle = a.color;
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    if (a.type === 'arrow') drawArrowhead(ctx, start.x, start.y, end.x, end.y, a.color);
  }
  ctx.restore();
}

function undoAnnotation() {
  if (annotations.length === 0) return;
  annotations.pop();
  saveAnnotations();
  updateAnnotationHint();
  generateChart();
}

function clearAnnotations(evt) {
  if (annotations.length === 0) return;
  showConfirmPopup({
    message: 'Clear all ' + annotations.length + ' annotation' + (annotations.length === 1 ? '' : 's') + '?',
    x: evt ? evt.clientX : undefined,
    y: evt ? evt.clientY : undefined,
    onConfirm: function() {
      annotations = [];
      saveAnnotations();
      setAnnotationMode(null);
      generateChart();
    },
  });
}

function saveAnnotations() {
  try { localStorage.setItem('candlestick_annotations', JSON.stringify(annotations)); } catch (e) {}
}

function loadAnnotations() {
  try {
    const raw = localStorage.getItem('candlestick_annotations');
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      annotations = parsed;
      annotationCounter = annotations.reduce(function(m, a) { return Math.max(m, a.id || 0); }, 0);
    }
  } catch (e) {}
}

function setAnnotationToolsVisible(visible) {
  const toolbar = document.getElementById('annotationToolbar');
  const btn = document.getElementById('toggleAnnotationToolsBtn');
  if (!toolbar) return;
  if (visible) {
    toolbar.style.display = '';
    if (btn) { btn.textContent = 'Hide drawing tools'; btn.classList.add('primary'); }
  } else {
    toolbar.style.display = 'none';
    if (btn) { btn.textContent = 'Show drawing tools'; btn.classList.remove('primary'); }
    if (annotationMode) setAnnotationMode(null);
  }
  try { localStorage.setItem('candlestick_annotation_tools_visible', visible ? '1' : '0'); } catch (e) {}
}

function toggleAnnotationTools() {
  const toolbar = document.getElementById('annotationToolbar');
  const isHidden = !toolbar || toolbar.style.display === 'none';
  setAnnotationToolsVisible(isHidden);
}

let _chartSnapshot = null;
function captureChartSnapshot() {
  const main = document.getElementById('chart');
  if (!main) return;
  if (!_chartSnapshot) { _chartSnapshot = document.createElement('canvas'); _chartSnapshot.width = main.width; _chartSnapshot.height = main.height; }
  const sctx = _chartSnapshot.getContext('2d');
  sctx.setTransform(1, 0, 0, 1, 0, 0);
  sctx.clearRect(0, 0, _chartSnapshot.width, _chartSnapshot.height);
  sctx.drawImage(main, 0, 0);
}

function drawAnnotationPreview(canvasX, canvasY) {
  if (!_chartSnapshot || !_chartGeom || !annotationFirstPoint) return;
  const main = document.getElementById('chart');
  const ctx = main.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, main.width, main.height);
  ctx.drawImage(_chartSnapshot, 0, 0);
  ctx.setTransform(2, 0, 0, 2, 0, 0);
  const g = _chartGeom;
  const cx = Math.max(g.pad.left, Math.min(g.pad.left + g.chartW, canvasX));
  const cy = Math.max(g.pad.top, Math.min(g.pad.top + g.chartH, canvasY));
  const start = dataToCanvas(annotationFirstPoint.date, annotationFirstPoint.price);
  if (!start) return;
  ctx.save();
  ctx.beginPath();
  ctx.rect(g.pad.left, g.pad.top, g.chartW, g.chartH);
  ctx.clip();
  const color = document.getElementById('annotationColor').value;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(cx, cy);
  ctx.stroke();
  ctx.setLineDash([]);
  if (annotationMode === 'arrow') drawArrowhead(ctx, start.x, start.y, cx, cy, color);
  ctx.restore();
}

function handleCanvasMouseMove(evt) {
  const pos = getCanvasLogicalPos(evt);
  if (_dragging) {
    _dragging.moved = true;
    const newX = pos.x - _dragging.offsetX;
    const newY = pos.y - _dragging.offsetY;
    const data = canvasToData(newX, newY);
    if (data) {
      _dragging.annotation.x1 = data.date;
      _dragging.annotation.y1 = data.price;
      redrawAnnotationsFromBase();
    }
    return;
  }
  if (annotationMode && annotationMode !== 'label' && annotationFirstPoint) {
    drawAnnotationPreview(pos.x, pos.y);
    return;
  }
  if (!annotationMode) {
    const canvas = document.getElementById('chart');
    canvas.style.cursor = findLabelAtCanvas(pos.x, pos.y) ? 'grab' : 'default';
  }
}

let _chartBaseSnapshot = null;
let _dragging = null;

function captureChartBaseSnapshot() {
  const main = document.getElementById('chart');
  if (!main) return;
  if (!_chartBaseSnapshot) { _chartBaseSnapshot = document.createElement('canvas'); _chartBaseSnapshot.width = main.width; _chartBaseSnapshot.height = main.height; }
  const sctx = _chartBaseSnapshot.getContext('2d');
  sctx.setTransform(1, 0, 0, 1, 0, 0);
  sctx.clearRect(0, 0, _chartBaseSnapshot.width, _chartBaseSnapshot.height);
  sctx.drawImage(main, 0, 0);
}

function redrawAnnotationsFromBase() {
  if (!_chartBaseSnapshot) return;
  const main = document.getElementById('chart');
  const ctx = main.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, main.width, main.height);
  ctx.drawImage(_chartBaseSnapshot, 0, 0);
  ctx.setTransform(2, 0, 0, 2, 0, 0);
  drawAnnotations(ctx);
}

function findLabelAtCanvas(canvasX, canvasY) {
  if (!_chartGeom) return null;
  const ctx = document.getElementById('chart').getContext('2d');
  ctx.save();
  ctx.font = 'bold 13px ' + FONT;
  for (let i = annotations.length - 1; i >= 0; i--) {
    const a = annotations[i];
    if (a.type !== 'label') continue;
    const pos = dataToCanvas(a.x1, a.y1);
    if (!pos) continue;
    const textW = ctx.measureText(a.text).width;
    if (canvasX >= pos.x - 4 && canvasX <= pos.x + textW + 4 &&
        canvasY >= pos.y - 9 && canvasY <= pos.y + 9) {
      ctx.restore();
      return { annotation: a, anchorX: pos.x, anchorY: pos.y };
    }
  }
  ctx.restore();
  return null;
}

function handleCanvasMouseDown(evt) {
  if (annotationMode) return;
  const pos = getCanvasLogicalPos(evt);
  const hit = findLabelAtCanvas(pos.x, pos.y);
  if (!hit) return;
  _dragging = { annotation: hit.annotation, offsetX: pos.x - hit.anchorX, offsetY: pos.y - hit.anchorY, moved: false };
  document.getElementById('chart').style.cursor = 'grabbing';
  evt.preventDefault();
}

function handleCanvasMouseUp(evt) {
  if (!_dragging) return;
  const didMove = _dragging.moved;
  _dragging = null;
  if (didMove) { saveAnnotations(); generateChart(); }
  const canvas = document.getElementById('chart');
  if (annotationMode) canvas.style.cursor = 'crosshair';
  else {
    const pos = getCanvasLogicalPos(evt);
    canvas.style.cursor = findLabelAtCanvas(pos.x, pos.y) ? 'grab' : 'default';
  }
}

// ── Floating popup (replaces native prompt/confirm) ─────────────────
let _popupCallbacks = null;
let _popupKeyHandler = null;

function positionPopup(popup, anchorX, anchorY) {
  popup.style.left = '-9999px';
  popup.style.top = '-9999px';
  popup.style.display = 'block';
  const w = popup.offsetWidth;
  const h = popup.offsetHeight;
  let left, top;
  if (anchorX === undefined || anchorY === undefined) {
    left = (window.innerWidth - w) / 2;
    top = (window.innerHeight - h) / 2;
  } else {
    left = anchorX + 12;
    top = anchorY + 12;
    if (left + w > window.innerWidth - 8) left = anchorX - 12 - w;
    if (top + h > window.innerHeight - 8) top = anchorY - 12 - h;
    left = Math.max(8, left);
    top = Math.max(8, top);
  }
  popup.style.left = left + 'px';
  popup.style.top = top + 'px';
}

function hidePopup() {
  document.getElementById('popupModal').style.display = 'none';
  if (_popupKeyHandler) {
    document.removeEventListener('keydown', _popupKeyHandler, true);
    _popupKeyHandler = null;
  }
  _popupCallbacks = null;
}

function attachPopupKeyHandler() {
  if (_popupKeyHandler) document.removeEventListener('keydown', _popupKeyHandler, true);
  _popupKeyHandler = function(evt) {
    if (!_popupCallbacks) return;
    if (evt.key === 'Enter') { evt.preventDefault(); _popupCallbacks.submit(); }
    else if (evt.key === 'Escape') { evt.preventDefault(); evt.stopPropagation(); _popupCallbacks.cancel(); }
  };
  document.addEventListener('keydown', _popupKeyHandler, true);
}

function showPromptPopup(opts) {
  const popup = document.getElementById('popupModal');
  document.getElementById('popupMessage').textContent = opts.message || '';
  const input = document.getElementById('popupInput');
  input.style.display = 'block';
  input.value = opts.value || '';
  input.placeholder = opts.placeholder || '';
  _popupCallbacks = {
    submit: function() { const value = input.value; hidePopup(); if (opts.onSubmit) opts.onSubmit(value); },
    cancel: function() { hidePopup(); if (opts.onCancel) opts.onCancel(); },
  };
  positionPopup(popup, opts.x, opts.y);
  attachPopupKeyHandler();
  setTimeout(function() { input.focus(); input.select(); }, 0);
}

function showConfirmPopup(opts) {
  const popup = document.getElementById('popupModal');
  document.getElementById('popupMessage').textContent = opts.message || '';
  document.getElementById('popupInput').style.display = 'none';
  _popupCallbacks = {
    submit: function() { hidePopup(); if (opts.onConfirm) opts.onConfirm(); },
    cancel: function() { hidePopup(); if (opts.onCancel) opts.onCancel(); },
  };
  positionPopup(popup, opts.x, opts.y);
  attachPopupKeyHandler();
  setTimeout(function() { document.getElementById('popupConfirm').focus(); }, 0);
}

// ── Custom colors ───────────────────────────────────────────────────
const CUSTOM_COLOR_IDS = ['customBullish','customBearish','customBearishStroke','customWick','customSpotLine','customSpotArea'];

function toggleCustomColorsPanel() {
  const val = document.getElementById('colorScheme').value;
  document.getElementById('customColors').style.display = val === 'custom' ? 'block' : 'none';
}

function saveCustomColors() {
  const payload = { matchWick: document.getElementById('customMatchWick').checked };
  for (const id of CUSTOM_COLOR_IDS) payload[id] = document.getElementById(id).value;
  try { localStorage.setItem('candlestick_custom_colors', JSON.stringify(payload)); } catch (e) {}
}

function loadCustomColors() {
  try {
    const raw = localStorage.getItem('candlestick_custom_colors');
    if (!raw) return;
    const payload = JSON.parse(raw);
    for (const id of CUSTOM_COLOR_IDS) {
      if (payload[id]) document.getElementById(id).value = payload[id];
    }
    if (typeof payload.matchWick === 'boolean') document.getElementById('customMatchWick').checked = payload.matchWick;
  } catch (e) {}
}

function loadCustomFromPreset(name) {
  const s = SCHEMES[name];
  if (!s) return;
  document.getElementById('customBullish').value = s.bullish;
  document.getElementById('customBearish').value = s.bearish;
  document.getElementById('customBearishStroke').value = s.bearishStroke || s.bearish;
  document.getElementById('customWick').value = s.wick || s.bullish;
  document.getElementById('customSpotLine').value = s.spotLine;
  document.getElementById('customSpotArea').value = s.spotArea;
  saveCustomColors();
  generateChart();
}

// ── Custom date range ───────────────────────────────────────────────
function toggleDateRangePanel() {
  const val = document.getElementById('displayRange').value;
  document.getElementById('customDateRange').style.display = val === 'custom' ? 'block' : 'none';
}

function fmtDateInput(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

function populateCustomDateDefaults() {
  const fromEl = document.getElementById('dateFrom');
  const toEl = document.getElementById('dateTo');
  if (fromEl.value && toEl.value) return;
  const data = parseCSV(document.getElementById('csvInput').value);
  if (data.length === 0) return;
  if (!fromEl.value) fromEl.value = fmtDateInput(data[0].date);
  if (!toEl.value) toEl.value = fmtDateInput(data[data.length - 1].date);
}

// ── Wire all events on DOMContentLoaded ─────────────────────────────
function wireEvents() {
  setupLogToggle();

  document.getElementById('downloadBtn').addEventListener('click', downloadWebP);
  document.getElementById('reloadFuturesBtn').addEventListener('click', reloadFuturesFromSheet);
  document.getElementById('updateChartBtn').addEventListener('click', generateChart);
  document.getElementById('applyFuturesBtn').addEventListener('click', generateChart);
  document.getElementById('clearFuturesBtn').addEventListener('click', function() {
    document.getElementById('csvInput').value = '';
    document.getElementById('csvInput').focus();
  });
  document.getElementById('loadHenryHubSpotBtn').addEventListener('click', function() { loadHenryHubSpotHistory(true); });
  document.getElementById('applyCashBtn').addEventListener('click', generateChart);
  document.getElementById('clearCashBtn').addEventListener('click', function() {
    document.getElementById('cashInput').value = '';
    document.getElementById('cashInput').focus();
  });

  document.getElementById('applyIntradayFuturesBtn').addEventListener('click', applyIntradayFutures);
  document.getElementById('clearIntradayFuturesBtn').addEventListener('click', clearIntradayFutures);
  document.getElementById('applyIntradayHHBtn').addEventListener('click', applyIntradayHenryHub);
  document.getElementById('clearIntradayHHBtn').addEventListener('click', clearIntradayHenryHub);

  const onSeriesVisibilityChange = function() { syncTitleToSpotSelection(); generateChart(); };
  document.getElementById('showFutures').addEventListener('change', onSeriesVisibilityChange);
  document.getElementById('showSpot').addEventListener('change', onSeriesVisibilityChange);
  document.getElementById('showChicagoCitygate').addEventListener('change', handleChicagoCitygateToggle);

  document.querySelectorAll('.ma-check').forEach(function(cb) { cb.addEventListener('change', generateChart); });

  document.querySelectorAll('input[name="yaxis"]').forEach(function(r) { r.addEventListener('change', toggleYAxis); });
  document.querySelectorAll('input[name="yinterval"]').forEach(function(r) { r.addEventListener('change', toggleYInterval); });
  document.getElementById('yMin').addEventListener('input', generateChart);
  document.getElementById('yMax').addEventListener('input', generateChart);
  document.getElementById('yInterval').addEventListener('input', generateChart);

  document.getElementById('addPriceLevelBtn').addEventListener('click', function() { addPriceLevel(); });
  document.getElementById('levelOffset').addEventListener('change', generateChart);
  document.getElementById('levelFullLine').addEventListener('change', generateChart);
  document.getElementById('toggleAnnotationToolsBtn').addEventListener('click', toggleAnnotationTools);

  document.getElementById('drawLineBtn').addEventListener('click', function() { setAnnotationMode('line'); });
  document.getElementById('drawArrowBtn').addEventListener('click', function() { setAnnotationMode('arrow'); });
  document.getElementById('addLabelBtn').addEventListener('click', function() { setAnnotationMode('label'); });
  document.getElementById('undoAnnotationBtn').addEventListener('click', undoAnnotation);
  document.getElementById('clearAnnotationsBtn').addEventListener('click', clearAnnotations);

  document.getElementById('showNote').addEventListener('change', toggleNote);
  document.getElementById('noteText').addEventListener('input', generateChart);
  document.getElementById('sourceText').addEventListener('input', generateChart);
  document.getElementById('spotOpacity').addEventListener('change', function() {
    try { localStorage.setItem('candlestick_spot_opacity', this.value); } catch (e) {}
    generateChart();
  });

  document.getElementById('colorScheme').addEventListener('change', function() {
    toggleCustomColorsPanel();
    try { localStorage.setItem('candlestick_color_scheme', this.value); } catch (e) {}
    generateChart();
  });

  document.getElementById('customMatchWick').addEventListener('change', function() {
    document.getElementById('customWick').disabled = this.checked;
    saveCustomColors();
    generateChart();
  });

  for (const id of CUSTOM_COLOR_IDS) {
    document.getElementById(id).addEventListener('input', function() { saveCustomColors(); generateChart(); });
  }

  document.getElementById('customLoadPreset').addEventListener('click', function() {
    const names = Object.keys(SCHEMES);
    const current = prompt('Load colors from which preset?\n\nOptions: ' + names.join(', '), 'editorRedGreen');
    if (current && SCHEMES[current]) loadCustomFromPreset(current);
  });

  document.getElementById('displayRange').addEventListener('change', function() {
    toggleDateRangePanel();
    if (this.value === 'custom') populateCustomDateDefaults();
    generateChart();
  });
  document.getElementById('dateFrom').addEventListener('change', generateChart);
  document.getElementById('dateTo').addEventListener('change', generateChart);

  document.getElementById('chartTitle').addEventListener('input', generateChart);
  document.getElementById('cashInput').addEventListener('input', function() {
    cashDataSourceLabel = 'manual';
    const cb = document.getElementById('showChicagoCitygate');
    if (cb && cb.checked) {
      cb.checked = false;
      setSpotSlot('spot2', '');
      syncTitleToSpotSelection();
    }
    refreshSpotCoverageNotice(null);
    generateChart();
  });

  document.getElementById('chart').addEventListener('click', handleCanvasClick);
  document.getElementById('chart').addEventListener('mousemove', handleCanvasMouseMove);
  document.getElementById('chart').addEventListener('mousedown', handleCanvasMouseDown);
  document.addEventListener('mouseup', handleCanvasMouseUp);
  document.addEventListener('keydown', function(evt) {
    if (evt.key === 'Escape' && annotationMode) setAnnotationMode(null);
  });

  document.getElementById('popupConfirm').addEventListener('click', function() { if (_popupCallbacks) _popupCallbacks.submit(); });
  document.getElementById('popupCancel').addEventListener('click', function() { if (_popupCallbacks) _popupCallbacks.cancel(); });
}

function restorePersistedSettings() {
  loadCustomColors();
  document.getElementById('customWick').disabled = document.getElementById('customMatchWick').checked;
  try {
    const savedScheme = localStorage.getItem('candlestick_color_scheme');
    if (savedScheme) {
      const select = document.getElementById('colorScheme');
      if (Array.from(select.options).some(o => o.value === savedScheme)) select.value = savedScheme;
    }
    const savedOpacity = localStorage.getItem('candlestick_spot_opacity');
    if (savedOpacity) {
      const sel = document.getElementById('spotOpacity');
      if (Array.from(sel.options).some(o => o.value === savedOpacity)) sel.value = savedOpacity;
    }
  } catch (e) {}
  toggleCustomColorsPanel();
}

function initIntradayDate() {
  const el = document.getElementById('intradayDate');
  if (!el || el.value) return;
  const d = new Date();
  el.value = formatIsoDate(d);
}

document.addEventListener('DOMContentLoaded', function() {
  wireEvents();
  restorePersistedSettings();
  initIntradayDate();
  loadAnnotations();
  updateAnnotationHint();
  try {
    if (localStorage.getItem('candlestick_annotation_tools_visible') === '1') {
      setAnnotationToolsVisible(true);
    }
  } catch (e) {}
  logMsg('Candlestick chart system initialized.');
  loadDefaultData();
});
