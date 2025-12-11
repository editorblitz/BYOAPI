/**
 * LNG Flows Chart - ECharts implementation
 */

(function() {
    'use strict';

    // Initialize chart
    const chartDom = document.getElementById('chart');
    const progressLog = document.getElementById('progressLog');
    let chart = null;

    /**
     * Add a message to the progress log
     * @param {string} message - The message to log
     */
    function addProgressLog(message) {
        const logEntry = document.createElement('div');
        logEntry.textContent = message;
        progressLog.appendChild(logEntry);
        progressLog.scrollTop = progressLog.scrollHeight;
    }

    /**
     * Clear the progress log
     */
    function clearProgressLog() {
        progressLog.innerHTML = '';
    }

    // Set default dates
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);

    document.getElementById('end_date').value = today.toISOString().split('T')[0];
    document.getElementById('start_date').value = thirtyDaysAgo.toISOString().split('T')[0];

    // Set up resize handler once
    window.addEventListener('resize', function() {
        if (chart) {
            chart.resize();
        }
    });

    // Form submission handler
    document.getElementById('lng-form').addEventListener('submit', async function(e) {
        e.preventDefault();

        const startDate = document.getElementById('start_date').value;
        const endDate = document.getElementById('end_date').value;
        const terminal = document.getElementById('terminal').value;

        // Clear previous log
        clearProgressLog();

        // Show loading state
        showLoading();

        try {
            addProgressLog('Preparing LNG flows data request...');
            addProgressLog(`Date range: ${startDate} to ${endDate}`);
            if (terminal) {
                addProgressLog(`Filtering for terminal: ${terminal}`);
            } else {
                addProgressLog('Loading data for all terminals');
            }

            const params = new URLSearchParams({
                start_date: startDate,
                end_date: endDate
            });

            if (terminal) {
                params.append('terminal', terminal);
            }

            addProgressLog('Calling NGI API endpoint: lngFlowsDatafeed.json');
            const response = await fetch(`/api/lng-flows?${params}`);

            if (!response.ok) {
                addProgressLog(`NGI API request failed with status ${response.status}`);
                throw new Error(`API request failed with status ${response.status}`);
            }

            addProgressLog('Received response from NGI API');
            const result = await response.json();

            if (result.success) {
                addProgressLog('Successfully processed LNG flows data');
                if (result.data && result.data.series) {
                    addProgressLog(`Found ${result.data.series.length} terminal(s) with data`);
                }
                renderChart(result.data);
            } else {
                addProgressLog('Error: ' + (result.error || 'Failed to load data'));
                showError(result.error || 'Failed to load data');
            }
        } catch (error) {
            addProgressLog('Network error: ' + error.message);
            showError('Network error. Please try again.');
            console.error('Fetch error:', error);
        }
    });

    function showLoading() {
        if (chart) {
            chart.showLoading();
        } else {
            chartDom.innerHTML = '<div class="chart-loading">Loading data...</div>';
        }
    }

    function showError(message) {
        // Dispose of chart if it exists
        if (chart) {
            chart.dispose();
            chart = null;
        }
        chartDom.innerHTML = `<div class="chart-error">${message}</div>`;
    }

    function renderChart(data) {
        if (!data || !data.dates || data.dates.length === 0) {
            showError('No data available for the selected criteria');
            return;
        }

        // Initialize or get existing chart instance
        if (!chart) {
            chartDom.innerHTML = '';
            chart = echarts.init(chartDom);
        } else {
            chart.hideLoading();
        }

        const series = data.series.map(s => ({
            name: s.name,
            type: 'line',
            stack: 'Total',
            areaStyle: {},
            data: s.data,
            smooth: false,
            emphasis: {
                focus: 'series'
            }
        }));

        const option = {
            title: {
                text: 'LNG Export Flows',
                left: 'center'
            },
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    type: 'cross'
                },
                formatter: function(params) {
                    let result = `<strong>${params[0].axisValue}</strong><br/>`;
                    let total = 0;
                    params.forEach(param => {
                        if (param.value !== null && param.value !== undefined) {
                            result += `${param.marker} ${param.seriesName}: ${param.value.toLocaleString()} MMcf/d<br/>`;
                            total += param.value;
                        }
                    });
                    result += `<strong>Total: ${total.toLocaleString()} MMcf/d</strong>`;
                    return result;
                }
            },
            legend: {
                bottom: 0,
                data: data.series.map(s => s.name)
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '15%',
                top: '15%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                boundaryGap: false,
                data: data.dates,
                axisLabel: {
                    rotate: 45
                }
            },
            yAxis: {
                type: 'value',
                name: 'Flow (MMcf/d)',
                axisLabel: {
                    formatter: function(value) {
                        return value.toLocaleString();
                    }
                }
            },
            series: series,
            dataZoom: [
                {
                    type: 'inside',
                    start: 0,
                    end: 100
                },
                {
                    start: 0,
                    end: 100
                }
            ]
        };

        chart.setOption(option);
    }
})();
