/**
 * NGI LNG Netbacks - Frontend Logic
 * Compares TTF (Europe) and JKM (Asia) netbacks to Henry Hub
 */

const NetbacksApp = {
    state: {
        mode: 'forward_curve',
        showSpreads: true,
        chartInstance: null,
        hiddenSeries: new Set(),
        yAxisZoomEnabled: false,

        // Forward Curve mode
        issueDate: '',

        // Time Series mode
        contractMonth: '',
        startDate: '',
        endDate: ''
    },

    // --- INITIALIZATION ---
    init: async function() {
        await this.fetchLatestDateAndSetup();
        this.setupContractMonths();
        this.bindEvents();
        this.setMode(this.state.mode);
        this.setSystemStatus('ready');
        this.log('System initialized.');
    },

    log: function(msg) {
        const time = new Date().toLocaleTimeString();
        const logHtml = `<div class="border-l-2 border-slate-700 pl-2 mb-1 hover:bg-slate-800"><span class="text-slate-500 mr-2">[${time}]</span>${msg}</div>`;
        const logContainer = document.getElementById('logContent');
        if(logContainer) {
            logContainer.insertAdjacentHTML('beforeend', logHtml);
            logContainer.scrollTop = logContainer.scrollHeight;
        }
        const lastLog = document.getElementById('lastLogMsg');
        if(lastLog) lastLog.textContent = msg;
    },

    fetchLatestDateAndSetup: async function() {
        try {
            this.log('Fetching latest available issue date from API...');
            const res = await fetch('/api/netback-latest-date');
            const data = await res.json();

            if (data.success && data.latest_issue_date) {
                this.log(`Latest available issue date: ${data.latest_issue_date}`);
                this.setupDates(data.latest_issue_date);
            } else {
                this.log('Could not fetch latest issue date, using fallback defaults');
                this.setupDates(null);
            }
        } catch (err) {
            this.log(`Error fetching latest issue date: ${err.message}. Using fallback defaults.`);
            this.setupDates(null);
        }
    },

    setupDates: function(latestIssueDate = null) {
        let latestIssueDateObj;

        if (latestIssueDate) {
            latestIssueDateObj = new Date(latestIssueDate + 'T00:00:00');
        } else {
            latestIssueDateObj = new Date();
        }

        const twoMonthsAgo = new Date(latestIssueDateObj);
        twoMonthsAgo.setMonth(latestIssueDateObj.getMonth() - 2);

        // Forward Curve mode - single issue date
        document.getElementById('issueDate').value = latestIssueDateObj.toISOString().split('T')[0];
        this.state.issueDate = latestIssueDateObj.toISOString().split('T')[0];

        // Time Series mode - date range
        document.getElementById('endDate').value = latestIssueDateObj.toISOString().split('T')[0];
        document.getElementById('startDate').value = twoMonthsAgo.toISOString().split('T')[0];
        this.state.endDate = latestIssueDateObj.toISOString().split('T')[0];
        this.state.startDate = twoMonthsAgo.toISOString().split('T')[0];
    },

    setupContractMonths: function() {
        const contractSelect = document.getElementById('contractMonthSelect');
        contractSelect.innerHTML = '';

        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth();

        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        // Generate contracts for next 3 years
        for (let yearOffset = 0; yearOffset < 4; yearOffset++) {
            const year = currentYear + yearOffset;
            const startMonth = yearOffset === 0 ? currentMonth : 0;

            for (let month = startMonth; month < 12; month++) {
                const contractValue = `${year}-${String(month + 1).padStart(2, '0')}-01`;
                const contractLabel = `${monthNames[month]} ${year}`;
                const opt = document.createElement('option');
                opt.value = contractValue;
                opt.text = contractLabel;
                contractSelect.appendChild(opt);
            }
        }

        // Set default to 6 months out
        if (contractSelect.options.length > 6) {
            contractSelect.selectedIndex = 6;
        }

        this.state.contractMonth = contractSelect.value;
    },

    bindEvents: function() {
        // Mode tabs
        document.querySelectorAll('.mode-tab').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setMode(e.target.dataset.mode);
            });
        });

        // Spreads toggle
        document.getElementById('showSpreads').addEventListener('change', (e) => {
            this.state.showSpreads = e.target.checked;
            this.log(`Show spreads: ${e.target.checked}`);
        });

        // Forward Curve mode - issue date
        document.getElementById('issueDate').addEventListener('change', (e) => {
            this.state.issueDate = e.target.value;
        });

        // Time Series mode
        document.getElementById('contractMonthSelect').addEventListener('change', (e) => {
            this.state.contractMonth = e.target.value;
        });

        document.getElementById('startDate').addEventListener('change', (e) => {
            this.state.startDate = e.target.value;
        });

        document.getElementById('endDate').addEventListener('change', (e) => {
            this.state.endDate = e.target.value;
        });

        // Analyze button
        document.getElementById('analyzeBtn').addEventListener('click', () => this.analyze());

        // Log drawer
        document.getElementById('logToggle').addEventListener('click', () => this.toggleLogDrawer());

        // Copy table
        document.getElementById('copyTableBtn').addEventListener('click', () => this.copyTable());

        // Y-Axis Zoom
        const yZoomToggle = document.getElementById('toggleYZoom');
        if(yZoomToggle) {
            yZoomToggle.addEventListener('change', (e) => this.toggleYAxisZoom(e.target.checked));
        }

        // Window resize
        window.addEventListener('resize', () => {
            if(this.state.chartInstance) {
                this.state.chartInstance.resize();
            }
        });
    },

    setMode: function(mode) {
        this.state.mode = mode;
        this.state.hiddenSeries.clear();
        this.log(`Switched to [${mode.toUpperCase().replace('_', ' ')}] mode.`);

        // Update tabs
        document.querySelectorAll('.mode-tab').forEach(btn => {
            if(btn.dataset.mode === mode) {
                btn.className = 'mode-tab flex-1 py-2 text-xs font-semibold uppercase text-gray-900 border-b-2 border-gray-900 bg-white';
            } else {
                btn.className = 'mode-tab flex-1 py-2 text-xs font-semibold uppercase text-gray-600 hover:bg-gray-50';
            }
        });

        // Show/hide sections
        document.getElementById('forwardCurveSection').classList.toggle('hidden', mode !== 'forward_curve');
        document.getElementById('timeSeriesSection').classList.toggle('hidden', mode !== 'time_series');
    },

    setSystemStatus: function(state) {
        const dot = document.getElementById('statusDot');
        const label = document.getElementById('statusLabel');
        if(!dot || !label) return;

        const base = 'w-2 h-2 rounded-full';

        switch(state) {
            case 'working':
                dot.className = `${base} bg-yellow-500 animate-pulse`;
                label.textContent = 'Working';
                break;
            case 'error':
                dot.className = `${base} bg-red-500`;
                label.textContent = 'Attention Needed';
                break;
            default:
                dot.className = `${base} bg-green-500`;
                label.textContent = 'Ready';
        }
    },

    toggleLogDrawer: function() {
        const drawer = document.getElementById('logDrawer');
        const arrow = document.getElementById('logArrow');
        if(drawer.classList.contains('h-0')) {
            drawer.classList.remove('h-0');
            drawer.classList.add('h-64');
            arrow.classList.add('rotate-180');
        } else {
            drawer.classList.add('h-0');
            drawer.classList.remove('h-64');
            arrow.classList.remove('rotate-180');
        }
    },

    openLogDrawer: function() {
        const drawer = document.getElementById('logDrawer');
        const arrow = document.getElementById('logArrow');
        if(drawer && arrow) {
            drawer.classList.remove('h-0');
            drawer.classList.add('h-64');
            arrow.classList.add('rotate-180');
        }
    },

    analyze: async function() {
        const btn = document.getElementById('analyzeBtn');
        const mode = this.state.mode;
        const showSpreads = this.state.showSpreads;

        // Validation
        if (mode === 'forward_curve') {
            if (!document.getElementById('issueDate').value) {
                alert('Please select an issue date.');
                return;
            }
        } else if (mode === 'time_series') {
            if (!document.getElementById('startDate').value || !document.getElementById('endDate').value) {
                alert('Please select a date range.');
                return;
            }
            if (!document.getElementById('contractMonthSelect').value) {
                alert('Please select a contract month.');
                return;
            }
        }

        btn.textContent = 'Fetching...';
        btn.disabled = true;
        this.setSystemStatus('working');
        this.openLogDrawer();

        this.state.hiddenSeries.clear();

        // Use SSE streaming for time_series mode
        if (mode === 'time_series') {
            await this.analyzeTimeSeriesStream();
            return;
        }

        // Forward curve mode uses regular fetch
        const params = new URLSearchParams();
        params.append('mode', mode);
        params.append('show_spreads', showSpreads);

        const issueDate = document.getElementById('issueDate').value;
        params.append('issue_date', issueDate);
        this.log(`Fetching forward curves for issue date: ${issueDate}`);

        try {
            this.log(`Requesting: /api/netbacks?${params.toString()}`);
            const res = await fetch(`/api/netbacks?${params.toString()}`);
            const text = await res.text();
            let data;

            try {
                data = JSON.parse(text);
            } catch(parseErr) {
                throw new Error('Unexpected response from server. Please refresh your session.');
            }

            // Check for session expiration
            if (res.status === 401 || data.auth_required) {
                this.log('Session expired. Redirecting to login...', 'error');
                window.location.href = '/auth';
                return;
            }

            if(!res.ok) {
                throw new Error(data.error || `API Error ${res.status}`);
            }

            if(data.error) {
                throw new Error(data.error);
            }

            this.renderChart(data);
            this.renderTable(data);

            const seriesCount = data.series ? data.series.length : 0;
            const dateCount = data.dates ? data.dates.length : 0;
            this.log(`Analysis complete. ${seriesCount} series, ${dateCount} data points.`);

        } catch(err) {
            this.log(`Error: ${err.message}`);
            alert(err.message);
            this.setSystemStatus('error');
        } finally {
            btn.textContent = 'Submit';
            btn.disabled = false;
            this.setSystemStatus('ready');
        }
    },

    analyzeTimeSeriesStream: async function() {
        const btn = document.getElementById('analyzeBtn');
        const showSpreads = this.state.showSpreads;
        const contract = document.getElementById('contractMonthSelect').value;
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;

        // Calculate number of days for initial log
        const start = new Date(startDate);
        const end = new Date(endDate);
        const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

        this.log(`<strong>Starting time series fetch for ${contract}</strong>`);
        this.log(`Date range: ${startDate} to ${endDate} (${days} calendar days)`);
        this.log(`This will fetch data for each trading day - streaming progress...`);

        const params = new URLSearchParams();
        params.append('mode', 'time_series');
        params.append('show_spreads', showSpreads);
        params.append('contract', contract);
        params.append('start_date', startDate);
        params.append('end_date', endDate);

        return new Promise((resolve) => {
            const eventSource = new EventSource(`/api/netbacks-stream?${params.toString()}`);
            let lastProgressTime = Date.now();

            eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    if (data.type === 'start') {
                        this.log(`Fetching data for ${data.total} dates...`);
                    } else if (data.type === 'progress') {
                        // Log progress updates (throttle to avoid flooding)
                        const now = Date.now();
                        const shouldLog = (now - lastProgressTime > 200) || data.current === data.total || data.status === 'data';

                        if (shouldLog) {
                            lastProgressTime = now;
                            if (data.status === 'data') {
                                const ttfStr = data.ttf !== null ? `TTF=$${data.ttf.toFixed(2)}` : 'TTF=-';
                                const jkmStr = data.jkm !== null ? `JKM=$${data.jkm.toFixed(2)}` : 'JKM=-';
                                const hhStr = data.hh !== null ? `HH=$${data.hh.toFixed(2)}` : 'HH=-';
                                this.log(`[${data.current}/${data.total}] ${data.date}: <span class="text-green-400">✓</span> ${ttfStr}, ${jkmStr}, ${hhStr}`);
                            } else if (data.status === 'skip') {
                                this.log(`[${data.current}/${data.total}] ${data.date}: <span class="text-gray-500">- skipped (weekend/holiday)</span>`);
                            } else if (data.status === 'error') {
                                this.log(`[${data.current}/${data.total}] ${data.date}: <span class="text-red-400">✗ ${data.error}</span>`);
                            }
                        }

                        // Update button text with progress
                        btn.textContent = `Fetching... ${data.percent}%`;

                    } else if (data.type === 'complete') {
                        eventSource.close();

                        this.log(`<strong>Fetch complete!</strong> ${data.metadata.dates_with_data} dates with data, ${data.metadata.dates_skipped} skipped`);

                        this.renderChart(data);
                        this.renderTable(data);

                        const seriesCount = data.series ? data.series.length : 0;
                        const dateCount = data.dates ? data.dates.length : 0;
                        this.log(`Analysis complete. ${seriesCount} series, ${dateCount} data points.`);

                        btn.textContent = 'Submit';
                        btn.disabled = false;
                        this.setSystemStatus('ready');
                        resolve();
                    }
                } catch (err) {
                    console.error('Error parsing SSE data:', err);
                }
            };

            eventSource.onerror = (err) => {
                eventSource.close();
                this.log(`<span class="text-red-400">Stream error - connection lost</span>`);
                btn.textContent = 'Submit';
                btn.disabled = false;
                this.setSystemStatus('error');
                resolve();
            };
        });
    },

    renderChart: function(data) {
        const chartDom = document.getElementById('chartContainer');
        if(!this.state.chartInstance) {
            this.state.chartInstance = echarts.init(chartDom);
        }

        this.state.chartInstance.clear();
        this.updateChartHeader(data);
        this.updateCustomLegend(data);

        if(!data || !data.dates || data.dates.length === 0 || !data.series || data.series.length === 0) {
            chartDom.innerHTML = '<div class="flex items-center justify-center h-full text-gray-500">No data available for the selected criteria</div>';
            return;
        }

        const option = {
            animation: true,
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'axis',
                backgroundColor: 'rgba(0, 0, 0, 0.85)',
                borderColor: 'transparent',
                textStyle: { color: '#fff', fontSize: 12, fontFamily: 'system-ui, -apple-system, sans-serif' },
                formatter: function(params) {
                    let html = `<div style="font-weight: 600; margin-bottom: 4px;">${params[0].axisValueLabel}</div>`;
                    params.forEach(p => {
                        if(!p.seriesName || p.seriesName === '') return;
                        const val = typeof p.value === 'number' ? `$${p.value.toFixed(3)}` : '-';
                        html += `<div style="margin: 2px 0;"><span style="color:${p.color}">●</span> ${p.seriesName}: ${val}</div>`;
                    });
                    return html;
                }
            },
            legend: {
                show: false
            },
            dataZoom: this.state.yAxisZoomEnabled ? [
                {
                    type: 'slider',
                    yAxisIndex: 0,
                    filterMode: 'none',
                    width: 18,
                    right: 5,
                    top: 20,
                    bottom: 50,
                    showDetail: false
                },
                {
                    type: 'inside',
                    yAxisIndex: 0,
                    filterMode: 'none'
                }
            ] : [
                {
                    type: 'inside',
                    start: 0,
                    end: 100
                },
                {
                    type: 'slider',
                    start: 0,
                    end: 100
                }
            ],
            grid: {
                left: 50,
                right: this.state.yAxisZoomEnabled ? 130 : 60,
                bottom: 80,
                top: 20,
                containLabel: false
            },
            xAxis: {
                type: 'category',
                boundaryGap: false,
                data: data.dates,
                axisLine: {
                    lineStyle: { color: '#e6e6e6', width: 1 }
                },
                axisTick: { show: false },
                axisLabel: {
                    color: '#666',
                    fontSize: 10,
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    rotate: 45
                },
                splitLine: { show: false }
            },
            yAxis: {
                type: 'value',
                scale: true,
                position: 'right',
                axisLine: { show: false },
                axisTick: { show: false },
                axisLabel: {
                    color: '#666',
                    fontSize: 11,
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    formatter: (v) => `$${v.toFixed(2)}`,
                    align: 'left',
                    margin: 10
                },
                splitLine: {
                    lineStyle: { color: '#f0f0f0', width: 1, type: 'solid' }
                }
            },
            series: data.series.map(s => {
                const isHidden = s.name && this.state.hiddenSeries.has(s.name);
                const seriesColor = s.color || s.itemStyle?.color || s.lineStyle?.color;
                return {
                    ...s,
                    color: seriesColor,
                    lineStyle: {
                        ...s.lineStyle,
                        color: seriesColor,
                        width: s.lineStyle?.width || 2,
                        opacity: isHidden ? 0 : (s.lineStyle?.opacity ?? 1)
                    },
                    itemStyle: {
                        ...s.itemStyle,
                        color: seriesColor,
                        opacity: isHidden ? 0 : (s.itemStyle?.opacity ?? 1)
                    },
                    smooth: false,
                    silent: isHidden
                };
            })
        };

        this.state.chartInstance.setOption(option, { notMerge: true, replaceMerge: ['series'] });
    },

    toggleYAxisZoom: function(enabled) {
        this.state.yAxisZoomEnabled = enabled;

        if (this.state.chartInstance) {
            const currentOption = this.state.chartInstance.getOption();
            if (currentOption && currentOption.series && currentOption.series.length > 0) {
                // Re-render with new zoom settings
                const newOption = {
                    dataZoom: enabled ? [
                        {
                            type: 'slider',
                            yAxisIndex: 0,
                            filterMode: 'none',
                            width: 18,
                            right: 5,
                            top: 20,
                            bottom: 50,
                            showDetail: false
                        },
                        {
                            type: 'inside',
                            yAxisIndex: 0,
                            filterMode: 'none'
                        }
                    ] : [
                        {
                            type: 'inside',
                            start: 0,
                            end: 100
                        },
                        {
                            type: 'slider',
                            start: 0,
                            end: 100
                        }
                    ],
                    grid: {
                        left: 50,
                        right: enabled ? 130 : 60,
                        bottom: 80,
                        top: 20,
                        containLabel: false
                    }
                };

                this.state.chartInstance.setOption(newOption);
            }
        }
    },

    updateChartHeader: function(data) {
        const titleEl = document.getElementById('chartTitle');
        const subtitleEl = document.getElementById('chartSubtitle');
        const mode = this.state.mode;

        let title = 'LNG Netbacks vs Henry Hub';
        let subtitle = '';

        if (mode === 'forward_curve' && data.metadata) {
            title = 'LNG Netback Forward Curves';
            subtitle = `Issue date: ${data.metadata.issue_date}`;
        } else if (mode === 'time_series' && data.metadata) {
            title = `${data.metadata.contract_month} Contract - Netbacks Over Time`;
            subtitle = `${data.metadata.start_date} to ${data.metadata.end_date}`;
        }

        if (data.series && data.series.length === 0) {
            subtitle = 'No netback data available for the selected parameters';
        }

        titleEl.textContent = title;
        subtitleEl.textContent = subtitle;
    },

    updateCustomLegend: function(data) {
        const legendEl = document.getElementById('customLegend');
        legendEl.innerHTML = '';

        if (!data.series) return;

        const visibleSeries = data.series.filter(s => s.name && s.name !== '');

        visibleSeries.forEach(series => {
            const seriesName = series.name;
            const isHidden = this.state.hiddenSeries.has(seriesName);

            const item = document.createElement('div');
            item.className = 'flex items-center gap-2 cursor-pointer select-none hover:opacity-75 transition-opacity';

            item.addEventListener('click', () => this.toggleSeriesVisibility(seriesName));

            const line = document.createElement('div');
            line.className = 'h-0.5 w-5 transition-opacity';
            const color = series.color || series.itemStyle?.color || series.lineStyle?.color || '#000';
            line.style.backgroundColor = color;

            // Add dashed style for spread series
            if (seriesName.includes('Spread')) {
                line.style.backgroundImage = `repeating-linear-gradient(90deg, ${color} 0px, ${color} 4px, transparent 4px, transparent 8px)`;
                line.style.backgroundColor = 'transparent';
            }

            if (isHidden) {
                line.style.opacity = '0.3';
            }

            const label = document.createElement('span');
            label.textContent = seriesName;
            label.className = 'text-gray-700 transition-opacity';
            if (isHidden) {
                label.style.opacity = '0.3';
                label.style.textDecoration = 'line-through';
            }

            item.appendChild(line);
            item.appendChild(label);
            legendEl.appendChild(item);
        });
    },

    toggleSeriesVisibility: function(seriesName) {
        if (this.state.hiddenSeries.has(seriesName)) {
            this.state.hiddenSeries.delete(seriesName);
        } else {
            this.state.hiddenSeries.add(seriesName);
        }

        if (this.state.chartInstance) {
            const option = this.state.chartInstance.getOption();
            const updatedSeries = option.series.map(s => {
                if (s.name && s.name !== '') {
                    return {
                        ...s,
                        lineStyle: {
                            ...s.lineStyle,
                            opacity: this.state.hiddenSeries.has(s.name) ? 0 : 1
                        },
                        itemStyle: {
                            ...s.itemStyle,
                            opacity: this.state.hiddenSeries.has(s.name) ? 0 : 1
                        },
                        silent: this.state.hiddenSeries.has(s.name)
                    };
                }
                return s;
            });

            this.state.chartInstance.setOption({
                series: updatedSeries
            });

            // Update legend styling
            const legendEl = document.getElementById('customLegend');
            const items = legendEl.querySelectorAll('div.flex');
            items.forEach(item => {
                const line = item.querySelector('div.h-0\\.5');
                const label = item.querySelector('span');
                if (!label) return;
                const seriesNameFromLabel = label.textContent;
                const isHidden = this.state.hiddenSeries.has(seriesNameFromLabel);

                if (isHidden) {
                    if (line) line.style.opacity = '0.3';
                    label.style.opacity = '0.3';
                    label.style.textDecoration = 'line-through';
                } else {
                    if (line) line.style.opacity = '1';
                    label.style.opacity = '1';
                    label.style.textDecoration = 'none';
                }
            });
        }
    },

    renderTable: function(data) {
        if(!data || !data.table_columns || !data.table_rows) {
            return;
        }

        // Headers
        const headerRow = document.getElementById('tableHeaderRow');
        headerRow.innerHTML = '';
        data.table_columns.forEach(col => {
            const th = document.createElement('th');
            th.className = 'px-4 py-2 text-xs font-semibold text-gray-600 bg-gray-100 border-b border-gray-300';
            th.textContent = col;
            headerRow.appendChild(th);
        });

        // Body
        const tbody = document.getElementById('tableBody');
        tbody.innerHTML = '';

        data.table_rows.forEach(row => {
            const tr = document.createElement('tr');
            tr.className = 'border-b border-gray-200 hover:bg-gray-50';

            data.table_columns.forEach((col, idx) => {
                const td = document.createElement('td');
                td.className = 'px-4 py-2 text-sm text-gray-700';

                let val;
                if (idx === 0) {
                    // First column - date or contract
                    val = row.contract || row.date;
                } else if (col === 'TTF Netback') {
                    val = row.ttf_netback;
                } else if (col === 'JPN/KOR Netback') {
                    val = row.jkm_netback;
                } else if (col === 'Henry Hub') {
                    val = row.henry_hub;
                } else if (col === 'TTF-HH Spread') {
                    val = row.ttf_spread;
                } else if (col === 'JPN/KOR-HH Spread') {
                    val = row.jkm_spread;
                } else {
                    val = row[col];
                }

                if (val === null || val === undefined) {
                    td.textContent = '-';
                    td.className += ' text-gray-400';
                } else if (typeof val === 'number') {
                    td.textContent = '$' + val.toFixed(3);
                } else {
                    td.textContent = val;
                }
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
    },

    copyTable: function() {
        const table = document.querySelector('.daily-prices-pro-container table');
        if(!table) {
            alert('No table data to copy.');
            return;
        }

        const lines = [];
        for(const row of table.rows) {
            const cols = [];
            for(const cell of row.cells) {
                cols.push(cell.innerText.trim());
            }
            lines.push(cols.join('\t'));
        }

        const payload = lines.join('\n');
        if(!payload) {
            alert('Nothing to copy.');
            return;
        }

        this.copyToClipboard(payload)
            .then(() => {
                this.log('Table data copied to clipboard.');
                alert('Copied table data.');
            })
            .catch(err => {
                this.log(`Copy failed: ${err.message}`);
                alert('Unable to copy table data.');
            });
    },

    copyToClipboard: function(text) {
        if(navigator.clipboard && window.isSecureContext) {
            return navigator.clipboard.writeText(text);
        }

        return new Promise((resolve, reject) => {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.focus();
            textarea.select();

            try {
                document.execCommand('copy');
                resolve();
            } catch(err) {
                reject(err);
            } finally {
                document.body.removeChild(textarea);
            }
        });
    }
};

// Start
document.addEventListener('DOMContentLoaded', () => NetbacksApp.init());
