
// NGI LNG Flows - Frontend Logic

const LNGApp = {
    state: {
        chartInstance: null,
        apiData: {}, // Stores raw API data keyed by date
        currentUnit: 'bcf', // 'bcf' or 'million_dth'
    },

    // Terminal mapping - must match backend
    terminalMapping: {
        'Corpus Christi': ['corpus_christi'],
        'Freeport': ['freeport_costal_bend', 'freeport_stratton_ridge', 'freeport_tetco_big_pipeline'],
        'Golden Pass': ['terminal_sendout'],
        'Calcasieu Pass': ['venture_global_calcasieu_pass'],
        'Cameron': ['cameron_cgt', 'cameron_cip'],
        'Plaquemines': ['gxp_lp_del'],
        'Sabine Pass': ['sabine_pass_creole', 'sabine_pass_km_la', 'sabine_pass_ngpl', 'sabine_pass_transco'],
        'Elba Island': ['elba_island_elba_express'],
        'Cove Point': ['cove_point']
    },

    // --- INITIALIZATION ---
    init: function() {
        this.setupDates();
        this.bindEvents();
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

    setupDates: function() {
        const today = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(today.getDate() - 30);

        document.getElementById('endDate').value = today.toISOString().split('T')[0];
        document.getElementById('startDate').value = thirtyDaysAgo.toISOString().split('T')[0];
    },

    bindEvents: function() {
        // Analyze button - fetches data
        document.getElementById('analyzeBtn').addEventListener('click', () => this.fetchData());

        // Log drawer toggle
        document.getElementById('logToggle').addEventListener('click', () => this.toggleLogDrawer());

        // Unit toggle - re-renders chart with stored data
        document.getElementById('unitToggle').addEventListener('change', (e) => {
            this.currentUnit = e.target.checked ? 'bcf' : 'million_dth';
            if(Object.keys(this.state.apiData).length > 0) {
                const terminal = document.getElementById('terminalSelect').value;
                this.processAndDisplayData(terminal);
            }
        });

        // Terminal change - re-processes stored data, NO API call
        document.getElementById('terminalSelect').addEventListener('change', () => {
            if(Object.keys(this.state.apiData).length > 0) {
                const terminal = document.getElementById('terminalSelect').value;
                this.log(`Switching to terminal: ${terminal}`);
                this.processAndDisplayData(terminal);
            }
        });

        // Copy table button
        const copyTableBtn = document.getElementById('copyTableBtn');
        if(copyTableBtn) {
            copyTableBtn.addEventListener('click', () => this.copyTable());
        }

        // Window resize
        window.addEventListener('resize', () => {
            if(this.state.chartInstance) {
                this.state.chartInstance.resize();
            }
        });
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
            this.openLogDrawer();
        } else {
            this.closeLogDrawer();
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

    closeLogDrawer: function() {
        const drawer = document.getElementById('logDrawer');
        const arrow = document.getElementById('logArrow');
        if(drawer && arrow) {
            drawer.classList.add('h-0');
            drawer.classList.remove('h-64');
            arrow.classList.remove('rotate-180');
        }
    },

    fetchData: async function() {
        const btn = document.getElementById('analyzeBtn');
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;

        if(!startDate || !endDate) {
            alert('Please choose a start and end date.');
            return;
        }

        btn.textContent = 'Fetching...';
        btn.disabled = true;
        this.setSystemStatus('working');

        // Reset stored data
        this.state.apiData = {};

        try {
            // Generate list of dates to fetch
            const dates = this.generateDateList(new Date(startDate), new Date(endDate));
            const totalDates = dates.length;

            this.log(`=== LNG Flow Data Fetch Started ===`);
            this.log(`Date range: ${startDate} to ${endDate} (${totalDates} day${totalDates > 1 ? 's' : ''})`);
            this.log(`Fetching ALL terminal data for client-side filtering`);

            let successCount = 0;
            let errorCount = 0;

            // Fetch each date individually
            for (let i = 0; i < dates.length; i++) {
                const date = dates[i];
                const dateStr = this.formatDate(date);
                const progress = `[${i + 1}/${totalDates}]`;

                this.log(`${progress} Fetching ${dateStr}...`);

                try {
                    const params = new URLSearchParams({
                        issue_date: dateStr
                    });

                    const res = await fetch(`/api/lng-flows?${params.toString()}`);
                    const text = await res.text();
                    let data;

                    try {
                        data = JSON.parse(text);
                    } catch(parseErr) {
                        // Log the actual response for debugging
                        const preview = text.substring(0, 200);
                        this.log(`${progress} Response preview: ${preview}${text.length > 200 ? '...' : ''}`);
                        throw new Error(`Invalid JSON response (${parseErr.message})`);
                    }

                    if(!res.ok) {
                        const errorMsg = data.error || `HTTP ${res.status}`;
                        throw new Error(errorMsg);
                    }

                    if(!data.success) {
                        throw new Error(data.error || 'API returned success=false');
                    }

                    // Store the raw location data for this date
                    if(data.locations && typeof data.locations === 'object') {
                        this.state.apiData[dateStr] = data.locations;
                        successCount++;
                        const locationCount = Object.keys(data.locations).length;
                        this.log(`${progress} ✓ ${dateStr} complete - ${locationCount} locations`);
                    } else {
                        this.log(`${progress} ⚠ ${dateStr} returned no location data`);
                        errorCount++;
                    }

                } catch(err) {
                    errorCount++;
                    this.log(`${progress} ✗ ${dateStr} failed: ${err.message}`);
                    // Continue with next date even if this one fails
                }
            }

            this.log(`--- Fetch Summary ---`);
            this.log(`✓ Success: ${successCount} day${successCount !== 1 ? 's' : ''}`);
            if(errorCount > 0) {
                this.log(`✗ Failed: ${errorCount} day${errorCount !== 1 ? 's' : ''}`);
            }

            if(Object.keys(this.state.apiData).length === 0) {
                throw new Error('No data was retrieved for the selected date range');
            }

            // Process and display with default terminal (All)
            const terminal = document.getElementById('terminalSelect').value;
            this.processAndDisplayData(terminal);

            this.log(`=== Fetch Complete ===`);
            this.log(`Data ready. Change terminal dropdown to filter without re-fetching.`);

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

    processAndDisplayData: function(selectedTerminal) {
        if(Object.keys(this.state.apiData).length === 0) {
            this.log('No data to process');
            return;
        }

        this.log(`Processing data for terminal: ${selectedTerminal}`);

        // Get terminal locations to filter
        let terminalLocations;
        if(selectedTerminal === 'All') {
            terminalLocations = Object.values(this.terminalMapping).flat();
        } else {
            terminalLocations = this.terminalMapping[selectedTerminal] || [];
        }

        const processedData = [];

        // Process each date's data
        for (let [date, dateData] of Object.entries(this.state.apiData)) {
            if(!dateData) continue;

            // Sum up quantities for matching terminals
            let dailyTotalDth = 0;

            for (let [locationKey, details] of Object.entries(dateData)) {
                // Check if this location matches our terminal filter
                if(selectedTerminal === 'All' || terminalLocations.some(term => locationKey.includes(term))) {
                    const quantityStr = details['Scheduled Quantity (Dth)'] || '0';

                    // Clean and parse the quantity
                    try {
                        const quantity = parseFloat(String(quantityStr).replace(/,/g, ''));
                        if(!isNaN(quantity)) {
                            dailyTotalDth += quantity;
                        }
                    } catch(e) {
                        // Skip invalid quantities
                    }
                }
            }

            // Convert Dth to Bcf: 1 Million Dth ≈ 0.9643 Bcf (divide by 1.037)
            const bcfValue = (dailyTotalDth / 1.037) / 1000000;

            processedData.push({
                date: date,
                terminal: selectedTerminal,
                dth: dailyTotalDth,
                million_dth: dailyTotalDth / 1000000,
                bcf: bcfValue
            });
        }

        // Sort by date
        processedData.sort((a, b) => a.date.localeCompare(b.date));

        // Build aggregated data structure
        const aggregatedData = {
            dates: processedData.map(d => d.date),
            series: [{
                name: 'LNG Volume',
                type: 'line',
                data: processedData.map(d => d.bcf),
                color: '#2563eb',
                itemStyle: {'color': '#2563eb'},
                lineStyle: {'width': 3, 'color': '#2563eb'},
                symbol: 'none',
                smooth: false
            }],
            table_columns: ['Date', 'Terminal', 'Scheduled Quantity (Dth)', 'Scheduled Quantity (Million Dth)', 'Scheduled Quantity (Bcf)'],
            table_rows: processedData.map(item => ({
                date: item.date,
                terminal: item.terminal,
                dth: Math.round(item.dth),
                million_dth: item.million_dth.toFixed(3),
                bcf: item.bcf.toFixed(3)
            }))
        };

        this.renderChart(aggregatedData);
        this.renderTable(aggregatedData);
        this.updateChartHeader(aggregatedData);
    },

    generateDateList: function(startDate, endDate) {
        const dates = [];
        let currentDate = new Date(startDate);

        while (currentDate <= endDate) {
            dates.push(new Date(currentDate));
            currentDate.setDate(currentDate.getDate() + 1);
        }

        return dates;
    },

    formatDate: function(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    renderChart: function(data) {
        const chartDom = document.getElementById('chartContainer');
        if(!this.state.chartInstance) {
            this.state.chartInstance = echarts.init(chartDom);
        }

        // Clear the chart completely
        this.state.chartInstance.clear();

        if(!data || !data.dates || data.dates.length === 0) {
            chartDom.innerHTML = '<div class="flex items-center justify-center h-full text-gray-500">No data available for the selected criteria</div>';
            return;
        }

        // Convert data based on selected unit
        let chartData = data.series[0].data; // Already in Bcf from backend
        let yAxisLabel = 'Scheduled Quantity (Bcf)';
        let unitSuffix = 'Bcf';

        if(this.currentUnit === 'million_dth') {
            // Convert Bcf back to Million Dth: Bcf * 1.037
            chartData = data.series[0].data.map(v => v * 1.037);
            yAxisLabel = 'Scheduled Quantity (Million Dth)';
            unitSuffix = 'M Dth';
        }

        // Calculate y-axis range
        const values = chartData.filter(v => v !== null && v !== undefined);
        if(values.length === 0) {
            chartDom.innerHTML = '<div class="flex items-center justify-center h-full text-gray-500">No valid data to display</div>';
            return;
        }

        const minValue = Math.min(...values);
        const maxValue = Math.max(...values);
        const range = maxValue - minValue;

        // Add padding to the range (10% below min, 10% above max)
        const yMin = Math.max(0, minValue - range * 0.1);
        const yMax = maxValue + range * 0.1;

        const option = {
            animation: true,
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'axis',
                backgroundColor: 'rgba(0, 0, 0, 0.85)',
                borderColor: 'transparent',
                textStyle: { color: '#fff', fontSize: 12, fontFamily: 'system-ui, -apple-system, sans-serif' },
                formatter: function(params) {
                    const date = params[0].axisValueLabel;
                    const value = params[0].value !== null && params[0].value !== undefined ?
                        params[0].value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) :
                        '-';
                    return `<div style="font-weight: 600; margin-bottom: 4px;">${date}</div>` +
                           `<div style="margin: 2px 0;"><span style="color:${params[0].color}">●</span> Volume: ${value} ${unitSuffix}</div>`;
                }
            },
            legend: {
                show: false
            },
            grid: {
                left: 50,
                right: 60,
                bottom: 50,
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
                    fontSize: 11,
                    fontFamily: 'system-ui, -apple-system, sans-serif'
                },
                splitLine: { show: false }
            },
            yAxis: {
                type: 'value',
                scale: true,
                position: 'right',
                min: yMin,
                max: yMax,
                axisLine: { show: false },
                axisTick: { show: false },
                axisLabel: {
                    color: '#666',
                    fontSize: 11,
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    formatter: (v) => {
                        if(unitSuffix === 'Bcf') {
                            return v.toFixed(2);
                        } else {
                            return v.toFixed(1);
                        }
                    },
                    align: 'left',
                    margin: 10
                },
                splitLine: {
                    lineStyle: { color: '#f0f0f0', width: 1, type: 'solid' }
                },
                splitNumber: 8
            },
            series: [{
                name: 'LNG Volume',
                type: 'line',
                data: chartData,
                color: '#2563eb',
                itemStyle: { color: '#2563eb' },
                lineStyle: { width: 3, color: '#2563eb' },
                symbol: 'none',
                smooth: false
            }],
            dataZoom: [
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
            ]
        };

        this.state.chartInstance.setOption(option, { notMerge: true, replaceMerge: ['series'] });
    },

    updateChartHeader: function(data) {
        const titleEl = document.getElementById('chartTitle');
        const subtitleEl = document.getElementById('chartSubtitle');
        const terminal = document.getElementById('terminalSelect').value;

        let title = `LNG Export Flows - ${terminal}`;
        let subtitle = '';

        if (data && data.dates && data.dates.length > 0) {
            const startDate = data.dates[0] || '';
            const endDate = data.dates[data.dates.length - 1] || '';
            subtitle = `Scheduled quantities from ${startDate} to ${endDate}`;
        }

        titleEl.textContent = title;
        subtitleEl.textContent = subtitle;
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

            // Build cells in order: date, terminal, dth, million_dth, bcf
            const values = [
                row.date,
                row.terminal,
                row.dth,
                row.million_dth,
                row.bcf
            ];

            values.forEach((val, idx) => {
                const td = document.createElement('td');
                td.className = 'px-4 py-2 text-sm text-gray-700';

                if (val === null || val === undefined) {
                    td.textContent = '';
                } else if (typeof val === 'number') {
                    // Format based on column type
                    const colName = data.table_columns[idx] || '';

                    if (colName.includes('(Dth)') && !colName.includes('Million')) {
                        // Dth column - integer format with commas
                        td.textContent = Math.round(val).toLocaleString();
                    } else if (colName.includes('Million') || colName.includes('Bcf')) {
                        // Million Dth or Bcf - decimal format
                        td.textContent = typeof val === 'string' ? val : val.toFixed(3);
                    } else {
                        td.textContent = val.toLocaleString();
                    }
                } else {
                    // Text columns (dates, terminal names)
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
document.addEventListener('DOMContentLoaded', () => LNGApp.init());
