/**
 * Entropic Bar/Line Chart - Publication-ready stacked-bar + line charts from
 * user-provided data. Cloned from custom_data_chart.js (the line chart engine);
 * differences: each series has a role — stacked bar (left axis) or line (right
 * axis) — and the chart renders dual y-axes.
 * No API calls: data comes from the pop-out Data Editor, a CSV upload, or
 * paste — everything is parsed and rendered in the browser.
 * First column = x-axis (dates or labels), each other column = one series.
 */

const CustomDataChart = {
    chart: null,
    rawText: '',       // Current dataset as delimited text (single source of truth)
    parsed: null,      // Result of parseData(): see parseData() return value
    chartData: null,   // Snapshot of parsed data used by the rendered chart
    seriesList: [],    // Each item: {name, color, style}
    editorWindow: null,
    customLegendLabels: {},
    customTitle: null, // { line1, line2 } or null for auto
    customNote: null,  // string, '' hides the note line, null = default
    customSource: null,
    customYMin: null,
    customYMax: null,
    customYMinRight: null,
    customYMaxRight: null,
    userTouchedHeaderCheckbox: false,
    userTouchedHideLegend: false,

    MAX_ROWS: 5000,
    MAX_SERIES: 12,
    // Per-page branding (NGI vs Entropic line chart): the route injects
    // window.LINE_CHART_CONFIG via the template; NGI values are the fallback.
    PAGE_CFG: window.LINE_CHART_CONFIG || {},
    STORAGE_KEY: (window.LINE_CHART_CONFIG && window.LINE_CHART_CONFIG.storage_key) || 'customDataChart.lastInput',
    // The saved dataset is only loaded when the user clicks "Load Previous" —
    // never automatically, so a fresh visit always starts clean.

    // Color palette for multi-line charts (up to 8 colors)
    colorPalette: [
        '#1d4063',  // Dark Navy Blue
        '#37b4ee',  // Sky Blue
        '#fabc28',  // Gold/Amber
        '#dc3545',  // Red
        '#28a745',  // Green
        '#6f42c1',  // Purple
        '#fd7e14',  // Orange
        '#20c997'   // Teal
    ],

    // Default line style rotation
    defaultStyles: ['solid', 'solid', 'dashed', 'solid', 'dotted', 'dashed', 'solid', 'dotted'],

    // SVG path icons for legend
    legendIcons: {
        solid:  'path://M0,5L40,5L40,7L0,7Z',
        dashed: 'path://M0,5L10,5L10,7L0,7Z M15,5L25,5L25,7L15,7Z M30,5L40,5L40,7L30,7Z',
        dotted: 'path://M0,5L4,5L4,7L0,7Z M8,5L12,5L12,7L8,7Z M16,5L20,5L20,7L16,7Z M24,5L28,5L28,7L24,7Z M32,5L36,5L36,7L32,7Z'
    },

    MONTHS: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],

    // NGI website CSV exports (long format: one row per location per date)
    // are recognized by their header signature and auto-pivoted to wide
    // format. Which value column to chart is the user's pick:
    ngiMetric: null,
    NGI_METRICS: {
        prices: [   // Daily / Bidweek exports
            { col: 'average', label: 'Average' },
            { col: 'low', label: 'Low' },
            { col: 'high', label: 'High' },
            { col: 'volume', label: 'Volume' },
            { col: 'deals', label: 'Deals' }
        ],
        forward: [  // Forward Look exports
            { col: 'fixed_prices', label: 'Fixed price' },
            { col: 'basis_prices', label: 'Basis' }
        ]
    },

    init: function() {
        this.bindEvents();
        this.setupLogToggle();
        this.updateLoadPreviousButton();
        this.log((this.PAGE_CFG.page_name || 'NGI Line Chart') + ' ready. Click Input/Edit Data or upload a CSV to begin.');
    },

    log: function(msg) {
        const time = new Date().toLocaleTimeString();
        const logHtml = `<div class="border-l-2 border-slate-700 pl-2 mb-1 hover:bg-slate-800"><span class="text-slate-500 mr-2">[${time}]</span>${msg}</div>`;
        const logContainer = document.getElementById('logContent');
        if (logContainer) {
            logContainer.insertAdjacentHTML('beforeend', logHtml);
            logContainer.scrollTop = logContainer.scrollHeight;
        }
        const lastLog = document.getElementById('lastLogMsg');
        if (lastLog) lastLog.textContent = msg.replace(/<[^>]*>/g, '');
    },

    setupLogToggle: function() {
        const logToggle = document.getElementById('logToggle');
        const logDrawer = document.getElementById('logDrawer');
        const logArrow = document.getElementById('logArrow');

        if (logToggle) {
            logToggle.addEventListener('click', () => {
                const isOpen = logDrawer.style.height !== '0px' && logDrawer.style.height !== '';
                if (isOpen) {
                    logDrawer.style.height = '0';
                    logArrow.style.transform = 'rotate(0deg)';
                } else {
                    logDrawer.style.height = '16rem';
                    logArrow.style.transform = 'rotate(180deg)';
                }
            });
        }
    },

    bindEvents: function() {
        document.getElementById('openEditorBtn').addEventListener('click', () => this.openEditor());
        window.addEventListener('message', (e) => this.handleEditorMessage(e));

        document.getElementById('uploadCsvBtn').addEventListener('click', () => document.getElementById('csvFileInput').click());
        document.getElementById('csvFileInput').addEventListener('change', (e) => this.handleFileUpload(e));
        document.getElementById('loadPreviousBtn').addEventListener('click', () => this.loadPrevious());
        document.getElementById('clearDataBtn').addEventListener('click', () => {
            this.ngiMetric = null;
            this.setRawText('', true);
            try { localStorage.removeItem(this.STORAGE_KEY); } catch (e) { /* unavailable — fine */ }
            this.updateLoadPreviousButton();
            this.log('Data cleared, including the saved copy in this browser.');
        });

        document.getElementById('ngiMetricSelect').addEventListener('change', (e) => {
            this.ngiMetric = e.target.value;
            // Volume/deals are counts, not prices — adjust the y-axis format
            if (this.ngiMetric === 'volume' || this.ngiMetric === 'deals') {
                document.getElementById('yAxisPrefix').value = '';
                document.getElementById('yAxisDecimals').value = '0';
            } else {
                document.getElementById('yAxisPrefix').value = '$';
                document.getElementById('yAxisDecimals').value = '3';
            }
            this.handleInputChanged(true);
            this.log(`NGI export: now charting <strong>${e.target.selectedOptions[0].textContent}</strong>. Click Generate Chart to apply.`);
        });

        document.getElementById('firstRowHeaders').addEventListener('change', () => {
            this.userTouchedHeaderCheckbox = true;
            this.handleInputChanged(true);
        });
        document.getElementById('sortByDate').addEventListener('change', () => this.handleInputChanged(true));

        document.getElementById('generateBtn').addEventListener('click', () => this.handleGenerate());
        document.getElementById('downloadBtn').addEventListener('click', () => this.downloadChart());
        document.getElementById('updateXRangeBtn').addEventListener('click', () => this.rerenderChart());
        document.getElementById('applyTitleBtn').addEventListener('click', () => this.applyTitle());
        document.getElementById('applyLegendBtn').addEventListener('click', () => this.applyLegendLabels());
        document.getElementById('applyNoteSourceBtn').addEventListener('click', () => this.applyNoteSource());
        ['noteInput', 'sourceInput'].forEach(id => {
            document.getElementById(id).addEventListener('keydown', (e) => {
                if (e.key === 'Enter') this.applyNoteSource();
            });
        });
        document.getElementById('applyYAxisLabelBtn').addEventListener('click', () => this.applyYAxisLabel());
        ['yAxisLabelInput', 'yAxisLabelRightInput'].forEach(id => {
            document.getElementById(id).addEventListener('keydown', (e) => {
                if (e.key === 'Enter') this.applyYAxisLabel();
            });
        });
        document.getElementById('yAxisLeftDivisor').addEventListener('change', () => this.rerenderChart());
        document.getElementById('yAxisLeftDecimals').addEventListener('input', () => this.rerenderChart());
        document.getElementById('applyYAxisRightBtn').addEventListener('click', () => this.applyYAxisRight());
        document.getElementById('resetYAxisRightBtn').addEventListener('click', () => this.resetYAxisRight());
        ['yAxisRightMin', 'yAxisRightMax'].forEach(id => {
            document.getElementById(id).addEventListener('keydown', (e) => {
                if (e.key === 'Enter') this.applyYAxisRight();
            });
        });
        document.getElementById('exportColorsBtn').addEventListener('click', () => this.exportColors());
        document.getElementById('importColorsBtn').addEventListener('click', () => document.getElementById('importColorsFile').click());
        document.getElementById('importColorsFile').addEventListener('change', (e) => this.importColors(e));
        document.getElementById('applyYAxisBtn').addEventListener('click', () => this.applyYAxis());
        document.getElementById('resetYAxisBtn').addEventListener('click', () => this.resetYAxis());
        const aspectSelect = document.getElementById('aspectRatioSelect');
        if (aspectSelect) aspectSelect.addEventListener('change', () => this.applyAspect());
        ['yAxisMin', 'yAxisMax'].forEach(id => {
            document.getElementById(id).addEventListener('keydown', (e) => {
                if (e.key === 'Enter') this.applyYAxis();
            });
        });
        document.getElementById('hideYearCheckbox').addEventListener('change', (e) => {
            ['showYearUnderJanCheckbox', 'showYearUnderJanuaryCheckbox'].forEach(id => {
                const sub = document.getElementById(id);
                sub.disabled = !e.target.checked;
                if (!e.target.checked) sub.checked = false;
            });
            this.rerenderChart();
        });
        // "Under first month of year" and "under January" are either/or
        document.getElementById('showYearUnderJanCheckbox').addEventListener('change', (e) => {
            if (e.target.checked) document.getElementById('showYearUnderJanuaryCheckbox').checked = false;
            this.rerenderChart();
        });
        document.getElementById('showYearUnderJanuaryCheckbox').addEventListener('change', (e) => {
            if (e.target.checked) document.getElementById('showYearUnderJanCheckbox').checked = false;
            this.rerenderChart();
        });
        document.getElementById('hideMonthCheckbox').addEventListener('change', () => this.rerenderChart());
        document.getElementById('hideDayCheckbox').addEventListener('change', () => this.rerenderChart());
        document.getElementById('connectGapsCheckbox').addEventListener('change', () => this.rerenderChart());
        document.getElementById('hideLegendCheckbox').addEventListener('change', (e) => {
            this.userTouchedHideLegend = true;
            this.syncLegendPaddingDefault(e.target.checked);
            this.rerenderChart();
        });
        document.getElementById('xAxisLabelMode').addEventListener('change', () => this.rerenderChart());
        document.getElementById('trimForIntervalCheckbox').addEventListener('change', () => this.rerenderChart());
        const xPadSlider = document.getElementById('xAxisPadding');
        const xPadReadout = document.getElementById('xAxisPaddingValue');
        xPadSlider.addEventListener('input', () => {
            xPadReadout.textContent = `${xPadSlider.value}%`;
            this.rerenderChart();
        });
        xPadSlider.addEventListener('dblclick', () => {
            xPadSlider.value = '0';
            xPadReadout.textContent = '0%';
            this.rerenderChart();
        });
        const legendPadSlider = document.getElementById('legendPadding');
        const legendPadReadout = document.getElementById('legendPaddingValue');
        legendPadSlider.addEventListener('input', () => {
            legendPadReadout.textContent = `${legendPadSlider.value}%`;
            this.rerenderChart();
        });
        legendPadSlider.addEventListener('dblclick', () => {
            legendPadSlider.value = '0';
            legendPadReadout.textContent = '0%';
            this.rerenderChart();
        });
        document.getElementById('yAxisPrefix').addEventListener('input', () => this.rerenderChart());
        document.getElementById('yAxisDecimals').addEventListener('input', () => this.rerenderChart());

        // Two-line title checkbox toggles second input
        document.getElementById('twoLineTitleCheckbox').addEventListener('change', (e) => {
            document.getElementById('titleLine2').classList.toggle('hidden', !e.target.checked);
        });

        // Enter key in title inputs triggers apply
        ['titleLine1', 'titleLine2'].forEach(id => {
            document.getElementById(id).addEventListener('keydown', (e) => {
                if (e.key === 'Enter') this.applyTitle();
            });
        });
    },

    // ==================== DATA EDITOR POP-OUT ====================

    openEditor: function() {
        if (this.editorWindow && !this.editorWindow.closed) {
            this.editorWindow.focus();
            return;
        }
        this.editorWindow = window.open('/custom-data-chart/editor', 'ngiDataEditor',
            'width=1080,height=700,resizable=yes,scrollbars=yes');
        if (!this.editorWindow) {
            alert('The Data Editor window was blocked by your browser. Allow pop-ups for this site and try again.');
            return;
        }
        this.log('Data Editor opened. Paste or type your data there, then click "Use This Data in Chart".');
    },

    handleEditorMessage: function(e) {
        if (e.origin !== window.location.origin) return;
        const msg = e.data;
        if (!msg || typeof msg.type !== 'string') return;

        if (msg.type === 'ngi-editor-ready') {
            // Editor just loaded — send it the current dataset so edits round-trip
            if (e.source && this.rawText.trim()) {
                e.source.postMessage({
                    type: 'ngi-editor-init',
                    text: this.rawText,
                    hasHeader: document.getElementById('firstRowHeaders').checked
                }, window.location.origin);
            }
        } else if (msg.type === 'ngi-editor-data') {
            document.getElementById('firstRowHeaders').checked = !!msg.hasHeader;
            this.userTouchedHeaderCheckbox = true;
            this.setRawText(String(msg.text || ''), false);
            this.saveInput();
            this.log('Data received from the Data Editor. Check the preview, then Generate Chart.');
        }
    },

    // Replace the current dataset and re-run parse + preview.
    // resetHeaderChoice: forget any manual header-checkbox override.
    setRawText: function(text, resetHeaderChoice) {
        this.rawText = text;
        if (resetHeaderChoice) this.userTouchedHeaderCheckbox = false;
        this.handleInputChanged(!resetHeaderChoice);
    },

    handleFileUpload: function(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            // NGI forward exports carry both price types; the filename often
            // says which was intended (Forward-basis_... / Forward-fixed_...)
            const nameHint = /basis/i.test(file.name) ? 'basis_prices'
                : (/fixed/i.test(file.name) ? 'fixed_prices' : null);
            if (nameHint) this.ngiMetric = nameHint;
            this.setRawText(evt.target.result, true);
            if (nameHint && this.parsed && this.parsed.ngiExport && this.parsed.ngiExport.metric === nameHint) {
                this.log(`Loaded <strong>${file.name}</strong> — charting <strong>${nameHint === 'basis_prices' ? 'Basis' : 'Fixed price'}</strong> (from the filename). Change it under NGI Export Value if needed.`);
            } else {
                this.log(`Loaded <strong>${file.name}</strong>. Check the preview below — click Input/Edit Data to make changes.`);
            }
        };
        reader.onerror = () => {
            alert('Could not read the file. Try opening it in Excel, copying the cells, and pasting into the Data Editor instead.');
        };
        reader.readAsText(file);
        e.target.value = '';
    },

    handleInputChanged: function(keepHeaderChoice) {
        const text = this.rawText;
        if (!text.trim()) {
            this.parsed = null;
            document.getElementById('previewSection').classList.add('hidden');
            document.getElementById('seriesListSection').classList.add('hidden');
            document.getElementById('sortByDateWrap').classList.add('hidden');
            this.updateNgiMetricUi();
            return;
        }
        const headerChoice = (keepHeaderChoice || this.userTouchedHeaderCheckbox)
            ? document.getElementById('firstRowHeaders').checked
            : null; // null = auto-detect
        this.parsed = this.parseData(text, headerChoice);
        if (headerChoice === null || this.parsed.ngiExport) {
            document.getElementById('firstRowHeaders').checked = this.parsed.hasHeaders;
        }
        document.getElementById('sortByDateWrap').classList.toggle('hidden', this.parsed.xKind === 'category');
        this.updateNgiMetricUi();
        this.renderPreview();
        this.buildSeriesList();
    },

    // ==================== NGI WEBSITE EXPORT DETECTION ====================

    // Inspect a header row for the NGI website export signature. Returns
    // {schema, kind, dateCol, locCol, contractCol, metrics} or null.
    detectNgiExport: function(headerCells) {
        const cols = headerCells.map(h => String(h).trim().toLowerCase());
        const idx = (name) => cols.indexOf(name);
        if (idx('location_name') === -1) return null;
        const withIdx = (list) => list.filter(m => idx(m.col) !== -1).map(m => ({ ...m, idx: idx(m.col) }));

        if (idx('issue_dates') !== -1 && idx('fixed_prices') !== -1) {
            return {
                schema: 'forward', kind: 'Forward',
                dateCol: idx('issue_dates'), locCol: idx('location_name'),
                contractCol: idx('contract_month'),
                metrics: withIdx(this.NGI_METRICS.forward)
            };
        }
        if (idx('issue_date') !== -1 && idx('average') !== -1) {
            const kind = idx('survey_start') !== -1 ? 'Bidweek' : (idx('trade_date') !== -1 ? 'Daily' : 'NGI');
            return {
                schema: 'prices', kind,
                dateCol: idx('issue_date'), locCol: idx('location_name'),
                contractCol: -1,
                metrics: withIdx(this.NGI_METRICS.prices)
            };
        }
        return null;
    },

    // Reshape a long NGI export into a wide table: dates down, one column
    // per location, values from the chosen metric column.
    pivotNgiExport: function(table, det, metric) {
        const dates = [];
        const dateSeen = new Set();
        const locs = [];
        const locSeen = new Set();
        const values = new Map();
        const contracts = new Set();
        let dupes = 0;

        table.slice(1).forEach(r => {
            const d = r[det.dateCol] !== undefined ? String(r[det.dateCol]).trim() : '';
            const loc = r[det.locCol] !== undefined ? String(r[det.locCol]).trim() : '';
            if (!d || !loc) return;
            if (!dateSeen.has(d)) { dateSeen.add(d); dates.push(d); }
            if (!locSeen.has(loc)) { locSeen.add(loc); locs.push(loc); }
            if (det.contractCol >= 0 && r[det.contractCol]) contracts.add(String(r[det.contractCol]).trim());
            const key = loc + '||' + d;
            if (values.has(key)) dupes++;
            values.set(key, r[metric.idx] !== undefined ? String(r[metric.idx]) : '');
        });

        dates.sort(); // ISO dates sort correctly as strings
        const header = ['Date', ...locs];
        const rows = dates.map(d => [d, ...locs.map(loc => values.get(loc + '||' + d) ?? '')]);
        return { table: [header, ...rows], locs: locs.length, dates: dates.length, dupes, contracts: [...contracts].sort() };
    },

    formatContractMonth: function(iso) {
        const m = String(iso).match(/^(\d{4})-(\d{1,2})/);
        if (!m) return iso;
        return `${this.MONTHS[parseInt(m[2], 10) - 1]} ${m[1]}`;
    },

    updateNgiMetricUi: function() {
        const wrap = document.getElementById('ngiMetricWrap');
        const sel = document.getElementById('ngiMetricSelect');
        const info = this.parsed && this.parsed.ok && this.parsed.ngiExport;
        if (!info) { wrap.classList.add('hidden'); return; }
        sel.innerHTML = '';
        if (info.needsChoice) {
            const ph = document.createElement('option');
            ph.value = '';
            ph.textContent = 'Choose: Fixed or Basis...';
            ph.disabled = true;
            ph.selected = true;
            sel.appendChild(ph);
        }
        info.metrics.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.col;
            opt.textContent = m.label;
            if (!info.needsChoice && m.col === info.metric) opt.selected = true;
            sel.appendChild(opt);
        });
        wrap.classList.remove('hidden');
    },

    // ==================== PARSING ====================

    detectDelimiter: function(lines) {
        // Excel paste = tabs; CSV = commas; some locales use semicolons.
        const sample = lines.slice(0, 10);
        const count = (ch) => sample.reduce((sum, l) => sum + l.split(ch).length - 1, 0);
        const tabs = count('\t');
        if (tabs > 0) return '\t';
        const semis = count(';');
        const commas = count(',');
        if (semis > commas) return ';';
        return ',';
    },

    // Split one line into fields, honoring double-quoted fields for CSV.
    splitLine: function(line, delim) {
        if (delim === '\t') return line.split('\t');
        const fields = [];
        let cur = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (inQuotes) {
                if (ch === '"') {
                    if (line[i + 1] === '"') { cur += '"'; i++; }
                    else inQuotes = false;
                } else {
                    cur += ch;
                }
            } else if (ch === '"') {
                inQuotes = true;
            } else if (ch === delim) {
                fields.push(cur);
                cur = '';
            } else {
                cur += ch;
            }
        }
        fields.push(cur);
        return fields;
    },

    // Convert a cell to a number, tolerating $, thousands separators,
    // (parentheses) negatives, %, and blank/N-A placeholders (-> null).
    // Returns {value: number|null, bad: boolean} — bad means it looked like
    // data but couldn't be read as a number.
    parseNumber: function(raw) {
        if (raw === null || raw === undefined) return { value: null, bad: false };
        let s = String(raw).trim();
        if (s === '') return { value: null, bad: false };
        const naTokens = ['n/a', 'na', '-', '–', '—', 'null', '#n/a', '#value!', '#div/0!'];
        if (naTokens.includes(s.toLowerCase())) return { value: null, bad: false };

        let negative = false;
        if (/^\(.*\)$/.test(s)) { negative = true; s = s.slice(1, -1).trim(); }
        s = s.replace(/[$€£%\s]/g, '');

        if (/^[-+]?\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) {
            s = s.replace(/,/g, '');            // 1,234.56 thousands separators
        } else if (/^[-+]?\d+,\d+$/.test(s)) {
            s = s.replace(',', '.');            // 3,05 European decimal comma
        } else {
            s = s.replace(/,/g, '');
        }

        if (!/^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(s)) {
            return { value: null, bad: true };
        }
        let num = parseFloat(s);
        if (!isFinite(num)) return { value: null, bad: true };
        if (negative) num = -num;
        return { value: num, bad: false };
    },

    monthIndex: function(name) {
        const idx = this.MONTHS.findIndex(m => name.toLowerCase().startsWith(m.toLowerCase()));
        return idx;
    },

    expandYear: function(yr) {
        const n = parseInt(yr, 10);
        if (yr.length === 4) return n;
        return n < 70 ? 2000 + n : 1900 + n;
    },

    // Try to read one x-cell as a date. Returns {year, month(1-12), day, monthly} or null.
    parseDateCell: function(raw) {
        const s = String(raw).trim();
        if (s === '') return null;
        let m;

        // ISO daily: 2026-08-18 (also 2026/08/18)
        if ((m = s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/))) {
            return this.validDate(+m[1], +m[2], +m[3], false);
        }
        // ISO monthly: 2026-08
        if ((m = s.match(/^(\d{4})[-\/](\d{1,2})$/))) {
            return this.validDate(+m[1], +m[2], 1, true);
        }
        // US daily: 8/18/2026 or 8/18/26
        if ((m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/))) {
            return this.validDate(this.expandYear(m[3]), +m[1], +m[2], false);
        }
        // Daily with month name: 18-Aug-25, 18 Aug 2025
        if ((m = s.match(/^(\d{1,2})[- ]([A-Za-z]{3,9})[- ,]+(\d{2}|\d{4})$/))) {
            const mi = this.monthIndex(m[2]);
            if (mi >= 0) return this.validDate(this.expandYear(m[3]), mi + 1, +m[1], false);
            return null;
        }
        // Daily with month name first: Aug 18, 2025 / Aug-18-25
        if ((m = s.match(/^([A-Za-z]{3,9})[- ](\d{1,2})[- ,]+(\d{2}|\d{4})$/))) {
            const mi = this.monthIndex(m[1]);
            if (mi >= 0) return this.validDate(this.expandYear(m[3]), mi + 1, +m[2], false);
            return null;
        }
        // Monthly with month name: Sep-25, Sep 2025, September 2026
        if ((m = s.match(/^([A-Za-z]{3,9})[- ](\d{2}|\d{4})$/))) {
            const mi = this.monthIndex(m[1]);
            if (mi >= 0) return this.validDate(this.expandYear(m[2]), mi + 1, 1, true);
            return null;
        }
        return null;
    },

    validDate: function(year, month, day, monthly) {
        if (year < 1900 || year > 2200) return null;
        if (month < 1 || month > 12) return null;
        if (day < 1 || day > 31) return null;
        return { year, month, day, monthly };
    },

    // Excel stores dates as serial numbers (days since 1899-12-30). Only used
    // when EVERY x value is a plausible serial, so plain integers stay categories.
    excelSerialToDate: function(n) {
        const ms = (n - 25569) * 86400 * 1000; // 25569 = serial for 1970-01-01
        const d = new Date(ms);
        return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(), monthly: false };
    },

    parseData: function(text, headerChoice) {
        const result = {
            ok: false,
            error: null,
            warnings: [],
            hasHeaders: false,
            headers: [],        // series names (without x column)
            xRaw: [],           // original x cell text per row
            xDates: null,       // per-row {year, month, day} or null when xKind === 'category'
            xKind: 'category',  // 'daily' | 'monthly' | 'category'
            rows: [],           // rows of numeric values (null = blank/bad cell)
            badCells: 0
        };

        const rawLines = text.replace(/^﻿/, '').replace(/\r\n?/g, '\n').split('\n');
        const lines = rawLines.filter(l => l.trim() !== '');
        if (lines.length === 0) {
            result.error = 'No data found.';
            return result;
        }

        const delim = this.detectDelimiter(lines);
        let table = lines.map(l => this.splitLine(l, delim).map(c => c.trim()));

        // NGI website exports (long format) are auto-pivoted to wide format
        const ngiDet = table.length > 1 ? this.detectNgiExport(table[0]) : null;
        if (ngiDet && ngiDet.metrics.length) {
            const explicit = ngiDet.metrics.find(m => m.col === this.ngiMetric) || null;
            const metric = explicit || ngiDet.metrics[0];
            const pivot = this.pivotNgiExport(table, ngiDet, metric);
            table = pivot.table;
            result.ngiExport = {
                kind: ngiDet.kind,
                metrics: ngiDet.metrics.map(m => ({ col: m.col, label: m.label })),
                metric: metric.col,
                metricLabel: metric.label,
                locations: pivot.locs,
                dates: pivot.dates,
                contracts: pivot.contracts,
                // Forward exports carry BOTH fixed and basis columns; the CSV
                // can't say which one is wanted, so the user must pick.
                needsChoice: ngiDet.schema === 'forward' && ngiDet.metrics.length > 1 && !explicit
            };
            if (pivot.dupes > 0) {
                result.warnings.push(`${pivot.dupes} duplicate location/date row(s) in the export — the last value was used.`);
            }
            headerChoice = true; // the pivoted table always has a header row
        }

        // Column count = the most common row width
        const widthCounts = {};
        table.forEach(r => { widthCounts[r.length] = (widthCounts[r.length] || 0) + 1; });
        const numCols = +Object.keys(widthCounts).reduce((a, b) => widthCounts[a] >= widthCounts[b] ? a : b);
        if (numCols < 2) {
            result.error = 'Need at least two columns: one for the x-axis and one for values. Check that the data is tab- or comma-separated.';
            return result;
        }
        if (numCols - 1 > this.MAX_SERIES) {
            result.error = `Too many columns: found ${numCols - 1} series, the limit is ${this.MAX_SERIES}.`;
            return result;
        }

        // Normalize row widths (pad short rows, trim long ones) with warnings
        let raggedRows = 0;
        table = table.map((r) => {
            if (r.length === numCols) return r;
            raggedRows++;
            const fixed = r.slice(0, numCols);
            while (fixed.length < numCols) fixed.push('');
            return fixed;
        });
        if (raggedRows > 0) {
            result.warnings.push(`${raggedRows} row(s) did not have ${numCols} columns; missing cells were treated as blank.`);
        }

        // Header detection: if any value column in row 1 is non-numeric, it's a header row
        let hasHeaders;
        if (headerChoice === null || headerChoice === undefined) {
            const firstRowVals = table[0].slice(1);
            hasHeaders = firstRowVals.some(c => c !== '' && this.parseNumber(c).bad);
        } else {
            hasHeaders = headerChoice;
        }
        result.hasHeaders = hasHeaders;

        let dataRows = hasHeaders ? table.slice(1) : table;
        if (hasHeaders) {
            result.headers = table[0].slice(1).map((h, i) => h || `Series ${i + 1}`);
        } else {
            result.headers = Array.from({ length: numCols - 1 }, (_, i) => `Series ${i + 1}`);
        }

        if (dataRows.length === 0) {
            result.error = 'No data rows found below the header row.';
            return result;
        }
        if (dataRows.length > this.MAX_ROWS) {
            result.warnings.push(`Data has ${dataRows.length} rows; only the first ${this.MAX_ROWS} were used.`);
            dataRows = dataRows.slice(0, this.MAX_ROWS);
        }

        // Parse x column: dates only if EVERY non-empty x value parses as a date
        const xCells = dataRows.map(r => r[0]);
        let xDates = xCells.map(c => this.parseDateCell(c));
        let allDates = xDates.every(d => d !== null);

        // Excel serial number fallback (all x values plausible serials)
        if (!allDates && xCells.every(c => /^\d{5}$/.test(String(c).trim()) && +c >= 20000 && +c <= 60000)) {
            xDates = xCells.map(c => this.excelSerialToDate(+String(c).trim()));
            allDates = true;
            result.warnings.push('X values looked like Excel date serial numbers and were converted to dates.');
        }

        if (allDates && xDates.length > 0) {
            result.xKind = xDates.every(d => d.monthly) ? 'monthly' : 'daily';
            // All dates on the 1st of a month (e.g. bidweek issues) = monthly data
            if (result.xKind === 'daily' && xDates.every(d => d.day === 1)) {
                result.xKind = 'monthly';
            }
            result.xDates = xDates;
        } else {
            result.xKind = 'category';
            const parsedCount = xDates.filter(d => d !== null).length;
            if (parsedCount > 0 && parsedCount >= dataRows.length * 0.5) {
                result.warnings.push('Some first-column values did not look like dates, so the x-axis is plotted as plain labels in the order given.');
            }
        }

        // Parse value cells
        let badCells = 0;
        const rows = dataRows.map(r => r.slice(1).map(c => {
            const p = this.parseNumber(c);
            if (p.bad) badCells++;
            return p.value;
        }));
        result.badCells = badCells;
        if (badCells > 0) {
            result.warnings.push(`${badCells} cell(s) could not be read as numbers and were left blank.`);
        }

        // Drop rows where every value is blank
        const keep = rows.map((r, i) => ({ r, i })).filter(o => o.r.some(v => v !== null));
        const droppedEmpty = rows.length - keep.length;
        if (droppedEmpty > 0) {
            result.warnings.push(`${droppedEmpty} row(s) had no numeric values and were skipped.`);
        }
        if (keep.length === 0) {
            result.error = 'No numeric values found. Check that value columns contain numbers.';
            return result;
        }

        result.rows = keep.map(o => o.r);
        result.xRaw = keep.map(o => xCells[o.i]);
        if (result.xDates) result.xDates = keep.map(o => xDates[o.i]);

        // Sort by date if requested
        const sortEl = document.getElementById('sortByDate');
        if (result.xKind !== 'category' && sortEl && sortEl.checked) {
            const order = result.xDates
                .map((d, i) => ({ key: d.year * 10000 + d.month * 100 + d.day, i }))
                .sort((a, b) => a.key - b.key)
                .map(o => o.i);
            const isSorted = order.every((v, i) => v === i);
            if (!isSorted) {
                result.rows = order.map(i => result.rows[i]);
                result.xRaw = order.map(i => result.xRaw[i]);
                result.xDates = order.map(i => result.xDates[i]);
                result.warnings.push('Rows were re-sorted into date order.');
            }
        }

        // Duplicate x values
        const seen = new Set();
        let dupes = 0;
        result.xRaw.forEach(x => {
            const k = String(x).trim().toLowerCase();
            if (seen.has(k)) dupes++;
            seen.add(k);
        });
        if (dupes > 0) {
            result.warnings.push(`${dupes} duplicate ${result.xKind === 'category' ? 'label(s)' : 'date(s)'} in the first column — both rows are plotted.`);
        }

        result.ok = true;
        return result;
    },

    // Display label for one x position, e.g. "18-Aug-2026" or "Aug 2026"
    xDisplayLabel: function(idx, data) {
        const d = data || this.chartData || this.parsed;
        if (d.xKind === 'category') return String(d.xRaw[idx]);
        const dt = d.xDates[idx];
        const mon = this.MONTHS[dt.month - 1];
        if (d.xKind === 'monthly') return `${mon} ${dt.year}`;
        return `${dt.day}-${mon}-${dt.year}`;
    },

    // ==================== PREVIEW & SERIES LIST ====================

    renderPreview: function() {
        const section = document.getElementById('previewSection');
        const summary = document.getElementById('previewSummary');
        const warningsEl = document.getElementById('previewWarnings');
        section.classList.remove('hidden');
        warningsEl.innerHTML = '';

        const p = this.parsed;
        if (!p || !p.ok) {
            summary.innerHTML = `<span class="text-red-600 font-semibold">✗ ${p ? p.error : 'Could not read the data.'}</span>`;
            document.getElementById('seriesListSection').classList.add('hidden');
            return;
        }

        const xDesc = p.xKind === 'category' ? 'labels' : (p.xKind === 'monthly' ? 'monthly dates' : 'dates');
        const first = this.xDisplayLabel(0, p);
        const last = this.xDisplayLabel(p.rows.length - 1, p);
        const range = p.rows.length > 1 ? ` <span class="text-gray-500">(${this.escapeHtml(first)} to ${this.escapeHtml(last)})</span>` : '';
        summary.innerHTML = `<span class="text-green-700 font-semibold">✓ Found ${p.headers.length} series × ${p.rows.length} rows</span> <span class="text-gray-500">(x-axis: ${xDesc})</span>${range}`;

        if (p.ngiExport) {
            const n = p.ngiExport;
            let contractInfo = '';
            if (n.kind === 'Forward' && n.contracts.length === 1) {
                contractInfo = `, ${this.escapeHtml(this.formatContractMonth(n.contracts[0]))} contract`;
            } else if (n.kind === 'Forward' && n.contracts.length > 1) {
                contractInfo = `, rolling prompt (${n.contracts.length} contracts)`;
            }
            if (n.needsChoice) {
                summary.insertAdjacentHTML('afterbegin',
                    `<div class="text-amber-700 font-medium mb-0.5">NGI website export (${n.kind}): has both Fixed and Basis prices — <strong>choose one</strong> under NGI Export Value${contractInfo}</div>`);
            } else {
                summary.insertAdjacentHTML('afterbegin',
                    `<div class="text-[#003A50] font-medium mb-0.5">NGI website export (${n.kind}): charting <strong>${this.escapeHtml(n.metricLabel)}</strong>${contractInfo}</div>`);
            }
        }

        p.warnings.forEach(w => {
            warningsEl.insertAdjacentHTML('beforeend', `<div>⚠ ${this.escapeHtml(w)}</div>`);
        });
    },

    escapeHtml: function(s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    },

    buildSeriesList: function() {
        const section = document.getElementById('seriesListSection');
        const p = this.parsed;
        if (!p || !p.ok) {
            section.classList.add('hidden');
            this.seriesList = [];
            return;
        }
        section.classList.remove('hidden');

        // Keep existing color/style/role choices where names still match.
        // Default roles: last series = line (right axis), the rest = stacked bars.
        const old = this.seriesList;
        this.seriesList = p.headers.map((name, idx) => {
            const prev = old.find(s => s.name === name);
            return prev || {
                name,
                color: this.colorPalette[idx % this.colorPalette.length],
                style: 'solid',
                role: (p.headers.length > 1 && idx === p.headers.length - 1) ? 'line' : 'bar'
            };
        });
        this.renderSeriesList();
    },

    renderSeriesList: function() {
        const container = document.getElementById('seriesListContainer');
        container.innerHTML = '';

        this.seriesList.forEach(item => {
            const div = document.createElement('div');
            div.className = 'bg-white p-2 border border-gray-300 text-sm';

            const topRow = document.createElement('div');
            topRow.className = 'flex justify-between items-center';
            const label = document.createElement('span');
            label.className = 'truncate pr-2 text-xs font-medium';
            label.textContent = item.name;
            topRow.appendChild(label);

            const bottomRow = document.createElement('div');
            bottomRow.className = 'flex items-center gap-2 mt-1';

            const colorInput = document.createElement('input');
            colorInput.type = 'color';
            colorInput.value = item.color;
            colorInput.className = 'color-picker';
            colorInput.addEventListener('input', (e) => {
                item.color = e.target.value;
                this.rerenderChart();
            });

            const roleSelect = document.createElement('select');
            roleSelect.className = 'px-1 py-0.5 border border-gray-300 text-xs bg-white flex-1';
            [['bar', 'Stacked Bar (left axis)'], ['line', 'Line (right axis)']].forEach(([val, text]) => {
                const opt = document.createElement('option');
                opt.value = val;
                opt.textContent = text;
                if (val === item.role) opt.selected = true;
                roleSelect.appendChild(opt);
            });
            roleSelect.addEventListener('change', (e) => {
                item.role = e.target.value;
                this.renderSeriesList();   // show/hide the line-style dropdown
                this.rerenderChart();
            });

            bottomRow.appendChild(colorInput);
            bottomRow.appendChild(roleSelect);

            if (item.role === 'line') {
                const styleSelect = document.createElement('select');
                styleSelect.className = 'px-1 py-0.5 border border-gray-300 text-xs bg-white';
                ['solid', 'dashed', 'dotted'].forEach(s => {
                    const opt = document.createElement('option');
                    opt.value = s;
                    opt.textContent = s.charAt(0).toUpperCase() + s.slice(1);
                    if (s === item.style) opt.selected = true;
                    styleSelect.appendChild(opt);
                });
                styleSelect.addEventListener('change', (e) => {
                    item.style = e.target.value;
                    this.rerenderChart();
                });
                bottomRow.appendChild(styleSelect);
            }
            div.appendChild(topRow);
            div.appendChild(bottomRow);
            container.appendChild(div);
        });
    },

    // ==================== GENERATE ====================

    handleGenerate: function() {
        if (!this.rawText.trim()) {
            alert('Add your data first: click Input/Edit Data or upload a CSV.');
            return;
        }
        if (!this.parsed || !this.parsed.ok) {
            alert('The data could not be read: ' + ((this.parsed && this.parsed.error) || 'unknown format') + '\n\nClick Input/Edit Data to check the layout: first column = dates or labels, each other column = one series.');
            return;
        }
        if (this.parsed.ngiExport && this.parsed.ngiExport.needsChoice) {
            alert('This NGI forward export contains both Fixed and Basis prices, so the tool cannot know which one you want.\n\nPick one in the "NGI Export Value" dropdown, then Generate.');
            return;
        }

        // Freeze a copy of the parsed data for the chart, so further edits in
        // the paste box don't disturb the rendered chart until next Generate.
        this.chartData = {
            xKind: this.parsed.xKind,
            xRaw: this.parsed.xRaw.slice(),
            xDates: this.parsed.xDates ? this.parsed.xDates.slice() : null,
            rows: this.parsed.rows.map(r => r.slice()),
            headers: this.parsed.headers.slice(),
            ngiExport: this.parsed.ngiExport || null
        };

        this.log(`Generating chart: ${this.chartData.headers.length} series × ${this.chartData.rows.length} rows (x-axis: ${this.chartData.xKind}).`);

        // Single-series charts hide the legend by default (user choice wins once touched)
        if (!this.userTouchedHideLegend) {
            const hide = this.chartData.headers.length === 1;
            document.getElementById('hideLegendCheckbox').checked = hide;
            this.syncLegendPaddingDefault(hide);
        }

        // Date-part checkboxes only make sense for date axes
        const isDates = this.chartData.xKind !== 'category';
        ['hideYearCheckbox', 'hideMonthCheckbox'].forEach(id => {
            const el = document.getElementById(id);
            el.disabled = !isDates;
            if (!isDates) el.checked = false;
        });
        const hideDayEl = document.getElementById('hideDayCheckbox');
        hideDayEl.disabled = this.chartData.xKind !== 'daily';
        if (hideDayEl.disabled) hideDayEl.checked = false;
        ['showYearUnderJanCheckbox', 'showYearUnderJanuaryCheckbox'].forEach(id => {
            const subEl = document.getElementById(id);
            if (!isDates) { subEl.checked = false; subEl.disabled = true; }
            else subEl.disabled = !document.getElementById('hideYearCheckbox').checked;
        });

        // Date-based interval modes only apply when the x-axis is dates;
        // weekly/monthly need day-level dates
        const modeSelect = document.getElementById('xAxisLabelMode');
        Array.from(modeSelect.options).forEach(opt => {
            if (opt.value === 'weekly' || opt.value === 'monthly') {
                opt.disabled = this.chartData.xKind !== 'daily';
            } else if (opt.value === 'yearly') {
                opt.disabled = !isDates;
            }
        });
        if (modeSelect.selectedOptions[0] && modeSelect.selectedOptions[0].disabled) {
            modeSelect.value = 'auto';
        }

        this.setupXRangeDropdowns();
        document.getElementById('xRangeSection').classList.remove('hidden');
        this.customTitle = null;
        this.setupTitleEditor();
        this.customLegendLabels = {};
        this.setupLegendEditor();
        this.customNote = null;
        this.customSource = null;
        this.setupNoteSource();
        this.customYMin = null;
        this.customYMax = null;
        document.getElementById('yAxisMin').value = '';
        document.getElementById('yAxisMax').value = '';
        this.customYMinRight = null;
        this.customYMaxRight = null;
        document.getElementById('yAxisRightMin').value = '';
        document.getElementById('yAxisRightMax').value = '';
        document.getElementById('chartControlsSection').classList.remove('hidden');
        document.getElementById('downloadBtn').classList.remove('hidden');
        const csvHelp = document.getElementById('ngiCsvHelp');
        if (csvHelp) csvHelp.classList.add('hidden');

        // One-time note that "Trim start for exact intervals" defaults to on,
        // shown on the X-Axis group header, fading out after a few seconds.
        if (!this.trimNoteShown && document.getElementById('trimForIntervalCheckbox').checked) {
            this.trimNoteShown = true;
            const trimNote = document.getElementById('trimDefaultNote');
            if (trimNote) {
                trimNote.classList.remove('hidden');
                setTimeout(() => trimNote.classList.add('opacity-0'), 45000);
                setTimeout(() => trimNote.classList.add('hidden'), 45800);
            }
        }

        // Restore customizations staged by Load Previous (after the resets above)
        if (this.pendingSettings) {
            this.applySavedSettings(this.pendingSettings);
            this.pendingSettings = null;
            this.log('Re-applied your saved settings from the previous session.');
        }

        this.renderChart();
        this.saveInput();
        this.log(`Chart rendered: <strong>750×${this.PAGE_CFG.chart_height || 400}px</strong> display • Exports as <strong>${this.PAGE_CFG.export_width || 1656}×${this.PAGE_CFG.export_height || 894}px WebP</strong>`);
    },

    // Control ids captured into the saved-settings snapshot. Ids that don't
    // exist on a given page are skipped, so the list is shared across tools.
    SETTING_CONTROL_IDS: [
        'hideYearCheckbox', 'hideMonthCheckbox', 'hideDayCheckbox',
        'showYearUnderJanCheckbox', 'showYearUnderJanuaryCheckbox',
        'connectGapsCheckbox', 'hideLegendCheckbox', 'trimForIntervalCheckbox',
        'xAxisLabelMode', 'xAxisPadding', 'legendPadding',
        'xRangeFrom', 'xRangeTo',
        'yAxisLabelInput', 'yAxisPrefix', 'yAxisDecimals',
        'yAxisLabelRightInput', 'yAxisLeftDivisor', 'yAxisLeftDecimals',
        'aspectRatioSelect'
    ],

    captureSettings: function() {
        const controls = {};
        this.SETTING_CONTROL_IDS.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            controls[id] = (el.type === 'checkbox') ? el.checked : el.value;
        });
        return {
            controls,
            customTitle: this.customTitle,
            customLegendLabels: this.customLegendLabels,
            customNote: this.customNote,
            customSource: this.customSource,
            customYMin: this.customYMin,
            customYMax: this.customYMax,
            customYMinRight: (this.customYMinRight !== undefined) ? this.customYMinRight : null,
            customYMaxRight: (this.customYMaxRight !== undefined) ? this.customYMaxRight : null,
            seriesList: this.seriesList
        };
    },

    // Re-apply a saved settings snapshot after Generate has reset everything.
    applySavedSettings: function(s) {
        if (!s) return;
        if (Array.isArray(s.seriesList)) {
            // Merge by series name so renamed/added columns keep sane defaults
            this.seriesList = this.seriesList.map(item => {
                const prev = s.seriesList.find(p => p.name === item.name);
                return prev ? Object.assign({}, item, prev) : item;
            });
            this.renderSeriesList();
        }
        this.customTitle = s.customTitle || null;
        this.customLegendLabels = s.customLegendLabels || {};
        this.customNote = (s.customNote !== undefined) ? s.customNote : null;
        this.customSource = (s.customSource !== undefined) ? s.customSource : null;
        this.customYMin = (s.customYMin !== undefined) ? s.customYMin : null;
        this.customYMax = (s.customYMax !== undefined) ? s.customYMax : null;
        if (this.customYMinRight !== undefined) {
            this.customYMinRight = (s.customYMinRight !== undefined) ? s.customYMinRight : null;
            this.customYMaxRight = (s.customYMaxRight !== undefined) ? s.customYMaxRight : null;
        }

        const controls = s.controls || {};
        Object.keys(controls).forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            if (el.type === 'checkbox') {
                el.checked = !!controls[id];
            } else if (el.tagName === 'SELECT') {
                // Only restore a select if the saved option still exists
                const has = Array.from(el.options).some(o => o.value === String(controls[id]));
                if (has) el.value = controls[id];
            } else {
                el.value = controls[id];
            }
        });
        if (controls.aspectRatioSelect !== undefined && document.getElementById('aspectRatioSelect')) {
            this.applyAspect();
        }

        // Repopulate the editor fields from the restored custom values
        this.setupTitleEditor();
        this.setupLegendEditor();
        this.setupNoteSource();
        if (this.customYMin !== null) document.getElementById('yAxisMin').value = this.customYMin;
        if (this.customYMax !== null) document.getElementById('yAxisMax').value = this.customYMax;
        const rMinEl = document.getElementById('yAxisRightMin');
        const rMaxEl = document.getElementById('yAxisRightMax');
        if (rMinEl && this.customYMinRight !== null && this.customYMinRight !== undefined) rMinEl.value = this.customYMinRight;
        if (rMaxEl && this.customYMaxRight !== null && this.customYMaxRight !== undefined) rMaxEl.value = this.customYMaxRight;
    },

    saveInput: function() {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
                text: this.rawText,
                firstRowHeaders: document.getElementById('firstRowHeaders').checked,
                sortByDate: document.getElementById('sortByDate').checked,
                settings: this.captureSettings()
            }));
        } catch (e) { /* storage full or unavailable — not critical */ }
        this.updateLoadPreviousButton();
    },

    getSavedInput: function() {
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY);
            if (!raw) return null;
            const saved = JSON.parse(raw);
            if (!saved.text || !saved.text.trim()) return null;
            return saved;
        } catch (e) { return null; /* corrupt saved state */ }
    },

    updateLoadPreviousButton: function() {
        document.getElementById('loadPreviousBtn').disabled = !this.getSavedInput();
    },

    loadPrevious: function() {
        const saved = this.getSavedInput();
        if (!saved) {
            this.log('No previous dataset saved in this browser.');
            return;
        }
        document.getElementById('firstRowHeaders').checked = !!saved.firstRowHeaders;
        document.getElementById('sortByDate').checked = saved.sortByDate !== false;
        this.userTouchedHeaderCheckbox = true; // trust the saved choice
        this.rawText = saved.text;
        // Stage the saved customizations; they are re-applied after the next
        // Generate (which always resets settings first).
        this.pendingSettings = saved.settings || null;
        this.handleInputChanged(true);
        this.log('Loaded your previous dataset from this browser. Check the preview, then Generate Chart'
            + (this.pendingSettings ? ' — your previous title, axis and series settings will be re-applied.' : '.'));
    },

    // ==================== CHART ====================

    setupXRangeDropdowns: function() {
        const fromSelect = document.getElementById('xRangeFrom');
        const toSelect = document.getElementById('xRangeTo');
        fromSelect.innerHTML = '';
        toSelect.innerHTML = '';

        const n = this.chartData.rows.length;
        for (let idx = 0; idx < n; idx++) {
            const label = this.xDisplayLabel(idx, this.chartData);
            const optFrom = document.createElement('option');
            optFrom.value = String(idx);
            optFrom.textContent = label;
            fromSelect.appendChild(optFrom);

            const optTo = document.createElement('option');
            optTo.value = String(idx);
            optTo.textContent = label;
            toSelect.appendChild(optTo);
        }
        fromSelect.value = '0';
        toSelect.value = String(n - 1);
    },

    getXRange: function() {
        const total = this.chartData.rows.length;
        let fromIdx = parseInt(document.getElementById('xRangeFrom').value, 10);
        let toIdx = parseInt(document.getElementById('xRangeTo').value, 10);
        if (isNaN(fromIdx) || fromIdx < 0) fromIdx = 0;
        if (isNaN(toIdx) || toIdx >= total) toIdx = total - 1;
        if (fromIdx > toIdx) [fromIdx, toIdx] = [toIdx, fromIdx];
        return { fromIdx, toIdx };
    },

    getDefaultTitle: function() {
        const data = this.chartData;
        const ngi = data && data.ngiExport;
        if (!ngi) return "NGI's Natural Gas Prices";

        // NGI website exports get house-style titles: single location names
        // the location (like the single-location generators), multi doesn't.
        const single = data.headers.length === 1 ? data.headers[0] + ' ' : '';
        const metric = ngi.metric;

        if (ngi.kind === 'Forward') {
            // Name the contract: a single contract month, or "Prompt Month"
            // when the export rolls through contracts over time
            const contracts = ngi.contracts || [];
            const contractPart = contracts.length === 1
                ? this.formatContractMonth(contracts[0]) + ' '
                : (contracts.length > 1 ? 'Prompt Month ' : '');
            const suffix = metric === 'basis_prices' ? 'Forward Basis Prices' : 'Forward Fixed Prices';
            return `NGI's ${single}${contractPart}${suffix}`;
        }
        const period = ngi.kind === 'Bidweek' ? 'Bidweek' : 'Daily';
        if (metric === 'volume') return `NGI's ${single}${period} Trade Volume`;
        if (metric === 'deals') return `NGI's ${single}${period} Deal Count`;
        const base = single
            ? `NGI's ${single}${period} Gas Price`
            : `NGI's ${period} Natural Gas Prices`;
        if (metric === 'low') return `${base} (Low)`;
        if (metric === 'high') return `${base} (High)`;
        return base;
    },

    setupTitleEditor: function() {
        const twoLine = document.getElementById('twoLineTitleCheckbox').checked;
        if (this.customTitle) {
            document.getElementById('titleLine1').value = this.customTitle.line1;
            document.getElementById('titleLine2').value = this.customTitle.line2 || '';
        } else {
            document.getElementById('titleLine1').value = this.getDefaultTitle();
            document.getElementById('titleLine2').value = '';
        }
        document.getElementById('titleLine2').classList.toggle('hidden', !twoLine);
    },

    applyTitle: function() {
        const twoLine = document.getElementById('twoLineTitleCheckbox').checked;
        const line1 = document.getElementById('titleLine1').value.trim();
        const line2 = twoLine ? document.getElementById('titleLine2').value.trim() : '';
        this.customTitle = { line1, line2 };
        this.rerenderChart();
        this.log('Title updated.');
    },

    getTitleText: function() {
        if (this.customTitle) {
            if (this.customTitle.line2) return this.customTitle.line1 + '\n' + this.customTitle.line2;
            return this.customTitle.line1;
        }
        return this.getDefaultTitle();
    },

    styleToEcharts: function(style) {
        if (style === 'dashed') return [10, 6];
        if (style === 'dotted') return [4, 4];
        return 'solid';
    },

    getLegendIcon: function(style) {
        return this.legendIcons[style] || this.legendIcons.solid;
    },

    getYFormat: function() {
        const prefix = document.getElementById('yAxisPrefix').value || '';
        let decimals = parseInt(document.getElementById('yAxisDecimals').value, 10);
        if (isNaN(decimals) || decimals < 0) decimals = 3;
        if (decimals > 6) decimals = 6;
        return { prefix, decimals };
    },

    // Aspect toggle (Entropic pages): swaps display height + export size,
    // resizes the canvas and re-renders. Options come from the route config.
    applyAspect: function() {
        const sel = document.getElementById('aspectRatioSelect');
        if (!sel || !sel.selectedOptions.length) return;
        const opt = sel.selectedOptions[0];
        this.PAGE_CFG.chart_height = parseInt(opt.dataset.chartHeight, 10);
        this.PAGE_CFG.export_width = parseInt(opt.dataset.exportWidth, 10);
        this.PAGE_CFG.export_height = parseInt(opt.dataset.exportHeight, 10);
        document.getElementById('chart').style.height = this.PAGE_CFG.chart_height + 'px';
        if (this.chart) {
            this.chart.resize();
            this.rerenderChart();
        }
        this.log(`Aspect set: <strong>750×${this.PAGE_CFG.chart_height}px</strong> display • exports <strong>${this.PAGE_CFG.export_width}×${this.PAGE_CFG.export_height}px</strong>`);
    },

    getLeftDivisor: function() {
        const sel = document.getElementById('yAxisLeftDivisor');
        const v = sel ? parseFloat(sel.value) : 1;
        return (isNaN(v) || v <= 0) ? 1 : v;
    },

    getLeftDecimals: function() {
        let d = parseInt(document.getElementById('yAxisLeftDecimals').value, 10);
        if (isNaN(d) || d < 0) d = 1;
        if (d > 6) d = 6;
        return d;
    },

    applyYAxisRight: function() {
        const minRaw = document.getElementById('yAxisRightMin').value.trim();
        const maxRaw = document.getElementById('yAxisRightMax').value.trim();
        this.customYMinRight = minRaw === '' ? null : parseFloat(minRaw);
        this.customYMaxRight = maxRaw === '' ? null : parseFloat(maxRaw);
        if (this.customYMinRight !== null && isNaN(this.customYMinRight)) this.customYMinRight = null;
        if (this.customYMaxRight !== null && isNaN(this.customYMaxRight)) this.customYMaxRight = null;
        this.rerenderChart();
    },

    resetYAxisRight: function() {
        this.customYMinRight = null;
        this.customYMaxRight = null;
        document.getElementById('yAxisRightMin').value = '';
        document.getElementById('yAxisRightMax').value = '';
        this.rerenderChart();
    },

    renderChart: function() {
        if (!this.chartData) return;

        const chartDom = document.getElementById('chart');
        if (this.chart) this.chart.dispose();
        this.chart = echarts.init(chartDom);

        const data = this.chartData;
        const isDates = data.xKind !== 'category';
        const hideYear = isDates && document.getElementById('hideYearCheckbox').checked;
        const hideMonth = isDates && document.getElementById('hideMonthCheckbox').checked;
        const hideDay = data.xKind === 'daily' && document.getElementById('hideDayCheckbox').checked;
        // Year-under-label mode: 'first' = first visible label of each year,
        // 'january' = only under January labels, null = off. Either/or.
        const showYearUnder =
            (hideYear && document.getElementById('showYearUnderJanCheckbox').checked) ? 'first'
            : (hideYear && document.getElementById('showYearUnderJanuaryCheckbox').checked) ? 'january'
            : null;
        const showYearUnderJan = showYearUnder !== null;
        const compact = hideYear || hideMonth || hideDay; // any simplification = horizontal labels
        const connectGaps = document.getElementById('connectGapsCheckbox').checked;
        const hideLegend = document.getElementById('hideLegendCheckbox').checked;
        const yAxisLabel = (document.getElementById('yAxisLabelInput').value || '').trim() || 'Million Dekatherm';
        const yAxisLabelRight = (document.getElementById('yAxisLabelRightInput').value || '').trim() || '$US/MMBtu';
        const yFmt = this.getYFormat();

        // Note / Source lines are optional — blank input hides the line, and
        // the bottom padding shrinks to match so no dead space is reserved.
        const noteText = this.customNote !== null ? this.customNote : this.getDefaultNote();
        const sourceText = this.customSource !== null ? this.customSource : this.getDefaultSource();
        const footerLines = (noteText ? 1 : 0) + (sourceText ? 1 : 0);

        const titleText = this.getTitleText();
        const isTwoLine = titleText.includes('\n');

        let { fromIdx, toIdx } = this.getXRange();
        const labelMode = document.getElementById('xAxisLabelMode').value;
        const exactIntervals = document.getElementById('trimForIntervalCheckbox').checked;
        if (exactIntervals) {
            const newFrom = this.trimStartForExactIntervals(fromIdx, toIdx, labelMode, data);
            const trimmed = newFrom - fromIdx;
            const msg = trimmed > 0
                ? `Trimmed ${trimmed} point(s) from the start (now begins ${this.xDisplayLabel(newFrom, data)}) for exact label intervals.`
                : null;
            if (msg !== this.lastTrimMsg && msg) this.log(msg);
            this.lastTrimMsg = msg;
            fromIdx = newFrom;
        } else {
            this.lastTrimMsg = null;
        }
        const labels = [];
        for (let i = fromIdx; i <= toIdx; i++) labels.push(this.xDisplayLabel(i, data));
        const dateParts = data.xDates ? data.xDates.slice(fromIdx, toIdx + 1) : null;

        // Build series with per-item colors, styles and roles. Bars stack on
        // the left axis; lines draw on the right axis. If the data is bars-only
        // or lines-only, everything uses the left axis.
        const roles = data.headers.map((name, idx) => {
            const item = this.seriesList[idx];
            return item ? item.role : 'bar';
        });
        const hasBars = roles.includes('bar');
        const hasLines = roles.includes('line');
        const useRightAxis = hasBars && hasLines;
        const leftDivisor = this.getLeftDivisor();
        const leftDecimals = this.getLeftDecimals();
        const series = data.headers.map((name, idx) => {
            const item = this.seriesList[idx];
            const seriesColor = item ? item.color : this.colorPalette[idx % this.colorPalette.length];
            const displayName = this.customLegendLabels[name] || name;
            const values = [];
            for (let r = fromIdx; r <= toIdx; r++) {
                let v = data.rows[r][idx];
                // Bar values honor the left-axis Units divisor (e.g. dth -> million dth)
                if (roles[idx] === 'bar' && v !== null && v !== undefined && !isNaN(v)) v = v / leftDivisor;
                values.push(v);
            }
            if (roles[idx] === 'bar') {
                return {
                    name: displayName,
                    type: 'bar',
                    stack: 'total',
                    barCategoryGap: '25%',
                    yAxisIndex: 0,
                    data: values,
                    color: seriesColor,
                    itemStyle: { color: seriesColor }
                };
            }
            const lineStyle = item ? item.style : 'solid';
            return {
                name: displayName,
                type: 'line',
                yAxisIndex: useRightAxis ? 1 : 0,
                z: 10,
                data: values,
                color: seriesColor,
                itemStyle: { color: seriesColor },
                lineStyle: {
                    color: seriesColor,
                    width: 3,
                    type: this.styleToEcharts(lineStyle)
                },
                symbol: 'none',
                connectNulls: connectGaps
            };
        });

        // Y-axis bounds. Left axis fits the stacked bar totals (bars start at
        // 0); the Range override applies to the left axis. The right axis gets
        // its own nice interval, then its division count is matched to the
        // left axis so right-axis labels sit exactly on the left gridlines.
        const allValues = series.flatMap(s => s.data).filter(v => v !== null && v !== undefined && !isNaN(v));
        if (allValues.length === 0) {
            this.log('<span class="text-red-400">No values available for the selected x-axis range.</span>');
            return;
        }
        const lineValues = series
            .filter((s, i) => roles[i] === 'line')
            .flatMap(s => s.data)
            .filter(v => v !== null && v !== undefined && !isNaN(v));
        let leftValues;
        if (hasBars) {
            // Stacked totals per x position; positive and negative stacks tracked separately
            const barSeries = series.filter((s, i) => roles[i] === 'bar');
            leftValues = [0];
            const n = toIdx - fromIdx + 1;
            for (let i = 0; i < n; i++) {
                let pos = 0, neg = 0, any = false;
                barSeries.forEach(s => {
                    const v = s.data[i];
                    if (v !== null && v !== undefined && !isNaN(v)) {
                        any = true;
                        if (v >= 0) pos += v; else neg += v;
                    }
                });
                if (any) { leftValues.push(pos); leftValues.push(neg); }
            }
        } else {
            leftValues = lineValues;
        }
        const dataMin = Math.min(...leftValues);
        const dataMax = Math.max(...leftValues);
        const effectiveMin = this.customYMin !== null ? this.customYMin : dataMin;
        const effectiveMax = this.customYMax !== null ? this.customYMax : dataMax;
        const interval = this.calculateYAxisInterval(effectiveMin, effectiveMax);
        const adjustedMin = Math.floor(effectiveMin / interval) * interval;
        const adjustedMax = Math.ceil(effectiveMax / interval) * interval;

        // Right axis: nice interval, division count forced to match the left
        // so right-axis labels sit on the left gridlines. A manual right-axis
        // Range override wins; its interval keeps the same division count.
        let rAdjustedMin = 0, rAdjustedMax = 1, rInterval = 0.5;
        if (useRightAxis && lineValues.length) {
            const leftDivisions = Math.max(1, Math.round((adjustedMax - adjustedMin) / interval));
            const rMin = Math.min(...lineValues);
            const rMax = Math.max(...lineValues);
            rInterval = this.calculateYAxisInterval(rMin, rMax);
            const niceUp = (v) => {
                const exp = Math.floor(Math.log10(v));
                const base = v / Math.pow(10, exp);
                const next = base < 1.5 ? 2 : base < 3 ? 5 : 10;
                return next * Math.pow(10, exp);
            };
            let guard = 0;
            while (rInterval > 0 && guard++ < 20
                && Math.ceil((rMax - Math.floor(rMin / rInterval) * rInterval) / rInterval) > leftDivisions) {
                rInterval = niceUp(rInterval);
            }
            rAdjustedMin = Math.floor(rMin / rInterval) * rInterval;
            rAdjustedMax = rAdjustedMin + leftDivisions * rInterval;

            if (this.customYMinRight !== null || this.customYMaxRight !== null) {
                if (this.customYMinRight !== null) rAdjustedMin = this.customYMinRight;
                if (this.customYMaxRight !== null) rAdjustedMax = this.customYMaxRight;
                rInterval = (rAdjustedMax - rAdjustedMin) / leftDivisions;
            }
        }

        // Layout offsets adjust for one-line vs two-line title
        const dividerTop = isTwoLine ? 73 : 63;
        const legendTop = isTwoLine ? 80 : 70;
        const legendPadding = parseFloat(document.getElementById('legendPadding').value) || 0;
        // With the legend hidden the plot reclaims its row (matches the
        // single-location generators). Clamp so negative padding can't pull
        // the plot up into the legend text / title divider.
        const gridTopBase = (isTwoLine ? 28 : 24) - (hideLegend ? 6 : 0);
        const gridTopMin = hideLegend ? (isTwoLine ? 19 : 17) : (isTwoLine ? 22 : 20);
        const gridTop = Math.max(gridTopMin, gridTopBase + legendPadding) + '%';

        const legendData = series.map((s, idx) => {
            const item = this.seriesList[idx];
            if (roles[idx] === 'bar') {
                return { name: s.name, icon: 'rect', itemStyle: { color: s.color } };
            }
            const lineStyle = item ? item.style : 'solid';
            return {
                name: s.name,
                icon: this.getLegendIcon(lineStyle),
                itemStyle: { color: s.color }
            };
        });

        // Label formatting. For date axes the label is built from whichever
        // parts aren't hidden (day-Mon-year order); categories show raw text.
        const monthsRef = this.MONTHS;
        const formatXLabel = function(idxInRange) {
            if (!dateParts) return labels[idxInRange];
            const dt = dateParts[idxInRange];
            const parts = [];
            if (data.xKind === 'daily' && !hideDay) parts.push(String(dt.day));
            if (!hideMonth) parts.push(monthsRef[dt.month - 1]);
            if (!hideYear) parts.push(String(dt.year));
            return parts.join('-');
        };

        // Which x positions get a label, per the X-axis interval mode
        const labelIndexSet = this.calculateLabelIndices(dateParts, labels.length, labelMode, exactIntervals);
        const labelInterval = (index) => labelIndexSet.has(index);
        let labelFormatter = (value, index) => formatXLabel(index);
        if (showYearUnder && dateParts) {
            // 'first': year under the first visible label of each year;
            // 'january': year only under the first visible January label of each year
            const labelTextByIndex = {};
            const seenYears = new Set();
            [...labelIndexSet].sort((a, b) => a - b).forEach(i => {
                const base = formatXLabel(i);
                const yr = String(dateParts[i].year);
                const eligible = showYearUnder === 'january' ? dateParts[i].month === 1 : true;
                if (eligible && !seenYears.has(yr)) {
                    seenYears.add(yr);
                    labelTextByIndex[i] = base + '\n' + yr;
                } else {
                    labelTextByIndex[i] = base;
                }
            });
            labelFormatter = (value, index) => labelTextByIndex[index] || '';
        }

        // Simplified date labels read best level, not diagonal (matches the
        // forward charts): always level when stacking the year under labels,
        // and for monthly axes once any part is hidden. Full daily dates and
        // categories rotate 45.
        const rotateLabels = (showYearUnderJan || (data.xKind === 'monthly' && compact)) ? 0 : 45;
        const horizontal = rotateLabels === 0;

        // Left axis (bars): plain numbers with the left decimals setting.
        // Right axis (line): uses the Number format controls (prefix + decimals).
        const leftTickFormatter = function(value) {
            const text = value.toFixed(leftDecimals);
            if (value < 0) return `{red|${text}}`;
            return text;
        };
        const rightTickFormatter = function(value) {
            const text = yFmt.prefix + value.toFixed(yFmt.decimals);
            if (value < 0) return `{red|${text}}`;
            return text;
        };

        const graphics = [
            {
                type: 'image',
                // 25 puts the logo's right edge flush with the divider line
                // (700px rect centered on the 750px chart); NGI keeps 40.
                right: this.PAGE_CFG.logo_right || 40,
                // logo_center: vertically center the logo in the band between
                // the top edge and the divider line (Entropic house style)
                top: this.PAGE_CFG.logo_center
                    ? Math.max(6, Math.round((dividerTop - (this.PAGE_CFG.logo_height || 35)) / 2))
                    : 18,
                style: {
                    image: this.PAGE_CFG.logo_url || '/static/images/ngi_logo.png',
                    width: this.PAGE_CFG.logo_width || 70,
                    height: this.PAGE_CFG.logo_height || 35
                }
            },
            {
                type: 'group',
                left: 'center',
                top: dividerTop,
                children: [{
                    type: 'rect',
                    z: 100,
                    left: 'center',
                    top: 'middle',
                    shape: { width: 700, height: 1.4 },
                    style: { fill: '#003A50' }
                }]
            },
            {
                type: 'text',
                left: '3%',
                top: 'middle',
                rotation: Math.PI / 2,
                style: {
                    text: yAxisLabel,
                    font: 'bold 12px Arial',
                    fill: '#000'
                }
            },
            {
                type: 'text',
                right: '3%',
                top: 'middle',
                rotation: -Math.PI / 2,
                style: {
                    text: useRightAxis ? yAxisLabelRight : '',
                    font: 'bold 12px Arial',
                    fill: '#000'
                }
            }
        ];

        if (noteText) {
            graphics.push({
                type: 'text',
                left: '3.5%',
                bottom: sourceText ? '7%' : '1.6%',
                style: {
                    text: `{bold|Note:} ${noteText}`,
                    font: '12px Arial',
                    rich: { bold: { fontWeight: 'bold', fontSize: 12, fontFamily: 'Arial' } },
                    fill: '#000'
                }
            });
        }
        if (sourceText) {
            graphics.push({
                type: 'text',
                left: '3.5%',
                bottom: '1.6%',
                style: {
                    text: `{bold|Source:} ${sourceText}`,
                    font: '14px Arial',
                    rich: { bold: { fontWeight: 'bold', fontSize: 14, fontFamily: 'Arial' } },
                    fill: '#000'
                }
            });
        }

        const option = {
            color: series.map(s => s.color),
            toolbox: { show: false },
            textStyle: { fontFamily: 'Arial' },
            title: [{
                text: titleText,
                left: '3%',
                top: '10',
                textStyle: {
                    color: '#003A50',
                    fontWeight: 'bold',
                    fontSize: isTwoLine ? 21 : 24,
                    lineHeight: isTwoLine ? 24 : 28
                }
            }],
            legend: {
                show: !hideLegend,
                top: legendTop,
                left: 'center',
                textStyle: {
                    fontFamily: 'Arial',
                    fontSize: 13,
                    color: '#000'
                },
                itemWidth: 30,
                itemHeight: 14,
                itemGap: 16,
                data: legendData
            },
            graphic: graphics,
            tooltip: {
                trigger: 'axis',
                formatter: function(params) {
                    if (!params || !params.length) return '';
                    let html = `<strong>${params[0].axisValueLabel}</strong>`;
                    params.forEach(p => {
                        if (p.value !== null && p.value !== undefined) {
                            const valText = roles[p.seriesIndex] === 'bar'
                                ? p.value.toFixed(leftDecimals)
                                : yFmt.prefix + p.value.toFixed(yFmt.decimals);
                            html += `<br/><span style="display:inline-block;width:10px;height:10px;background:${p.color};margin-right:5px;border-radius:50%;"></span>${p.seriesName}: ${valText}`;
                        }
                    });
                    return html;
                }
            },
            grid: {
                left: '5.5%',
                right: '5.5%',
                top: gridTop,
                bottom: Math.max(0,
                    (footerLines === 2 ? (horizontal ? 9 : 11)
                        : footerLines === 1 ? (horizontal ? 5 : 7)
                        : (horizontal ? 2 : 3))
                    + (parseFloat(document.getElementById('xAxisPadding').value) || 0)) + '%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                boundaryGap: true,   // bars need a band per category
                data: labels,
                axisLabel: {
                    show: !(isDates && hideYear && hideMonth
                        && (data.xKind !== 'daily' || hideDay) && !showYearUnderJan),
                    rotate: rotateLabels,
                    interval: labelInterval,
                    formatter: labelFormatter,
                    verticalAlign: showYearUnderJan ? 'top' : (horizontal ? 'middle' : 'top'),
                    align: horizontal ? 'center' : 'right',
                    margin: horizontal ? 14 : 8,
                    fontSize: horizontal ? 14 : 13,
                    lineHeight: showYearUnderJan ? 18 : undefined,
                    fontWeight: 510,
                    color: 'black'
                },
                axisLine: {
                    lineStyle: { color: '#D3D3D3' }
                },
                axisTick: {
                    alignWithLabel: true,
                    interval: labelInterval,
                    lineStyle: { color: '#D3D3D3' }
                }
            },
            yAxis: [
                {
                    type: 'value',
                    min: adjustedMin,
                    max: adjustedMax,
                    interval: interval,
                    axisLabel: {
                        formatter: leftTickFormatter,
                        fontSize: 14,
                        fontWeight: 510,
                        color: 'black',
                        rich: {
                            red: {
                                color: 'red',
                                fontSize: 14,
                                fontWeight: 510
                            }
                        }
                    },
                    axisLine: {
                        lineStyle: { color: '#D3D3D3' }
                    },
                    axisTick: { show: false },
                    splitLine: {
                        lineStyle: {
                            color: '#D3D3D3',
                            width: 1
                        }
                    }
                },
                {
                    type: 'value',
                    show: useRightAxis,
                    min: rAdjustedMin,
                    max: rAdjustedMax,
                    interval: rInterval,
                    axisLabel: {
                        formatter: rightTickFormatter,
                        fontSize: 14,
                        fontWeight: 510,
                        color: 'black',
                        rich: {
                            red: {
                                color: 'red',
                                fontSize: 14,
                                fontWeight: 510
                            }
                        }
                    },
                    axisLine: {
                        lineStyle: { color: '#D3D3D3' }
                    },
                    axisTick: { show: false },
                    splitLine: { show: false }   // left axis owns the gridlines
                }
            ],
            series: series
        };

        this.chart.setOption(option);
    },

    rerenderChart: function() {
        if (!this.chartData || !this.chart) return;
        this.renderChart();
        this.saveInput();   // keep the saved settings snapshot current
    },

    // Hiding the legend defaults the legend padding to 5% (a little air under
    // the title divider); showing it defaults back to 0. Only the defaults
    // swap — a custom padding value the user dialed in is left alone.
    syncLegendPaddingDefault: function(legendHidden) {
        const slider = document.getElementById('legendPadding');
        const current = parseFloat(slider.value) || 0;
        if (legendHidden && current === 0) slider.value = '5';
        else if (!legendHidden && current === 5) slider.value = '0';
        else return;
        document.getElementById('legendPaddingValue').textContent = `${slider.value}%`;
    },

    /**
     * With "Trim start for exact intervals" on: how many points to drop from
     * the start of the visible range so labels land at perfectly even
     * intervals ending on the last date. Returns the adjusted fromIdx.
     * auto/short: make the point count divide evenly by the label step.
     * weekly: start on the first Monday; monthly/yearly: start on the first
     * month/year boundary. Never trims more than a third of the data.
     */
    trimStartForExactIntervals: function(fromIdx, toIdx, mode, data) {
        const n = toIdx - fromIdx + 1;
        if (n < 4 || mode === 'all') return fromIdx;
        const maxTrim = Math.max(3, Math.floor(n / 3));
        const guard = (idx) => (idx - fromIdx) <= maxTrim ? idx : fromIdx;
        const dates = data.xDates;

        if (mode === 'weekly' && dates && data.xKind === 'daily') {
            for (let i = fromIdx; i <= toIdx && i - fromIdx <= 10; i++) {
                const d = dates[i];
                if (new Date(Date.UTC(d.year, d.month - 1, d.day)).getUTCDay() === 1) return guard(i);
            }
            return fromIdx;
        }

        if (mode === 'monthly' && dates && data.xKind === 'daily') {
            if (dates[fromIdx].day === 1) return fromIdx;
            const key0 = dates[fromIdx].year * 100 + dates[fromIdx].month;
            for (let i = fromIdx + 1; i <= toIdx; i++) {
                if (dates[i].year * 100 + dates[i].month !== key0) return guard(i);
            }
            return fromIdx;
        }

        if (mode === 'yearly' && dates) {
            const first = dates[fromIdx];
            const isYearStart = first.month === 1 && (data.xKind !== 'daily' || first.day === 1);
            if (isYearStart) return fromIdx;
            for (let i = fromIdx + 1; i <= toIdx; i++) {
                if (dates[i].year !== first.year) return guard(i);
            }
            return fromIdx;
        }

        // auto / short: smallest trim where the remaining span divides evenly
        // by the step that span produces (formulas must match calculateLabelIndices)
        const INTERVALS = mode === 'short' ? 11 : 12;
        for (let trim = 0; trim <= maxTrim; trim++) {
            const span = n - trim - 1;
            const step = Math.ceil(span / INTERVALS);
            if (span % step === 0) return fromIdx + trim;
        }
        return fromIdx;
    },

    /**
     * Which x positions get an axis label (same modes as the Forward Curve /
     * Daily Spot chart pages). dateParts is the sliced per-point
     * {year, month, day} array, or null for a category axis — date-based
     * modes fall back to auto without dates. With exact=true, auto/short use
     * uniform stepping anchored at the last point (pairs with
     * trimStartForExactIntervals so the first point is on the grid too).
     */
    calculateLabelIndices: function(dateParts, count, mode, exact) {
        const n = count;
        if (n === 0) return new Set();
        const lastIdx = n - 1;
        if (n === 1) return new Set([0]);

        if (mode === 'all') {
            const all = new Set();
            for (let i = 0; i < n; i++) all.add(i);
            return all;
        }

        if (mode === 'short') {
            // Uniform integer step — avoids Math.round clustering on short ranges
            const TARGET = 12;
            if (n <= TARGET) {
                const all = new Set();
                for (let i = 0; i < n; i++) all.add(i);
                return all;
            }
            const step = Math.ceil(lastIdx / (TARGET - 1));
            const indices = new Set();
            if (exact) {
                // Anchor on the last point, step backwards — even gaps throughout
                for (let i = lastIdx; i >= 0; i -= step) indices.add(i);
            } else {
                for (let i = 0; i < n; i += step) indices.add(i);
                indices.add(lastIdx);
            }
            return indices;
        }

        if (dateParts) {
            if (mode === 'weekly') {
                // Snap to Mondays (nearest data point), pin first + last
                const ts = dateParts.map(d => Date.UTC(d.year, d.month - 1, d.day));
                const closest = (targetMs) => {
                    let best = 0, bestDiff = Infinity;
                    for (let i = 0; i < n; i++) {
                        const diff = Math.abs(ts[i] - targetMs);
                        if (diff < bestDiff) { bestDiff = diff; best = i; }
                    }
                    return best;
                };
                const indices = new Set([0, lastIdx]);
                const cursor = new Date(ts[0]);
                const daysToMon = (8 - cursor.getUTCDay()) % 7;
                cursor.setUTCDate(cursor.getUTCDate() + daysToMon);
                while (cursor.getTime() <= ts[lastIdx]) {
                    indices.add(closest(cursor.getTime()));
                    cursor.setUTCDate(cursor.getUTCDate() + 7);
                }
                return indices;
            }

            if (mode === 'monthly') {
                // First data point of each calendar month, last pinned
                const indices = new Set([lastIdx]);
                let prevKey = null;
                dateParts.forEach((d, i) => {
                    const key = d.year * 100 + d.month;
                    if (key !== prevKey) { indices.add(i); prevKey = key; }
                });
                return indices;
            }

            if (mode === 'yearly') {
                // First data point of each year, first + last pinned
                const indices = new Set([0, lastIdx]);
                let prevYear = null;
                dateParts.forEach((d, i) => {
                    if (d.year !== prevYear) { indices.add(i); prevYear = d.year; }
                });
                return indices;
            }
        }

        // mode === 'auto' (default)
        if (exact) {
            // Uniform stepping anchored on the last point — even gaps throughout
            const step = Math.ceil(lastIdx / 12);
            const indices = new Set();
            for (let i = lastIdx; i >= 0; i -= step) indices.add(i);
            return indices;
        }
        // 12-interval float stepping with last pinned
        const numIntervals = Math.min(12, lastIdx);
        const step = lastIdx / numIntervals;
        const indices = new Set();
        for (let i = 0; i <= numIntervals; i++) {
            indices.add(Math.round(i * step));
        }
        indices.add(lastIdx);
        return indices;
    },

    calculateYAxisInterval: function(min, max) {
        // Scale-invariant nice interval aiming for ~6 divisions. The line
        // tools use a fixed price ladder; this tool also charts volumes in
        // the millions, so the interval must scale with the data magnitude.
        const range = Math.max(max - min, 1e-9);
        const target = range / 6;
        const exp = Math.floor(Math.log10(target));
        const base = target / Math.pow(10, exp);
        const nice = base <= 1 ? 1 : base <= 2 ? 2 : base <= 2.5 ? 2.5 : base <= 5 ? 5 : 10;
        return nice * Math.pow(10, exp);
    },

    setupLegendEditor: function() {
        const container = document.getElementById('legendEditorContainer');
        container.innerHTML = '';

        this.chartData.headers.forEach(name => {
            const input = document.createElement('input');
            input.type = 'text';
            input.value = this.customLegendLabels[name] || name;
            input.dataset.originalName = name;
            input.className = 'px-1.5 py-0.5 border border-gray-300 text-xs bg-white w-64';
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') this.applyLegendLabels();
            });
            container.appendChild(input);
        });
    },

    applyLegendLabels: function() {
        const inputs = document.querySelectorAll('#legendEditorContainer input');
        this.customLegendLabels = {};
        inputs.forEach(input => {
            const original = input.dataset.originalName;
            const custom = input.value.trim();
            if (custom && custom !== original) {
                this.customLegendLabels[original] = custom;
            }
        });
        this.rerenderChart();
        this.log('Legend labels updated.');
    },

    getDefaultNote: function() {
        return '';
    },

    getDefaultSource: function() {
        return this.PAGE_CFG.default_source || 'NGI';
    },

    setupNoteSource: function() {
        document.getElementById('noteInput').value = this.customNote !== null ? this.customNote : this.getDefaultNote();
        document.getElementById('sourceInput').value = this.customSource !== null ? this.customSource : this.getDefaultSource();
    },

    applyNoteSource: function() {
        this.customNote = document.getElementById('noteInput').value.trim();
        this.customSource = document.getElementById('sourceInput').value.trim();
        this.rerenderChart();
        this.log('Note/Source updated.');
    },

    applyYAxisLabel: function() {
        this.rerenderChart();
        this.log('Y-axis label updated.');
    },

    applyYAxis: function() {
        const minVal = document.getElementById('yAxisMin').value;
        const maxVal = document.getElementById('yAxisMax').value;
        this.customYMin = minVal !== '' ? parseFloat(minVal) : null;
        this.customYMax = maxVal !== '' ? parseFloat(maxVal) : null;
        this.rerenderChart();
        this.log('Y-axis range updated.');
    },

    resetYAxis: function() {
        this.customYMin = null;
        this.customYMax = null;
        document.getElementById('yAxisMin').value = '';
        document.getElementById('yAxisMax').value = '';
        this.rerenderChart();
        this.log('Y-axis range reset to auto.');
    },

    downloadChart: function() {
        if (!this.chart) return;

        this.log('Preparing chart for download...');

        const fullChartBase64 = this.chart.getDataURL({
            type: 'png',
            pixelRatio: 4,
            backgroundColor: '#fff'
        });

        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            // Source image is 750*4=3000 wide x (display height)*4 tall
            const srcHeight = (this.PAGE_CFG.chart_height || 400) * 4;
            const cropLeft = 40;
            const cropTop = 22;
            const cropWidth = 3000 - 40 - 38;
            const cropHeight = srcHeight - 22;

            const targetWidth = this.PAGE_CFG.export_width || 1656;
            const targetHeight = this.PAGE_CFG.export_height || 894;
            const scaleX = targetWidth / cropWidth;
            const scaleY = targetHeight / cropHeight;
            const scale = Math.min(scaleX, scaleY);

            const scaledWidth = Math.round(cropWidth * scale);
            const scaledHeight = Math.round(cropHeight * scale);

            canvas.width = targetWidth;
            canvas.height = targetHeight;

            ctx.fillStyle = '#fff';
            ctx.fillRect(0, 0, targetWidth, targetHeight);

            const offsetX = (targetWidth - scaledWidth) / 2;
            const offsetY = (targetHeight - scaledHeight) / 2;

            ctx.drawImage(
                img,
                cropLeft, cropTop, cropWidth, cropHeight,
                offsetX, offsetY, scaledWidth, scaledHeight
            );

            canvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');

                const title = this.getTitleText().split('\n')[0].replace(/[\\/:*?"<>|]/g, '').trim() || 'NGI Custom Chart';
                const filename = `${title}.webp`;

                link.download = filename;
                link.href = url;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);

                this.log(`Chart downloaded as <strong>${filename}</strong> (${targetWidth}×${targetHeight}px WebP)`);
            }, 'image/webp');
        };

        img.src = fullChartBase64;
    },

    exportColors: function() {
        if (!this.seriesList.length) {
            alert('No color settings to export.');
            return;
        }
        const data = {
            preset: 'Custom Data Chart Colors',
            colors: this.seriesList.map(item => ({ color: item.color, style: item.style }))
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = 'custom-data-chart-colors.json';
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        this.log('Color settings exported.');
    },

    importColors: function(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const data = JSON.parse(evt.target.result);
                if (!data.colors || !Array.isArray(data.colors)) {
                    throw new Error('Invalid format: missing colors array');
                }
                data.colors.forEach((c, i) => {
                    if (i < this.seriesList.length) {
                        if (c.color) this.seriesList[i].color = c.color;
                        if (c.style) this.seriesList[i].style = c.style;
                    }
                });
                this.renderSeriesList();
                this.rerenderChart();
                this.log(`Imported color settings from <strong>${file.name}</strong>`);
            } catch (err) {
                alert('Could not read color file: ' + err.message);
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => CustomDataChart.init());
