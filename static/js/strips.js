/**
 * Strips Chart - ECharts implementation
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

    // Set default date to today
    const today = new Date();
    document.getElementById('issue_date').value = today.toISOString().split('T')[0];

    // Set up resize handler once
    window.addEventListener('resize', function() {
        if (chart) {
            chart.resize();
        }
    });

    // Form submission handler
    document.getElementById('strips-form').addEventListener('submit', async function(e) {
        e.preventDefault();

        const issueDate = document.getElementById('issue_date').value;
        const location = document.getElementById('location').value;
        const monthsForward = document.getElementById('months_forward').value;
        const locationName = document.getElementById('location').options[document.getElementById('location').selectedIndex].text;

        // Clear previous log
        clearProgressLog();

        // Show loading state
        showLoading();

        try {
            addProgressLog('Preparing forward strips request...');
            addProgressLog(`Issue date: ${issueDate}`);
            addProgressLog(`Location: ${locationName}`);
            addProgressLog(`Months forward: ${monthsForward}`);

            const params = new URLSearchParams({
                issue_date: issueDate,
                location: location,
                months_forward: monthsForward
            });

            addProgressLog('Calling NGI API endpoint: forwardDatafeed.json');
            const response = await fetch(`/api/strips?${params}`);

            if (!response.ok) {
                addProgressLog(`NGI API request failed with status ${response.status}`);
                throw new Error(`API request failed with status ${response.status}`);
            }

            addProgressLog('Received response from NGI API');
            const result = await response.json();

            if (result.success) {
                addProgressLog('Successfully processed forward strips data');
                if (result.data && result.data.months) {
                    addProgressLog(`Found ${result.data.months.length} forward month(s)`);
                }
                renderChart(result.data, location);
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

    function renderChart(data, location) {
        if (!data || !data.months || data.months.length === 0) {
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
            type: 'bar',
            data: s.data,
            emphasis: {
                focus: 'series'
            },
            label: {
                show: true,
                position: 'top',
                formatter: function(params) {
                    return params.value ? '$' + params.value.toFixed(2) : '';
                },
                fontSize: 10
            }
        }));

        const option = {
            title: {
                text: 'Forward Strip Curve',
                subtext: location,
                left: 'center'
            },
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    type: 'shadow'
                },
                formatter: function(params) {
                    let result = `<strong>${params[0].axisValue}</strong><br/>`;
                    params.forEach(param => {
                        if (param.value !== null && param.value !== undefined) {
                            result += `${param.marker} ${param.seriesName}: $${param.value.toFixed(2)}/MMBtu<br/>`;
                        }
                    });
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
                top: '18%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                data: data.months,
                axisLabel: {
                    rotate: 45
                }
            },
            yAxis: {
                type: 'value',
                name: 'Price ($/MMBtu)',
                axisLabel: {
                    formatter: '${value}'
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
