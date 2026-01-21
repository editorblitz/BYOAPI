// NGI Spreads - Frontend Logic

const SpreadsApp = {
    state: {
        chartInstance: null,
        hiddenSeries: new Set(),
        yAxisZoomEnabled: false,
        rawData: null,
        // Full Location Database
        locations: {
            'Favorites': [
                { name: 'National Avg.', value: 'USAVG' },
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
            'South Texas': [
                { name: 'Agua Dulce', value: 'STXAGUAD' },
                { name: 'Florida Gas Zone 1', value: 'STXFGTZ1' },
                { name: 'NGPL S. TX', value: 'STXNGPL' },
                { name: 'Tennessee Zone 0 South', value: 'STXTENN' },
                { name: 'Texas Eastern S. TX', value: 'STXTETCO' },
                { name: 'Transco Zone 1', value: 'STXST30' },
                { name: 'Tres Palacios', value: 'STX3PAL' },
                { name: 'S. TX Regional Avg.', value: 'STXRAVG' }
            ],
            'East Texas': [
                { name: 'Atmos Zone 3', value: 'ETXATMOSZ3' },
                { name: 'Carthage', value: 'ETXCARTH' },
                { name: 'Golden Triangle Storage', value: 'ETXGLDTRI' },
                { name: 'Houston Ship Channel', value: 'ETXHSHIP' },
                { name: 'Katy', value: 'ETXKATY' },
                { name: 'Moss Bluff', value: 'ETXMBSF' },
                { name: 'NGPL TexOk', value: 'ETXNGPL' },
                { name: 'Tennessee Zone 0 North', value: 'ETXTENN' },
                { name: 'Texas Eastern E. TX', value: 'ETXTETCO' },
                { name: 'Tolar Hub', value: 'OTHTOLAR' },
                { name: 'Transco Zone 2', value: 'ETXST45' },
                { name: 'E. TX Regional Avg.', value: 'ETXRAVG' }
            ],
            'West Texas': [
                { name: 'El Paso Permian', value: 'WTXEPP' },
                { name: 'El Paso - Keystone Pool', value: 'WTXEPKEY' },
                { name: 'El Paso - Plains Pool', value: 'WTXEPPL' },
                { name: 'El Paso - Waha Pool', value: 'WTXEPWAHA' },
                { name: 'Northern Natural Gas 1-7', value: 'WTXNNG' },
                { name: 'Oneok WesTex', value: 'WTXONEOK' },
                { name: 'Transwestern', value: 'WTXTW' },
                { name: 'Transwestern - Central', value: 'WTXTWCENT' },
                { name: 'Transwestern - W. TX', value: 'WTXTWOTH' },
                { name: 'Waha', value: 'WTXWAHA' },
                { name: 'W. TX/SE NM Regional Avg.', value: 'WTXRAVG' }
            ],
            'Midwest': [
                { name: 'Alliance', value: 'MCWALL' },
                { name: 'ANR ML7', value: 'MCWML7' },
                { name: 'Chicago Citygate', value: 'MCWCCITY' },
                { name: 'Chicago - Nicor Gas', value: 'MCWCCNICOR' },
                { name: 'Chicago - NIPSCO', value: 'MCWCCNIPS' },
                { name: 'Chicago - North Shore', value: 'MCWCCNSHOR' },
                { name: 'Chicago - Peoples', value: 'MCWCCPEOP' },
                { name: 'Consumers Energy', value: 'MCWCONS' },
                { name: 'Dawn', value: 'MCWDAWN' },
                { name: 'Defiance', value: 'MCWDEFIANCE' },
                { name: 'Rover-ANR', value: 'MCWROVANR' },
                { name: 'Rover-Panhandle', value: 'MCWROVPEPL' },
                { name: 'Emerson', value: 'MCWEMER' },
                { name: 'Joliet', value: 'MCWJOL' },
                { name: 'Lebanon', value: 'NEALEB' },
                { name: 'Michigan Consolidated', value: 'MCWMCON' },
                { name: 'NGPL Amarillo Mainline', value: 'MCWNGPLAM' },
                { name: 'NGPL Iowa-Illinois', value: 'MCWNGPLIOI' },
                { name: 'NGPL MidAmerican', value: 'MCWNGPLMIDAM' },
                { name: 'Parkway/Union', value: 'MCWPARKWAY' },
                { name: 'REX Zone 3 Delivered', value: 'OTHREXZN3DEL' },
                { name: 'REX into ANR - Shelby', value: 'MCWREXANR' },
                { name: 'REX into MGT - Edgar', value: 'MCWREXMGT' },
                { name: 'REX into NGPL - Moultrie', value: 'MCWREXNGPL' },
                { name: 'REX into PEPL - Putnam', value: 'MCWREXPEPL' },
                { name: 'REX into Trunk - Douglas', value: 'MCWREXTRNK' },
                { name: 'Midwest Regional Avg.', value: 'MWERAVG' }
            ],
            'Midcontinent': [
                { name: 'ANR SW', value: 'MCWANR' },
                { name: 'El Paso Anadarko', value: 'MCWEPANDKO' },
                { name: 'Enable East', value: 'MCWNORE' },
                { name: 'NGPL Midcontinent', value: 'MCWNGPL' },
                { name: 'Northern Natural Demarc', value: 'MCWDMARK' },
                { name: 'OGT', value: 'MCWONG' },
                { name: 'Panhandle Eastern', value: 'MCWPEPL' },
                { name: 'Southern Star', value: 'MCWWILL' },
                { name: 'Ventura', value: 'OTHVENTURA' },
                { name: 'Northern Border Ventura', value: 'MCWNBVENT' },
                { name: 'Northern Natural Ventura', value: 'MCWVENT' },
                { name: 'Midcontinent Regional Avg.', value: 'MCTRAVG' }
            ],
            'North Louisiana': [
                { name: 'Enable South', value: 'NLACPTS' },
                { name: 'NGPL Gulf Coast Mainline', value: 'NLANGPLGULFML' },
                { name: 'Perryville', value: 'NLAPERRY' },
                { name: 'Texas Eastern, M1, 24', value: 'ALATETM124' },
                { name: 'Texas Gas Zone 1', value: 'ETXTGT' },
                { name: 'Trunkline Zone 1A', value: 'OTHTRNK1A' },
                { name: 'N. LA Regional Avg.', value: 'NLARAVG' }
            ],
            'South Louisiana': [
                { name: 'ANR SE', value: 'SLAANRSE' },
                { name: 'Bobcat Storage', value: 'STGBOBCAT' },
                { name: 'Columbia Gulf Mainline', value: 'SLACGMAIN' },
                { name: 'Columbia Gulf onshore', value: 'SLACGO' },
                { name: 'Egan Hub', value: 'STGEGAN' },
                { name: 'Florida Gas Zone 2', value: 'SLAFGTZ2' },
                { name: 'Henry Hub', value: 'SLAHH' },
                { name: 'Pine Prairie', value: 'SLAPPSF' },
                { name: 'Southern Natural', value: 'SLASONAT' },
                { name: 'Tennessee Line 500', value: 'SLAT500' },
                { name: 'Tennessee Line 800', value: 'SLAT800' },
                { name: 'Texas Eastern E. LA', value: 'SLATETCOE' },
                { name: 'Texas Eastern W. LA', value: 'SLATETCOW' },
                { name: 'Transco Zone 3 non-St. 65', value: 'SLANONST65' },
                { name: 'Transco Zone 3 St. 65', value: 'SLAST65' },
                { name: 'Trunkline E. LA', value: 'SLATRNKE' },
                { name: 'Trunkline W. LA', value: 'SLATRNKW' },
                { name: 'S. LA Regional Avg.', value: 'SLARAVG' }
            ],
            'Southeast': [
                { name: 'Cove Point', value: 'NEACOVE' },
                { name: 'FGT Citygate', value: 'FLAFGT' },
                { name: 'Florida Gas Zone 3', value: 'SLAFGTZ3' },
                { name: 'Southern Pines', value: 'ALASPSF' },
                { name: 'Tenn Zone 1 100L', value: 'ALATENN1L100' },
                { name: 'Tenn Zone 1 non-St. 87', value: 'SETENN1OTH' },
                { name: 'Tenn Zone 1 St. 87', value: 'SETENN1ST87' },
                { name: 'Texas Eastern M-1, 30', value: 'ALATETM1' },
                { name: 'Transco Zone 4', value: 'ALAST85' },
                { name: 'Transco Zone 5', value: 'NEATRANZ5' },
                { name: 'Transco Zone 5 North', value: 'NEATZ5WGL' },
                { name: 'Transco Zone 5 South', value: 'NEATZ5NWGL' },
                { name: 'Southeast Regional Avg.', value: 'SEREGAVG' }
            ],
            'Appalachia': [
                { name: 'Columbia Gas', value: 'NEATCO' },
                { name: 'Eastern Gas North', value: 'NEACNGNP' },
                { name: 'Eastern Gas South', value: 'NEACNG' },
                { name: 'Millennium East Pool', value: 'NEAMILL' },
                { name: 'Tenn Zone 4 200L', value: 'NEATENN4L200' },
                { name: 'Tennessee Zn 4 313 Pool', value: 'NEATENN4313P' },
                { name: 'Tennessee Zn 4 Marcellus', value: 'NEATENN4MAR' },
                { name: 'Texas Eastern M-2, 30 Receipt', value: 'NEATETM2REC' },
                { name: 'Texas Eastern M-3, Delivery', value: 'NEATETM3DEL' },
                { name: 'Transco-Leidy Line', value: 'NEALEIDYT' },
                { name: 'Appalachia Regional Avg.', value: 'APPREGAVG' }
            ],
            'Northeast': [
                { name: 'Algonquin Citygate', value: 'NEAALGCG' },
                { name: 'Algonquin Citygate (non-G)', value: 'NEALGNG' },
                { name: 'Algonquin Receipts', value: 'NEAALGIN' },
                { name: 'Dracut', value: 'NEADRACUT' },
                { name: 'Iroquois Zone 1', value: 'NEAIROZ1' },
                { name: 'Iroquois Zone 2', value: 'NEAIRO' },
                { name: 'Iroquois, Waddington', value: 'NEAIROWAD' },
                { name: 'Maritimes & Northeast', value: 'NEAMNP' },
                { name: 'Niagara', value: 'MCWNIAGR' },
                { name: 'PNGTS', value: 'NEAPNGTS' },
                { name: 'E Hereford/Pittsburg', value: 'NEAEHPITT' },
                { name: 'PNGTS Non-Border', value: 'NEAPNGTSNBDR' },
                { name: 'Tenn Zone 5 200L', value: 'NEATENN5L200' },
                { name: 'Tenn Zone 5 200L East', value: 'NEATENNZ5E' },
                { name: 'Tenn Zone 5 200L West', value: 'NEATENNZ5W' },
                { name: 'Tenn Zone 6 200L', value: 'NEATENN6L200' },
                { name: 'Tenn Zone 6 200L North', value: 'NEATENNZ6N' },
                { name: 'Tenn Zone 6 200L South', value: 'NEATENNZ6S' },
                { name: 'Transco Zone 6 non-NY', value: 'NEATZ6NNY' },
                { name: 'Transco Zone 6 NY', value: 'NEATZ6NY' },
                { name: 'Northeast Regional Avg.', value: 'NEARAVG' }
            ],
            'Rockies': [
                { name: 'Cheyenne Hub', value: 'RMTCHEY' },
                { name: 'CIG', value: 'RMTCIG' },
                { name: 'CIG DJ Basin', value: 'RMTCIGDJ' },
                { name: 'El Paso Bondad', value: 'RMTEPBON' },
                { name: 'El Paso San Juan', value: 'RMTEPSJ' },
                { name: 'Kingsgate', value: 'RMTKING' },
                { name: 'KRGT Rec Pool', value: 'RMTKR' },
                { name: 'Northwest S. of Green River', value: 'RMTNWSGR' },
                { name: 'Northwest Sumas', value: 'RMTSUMAS' },
                { name: 'Northwest Wyoming Pool', value: 'RMTNWW' },
                { name: 'Opal', value: 'RMTOPAL' },
                { name: 'Questar', value: 'RMTQUEST' },
                { name: 'Ruby - Receipts', value: 'RMTRUBYR' },
                { name: 'Stanfield', value: 'RMTSTAN' },
                { name: 'Transwestern San Juan', value: 'RMTTWSJ' },
                { name: 'White River Hub', value: 'RMTWHITERVR' },
                { name: 'Rocky Mtns. Regional Avg.', value: 'RMTRAVG' }
            ],
            'Arizona/Nevada': [
                { name: 'El Paso S. Mainline/N. Baja', value: 'ARNBAJAN' },
                { name: 'KRGT Del Pool', value: 'ARNKERNDEL' }
            ],
            'California': [
                { name: 'Malin', value: 'CALM400' },
                { name: 'PG&E Citygate', value: 'CALPGCG' },
                { name: 'SoCal Citygate', value: 'CALSCG' },
                { name: 'Southern Border, PG&E', value: 'CALSPGE' },
                { name: 'SoCal Border Avg.', value: 'CALSAVG' },
                { name: 'SoCal Border - Blythe', value: 'CALSAVGBLY' },
                { name: 'SoCal Border - Ehrenberg', value: 'CALSAVGEH' },
                { name: 'SoCal Border - Kern River Station', value: 'CALSAVGKRS' },
                { name: 'SoCal Border - Kramer', value: 'CALSAVGKR' },
                { name: 'SoCal Border - Needles', value: 'CALSAVGNE' },
                { name: 'SoCal Border - Topock', value: 'CALSAVGTPK' },
                { name: 'SoCal Border - Wheeler Ridge', value: 'CALSAVGWR' },
                { name: 'California Regional Avg.', value: 'CALRAVG' }
            ],
            'Canada': [
                { name: 'Alliance (APC) - ATP', value: 'CDNCREC' },
                { name: 'Empress', value: 'CDNEMP' },
                { name: 'NOVA/AECO C', value: 'CDNNOVA' },
                { name: 'Westcoast Station 2', value: 'CDNWST2' }
            ]
        }
    },

    init: function() {
        this.setupEventListeners();
        this.populateRegionSelects();
        this.setDefaultDates();
        this.log('System ready');
    },

    setupEventListeners: function() {
        // Region change handlers
        document.getElementById('regionSelect1').addEventListener('change', () => this.updateLocationSelect(1));
        document.getElementById('regionSelect2').addEventListener('change', () => this.updateLocationSelect(2));

        // Analyze button
        const btn = document.getElementById('analyzeBtn');
        if(btn) {
            btn.addEventListener('click', () => this.analyze());
        }

        // Copy button
        const copyBtn = document.getElementById('copyTableBtn');
        if(copyBtn) {
            copyBtn.addEventListener('click', () => this.copyTable());
        }

        // Y-Axis Zoom toggle
        const yZoomToggle = document.getElementById('toggleYZoom');
        if(yZoomToggle) {
            yZoomToggle.addEventListener('change', (e) => this.toggleYAxisZoom(e.target.checked));
        }

        // Log toggle
        const logToggle = document.getElementById('logToggle');
        const logDrawer = document.getElementById('logDrawer');
        const logArrow = document.getElementById('logArrow');
        if(logToggle && logDrawer) {
            logToggle.addEventListener('click', () => {
                const isOpen = logDrawer.style.height !== '0px' && logDrawer.style.height !== '';
                logDrawer.style.height = isOpen ? '0' : '16rem';
                if(logArrow) {
                    logArrow.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
                }
            });
        }
    },

    populateRegionSelects: function() {
        const regions = Object.keys(this.state.locations);

        [1, 2].forEach(num => {
            const select = document.getElementById(`regionSelect${num}`);
            select.innerHTML = '';
            regions.forEach(region => {
                const option = document.createElement('option');
                option.value = region;
                option.textContent = region;
                select.appendChild(option);
            });
            this.updateLocationSelect(num);
        });
    },

    updateLocationSelect: function(locationNum) {
        const regionSelect = document.getElementById(`regionSelect${locationNum}`);
        const locationSelect = document.getElementById(`locationSelect${locationNum}`);
        const region = regionSelect.value;

        locationSelect.innerHTML = '';

        if (this.state.locations[region]) {
            this.state.locations[region].forEach(loc => {
                const option = document.createElement('option');
                option.value = loc.value;
                option.textContent = loc.name;
                option.dataset.name = loc.name;
                locationSelect.appendChild(option);
            });
        }
    },

    setDefaultDates: function() {
        const today = new Date();
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 30);

        document.getElementById('endDate').value = today.toISOString().split('T')[0];
        document.getElementById('startDate').value = thirtyDaysAgo.toISOString().split('T')[0];
    },

    analyze: async function() {
        const btn = document.getElementById('analyzeBtn');
        btn.textContent = 'Fetching...';
        btn.disabled = true;
        this.setSystemStatus('working');

        this.state.hiddenSeries.clear();

        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        const location1 = document.getElementById('locationSelect1').value;
        const location2 = document.getElementById('locationSelect2').value;

        const location1Name = this.getSelectedLocationName(1);
        const location2Name = this.getSelectedLocationName(2);

        this.log(`Fetching spread data: ${location1Name} vs ${location2Name}`);
        this.log(`Date range: ${startDate} to ${endDate}`);

        const params = new URLSearchParams({
            start_date: startDate,
            end_date: endDate,
            location1: location1,
            location2: location2
        });

        try {
            const response = await fetch(`/api/spreads?${params}`);

            if (!response.ok) {
                throw new Error(`API request failed with status ${response.status}`);
            }

            const result = await response.json();

            if (result.success && result.data) {
                this.state.rawData = result.data;
                this.state.rawData.location1Name = location1Name;
                this.state.rawData.location2Name = location2Name;

                this.renderChart(result.data, location1Name, location2Name);
                this.renderTable(result.data, location1Name, location2Name);

                const pointCount = (result.data.dates && result.data.dates.length) || 0;
                this.log(`Analysis complete. Received ${pointCount} data points.`);
            } else {
                this.log('Error: ' + (result.error || 'Failed to load data'));
                alert(result.error || 'Failed to load data');
            }
        } catch(err) {
            this.log(`Error: ${err.message}`);
            alert(err.message);
        } finally {
            btn.textContent = 'Submit';
            btn.disabled = false;
            this.setSystemStatus('ready');
        }
    },

    renderChart: function(data, location1Name, location2Name) {
        const chartDom = document.getElementById('chartContainer');
        if(!this.state.chartInstance) {
            this.state.chartInstance = echarts.init(chartDom);
            window.addEventListener('resize', () => this.state.chartInstance.resize());
        }

        // Update chart title and subtitle
        this.updateChartHeader(location1Name, location2Name, data);

        // Update custom legend
        this.updateCustomLegend(data);

        // Bloomberg-style chart options
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
                    showDetail: false,
                    borderColor: '#ccc',
                    fillerColor: 'rgba(107, 114, 128, 0.2)',
                    handleStyle: {
                        color: '#666',
                        borderColor: '#999'
                    }
                },
                {
                    type: 'inside',
                    yAxisIndex: 0,
                    filterMode: 'none'
                }
            ] : undefined,
            grid: {
                left: 50,
                right: this.state.yAxisZoomEnabled ? 130 : 60,
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
                return {
                    ...s,
                    type: 'line',
                    lineStyle: {
                        width: 3,
                        color: '#5470C6',
                        opacity: isHidden ? 0 : 1
                    },
                    itemStyle: {
                        color: '#5470C6',
                        opacity: isHidden ? 0 : 1
                    },
                    symbol: 'none',
                    smooth: false,
                    silent: isHidden
                };
            })
        };

        this.state.chartInstance.setOption(option, true);
    },

    toggleYAxisZoom: function(enabled) {
        this.state.yAxisZoomEnabled = enabled;

        if (this.state.chartInstance) {
            const currentOption = this.state.chartInstance.getOption();

            const newOption = {
                ...currentOption,
                dataZoom: enabled ? [
                    {
                        type: 'slider',
                        yAxisIndex: 0,
                        filterMode: 'none',
                        width: 18,
                        right: 5,
                        top: 20,
                        bottom: 50,
                        showDetail: false,
                        borderColor: '#ccc',
                        fillerColor: 'rgba(107, 114, 128, 0.2)',
                        handleStyle: {
                            color: '#666',
                            borderColor: '#999'
                        }
                    },
                    {
                        type: 'inside',
                        yAxisIndex: 0,
                        filterMode: 'none'
                    }
                ] : undefined,
                grid: {
                    left: 50,
                    right: enabled ? 130 : 60,
                    bottom: 50,
                    top: 20,
                    containLabel: false
                }
            };

            this.state.chartInstance.setOption(newOption, { notMerge: true });
        }
    },

    updateChartHeader: function(location1Name, location2Name, data) {
        const titleEl = document.getElementById('chartTitle');
        const subtitleEl = document.getElementById('chartSubtitle');

        const title = `Spread of ${location1Name} to ${location2Name}`;
        const startDate = data.dates[0] || '';
        const endDate = data.dates[data.dates.length - 1] || '';
        const subtitle = `Price spread from ${startDate} to ${endDate}`;

        titleEl.textContent = title;
        subtitleEl.textContent = subtitle;
    },

    updateCustomLegend: function(data) {
        const legendEl = document.getElementById('customLegend');
        legendEl.innerHTML = '';

        const visibleSeries = data.series.filter(s => s.name && s.name !== '');

        visibleSeries.forEach(series => {
            const seriesName = series.name;
            const isHidden = this.state.hiddenSeries.has(seriesName);

            const item = document.createElement('div');
            item.className = 'flex items-center gap-2 cursor-pointer select-none hover:opacity-75 transition-opacity';
            item.addEventListener('click', () => this.toggleSeriesVisibility(seriesName));

            const line = document.createElement('div');
            line.className = 'h-0.5 w-5 transition-opacity';
            line.style.backgroundColor = '#5470C6';
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

            // Calculate new y-axis range
            let minVal = Infinity;
            let maxVal = -Infinity;

            updatedSeries.forEach(s => {
                if (!s.name || s.name === '' || this.state.hiddenSeries.has(s.name)) {
                    return;
                }

                const data = s.data || [];
                data.forEach(val => {
                    if (val !== null && val !== undefined && typeof val === 'number') {
                        minVal = Math.min(minVal, val);
                        maxVal = Math.max(maxVal, val);
                    }
                });
            });

            if (minVal !== Infinity && maxVal !== -Infinity) {
                const range = maxVal - minVal;
                const padding = range * 0.05;
                minVal = minVal - padding;
                maxVal = maxVal + padding;
            } else {
                minVal = undefined;
                maxVal = undefined;
            }

            this.state.chartInstance.setOption({
                series: updatedSeries,
                yAxis: {
                    min: minVal,
                    max: maxVal,
                    scale: true
                }
            });

            // Update legend styling
            const legendEl = document.getElementById('customLegend');
            const items = legendEl.querySelectorAll('div.flex');
            items.forEach((item) => {
                const line = item.querySelector('div.h-0\\.5');
                const label = item.querySelector('span');
                const seriesNameFromLabel = label.textContent;
                const isHidden = this.state.hiddenSeries.has(seriesNameFromLabel);

                if (isHidden) {
                    line.style.opacity = '0.3';
                    label.style.opacity = '0.3';
                    label.style.textDecoration = 'line-through';
                } else {
                    line.style.opacity = '1';
                    label.style.opacity = '1';
                    label.style.textDecoration = 'none';
                }
            });
        }
    },

    renderTable: function(data, location1Name, location2Name) {
        const headerRow = document.getElementById('tableHeaderRow');
        const tbody = document.getElementById('tableBody');

        headerRow.innerHTML = '';
        tbody.innerHTML = '';

        // Headers
        const headers = ['Date', `${location1Name} - ${location2Name} Spread`];
        headers.forEach(col => {
            const th = document.createElement('th');
            th.className = 'px-4 py-2 text-xs font-semibold text-gray-600 bg-gray-100 border-b border-gray-300';
            th.textContent = col;
            headerRow.appendChild(th);
        });

        // Body
        if (!data || !data.dates || data.dates.length === 0) {
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = 2;
            td.className = 'px-4 py-2 text-sm text-gray-500';
            td.textContent = 'No spread data available';
            tr.appendChild(td);
            tbody.appendChild(tr);
            return;
        }

        for (let i = 0; i < data.dates.length; i++) {
            const tr = document.createElement('tr');
            tr.className = 'border-b border-gray-200 hover:bg-gray-50';

            const dateCell = document.createElement('td');
            dateCell.className = 'px-4 py-2 text-sm text-gray-700';
            dateCell.textContent = data.dates[i];
            tr.appendChild(dateCell);

            const spreadCell = document.createElement('td');
            spreadCell.className = 'px-4 py-2 text-sm text-gray-700';
            const spread = data.series[0].data[i];
            if (spread !== null && spread !== undefined) {
                const sign = spread >= 0 ? '+' : '';
                spreadCell.textContent = `${sign}$${spread.toFixed(3)}`;
                if (spread > 0) {
                    spreadCell.classList.add('text-green-600');
                } else if (spread < 0) {
                    spreadCell.classList.add('text-red-600');
                }
            } else {
                spreadCell.textContent = 'N/A';
            }
            tr.appendChild(spreadCell);

            tbody.appendChild(tr);
        }
    },

    copyTable: function() {
        const table = document.querySelector('#tableBody').closest('table');
        if (!table) {
            alert('No table data to copy!');
            return;
        }

        let text = '';
        for (let i = 0, row; row = table.rows[i]; i++) {
            for (let j = 0, col; col = row.cells[j]; j++) {
                text += col.innerText + (j < row.cells.length - 1 ? '\t' : '');
            }
            text += '\n';
        }

        navigator.clipboard.writeText(text)
            .then(() => {
                this.log('Spread table copied to clipboard');
                alert('Spread table copied to clipboard!');
            })
            .catch(err => alert('Error copying text: ' + err));
    },

    getSelectedLocationName: function(locationNum) {
        const locationSelect = document.getElementById(`locationSelect${locationNum}`);
        if (locationSelect.selectedIndex >= 0) {
            return locationSelect.options[locationSelect.selectedIndex].dataset.name ||
                   locationSelect.options[locationSelect.selectedIndex].text;
        }
        return 'Unknown Location';
    },

    log: function(message) {
        const logContent = document.getElementById('logContent');
        const lastLogMsg = document.getElementById('lastLogMsg');

        if (logContent) {
            const timestamp = new Date().toLocaleTimeString();
            const entry = document.createElement('div');
            entry.textContent = `[${timestamp}] ${message}`;
            entry.className = 'mb-1';
            logContent.appendChild(entry);
            logContent.scrollTop = logContent.scrollHeight;
        }

        if (lastLogMsg) {
            lastLogMsg.textContent = message;
        }
    },

    setSystemStatus: function(status) {
        const statusDot = document.getElementById('statusDot');
        const statusLabel = document.getElementById('statusLabel');

        if (!statusDot || !statusLabel) return;

        const base = 'w-2 h-2';
        switch(status) {
            case 'working':
                statusDot.className = `${base} bg-blue-500 animate-pulse`;
                statusLabel.textContent = 'Working';
                break;
            case 'error':
                statusDot.className = `${base} bg-red-500`;
                statusLabel.textContent = 'Attention Needed';
                break;
            default:
                statusDot.className = `${base} bg-green-500`;
                statusLabel.textContent = 'Ready';
        }
    }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    SpreadsApp.init();
});
