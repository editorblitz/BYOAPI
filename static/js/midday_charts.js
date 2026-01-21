/**
 * Midday Charts - Publication-ready NGI midday alert charts
 * Generates single-location charts at 750x400px, exports as 828x447px WebP
 */

const MiddayCharts = {
    chart: null,
    currentLocationName: '',

    // Location data
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
            { name: 'Enterprise Pipeline-S. TX MAP', value: 'STXMAP' },
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
            { name: 'Gulf South Pool 16', value: 'ETXGS16P' },
            { name: 'Houston Ship Channel', value: 'ETXHSHIP' },
            { name: 'Katy', value: 'ETXKATY' },
            { name: 'NGPL TexOk', value: 'ETXNGPL' },
            { name: 'Texas Eastern E. TX', value: 'ETXTETCO' },
            { name: 'Tolar Hub', value: 'OTHTOLAR' },
            { name: 'Transco Zone 2', value: 'ETXST45' },
            { name: 'E. TX Regional Avg.', value: 'ETXRAVG' }
        ],
        'West Texas': [
            { name: 'El Paso Permian', value: 'WTXEPP' },
            { name: 'El Paso - Keystone', value: 'WTXEPKEY' },
            { name: 'El Paso - Plains Pool', value: 'WTXEPPL' },
            { name: 'El Paso - Waha', value: 'WTXEPW' },
            { name: 'Oneok WesTex', value: 'WTXONEOK' },
            { name: 'Transwestern', value: 'WTXTW' },
            { name: 'Transwestern - W. TX', value: 'WTXTWOTH' },
            { name: 'Waha', value: 'WTXWAHA' },
            { name: 'W. TX/SE NM Regional Avg.', value: 'WTXRAVG' }
        ],
        'Midwest': [
            { name: 'Chicago Citygate', value: 'MCWCCITY' },
            { name: 'Chicago - Nicor Gas', value: 'MCWCCNICOR' },
            { name: 'Chicago - NIPSCO', value: 'MCWCCNIPS' },
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
            { name: 'Perryville', value: 'NLAPERRY' },
            { name: 'Texas Eastern, M1, 24', value: 'ALATETM124' },
            { name: 'Texas Gas Zone 1', value: 'ETXTGT' },
            { name: 'Trunkline Zone 1A', value: 'OTHTRNK1A' },
            { name: 'N. LA Regional Avg.', value: 'NLARAVG' }
        ],
        'South Louisiana': [
            { name: 'ANR SE', value: 'SLAANRSE' },
            { name: 'Columbia Gulf Mainline', value: 'SLACGMAIN' },
            { name: 'Columbia Gulf onshore', value: 'SLACGO' },
            { name: 'Henry Hub', value: 'SLAHH' },
            { name: 'Pine Prairie', value: 'SLAPPSF' },
            { name: 'Southern Natural', value: 'SLASONAT' },
            { name: 'Tennessee Line 500', value: 'SLAT500' },
            { name: 'Tennessee Line 800', value: 'SLAT800' },
            { name: 'Texas Eastern E. LA', value: 'SLATETCOE' },
            { name: 'Texas Eastern W. LA', value: 'SLATETCOW' },
            { name: 'Transco Zone 3 St. 65', value: 'SLAST65' },
            { name: 'S. LA Regional Avg.', value: 'SLARAVG' }
        ],
        'Southeast': [
            { name: 'Florida Gas Zone 3', value: 'SLAFGTZ3' },
            { name: 'Tenn Zone 1 100L', value: 'ALATENN1L100' },
            { name: 'Tenn Zone 1 St. 87', value: 'SETENN1ST87' },
            { name: 'Texas Eastern M-1, 30', value: 'ALATETM1' },
            { name: 'Transco Zone 4', value: 'ALAST85' },
            { name: 'Transco Zone 5', value: 'NEATRANZ5' },
            { name: 'Transco Zone 5 North', value: 'NEATZ5WGL' },
            { name: 'Transco Zone 5 South', value: 'NEATZ5NWGL' },
            { name: 'Transco Zone 5 St. 165', value: 'SEST165' },
            { name: 'Southeast Regional Avg.', value: 'SEREGAVG' }
        ],
        'Appalachia': [
            { name: 'Columbia Gas', value: 'NEATCO' },
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
            { name: 'Iroquois Zone 2', value: 'NEAIRO' },
            { name: 'Iroquois, Waddington', value: 'NEAIROWAD' },
            { name: 'Niagara', value: 'MCWNIAGR' },
            { name: 'Tenn Zone 5 200L', value: 'NEATENN5L200' },
            { name: 'Tenn Zone 5 200L East', value: 'NEATENNZ5E' },
            { name: 'Tenn Zone 6 200L', value: 'NEATENN6L200' },
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
            { name: 'MountainWest', value: 'RMTQUEST' },
            { name: 'Northwest Sumas', value: 'RMTSUMAS' },
            { name: 'Northwest Wyoming Pool', value: 'RMTNWW' },
            { name: 'Opal', value: 'RMTOPAL' },
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
            { name: 'SoCal Border - Ehrenberg', value: 'CALSAVGEH' },
            { name: 'SoCal Border - Kern River Station', value: 'CALSAVGKRS' },
            { name: 'SoCal Border - Kramer', value: 'CALSAVGKR' },
            { name: 'SoCal Border - Needles', value: 'CALSAVGNE' },
            { name: 'California Regional Avg.', value: 'CALRAVG' }
        ],
        'Canada': [
            { name: 'Alliance (APC) - ATP', value: 'CDNCREC' },
            { name: 'Empress', value: 'CDNEMP' },
            { name: 'NOVA/AECO C', value: 'CDNNOVA' },
            { name: 'Westcoast Station 2', value: 'CDNWST2' }
        ]
    },

    init: function() {
        this.setupDropdowns();
        this.bindEvents();
        this.setupLogToggle();
        this.log('Midday Charts system initialized.');
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

    setupLogToggle: function() {
        const logToggle = document.getElementById('logToggle');
        const logDrawer = document.getElementById('logDrawer');
        const logArrow = document.getElementById('logArrow');

        if(logToggle) {
            logToggle.addEventListener('click', () => {
                const isOpen = logDrawer.style.height !== '0px' && logDrawer.style.height !== '';
                if(isOpen) {
                    logDrawer.style.height = '0';
                    logArrow.style.transform = 'rotate(0deg)';
                } else {
                    logDrawer.style.height = '16rem';
                    logArrow.style.transform = 'rotate(180deg)';
                }
            });
        }
    },

    setupDropdowns: function() {
        const regionSelect = document.getElementById('regionSelect');
        const locationSelect = document.getElementById('locationSelect');

        // Populate regions
        Object.keys(this.locations).forEach(region => {
            const option = document.createElement('option');
            option.value = region;
            option.textContent = region;
            regionSelect.appendChild(option);
        });

        // Set default to Favorites
        regionSelect.value = 'Favorites';
        this.updateLocations();
    },

    updateLocations: function() {
        const regionSelect = document.getElementById('regionSelect');
        const locationSelect = document.getElementById('locationSelect');
        const region = regionSelect.value;

        locationSelect.innerHTML = '';

        const locs = this.locations[region] || [];
        locs.forEach(loc => {
            const option = document.createElement('option');
            option.value = loc.value;
            option.textContent = loc.name;
            locationSelect.appendChild(option);
        });
    },

    bindEvents: function() {
        document.getElementById('regionSelect').addEventListener('change', () => this.updateLocations());
        document.getElementById('generateBtn').addEventListener('click', () => this.handleGenerate());
        document.getElementById('downloadBtn').addEventListener('click', () => this.downloadChart());
        document.getElementById('updateChartBtn').addEventListener('click', () => this.handleGenerate());
    },

    handleGenerate: async function() {
        try {
            const location = document.getElementById('locationSelect').value;
            this.currentLocationName = document.querySelector('#locationSelect option:checked').textContent;

            const startDate = document.getElementById('startDate').value;
            const endDate = document.getElementById('endDate').value;

            // Validate dates only if both are provided (for updates)
            if (startDate && endDate && startDate > endDate) {
                alert('Start date must be before end date.');
                return;
            }

            // Build URL with optional date params
            let url = `/api/quick-charts?type=midday&location=${location}`;
            if (startDate && endDate) {
                url += `&start_date=${startDate}&end_date=${endDate}`;
                this.log(`Fetching midday chart for ${this.currentLocationName} from ${startDate} to ${endDate}...`);
            } else {
                this.log(`Fetching midday chart for ${this.currentLocationName} (last 12 months)...`);
            }

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch data: ${response.status}`);
            }
            const data = await response.json();
            this.log(`Received ${data.dates.length} data points for midday chart.`);

            this.renderChart(data);
            this.log(`Chart rendered: <strong>750×400px</strong> display (aspect ratio 15:8) • Exports as <strong>828×447px WebP</strong>`);

            // Show download button and date range section
            document.getElementById('downloadBtn').classList.remove('hidden');
            document.getElementById('dateRangeSection').classList.remove('hidden');

            // Update date inputs to show actual data range
            if (data.dates && data.dates.length > 0) {
                document.getElementById('startDate').value = data.dates[0];
                document.getElementById('endDate').value = data.dates[data.dates.length - 1];
            }
        } catch (error) {
            console.error('Error fetching chart data:', error);
            this.log(`<span class="text-red-400">Error: ${error.message}</span>`);
            alert('Failed to load chart data. Please try again.');
        }
    },

    renderChart: function(data) {
        const chartDom = document.getElementById('chart');

        // Dispose of existing chart instance to prevent conflicts
        if (this.chart) {
            this.chart.dispose();
        }

        // Create fresh chart instance
        this.chart = echarts.init(chartDom);

        // Use data as-is (API returns the requested date range)
        const limitedAverages = data.averages;
        const limitedDates = data.dates;

        // Calculate Y-axis bounds
        const validPrices = limitedAverages.filter(price => !isNaN(price) && price !== null);
        const minPrice = Math.min(...validPrices);
        const maxPrice = Math.max(...validPrices);

        const interval = this.calculateYAxisInterval(minPrice, maxPrice);
        const adjustedMinPrice = Math.floor(minPrice / interval) * interval;
        const adjustedMaxPrice = Math.ceil(maxPrice / interval) * interval;

        // Reformat dates to DD-Mon-YYYY
        const reformattedDates = limitedDates.map(dateStr => {
            const [year, month, day] = dateStr.split('-');
            const monthMap = {
                '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr', '05': 'May', '06': 'Jun',
                '07': 'Jul', '08': 'Aug', '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec'
            };
            return `${day}-${monthMap[month]}-${year}`;
        });

        const option = {
            toolbox: {
                show: false
            },
            textStyle: {
                fontFamily: 'Arial'
            },
            title: [{
                text: `NGI's ${data.location_name} MidDay Alert Price`,
                left: '3%',
                top: '10',
                textStyle: {
                    color: '#003A50',
                    fontWeight: 'bold',
                    fontSize: 24
                }
            }],
            graphic: [
                {
                    type: 'image',
                    right: 40,
                    top: 18,
                    style: {
                        image: '/static/images/ngi_logo.png',
                        width: 70,
                        height: 35
                    }
                },
                {
                    type: 'group',
                    left: 'center',
                    top: 63,
                    children: [{
                        type: 'rect',
                        z: 100,
                        left: 'center',
                        top: 'middle',
                        shape: {
                            width: 700,
                            height: 1.4
                        },
                        style: {
                            fill: '#003A50'
                        }
                    }]
                },
                {
                    type: 'text',
                    left: '3.5%',
                    bottom: '1.6%',
                    style: {
                        text: "{bold|Source:} NGI's MidDay Price Alert",
                        font: '14px Arial',
                        rich: {
                            bold: {
                                fontWeight: 'bold',
                                fontSize: 14,
                                fontFamily: 'Arial'
                            }
                        },
                        fill: '#000'
                    }
                }
            ],
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    type: 'cross'
                }
            },
            grid: {
                left: '7.7%',
                right: '4%',
                top: '22%',
                bottom: '8%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                boundaryGap: false,
                data: reformattedDates,
                axisLabel: {
                    rotate: 45,
                    interval: (index) => {
                        const totalDataPoints = limitedDates.length;
                        const lastIndex = totalDataPoints - 1;
                        const numIntervals = 12;
                        const step = lastIndex / numIntervals;
                        const labelIndices = [];
                        for (let i = 0; i <= numIntervals; i++) {
                            labelIndices.push(Math.round(i * step));
                        }
                        // Always include the last index to show the latest date
                        if (!labelIndices.includes(lastIndex)) {
                            labelIndices.push(lastIndex);
                        }
                        return labelIndices.includes(index);
                    },
                    verticalAlign: 'top',
                    align: 'right',
                    fontSize: 13,
                    fontWeight: 510,
                    color: 'black'
                },
                axisLine: {
                    lineStyle: {
                        color: '#D3D3D3'
                    }
                },
                axisTick: {
                    alignWithLabel: true,
                    lineStyle: {
                        color: '#D3D3D3'
                    }
                }
            },
            yAxis: {
                type: 'value',
                name: '$US/MMBtu',
                nameLocation: 'middle',
                nameGap: 70,
                nameTextStyle: {
                    fontWeight: 750,
                    fontSize: 12,
                    color: 'black'
                },
                min: adjustedMinPrice,
                max: adjustedMaxPrice,
                interval: interval,
                axisLine: {
                    show: false
                },
                axisLabel: {
                    formatter: function(value) {
                        if (value < 0) {
                            return `{red|$${value.toFixed(3)}}`;
                        } else {
                            return `$${value.toFixed(3)}`;
                        }
                    },
                    textStyle: {
                        fontFamily: 'Arial',
                        fontSize: 14,
                        color: 'black'
                    },
                    rich: {
                        red: {
                            color: 'red',
                            fontFamily: 'Arial',
                            fontSize: 13
                        }
                    }
                },
                splitLine: {
                    lineStyle: {
                        color: '#D3D3D3',
                        width: 1
                    }
                }
            },
            series: [{
                name: data.location_name,
                type: 'line',
                data: limitedAverages.map(value => isNaN(value) || value === null ? null : value),
                lineStyle: {
                    color: '#002060',
                    width: 3
                },
                symbol: 'none',
                connectNulls: false
            }]
        };

        this.chart.setOption(option);
    },

    calculateYAxisInterval: function(min, max) {
        const range = max - min;

        if (range > 100) return 20;
        if (range > 50) return 10;
        if (range > 20) return 5;
        if (range > 8) return 2;
        if (range > 4) return 1;
        return 0.5;
    },

    downloadChart: function() {
        if (!this.chart) return;

        this.log('Preparing chart for download...');

        // Get full chart as PNG at 2x pixel ratio (1500x800)
        const fullChartBase64 = this.chart.getDataURL({
            type: 'png',
            pixelRatio: 2,
            backgroundColor: '#fff'
        });

        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            // EXACT cropping: 20px left, 19px right, 11px top from 1500x800
            const cropLeft = 20;
            const cropTop = 11;
            const cropWidth = 1500 - 20 - 19;  // 1461px
            const cropHeight = 800 - 11;       // 789px

            // Scale to 828x447 while preserving aspect ratio
            const targetWidth = 828;
            const targetHeight = 447;
            const scaleX = targetWidth / cropWidth;
            const scaleY = targetHeight / cropHeight;
            const scale = Math.min(scaleX, scaleY);

            const scaledWidth = Math.round(cropWidth * scale);
            const scaledHeight = Math.round(cropHeight * scale);

            // Set canvas to target dimensions
            canvas.width = targetWidth;
            canvas.height = targetHeight;

            // Fill with white background
            ctx.fillStyle = '#fff';
            ctx.fillRect(0, 0, targetWidth, targetHeight);

            // Center the scaled image
            const offsetX = (targetWidth - scaledWidth) / 2;
            const offsetY = (targetHeight - scaledHeight) / 2;

            // Draw the cropped and scaled image
            ctx.drawImage(
                img,
                cropLeft, cropTop, cropWidth, cropHeight,
                offsetX, offsetY, scaledWidth, scaledHeight
            );

            // Convert to WebP and download
            canvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');

                const sanitizedName = this.currentLocationName.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, ' ').trim();
                const filename = `${sanitizedName} Midday.webp`;

                link.download = filename;
                link.href = url;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);

                this.log(`Chart downloaded as <strong>${filename}</strong> (828×447px WebP)`);
            }, 'image/webp');
        };

        img.src = fullChartBase64;
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => MiddayCharts.init());
