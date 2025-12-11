// Year-on-Year JavaScript for NGI Price Data visualization

let chart = null;

// Initialize the dashboard
document.addEventListener('DOMContentLoaded', function() {
    initializeChart();
    updateLocations(); // Initialize locations dropdown

    // Set default to Henry Hub if available
    setTimeout(() => {
        const locationSelect = document.getElementById('locationSelect');
        for (let option of locationSelect.options) {
            if (option.value === 'SLAHH') {
                option.selected = true;
                break;
            }
        }
        // Load initial chart data
        loadChartData();
    }, 100);

    // Add form submit handler
    document.getElementById('chartForm').addEventListener('submit', function(e) {
        e.preventDefault();
        loadChartData();
    });

    // Add radio button change handlers
    document.getElementById('modeFullYear').addEventListener('change', updateComparisonDescription);
    document.getElementById('modeYTD').addEventListener('change', updateComparisonDescription);
    document.getElementById('modeFiveYear').addEventListener('change', updateComparisonDescription);
});

function initializeChart() {
    const chartDom = document.getElementById('priceChart');
    chart = echarts.init(chartDom);

    // Set loading state
    chart.showLoading();
}

function updateLocations() {
    const regionSelect = document.getElementById('regionSelect');
    const locationSelect = document.getElementById('locationSelect');
    const selectedRegion = regionSelect.value;

    // Clear current options
    locationSelect.innerHTML = '<option value="">Select Location</option>';

    if (!selectedRegion || !locationsByRegion[selectedRegion]) {
        return;
    }

    // Add locations for selected region
    locationsByRegion[selectedRegion].forEach((location, index) => {
        const option = document.createElement('option');
        option.value = location.point_code;
        option.textContent = `${location.location_name} (${location.point_code})`;
        // Auto-select the first location
        if (index === 0) {
            option.selected = true;
        }
        locationSelect.appendChild(option);
    });
}

function selectLocation(locationCode) {
    // Set the region and location dropdowns
    const locationSelect = document.getElementById('locationSelect');

    // Find which region this location belongs to
    for (const [region, locations] of Object.entries(locationsByRegion)) {
        const location = locations.find(loc => loc.point_code === locationCode);
        if (location) {
            document.getElementById('regionSelect').value = region;
            updateLocations();
            setTimeout(() => {
                locationSelect.value = locationCode;
                loadChartData();
            }, 50);
            break;
        }
    }
}

function updateComparisonDescription() {
    const comparisonMode = document.querySelector('input[name="comparisonMode"]:checked').value;
    const description = document.getElementById('comparisonDescription');

    switch (comparisonMode) {
        case 'full':
            description.textContent = 'Full previous year vs. current year (Jan 1 - present)';
            break;
        case 'ytd':
            description.textContent = 'Same period comparison: year-to-date only';
            break;
        case 'fiveyear':
            description.textContent = 'Current year vs. five-year high/low range (daily flow dates)';
            break;
    }
}

function loadChartData() {
    const locationCode = document.getElementById('locationSelect').value;
    const comparisonMode = document.querySelector('input[name="comparisonMode"]:checked').value;

    if (!locationCode) {
        alert('Please select a location');
        return;
    }

    chart.showLoading();

    let url;
    if (comparisonMode === 'fiveyear') {
        url = `/api/five-year-range-data?location=${locationCode}`;
    } else {
        url = `/api/year-on-year-data?location=${locationCode}&mode=${comparisonMode}`;
    }

    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                throw new Error(data.error);
            }

            // Clear the chart completely before updating with new mode
            chart.clear();

            if (comparisonMode === 'fiveyear') {
                updateFiveYearChart(data);
                updateFiveYearChartInfo(data);
            } else {
                updateChart(data);
                updateChartInfo(data);
            }
        })
        .catch(error => {
            console.error('Error loading chart data:', error);
            alert('Error loading chart data: ' + error.message);
        })
        .finally(() => {
            chart.hideLoading();
        });
}

function updateChart(data) {
    const titleSuffix = data.comparison_mode === 'full' ? ' (Full Year)' : ' (YTD)';
    const option = {
        title: {
            text: `${data.location_name} - ${data.current_year} vs ${data.previous_year}${titleSuffix}`,
            left: 'center',
            top: 10
        },
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'cross'
            },
            formatter: function(params) {
                let result = params[0].axisValue + '<br/>';
                params.forEach(param => {
                    if (param.value !== null && param.value !== undefined) {
                        const value = '$' + param.value.toFixed(3);
                        result += `${param.seriesName}: ${value}<br/>`;
                    }
                });
                return result;
            }
        },
        legend: {
            data: [`${data.current_year}`, `${data.previous_year}`],
            bottom: 10,
            left: 'center'
        },
        grid: {
            left: '8%',
            right: '4%',
            bottom: '15%',
            top: '15%',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            data: data.dates,
            axisLabel: {
                rotate: 45,
                formatter: function(value) {
                    // Convert MM-DD to readable format
                    const [month, day] = value.split('-');
                    const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                                      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    return `${monthNames[parseInt(month)]} ${parseInt(day)}`;
                }
            }
        },
        yAxis: {
            type: 'value'
        },
        dataZoom: [
            {
                type: 'inside',
                yAxisIndex: 0,
                filterMode: 'none'
            },
            {
                type: 'slider',
                yAxisIndex: 0,
                filterMode: 'none',
                width: 20,
                right: 10,
                top: 60,
                bottom: 60
            }
        ],
        series: [
            {
                name: `${data.current_year}`,
                data: data.current_year_prices,
                type: 'line',
                smooth: true,
                symbol: 'none',
                connectNulls: true,
                lineStyle: {
                    color: '#d62728',
                    width: 2
                },
                itemStyle: {
                    color: '#d62728'
                }
            },
            {
                name: `${data.previous_year}`,
                data: data.previous_year_prices,
                type: 'line',
                smooth: true,
                symbol: 'none',
                connectNulls: true,
                lineStyle: {
                    color: '#4682B4',
                    width: 2,
                    type: 'dashed'
                },
                itemStyle: {
                    color: '#4682B4'
                }
            }
        ]
    };

    chart.setOption(option);
}

function updateFiveYearChart(data) {
    // Debug logging
    console.log('Five-year data received:', data);
    console.log('Debug info:', data.debug_info);

    // Convert daily prices object to array aligned with dates
    const currentYearPrices = data.dates.map(dateKey => data.current_year_prices[dateKey] || null);

    // Debug sample data
    console.log('Sample current year prices:', currentYearPrices.slice(0, 10));
    console.log('Sample five-year highs:', data.five_year_high.slice(0, 10));
    console.log('Sample five-year lows:', data.five_year_low.slice(0, 10));

    const option = {
        title: {
            text: `${data.location_name} - ${data.current_year} vs 5-Year Range`,
            left: 'center',
            top: 10
        },
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'cross'
            },
            formatter: function(params) {
                let result = params[0].axisValue + '<br/>';
                params.forEach(param => {
                    if (param.value !== null && param.value !== undefined) {
                        const value = '$' + param.value.toFixed(3);
                        result += `${param.seriesName}: ${value}<br/>`;
                    }
                });
                return result;
            }
        },
        legend: {
            data: [`${data.current_year}`, '5-Year Range', '5-Year Average'],
            bottom: 10,
            left: 'center'
        },
        grid: {
            left: '8%',
            right: '4%',
            bottom: '15%',
            top: '15%',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            data: data.dates,
            axisLabel: {
                rotate: 45,
                formatter: function(value) {
                    // Convert MM-DD to readable format
                    const [month, day] = value.split('-');
                    const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                                      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    return `${monthNames[parseInt(month)]} ${parseInt(day)}`;
                }
            }
        },
        yAxis: {
            type: 'value'
        },
        dataZoom: [
            {
                type: 'inside',
                yAxisIndex: 0,
                filterMode: 'none'
            },
            {
                type: 'slider',
                yAxisIndex: 0,
                filterMode: 'none',
                width: 20,
                right: 10,
                top: 60,
                bottom: 60
            }
        ],
        series: [
            {
                name: '', // Hidden series for bottom of range
                type: 'line',
                data: data.five_year_low,
                lineStyle: {
                    opacity: 0
                },
                areaStyle: {
                    opacity: 0
                },
                stack: 'range',
                symbol: 'none',
                legendHoverLink: false,
                silent: true
            },
            {
                name: '5-Year Range',
                type: 'line',
                data: data.five_year_low.map((low, index) =>
                    data.five_year_high[index] !== null && low !== null ?
                    data.five_year_high[index] - low : null
                ),
                lineStyle: {
                    opacity: 0
                },
                areaStyle: {
                    color: 'rgba(70, 130, 180, 0.4)' // Darker steel blue with more opacity
                },
                itemStyle: {
                    color: 'rgba(70, 130, 180, 0.8)' // Darker blue for legend
                },
                stack: 'range',
                symbol: 'none'
            },
            {
                name: '5-Year Average',
                data: data.five_year_average,
                type: 'line',
                smooth: true,
                symbol: 'none',
                connectNulls: true,
                lineStyle: {
                    color: '#4682B4',
                    width: 1,
                    type: 'dashed'
                },
                itemStyle: {
                    color: '#4682B4'
                }
            },
            {
                name: `${data.current_year}`,
                data: currentYearPrices,
                type: 'line',
                smooth: true,
                symbol: 'none',
                connectNulls: true,
                lineStyle: {
                    color: '#d62728',
                    width: 2
                },
                itemStyle: {
                    color: '#d62728'
                }
            }
        ]
    };

    chart.setOption(option);
}

function updateChartInfo(data) {
    document.getElementById('chartLocationName').textContent = data.location_name;
    document.getElementById('chartRegionName').textContent = data.region_name;
    document.getElementById('currentYearRecords').textContent = data.current_year_records.toLocaleString();
    document.getElementById('previousYearRecords').textContent = data.previous_year_records.toLocaleString();

    document.getElementById('chartInfo').style.display = 'block';

    // Show copy data button and store data
    document.getElementById('copyDataBtn').style.display = 'inline-block';
    window.currentChartData = data;
}

function updateFiveYearChartInfo(data) {
    document.getElementById('chartLocationName').textContent = data.location_name;
    document.getElementById('chartRegionName').textContent = data.region_name;
    document.getElementById('currentYearRecords').textContent = data.current_year_records.toLocaleString();
    document.getElementById('previousYearRecords').textContent =
        `Years: ${data.years_included.join(', ')}`;

    document.getElementById('chartInfo').style.display = 'block';

    // Show copy data button and store data
    document.getElementById('copyDataBtn').style.display = 'inline-block';
    window.currentChartData = data;
}

function copyChartDataToClipboard() {
    if (!window.currentChartData) {
        alert('No chart data available to copy');
        return;
    }

    const data = window.currentChartData;
    let tsvContent = '';

    // Different formats based on chart type
    if (data.five_year_average) {
        // Five-year range format
        tsvContent = 'Date\tCurrent Year\t5-Year Average\t5-Year Low\t5-Year High\n';
        data.dates.forEach((date, index) => {
            const current = data.current_year_prices[index] !== null ? data.current_year_prices[index].toFixed(3) : 'N/A';
            const fiveYearAvg = data.five_year_average[index] !== null ? data.five_year_average[index].toFixed(3) : 'N/A';
            const fiveYearLow = data.five_year_low[index] !== null ? data.five_year_low[index].toFixed(3) : 'N/A';
            const fiveYearHigh = data.five_year_high[index] !== null ? data.five_year_high[index].toFixed(3) : 'N/A';
            tsvContent += `${date}\t${current}\t${fiveYearAvg}\t${fiveYearLow}\t${fiveYearHigh}\n`;
        });
    } else {
        // Year-on-year format
        tsvContent = 'Date\tCurrent Year\tPrevious Year\n';
        data.dates.forEach((date, index) => {
            const current = data.current_year_prices[index] !== null ? data.current_year_prices[index].toFixed(3) : 'N/A';
            const previous = data.previous_year_prices[index] !== null ? data.previous_year_prices[index].toFixed(3) : 'N/A';
            tsvContent += `${date}\t${current}\t${previous}\n`;
        });
    }

    // Copy to clipboard
    navigator.clipboard.writeText(tsvContent).then(() => {
        // Temporarily change button text to show success
        const btn = document.getElementById('copyDataBtn');
        const originalText = btn.value;
        btn.value = 'Copied!';
        setTimeout(() => {
            btn.value = originalText;
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy data:', err);
        alert('Failed to copy data to clipboard');
    });
}