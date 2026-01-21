/**
 * Forward Curve Spread Dashboard - Grid of forward curve spread charts
 * Shows spreads across contract months (curve view) rather than over time
 */

const ForwardCurveSpreadDashboard = {
    charts: [],
    nextChartId: 0,
    resizeListenerAdded: false,
    logOpen: false,

    // Logging functions
    log: function(message, type = 'info') {
        const logContent = document.getElementById('logContent');
        const lastLogMsg = document.getElementById('lastLogMsg');
        if (!logContent) return;

        const timestamp = new Date().toLocaleTimeString();
        const colors = {
            info: 'text-gray-300',
            success: 'text-green-400',
            error: 'text-red-400',
            warning: 'text-yellow-400'
        };

        const entry = document.createElement('div');
        entry.className = `${colors[type] || colors.info} mb-1`;
        entry.innerHTML = `<span class="text-gray-500">[${timestamp}]</span> ${message}`;
        logContent.appendChild(entry);
        logContent.scrollTop = logContent.scrollHeight;

        if (lastLogMsg) {
            lastLogMsg.textContent = message.replace(/<[^>]*>/g, '');
        }
    },

    setStatus: function(status, label) {
        const statusDot = document.getElementById('statusDot');
        const statusLabel = document.getElementById('statusLabel');

        const colors = {
            ready: 'bg-green-500',
            loading: 'bg-yellow-500',
            error: 'bg-red-500'
        };

        if (statusDot) {
            statusDot.className = `w-2 h-2 rounded-full ${colors[status] || colors.ready}`;
        }
        if (statusLabel) {
            statusLabel.textContent = label || status.toUpperCase();
        }
    },

    setupLogToggle: function() {
        const logToggle = document.getElementById('logToggle');
        const logDrawer = document.getElementById('logDrawer');
        const logArrow = document.getElementById('logArrow');

        if (logToggle && logDrawer) {
            logToggle.addEventListener('click', () => {
                this.logOpen = !this.logOpen;
                if (this.logOpen) {
                    logDrawer.classList.remove('h-0');
                    logDrawer.classList.add('h-64');
                    if (logArrow) logArrow.style.transform = 'rotate(180deg)';
                } else {
                    logDrawer.classList.remove('h-64');
                    logDrawer.classList.add('h-0');
                    if (logArrow) logArrow.style.transform = 'rotate(0deg)';
                }
            });
        }
    },

    // Location database (same as other dashboards)
    locations: {
        'Favorites': [
            { name: 'Henry Hub', value: 'SLAHH' },
            { name: 'Waha', value: 'WTXWAHA' },
            { name: 'Houston Ship Channel', value: 'ETXHSHIP' },
            { name: 'Katy', value: 'ETXKATY' },
            { name: 'Chicago Citygate', value: 'MCWCCITY' },
            { name: 'Algonquin Citygate', value: 'NEAALGCG' },
            { name: 'Cheyenne Hub', value: 'RMTCHEY' },
            { name: 'SoCal Citygate', value: 'CALSCG' },
            { name: 'NOVA/AECO C', value: 'CDNNOVA' }
        ],
        'Northeast': [
            { name: 'Algonquin Citygate', value: 'NEAALGCG' },
            { name: 'Transco Zone 6 NY', value: 'NEATZ6NY' },
            { name: 'Transco-Leidy Line', value: 'NEALEIDYT' }
        ],
        'Midwest': [
            { name: 'Chicago Citygate', value: 'MCWCCITY' },
            { name: 'Dawn', value: 'MCWDAWN' }
        ],
        'California': [
            { name: 'PG&E Citygate', value: 'CALPGCG' },
            { name: 'SoCal Citygate', value: 'CALSCG' }
        ],
        'West Texas': [
            { name: 'Waha', value: 'WTXWAHA' },
            { name: 'El Paso Permian', value: 'WTXEPP' }
        ],
        'Rockies': [
            { name: 'Opal', value: 'RMTOPAL' }
        ]
    },

    // Default spread pairs - regional spreads
    defaultSpreads: [
        { loc1: 'NEAALGCG', loc2: 'MCWCCITY' },  // Northeast vs Midwest
        { loc1: 'CALPGCG', loc2: 'CALSCG' },     // NorCal vs SoCal
        { loc1: 'NEATZ6NY', loc2: 'NEAALGCG' },  // Transco Z6 NY vs Algonquin
        { loc1: 'MCWCCITY', loc2: 'MCWDAWN' },   // Chicago vs Dawn
        { loc1: 'CALSCG', loc2: 'WTXWAHA' },     // SoCal vs Waha
        { loc1: 'NEALEIDYT', loc2: 'MCWCCITY' }, // Leidy vs Chicago
        { loc1: 'RMTOPAL', loc2: 'WTXWAHA' },    // Opal vs Waha
        { loc1: 'NEAALGCG', loc2: 'NEATZ6NY' },  // Algonquin vs Transco Z6
        { loc1: 'CALPGCG', loc2: 'RMTOPAL' }     // PG&E vs Opal
    ],

    init: function() {
        this.setupLogToggle();
        this.setupEventListeners();
        this.setupResizeListener();
        this.log('Forward Curve Spreads Dashboard initialized', 'success');
        this.initializeDefaultCharts();
    },

    setupResizeListener: function() {
        if (!this.resizeListenerAdded) {
            window.addEventListener('resize', () => {
                this.charts.forEach(chart => {
                    if (chart.instance) {
                        chart.instance.resize();
                    }
                });
            });
            this.resizeListenerAdded = true;
        }
    },

    setupEventListeners: function() {
        document.getElementById('addChartBtn').addEventListener('click', () => {
            this.addChart();
        });
    },

    initializeDefaultCharts: async function() {
        for (let i = 0; i < this.defaultSpreads.length; i++) {
            const spread = this.defaultSpreads[i];
            await this.addChart(spread.loc1, spread.loc2);
            // Longer delay to prevent API rate limiting
            // Each chart makes 1 API call to forwardDatafeed.json
            if (i < this.defaultSpreads.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 600));
            }
        }
    },

    addChart: async function(defaultLoc1 = null, defaultLoc2 = null) {
        const chartId = this.nextChartId++;
        const grid = document.getElementById('dashboardGrid');

        const cardHTML = `
            <div class="chart-card" data-chart-id="${chartId}">
                <div class="chart-header">
                    <div class="chart-controls">
                        <select class="location-select" data-chart-id="${chartId}" data-location="1">
                            ${this.generateLocationOptions()}
                        </select>
                        <select class="location-select" data-chart-id="${chartId}" data-location="2">
                            ${this.generateLocationOptions()}
                        </select>
                    </div>
                    <div class="months-buttons">
                        <button class="months-btn" data-chart-id="${chartId}" data-months="6">6M</button>
                        <button class="months-btn active" data-chart-id="${chartId}" data-months="12">12M</button>
                        <button class="months-btn" data-chart-id="${chartId}" data-months="24">24M</button>
                        <button class="months-btn" data-chart-id="${chartId}" data-months="36">36M</button>
                        <button class="months-btn" data-chart-id="${chartId}" data-months="48">48M</button>
                        <button class="months-btn" data-chart-id="${chartId}" data-months="60">60M</button>
                        <button class="months-btn" data-chart-id="${chartId}" data-months="84">84M</button>
                    </div>
                    <div class="date-info-row">
                        <div class="trade-date-info" id="trade-date-${chartId}"></div>
                        <div class="date-picker-wrapper">
                            <span class="date-picker-label">Select Issue Date:</span>
                            <button class="calendar-btn" data-chart-id="${chartId}">📅</button>
                            <input type="date" class="date-picker-input-hidden" data-chart-id="${chartId}" value="${this.getDefaultDate()}">
                        </div>
                    </div>
                </div>
                <div class="chart-container" id="chart-${chartId}"></div>
            </div>
        `;

        grid.insertAdjacentHTML('beforeend', cardHTML);

        if (defaultLoc1 || defaultLoc2) {
            const loc1Select = grid.querySelector(`select[data-chart-id="${chartId}"][data-location="1"]`);
            const loc2Select = grid.querySelector(`select[data-chart-id="${chartId}"][data-location="2"]`);
            if (defaultLoc1 && loc1Select) loc1Select.value = defaultLoc1;
            if (defaultLoc2 && loc2Select) loc2Select.value = defaultLoc2;
        }

        const chartObj = {
            id: chartId,
            instance: null,
            location1: defaultLoc1 || this.getFirstLocation(),
            location2: defaultLoc2 || this.getFirstLocation(),
            monthsForward: 12,
            issueDate: this.getDefaultDate(),
            isLoading: false
        };

        this.charts.push(chartObj);
        this.bindChartEvents(chartId);
        await this.loadChartData(chartId);
    },

    bindChartEvents: function(chartId) {
        const card = document.querySelector(`.chart-card[data-chart-id="${chartId}"]`);

        card.querySelectorAll('.location-select').forEach(select => {
            select.addEventListener('change', (e) => {
                const locationNum = e.target.dataset.location;
                const chart = this.charts.find(c => c.id === chartId);
                if (chart) {
                    chart[`location${locationNum}`] = e.target.value;
                    this.loadChartData(chartId);
                }
            });
        });

        card.querySelectorAll('.months-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                card.querySelectorAll('.months-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');

                const chart = this.charts.find(c => c.id === chartId);
                if (chart) {
                    chart.monthsForward = parseInt(e.target.dataset.months);
                    this.loadChartData(chartId);
                }
            });
        });

        // Calendar button triggers hidden date input
        const calendarBtn = card.querySelector('.calendar-btn');
        const datePickerHidden = card.querySelector('.date-picker-input-hidden');

        if (calendarBtn && datePickerHidden) {
            calendarBtn.addEventListener('click', () => {
                datePickerHidden.showPicker();
            });

            datePickerHidden.addEventListener('change', (e) => {
                const chart = this.charts.find(c => c.id === chartId);
                if (chart) {
                    chart.issueDate = e.target.value;
                    this.loadChartData(chartId);
                }
            });
        }
    },

    generateLocationOptions: function() {
        let html = '';
        Object.keys(this.locations).forEach(region => {
            html += `<optgroup label="${region}">`;
            this.locations[region].forEach(loc => {
                html += `<option value="${loc.value}">${loc.name}</option>`;
            });
            html += '</optgroup>';
        });
        return html;
    },

    getFirstLocation: function() {
        const firstRegion = Object.keys(this.locations)[0];
        return this.locations[firstRegion][0].value;
    },

    getDefaultDate: function() {
        // Default to today
        const today = new Date();
        return today.toISOString().split('T')[0];
    },

    async loadChartData(chartId) {
        const chart = this.charts.find(c => c.id === chartId);
        if (!chart) return;

        if (chart.isLoading) return;

        chart.isLoading = true;
        this.setChartButtonsEnabled(chartId, false);
        this.setStatus('loading', 'LOADING');

        // Get location names for logging
        const loc1Name = this.getLocationName(chart.location1);
        const loc2Name = this.getLocationName(chart.location2);

        this.log(`Chart ${chartId + 1}: Fetching forward curve spread for <strong>${loc1Name}</strong> - <strong>${loc2Name}</strong>`);
        this.log(`Forward horizon: ${chart.monthsForward} months, Issue date: ${chart.issueDate || 'latest'}`);

        try {
            let url = `/api/forward-curve-spread-data?location1=${chart.location1}&location2=${chart.location2}&months_forward=${chart.monthsForward}`;
            if (chart.issueDate) {
                url += `&issue_date=${chart.issueDate}`;
            }

            this.log(`API call: /api/forward-curve-spread-data?location1=${chart.location1}&location2=${chart.location2}&...`);

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error('Failed to fetch data from API');
            }

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            const contracts = data.contracts ? data.contracts.length : 0;
            this.log(`Received ${contracts} contract months in forward curve`, 'success');

            this.renderChart(chartId, data);
            this.setStatus('ready', 'READY');
        } catch (error) {
            console.error('Error loading chart data:', error);
            this.log(`Error: ${error.message}`, 'error');
            this.setStatus('error', 'ERROR');
            const chartDom = document.getElementById(`chart-${chartId}`);
            if (chartDom) {
                chartDom.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#ef4444;font-size:12px;text-align:center;padding:1rem;">Error loading data: ${error.message}</div>`;
            }
        } finally {
            chart.isLoading = false;
            this.setChartButtonsEnabled(chartId, true);
        }
    },

    getLocationName: function(locationCode) {
        for (const region of Object.values(this.locations)) {
            const loc = region.find(l => l.value === locationCode);
            if (loc) return loc.name;
        }
        return locationCode;
    },

    setChartButtonsEnabled: function(chartId, enabled) {
        const card = document.querySelector(`.chart-card[data-chart-id="${chartId}"]`);
        if (!card) return;

        card.querySelectorAll('.months-btn').forEach(btn => {
            btn.disabled = !enabled;
        });

        card.querySelectorAll('.location-select').forEach(select => {
            select.disabled = !enabled;
        });

        const calendarBtn = card.querySelector('.calendar-btn');
        if (calendarBtn) {
            calendarBtn.disabled = !enabled;
        }
    },

    renderChart: function(chartId, data) {
        const chart = this.charts.find(c => c.id === chartId);
        if (!chart) return;

        const chartDom = document.getElementById(`chart-${chartId}`);

        if (chart.instance) {
            chart.instance.dispose();
        }

        chart.instance = echarts.init(chartDom);

        const loc1Name = data.location1_name || 'Location 1';
        const loc2Name = data.location2_name || 'Location 2';
        const contracts = data.contracts || [];
        const spreadData = data.spreads || [];

        // Update trade date info
        const tradeDateInfo = document.getElementById(`trade-date-${chartId}`);
        if (tradeDateInfo && data.trade_date) {
            tradeDateInfo.textContent = `Trade Date: ${data.trade_date}`;
        }

        // Calculate y-axis range
        let yMin = null;
        let yMax = null;
        if (spreadData.length > 0) {
            const validSpreads = spreadData.filter(s => s !== null && s !== undefined);
            if (validSpreads.length > 0) {
                yMin = Math.min(...validSpreads);
                yMax = Math.max(...validSpreads);

                const range = yMax - yMin;
                const padding = range * 0.1;
                yMin = yMin - padding;
                yMax = yMax + padding;
            }
        }

        const option = {
            title: {
                text: `${loc1Name} - ${loc2Name}`,
                textStyle: {
                    fontSize: 12,
                    fontWeight: 600
                },
                left: 10,
                top: 8
            },
            tooltip: {
                trigger: 'axis',
                formatter: function(params) {
                    if (params && params[0]) {
                        const value = params[0].value;
                        return `${params[0].name}<br/>Spread: $${value !== null ? value.toFixed(3) : 'N/A'}`;
                    }
                    return '';
                }
            },
            grid: {
                left: 50,
                right: 15,
                top: 35,
                bottom: 30,
                containLabel: false
            },
            xAxis: {
                type: 'category',
                data: contracts,
                axisLabel: {
                    fontSize: 9,
                    color: '#374151',
                    rotate: 45,
                    interval: function(index) {
                        // Show every 3rd label for contract months
                        return index % 3 === 0;
                    }
                },
                axisTick: {
                    show: false
                },
                axisLine: {
                    lineStyle: { color: '#e5e7eb' }
                }
            },
            yAxis: {
                type: 'value',
                min: yMin,
                max: yMax,
                axisLabel: {
                    fontSize: 9,
                    formatter: function(value) {
                        return '$' + value.toFixed(2);
                    }
                },
                splitLine: {
                    lineStyle: { color: '#f3f4f6' }
                },
                axisLine: {
                    show: false
                },
                axisTick: {
                    show: false
                }
            },
            series: [{
                data: spreadData,
                type: 'line',
                smooth: false,
                lineStyle: {
                    width: 1.5,
                    color: '#3b82f6'
                },
                itemStyle: {
                    color: '#3b82f6'
                },
                symbol: 'none',
                areaStyle: {
                    color: {
                        type: 'linear',
                        x: 0, y: 0, x2: 0, y2: 1,
                        colorStops: [
                            { offset: 0, color: 'rgba(59, 130, 246, 0.15)' },
                            { offset: 1, color: 'rgba(59, 130, 246, 0.02)' }
                        ]
                    }
                }
            }]
        };

        chart.instance.setOption(option);
    }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    ForwardCurveSpreadDashboard.init();
});
