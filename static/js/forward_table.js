/**
 * Forward Table - Frontend Logic
 * Displays forward curves for all locations on a single trade date.
 */

const ForwardTable = {
    state: {
        data: null,
        tradeDate: ''
    },

    init: function() {
        this.bindEvents();
        this.setDefaultDate();
        this.setSystemStatus('ready');
        this.log('System initialized.');
    },

    // --- LOGGING ---
    log: function(msg) {
        const time = new Date().toLocaleTimeString();
        const logHtml = `<div class="border-l-2 border-slate-700 pl-2 mb-1 hover:bg-slate-800"><span class="text-slate-500 mr-2">[${time}]</span>${msg}</div>`;
        const logContainer = document.getElementById('logContent');
        if (logContainer) {
            logContainer.insertAdjacentHTML('beforeend', logHtml);
            logContainer.scrollTop = logContainer.scrollHeight;
        }
        const lastLog = document.getElementById('lastLogMsg');
        if (lastLog) lastLog.textContent = msg;
    },

    setSystemStatus: function(state) {
        const dot = document.getElementById('statusDot');
        const label = document.getElementById('statusLabel');
        if (!dot || !label) return;

        const base = 'w-2 h-2 rounded-full';

        switch (state) {
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

    setDefaultDate: function() {
        // Set default to today in US Eastern time
        const now = new Date();
        const easternDate = now.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
        document.getElementById('issueDate').value = easternDate;
    },

    bindEvents: function() {
        document.getElementById('loadDataBtn').addEventListener('click', () => this.loadData());
        document.getElementById('copyTableBtn').addEventListener('click', () => this.copyEntireTable());

        // Allow Enter key to trigger load
        document.getElementById('issueDate').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.loadData();
        });

        // Log drawer toggle
        document.getElementById('logToggle').addEventListener('click', () => {
            const drawer = document.getElementById('logDrawer');
            const arrow = document.getElementById('logArrow');
            if (drawer.classList.contains('h-0')) {
                drawer.classList.remove('h-0');
                drawer.classList.add('h-64');
                arrow.classList.add('rotate-180');
            } else {
                drawer.classList.add('h-0');
                drawer.classList.remove('h-64');
                arrow.classList.remove('rotate-180');
            }
        });
    },

    showToast: function(message) {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2000);
    },

    async loadData() {
        const issueDate = document.getElementById('issueDate').value;
        const priceType = document.querySelector('input[name="priceType"]:checked').value;

        if (!issueDate) {
            alert('Please select an issue date');
            return;
        }

        this.log(`Loading ${priceType} prices for issue date: ${issueDate}...`);
        this.setSystemStatus('working');

        // Show loading, hide others
        document.getElementById('loadingMessage').classList.remove('hidden');
        document.getElementById('tableContainer').classList.add('hidden');
        document.getElementById('metadataDisplay').classList.add('hidden');
        document.getElementById('utilityButtons').classList.add('hidden');
        document.getElementById('emptyState').classList.add('hidden');
        document.getElementById('errorMessage').classList.add('hidden');

        try {
            const params = new URLSearchParams({
                issue_date: issueDate,
                price_type: priceType
            });

            const response = await fetch(`/api/forward-table?${params}`);
            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Failed to load data');
            }

            this.state.data = data;
            this.state.tradeDate = data.metadata.trade_date;

            this.updateMetadata(data.metadata);
            this.buildTable(data);

            // Show table and controls
            document.getElementById('loadingMessage').classList.add('hidden');
            document.getElementById('tableContainer').classList.remove('hidden');
            document.getElementById('metadataDisplay').classList.remove('hidden');
            document.getElementById('utilityButtons').classList.remove('hidden');

            this.log(`Loaded ${data.metadata.location_count} locations, ${data.contracts.length} contract months.`);
            this.setSystemStatus('ready');

        } catch (error) {
            console.error('Error loading data:', error);
            this.log(`Error: ${error.message}`);
            this.setSystemStatus('error');
            document.getElementById('loadingMessage').classList.add('hidden');
            document.getElementById('errorText').textContent = error.message;
            document.getElementById('errorMessage').classList.remove('hidden');
        }
    },

    updateMetadata: function(metadata) {
        document.getElementById('tradeDate').textContent = this.formatDateWithDay(metadata.trade_date);
        document.getElementById('displayIssueDate').textContent = this.formatDateWithDay(metadata.issue_date);
        document.getElementById('priceTypeDisplay').textContent = metadata.price_type + ' Prices';
        document.getElementById('locationCount').textContent = metadata.location_count;
        document.getElementById('contractRange').textContent = metadata.contract_range;
    },

    formatDateWithDay: function(dateString) {
        if (!dateString) return '-';
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const date = new Date(dateString + 'T00:00:00Z');
        const dayName = days[date.getUTCDay()];
        return `${dateString} (${dayName})`;
    },

    buildTable: function(data) {
        const thead = document.getElementById('tableHeader');
        const tbody = document.getElementById('tableBody');

        // Clear existing content
        thead.innerHTML = '';
        tbody.innerHTML = '';

        // Build header row
        const headerRow = document.createElement('tr');

        // First column: Delivery Month
        const monthHeader = document.createElement('th');
        monthHeader.className = 'px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b border-r border-gray-300 min-w-[120px]';
        monthHeader.textContent = 'Delivery Month';
        headerRow.appendChild(monthHeader);

        // Location columns with copy buttons
        data.locations.forEach((location, colIndex) => {
            const th = document.createElement('th');
            th.className = 'px-3 py-2 text-center text-xs font-semibold text-gray-700 border-b border-gray-300 min-w-[100px] whitespace-nowrap';

            const wrapper = document.createElement('div');
            wrapper.className = 'flex flex-col items-center gap-1';

            const nameSpan = document.createElement('span');
            nameSpan.textContent = location.name;

            const copyBtn = document.createElement('button');
            copyBtn.className = 'px-2 py-0.5 text-xs bg-gray-200 text-gray-600 rounded hover:bg-gray-300 hover:text-gray-800 transition-colors';
            copyBtn.textContent = 'Copy';
            copyBtn.onclick = (e) => {
                e.stopPropagation();
                this.copyColumn(colIndex, location.name);
            };

            wrapper.appendChild(nameSpan);
            wrapper.appendChild(copyBtn);
            th.appendChild(wrapper);
            headerRow.appendChild(th);
        });

        thead.appendChild(headerRow);

        // Build data rows (one per contract month)
        data.contracts.forEach((contract, rowIndex) => {
            const row = document.createElement('tr');
            row.className = 'border-b border-gray-200';

            // Month cell
            const monthCell = document.createElement('td');
            monthCell.className = 'px-3 py-2 text-sm border-r border-gray-300';
            monthCell.textContent = contract;
            row.appendChild(monthCell);

            // Price cells for each location
            data.locations.forEach(location => {
                const cell = document.createElement('td');
                cell.className = 'px-3 py-2 text-sm text-center';

                const price = location.prices[rowIndex];
                if (price !== null && price !== undefined) {
                    cell.textContent = parseFloat(price).toFixed(3);
                } else {
                    cell.textContent = '-';
                    cell.className += ' text-gray-400';
                }

                row.appendChild(cell);
            });

            tbody.appendChild(row);
        });
    },

    copyEntireTable: function() {
        if (!this.state.data) return;

        const data = this.state.data;
        const lines = [];

        // Header row
        const headers = ['Delivery Month', ...data.locations.map(l => l.name)];
        lines.push(headers.join('\t'));

        // Data rows
        data.contracts.forEach((contract, rowIndex) => {
            const rowData = [contract];
            data.locations.forEach(location => {
                const price = location.prices[rowIndex];
                rowData.push(price !== null && price !== undefined ? parseFloat(price).toFixed(3) : '');
            });
            lines.push(rowData.join('\t'));
        });

        const content = lines.join('\n');
        this.copyToClipboard(content, 'Table copied to clipboard');
        this.log('Copied entire table to clipboard.');
    },

    copyColumn: function(colIndex, locationName) {
        if (!this.state.data) return;

        const data = this.state.data;
        const location = data.locations[colIndex];

        // Build column data with header info
        const lines = [];

        // Header: Location name
        lines.push(`Delivery Month\t${locationName}`);

        // Trade date row
        lines.push(`\t${this.state.tradeDate}`);

        // Data rows
        data.contracts.forEach((contract, rowIndex) => {
            const price = location.prices[rowIndex];
            const priceStr = price !== null && price !== undefined ? parseFloat(price).toFixed(3) : '';
            lines.push(`${contract}\t${priceStr}`);
        });

        const content = lines.join('\n');
        this.copyToClipboard(content, `${locationName} copied to clipboard`);
        this.log(`Copied ${locationName} column to clipboard.`);
    },

    copyToClipboard: function(text, successMessage) {
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text)
                .then(() => this.showToast(successMessage))
                .catch(err => {
                    console.error('Failed to copy:', err);
                    this.fallbackCopy(text, successMessage);
                });
        } else {
            this.fallbackCopy(text, successMessage);
        }
    },

    fallbackCopy: function(text, successMessage) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();

        try {
            document.execCommand('copy');
            this.showToast(successMessage);
        } catch (err) {
            console.error('Fallback copy failed:', err);
            alert('Unable to copy to clipboard');
        } finally {
            document.body.removeChild(textarea);
        }
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => ForwardTable.init());
