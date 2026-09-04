/**
 * Daily Spot Spread Chart - Publication-ready NGI two-location price spread chart
 * Single-line chart of (Location 1 - Location 2) at 750x400px, exports as 828x447px WebP.
 */

const DailySpotSpreadChart = {
    chart: null,
    currentLocation1Name: '',
    currentLocation2Name: '',
    lastApiResponse: null,
    customTitle: null,         // { line1, line2 } or null for auto
    customSourcePrefix: null,  // 'Source:' or 'Note:' or null for default
    customSourceText: null,    // editable rest of source line, or null for default

    DEFAULT_SOURCE_PREFIX: 'Source:',
    DEFAULT_SOURCE_TEXT: "NGI's Daily Gas Price Index",

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
            { name: 'Tres Palacios - Injection', value: 'STX3PALINJ' },
            { name: 'Tres Palacios - Withdrawal', value: 'STX3PALWD' },
            { name: 'S. TX Regional Avg.', value: 'STXRAVG' }
        ],
        'East Texas': [
            { name: 'Atmos Zone 3', value: 'ETXATMOSZ3' },
            { name: 'Carthage', value: 'ETXCARTH' },
            { name: 'Golden Triangle Storage', value: 'ETXGLDTRI' },
            { name: 'Gulf South Pool 16', value: 'ETXGS16P' },
            { name: 'Houston Ship Channel', value: 'ETXHSHIP' },
            { name: 'Katy', value: 'ETXKATY' },
            { name: 'Moss Bluff', value: 'ETXMBSF' },
            { name: 'NGPL TexOk', value: 'ETXNGPL' },
            { name: 'Tennessee Zone 0 North', value: 'ETXTENN' },
            { name: 'Texas Eastern E. TX', value: 'ETXTETCO' },
            { name: 'Tolar Hub', value: 'OTHTOLAR' },
            { name: 'Transco Zone 2', value: 'ETXST45' },
            { name: 'Transco Zone 2 non-St. 45', value: 'ETXNONST45' },
            { name: 'Transco Zone 2 St. 45', value: 'ETXST45ONLY' },
            { name: 'E. TX Regional Avg.', value: 'ETXRAVG' }
        ],
        'West Texas': [
            { name: 'El Paso - Keystone & Waha Pools', value: 'WTXEPKPWP' },
            { name: 'El Paso Permian', value: 'WTXEPP' },
            { name: 'El Paso - Keystone Pool', value: 'WTXEPKEY' },
            { name: 'El Paso - Plains Pool', value: 'WTXEPPL' },
            { name: 'El Paso - Waha Pool', value: 'WTXEPWAHA' },
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
            { name: 'Transco Zone 3', value: 'SLATRANZ3' },
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
            { name: 'Transco Zone 5 St. 165', value: 'SEST165' },
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
            { name: 'Cheyenne Hub - Other', value: 'RMTCHEYOTH' },
            { name: 'REX Cheyenne Compression Pool', value: 'RMTREXPL' },
            { name: 'CIG', value: 'RMTCIG' },
            { name: 'CIG DJ Basin', value: 'RMTCIGDJ' },
            { name: 'El Paso Bondad', value: 'RMTEPBON' },
            { name: 'El Paso San Juan', value: 'RMTEPSJ' },
            { name: 'Kingsgate', value: 'RMTKING' },
            { name: 'KRGT Rec Pool', value: 'RMTKR' },
            { name: 'MountainWest', value: 'RMTQUEST' },
            { name: 'Northwest S. of Green River', value: 'RMTNWSGR' },
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
    },

    init: function() {
        this.setupDropdowns();
        this.bindEvents();
        this.setupLogToggle();
        this.log('Daily Spot Spread Chart system initialized.');
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
        const regionSelect1 = document.getElementById('regionSelect1');
        const regionSelect2 = document.getElementById('regionSelect2');

        Object.keys(this.locations).forEach(region => {
            const opt1 = document.createElement('option');
            opt1.value = region;
            opt1.textContent = region;
            regionSelect1.appendChild(opt1);

            const opt2 = document.createElement('option');
            opt2.value = region;
            opt2.textContent = region;
            regionSelect2.appendChild(opt2);
        });

        regionSelect1.value = 'Favorites';
        regionSelect2.value = 'Favorites';
        this.updateLocations(1);
        this.updateLocations(2);

        // Default to Henry Hub for Location 1, Waha for Location 2 (a common spread)
        const loc1 = document.getElementById('locationSelect1');
        const loc2 = document.getElementById('locationSelect2');
        if (loc1) loc1.value = 'SLAHH';
        if (loc2) loc2.value = 'WTXWAHA';
    },

    updateLocations: function(slot) {
        const regionSelect = document.getElementById('regionSelect' + slot);
        const locationSelect = document.getElementById('locationSelect' + slot);
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
        document.getElementById('regionSelect1').addEventListener('change', () => this.updateLocations(1));
        document.getElementById('regionSelect2').addEventListener('change', () => this.updateLocations(2));
        document.getElementById('generateBtn').addEventListener('click', () => this.handleGenerate());
        document.getElementById('downloadBtn').addEventListener('click', () => this.downloadChart());
        document.getElementById('updateChartBtn').addEventListener('click', () => this.handleGenerate());
        document.getElementById('xAxisLabelMode').addEventListener('change', () => {
            if (this.lastApiResponse) this.renderChart(this.lastApiResponse);
        });
        document.getElementById('twoLineTitleCheckbox').addEventListener('change', (e) => {
            const line2 = document.getElementById('titleLine2');
            line2.classList.toggle('hidden', !e.target.checked);
            if (e.target.checked && !line2.value) {
                line2.focus();
            }
        });
        document.getElementById('applyTitleBtn').addEventListener('click', () => this.applyTitle());
        document.getElementById('applySourceBtn').addEventListener('click', () => this.applySource());
    },

    getDefaultTitle: function() {
        return `NGI's ${this.currentLocation1Name} to ${this.currentLocation2Name} Price Spread`;
    },

    getTitleText: function() {
        if (this.customTitle) {
            if (this.customTitle.line2) return this.customTitle.line1 + '\n' + this.customTitle.line2;
            return this.customTitle.line1;
        }
        return this.getDefaultTitle();
    },

    getSourcePrefix: function() {
        return this.customSourcePrefix !== null ? this.customSourcePrefix : this.DEFAULT_SOURCE_PREFIX;
    },

    getSourceText: function() {
        return this.customSourceText !== null ? this.customSourceText : this.DEFAULT_SOURCE_TEXT;
    },

    setupTitleEditor: function() {
        const twoLineEl = document.getElementById('twoLineTitleCheckbox');
        const line1El = document.getElementById('titleLine1');
        const line2El = document.getElementById('titleLine2');
        if (this.customTitle) {
            line1El.value = this.customTitle.line1 || '';
            line2El.value = this.customTitle.line2 || '';
            twoLineEl.checked = !!this.customTitle.line2;
        } else {
            line1El.value = this.getDefaultTitle();
            line2El.value = '';
        }
        line2El.classList.toggle('hidden', !twoLineEl.checked);
    },

    setupSourceEditor: function() {
        document.getElementById('sourcePrefixSelect').value = this.getSourcePrefix();
        document.getElementById('sourceInput').value = this.getSourceText();
    },

    applyTitle: function() {
        const twoLine = document.getElementById('twoLineTitleCheckbox').checked;
        const line1 = document.getElementById('titleLine1').value.trim();
        const line2 = twoLine ? document.getElementById('titleLine2').value.trim() : '';
        this.customTitle = { line1, line2 };
        if (this.lastApiResponse) this.renderChart(this.lastApiResponse);
        this.log('Title updated.');
    },

    applySource: function() {
        this.customSourcePrefix = document.getElementById('sourcePrefixSelect').value;
        this.customSourceText = document.getElementById('sourceInput').value.trim();
        if (this.lastApiResponse) this.renderChart(this.lastApiResponse);
        this.log('Source/Note updated.');
    },

    handleGenerate: async function() {
        try {
            const location1 = document.getElementById('locationSelect1').value;
            const location2 = document.getElementById('locationSelect2').value;

            if (!location1 || !location2) {
                alert('Please select both Location 1 and Location 2.');
                return;
            }

            if (location1 === location2) {
                alert('Please select two different locations.');
                return;
            }

            this.currentLocation1Name = document.querySelector('#locationSelect1 option:checked').textContent;
            this.currentLocation2Name = document.querySelector('#locationSelect2 option:checked').textContent;

            const startDate = document.getElementById('startDate').value;
            const endDate = document.getElementById('endDate').value;

            if (startDate && endDate && startDate > endDate) {
                alert('Start date must be before end date.');
                return;
            }

            let url = `/api/quick-charts?type=daily-spread&location1=${encodeURIComponent(location1)}&location2=${encodeURIComponent(location2)}`;
            if (startDate && endDate) {
                url += `&start_date=${startDate}&end_date=${endDate}`;
                this.log(`Fetching ${this.currentLocation1Name} to ${this.currentLocation2Name} spread from ${startDate} to ${endDate}...`);
            } else {
                this.log(`Fetching ${this.currentLocation1Name} to ${this.currentLocation2Name} spread (last 12 months)...`);
            }

            const response = await fetch(url);
            const data = await response.json();

            if (response.status === 401 || data.auth_required) {
                this.log('Session expired. Redirecting to login...');
                window.location.href = '/auth';
                return;
            }

            if (!response.ok) {
                throw new Error(data.error || `Failed to fetch data: ${response.status}`);
            }

            if (!data.dates || data.dates.length === 0) {
                this.log(`<span class="text-red-400">No overlapping data between the two locations.</span>`);
                alert('No overlapping data found between the two locations for this date range.');
                return;
            }

            // Use API-resolved names if available; fall back to UI labels.
            if (data.location1_name) this.currentLocation1Name = data.location1_name;
            if (data.location2_name) this.currentLocation2Name = data.location2_name;

            this.log(`Received ${data.dates.length} spread data points.`);

            this.lastApiResponse = data;
            this.customTitle = null;
            this.customSourcePrefix = null;
            this.customSourceText = null;
            this.renderChart(data);
            this.log(`Chart rendered: <strong>750×400px</strong> display (aspect ratio 15:8) • Exports as <strong>828×447px WebP</strong>`);

            document.getElementById('downloadBtn').classList.remove('hidden');
            document.getElementById('dateRangeSection').classList.remove('hidden');

            this.setupTitleEditor();
            this.setupSourceEditor();

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

        if (this.chart) {
            this.chart.dispose();
        }

        this.chart = echarts.init(chartDom);

        const limitedAverages = data.averages;
        const limitedDates = data.dates;

        const validPrices = limitedAverages.filter(price => !isNaN(price) && price !== null);
        const minPrice = Math.min(...validPrices);
        const maxPrice = Math.max(...validPrices);

        const yAxisInput = document.getElementById('yAxisInterval');
        const customInterval = yAxisInput && yAxisInput.value ? parseFloat(yAxisInput.value) : null;
        const interval = (customInterval && customInterval > 0) ? customInterval : this.calculateYAxisInterval(minPrice, maxPrice);
        const adjustedMinPrice = Math.floor(minPrice / interval) * interval;
        const adjustedMaxPrice = Math.ceil(maxPrice / interval) * interval;

        const reformattedDates = limitedDates.map(dateStr => {
            const [year, month, day] = dateStr.split('-');
            const monthMap = {
                '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr', '05': 'May', '06': 'Jun',
                '07': 'Jul', '08': 'Aug', '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec'
            };
            return `${day}-${monthMap[month]}-${year}`;
        });

        const labelModeEl = document.getElementById('xAxisLabelMode');
        const labelMode = labelModeEl ? labelModeEl.value : 'auto';
        const labelIndexSet = this.calculateLabelIndices(limitedDates, labelMode);

        const titleText = this.getTitleText();
        const isTwoLine = titleText.includes('\n');
        const dividerTop = isTwoLine ? 73 : 63;
        const gridTop = isTwoLine ? '26%' : '22%';

        const option = {
            toolbox: {
                show: false
            },
            textStyle: {
                fontFamily: 'Arial'
            },
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
                    top: dividerTop,
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
                        text: `{bold|${this.getSourcePrefix()}} ${this.getSourceText()}`,
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
                },
                // Y-axis label pinned near the chart's left edge rather than
                // anchored to the axis line. With grid.containLabel the tick
                // labels always start at grid.left, so the gap between this
                // label and the tick labels stays constant however wide the
                // prices get (same layout as the custom / multi-location charts).
                {
                    type: 'text',
                    left: '3%',
                    top: 'middle',
                    rotation: Math.PI / 2,
                    style: {
                        text: (document.getElementById('yAxisLabel') && document.getElementById('yAxisLabel').value.trim()) || '$US/MMBtu',
                        font: '750 12px Arial',
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
                left: '5.5%',
                right: '4%',
                top: gridTop,
                bottom: '8%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                boundaryGap: false,
                data: reformattedDates,
                axisLabel: {
                    rotate: 45,
                    interval: (index) => labelIndexSet.has(index),
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
                    interval: (index) => labelIndexSet.has(index),
                    lineStyle: {
                        color: '#D3D3D3'
                    }
                }
            },
            yAxis: {
                type: 'value',
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
                name: `${this.currentLocation1Name} - ${this.currentLocation2Name}`,
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
        if (range > 2) return 0.5;
        if (range > 1) return 0.25;
        return 0.1;
    },

    calculateLabelIndices: function(isoDates, mode) {
        if (!isoDates || isoDates.length === 0) return new Set();
        const n = isoDates.length;
        const lastIdx = n - 1;
        if (n === 1) return new Set([0]);

        if (mode === 'all') {
            const all = new Set();
            for (let i = 0; i < n; i++) all.add(i);
            return all;
        }

        if (mode === 'short') {
            const TARGET = 12;
            if (n <= TARGET) {
                const all = new Set();
                for (let i = 0; i < n; i++) all.add(i);
                return all;
            }
            const step = Math.ceil(lastIdx / (TARGET - 1));
            const indices = new Set();
            for (let i = 0; i < n; i += step) indices.add(i);
            indices.add(lastIdx);
            return indices;
        }

        if (mode === 'weekly') {
            const timestamps = isoDates.map(s => new Date(s + 'T00:00:00').getTime());
            const closest = (targetMs) => {
                let best = 0, bestDiff = Infinity;
                for (let i = 0; i < n; i++) {
                    const d = Math.abs(timestamps[i] - targetMs);
                    if (d < bestDiff) { bestDiff = d; best = i; }
                }
                return best;
            };
            const indices = new Set([0, lastIdx]);
            const cursor = new Date(timestamps[0]);
            const daysToMon = (8 - cursor.getDay()) % 7;
            cursor.setDate(cursor.getDate() + daysToMon);
            while (cursor.getTime() <= timestamps[lastIdx]) {
                indices.add(closest(cursor.getTime()));
                cursor.setDate(cursor.getDate() + 7);
            }
            return indices;
        }

        const numIntervals = 12;
        const step = lastIdx / numIntervals;
        const indices = new Set();
        for (let i = 0; i <= numIntervals; i++) {
            indices.add(Math.round(i * step));
        }
        indices.add(lastIdx);
        return indices;
    },

    downloadChart: function() {
        if (!this.chart) return;

        this.log('Preparing chart for download...');

        const fullChartBase64 = this.chart.getDataURL({
            type: 'png',
            pixelRatio: 2,
            backgroundColor: '#fff'
        });

        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            const cropLeft = 20;
            const cropTop = 11;
            const cropWidth = 1500 - 20 - 19;
            const cropHeight = 800 - 11;

            const targetWidth = 828;
            const targetHeight = 447;
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

                const sanitize = (s) => s.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, ' ').trim();
                const filename = `${sanitize(this.currentLocation1Name)} to ${sanitize(this.currentLocation2Name)} Spread.webp`;

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

document.addEventListener('DOMContentLoaded', () => DailySpotSpreadChart.init());
