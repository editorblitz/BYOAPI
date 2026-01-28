/**
 * Forward Heatmap - Frontend Logic
 * Compares forward curves between two trade dates with heatmap visualization.
 */

const ForwardHeatmap = {
    state: {
        data: null,
        cellPositions: {
            fixed: [],
            basis: []
        }
    },

    init: function() {
        this.bindEvents();
        this.setDefaultDates();
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

    setDefaultDates: function() {
        // Set default dates in US Eastern time
        const now = new Date();
        const easternToday = now.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });

        // End date = today, Start date = 7 days ago
        const endDate = new Date(easternToday + 'T00:00:00');
        const startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - 7);

        document.getElementById('endDate').value = easternToday;
        document.getElementById('startDate').value = startDate.toISOString().split('T')[0];
    },

    bindEvents: function() {
        document.getElementById('loadDataBtn').addEventListener('click', () => this.loadData());
        document.getElementById('copyTableBtn').addEventListener('click', () => this.copyTable());

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

        // Setup canvas tooltip handlers
        this.setupCanvasTooltips('fixedHeatmapCanvas', 'fixed');
        this.setupCanvasTooltips('basisHeatmapCanvas', 'basis');

        // Setup scroll handler for sticky labels
        window.addEventListener('scroll', () => this.updateStickyLabels());
        window.addEventListener('resize', () => this.updateStickyLabels());
    },

    updateStickyLabels: function() {
        const scrollX = window.scrollX || window.pageXOffset;

        // Handle each heatmap's labels
        this.updateLabelPosition('fixedHeatmapLabels', 'fixedHeatmapCanvas', scrollX);
        this.updateLabelPosition('basisHeatmapLabels', 'basisHeatmapCanvas', scrollX);
    },

    updateLabelPosition: function(labelsId, canvasId, scrollX) {
        const labels = document.getElementById(labelsId);
        const canvas = document.getElementById(canvasId);

        if (!labels || !canvas) return;

        const container = canvas.parentElement;
        const containerRect = container.getBoundingClientRect();

        // Check if we've scrolled horizontally (container's left edge is off-screen)
        const shouldStick = containerRect.left < 0;

        if (shouldStick) {
            labels.classList.add('is-stuck');
            // Position at the container's vertical position
            labels.style.top = containerRect.top + 'px';
            labels.style.left = '0px';
        } else {
            labels.classList.remove('is-stuck');
            labels.style.top = '';
            labels.style.left = '';
        }
    },

    setupCanvasTooltips: function(canvasId, type) {
        const canvas = document.getElementById(canvasId);
        const tooltip = document.getElementById('tooltip');

        canvas.addEventListener('mousemove', (event) => {
            const rect = canvas.getBoundingClientRect();
            const mouseX = event.clientX - rect.left;
            const mouseY = event.clientY - rect.top;

            const cell = this.state.cellPositions[type].find(cell =>
                mouseX >= cell.x && mouseX <= cell.x + cell.width &&
                mouseY >= cell.y && mouseY <= cell.y + cell.height
            );

            if (cell) {
                tooltip.style.left = `${event.clientX + 10}px`;
                tooltip.style.top = `${event.clientY + 10}px`;
                tooltip.style.display = 'block';

                if (cell.change === null) {
                    tooltip.innerHTML = `
                        <strong>${cell.location}</strong><br>
                        <span class="text-gray-600">${cell.contract}</span><br>
                        <span class="text-gray-500">Data not available</span>
                    `;
                } else {
                    const changeColor = cell.change >= 0 ? 'text-green-600' : 'text-red-600';
                    const changeSign = cell.change >= 0 ? '+' : '';
                    tooltip.innerHTML = `
                        <strong>${cell.location}</strong><br>
                        <span class="text-gray-600">${cell.contract}</span><br>
                        Start: $${cell.startPrice.toFixed(3)}<br>
                        End: $${cell.endPrice.toFixed(3)}<br>
                        <span class="${changeColor}">Change: ${changeSign}$${cell.change.toFixed(3)}</span>
                    `;
                }
            } else {
                tooltip.style.display = 'none';
            }
        });

        canvas.addEventListener('mouseleave', () => {
            tooltip.style.display = 'none';
        });
    },

    showToast: function(message) {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2000);
    },

    async loadData() {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;

        if (!startDate || !endDate) {
            alert('Please select both start and end dates');
            return;
        }

        this.log(`Comparing forward curves: ${startDate} to ${endDate}...`);
        this.setSystemStatus('working');

        // Show loading, hide others
        document.getElementById('loadingMessage').classList.remove('hidden');
        document.getElementById('contentContainer').classList.add('hidden');
        document.getElementById('metadataDisplay').classList.add('hidden');
        document.getElementById('alignmentInfo').classList.add('hidden');
        document.getElementById('utilityButtons').classList.add('hidden');
        document.getElementById('emptyState').classList.add('hidden');
        document.getElementById('errorMessage').classList.add('hidden');

        try {
            const params = new URLSearchParams({
                start_date: startDate,
                end_date: endDate
            });

            const response = await fetch(`/api/forward-heatmap?${params}`);
            const data = await response.json();

            // Check for session expiration
            if (response.status === 401 || data.auth_required) {
                this.log('Session expired. Redirecting to login...', 'error');
                window.location.href = '/auth';
                return;
            }

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Failed to load data');
            }

            this.state.data = data;

            this.updateMetadata(data.metadata);
            this.buildTable(data);
            this.drawHeatmap('fixedHeatmapCanvas', 'fixed', data);
            this.drawHeatmap('basisHeatmapCanvas', 'basis', data);

            // Show content
            document.getElementById('loadingMessage').classList.add('hidden');
            document.getElementById('contentContainer').classList.remove('hidden');
            document.getElementById('metadataDisplay').classList.remove('hidden');
            document.getElementById('utilityButtons').classList.remove('hidden');

            this.log(`Loaded ${data.metadata.location_count} locations, ${data.metadata.contract_count} contracts.`);
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
        document.getElementById('startTradeDate').textContent = this.formatDateWithDay(metadata.start_trade_date);
        document.getElementById('endTradeDate').textContent = this.formatDateWithDay(metadata.end_trade_date);
        document.getElementById('promptMonth').textContent = metadata.prompt_month;
        document.getElementById('locationCount').textContent = metadata.location_count;

        // Update table headers
        const startDateFormatted = this.formatDateShort(metadata.start_issue_date);
        const endDateFormatted = this.formatDateShort(metadata.end_issue_date);

        document.getElementById('startFixedHeader').textContent = `Fixed ${startDateFormatted}`;
        document.getElementById('endFixedHeader').textContent = `Fixed ${endDateFormatted}`;
        document.getElementById('startBasisHeader').textContent = `Basis ${startDateFormatted}`;
        document.getElementById('endBasisHeader').textContent = `Basis ${endDateFormatted}`;

        // Show alignment info if needed
        if (metadata.alignment_info && metadata.alignment_info.adjusted) {
            const info = metadata.alignment_info;
            let message = `Detected ${info.months_rolled} month roll. `;
            if (info.removed_months && info.removed_months.length > 0) {
                message += `Removed from start data: ${info.removed_months.join(', ')}`;
            }
            document.getElementById('alignmentMessage').textContent = message;
            document.getElementById('alignmentInfo').classList.remove('hidden');
            this.log(`Alignment: ${message}`);
        } else {
            document.getElementById('alignmentInfo').classList.add('hidden');
        }
    },

    formatDateWithDay: function(dateString) {
        if (!dateString) return '-';
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const date = new Date(dateString + 'T00:00:00Z');
        const dayName = days[date.getUTCDay()];
        return `${dateString} (${dayName})`;
    },

    formatDateShort: function(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString + 'T00:00:00Z');
        return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
    },

    buildTable: function(data) {
        const tbody = document.getElementById('summaryTableBody');
        tbody.innerHTML = '';

        data.table_data.forEach(row => {
            const tr = document.createElement('tr');
            tr.className = 'border-b border-gray-200 hover:bg-gray-50';

            // Location
            const locationCell = document.createElement('td');
            locationCell.className = 'px-3 py-2 text-sm font-medium';
            locationCell.textContent = row.location;
            tr.appendChild(locationCell);

            // Start Fixed
            const startFixedCell = document.createElement('td');
            startFixedCell.className = 'px-3 py-2 text-sm text-center';
            startFixedCell.textContent = row.start_fixed !== null ? row.start_fixed.toFixed(3) : 'N/A';
            tr.appendChild(startFixedCell);

            // End Fixed
            const endFixedCell = document.createElement('td');
            endFixedCell.className = 'px-3 py-2 text-sm text-center';
            endFixedCell.textContent = row.end_fixed !== null ? row.end_fixed.toFixed(3) : 'N/A';
            tr.appendChild(endFixedCell);

            // Fixed Change
            const fixedChangeCell = document.createElement('td');
            fixedChangeCell.className = 'px-3 py-2 text-sm text-center font-medium';
            if (row.fixed_change !== null) {
                const sign = row.fixed_change >= 0 ? '+' : '';
                fixedChangeCell.textContent = `${sign}$${row.fixed_change.toFixed(3)}`;
                fixedChangeCell.classList.add(row.fixed_change >= 0 ? 'text-green-600' : 'text-red-600');
            } else {
                fixedChangeCell.textContent = 'N/A';
                fixedChangeCell.classList.add('text-gray-400');
            }
            tr.appendChild(fixedChangeCell);

            // Start Basis
            const startBasisCell = document.createElement('td');
            startBasisCell.className = 'px-3 py-2 text-sm text-center';
            startBasisCell.textContent = row.start_basis !== null ? row.start_basis.toFixed(3) : 'N/A';
            tr.appendChild(startBasisCell);

            // End Basis
            const endBasisCell = document.createElement('td');
            endBasisCell.className = 'px-3 py-2 text-sm text-center';
            endBasisCell.textContent = row.end_basis !== null ? row.end_basis.toFixed(3) : 'N/A';
            tr.appendChild(endBasisCell);

            // Basis Change
            const basisChangeCell = document.createElement('td');
            basisChangeCell.className = 'px-3 py-2 text-sm text-center font-medium';
            if (row.basis_change !== null) {
                const sign = row.basis_change >= 0 ? '+' : '';
                basisChangeCell.textContent = `${sign}$${row.basis_change.toFixed(3)}`;
                basisChangeCell.classList.add(row.basis_change >= 0 ? 'text-green-600' : 'text-red-600');
            } else {
                basisChangeCell.textContent = 'N/A';
                basisChangeCell.classList.add('text-gray-400');
            }
            tr.appendChild(basisChangeCell);

            tbody.appendChild(tr);
        });
    },

    drawHeatmap: function(canvasId, type, data) {
        const canvas = document.getElementById(canvasId);
        const ctx = canvas.getContext('2d');

        const heatmapData = data.heatmap_data[type];
        const contracts = data.contracts;
        const locations = Object.keys(heatmapData).sort();

        const cellWidth = 50;
        const cellHeight = 24;
        const xOffset = 0;  // No offset - labels are in separate sticky element
        const yOffset = 25;

        const rowCount = locations.length;
        const colCount = contracts.length;

        canvas.width = colCount * cellWidth + 20;
        canvas.height = yOffset + rowCount * cellHeight + 20;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = '11px system-ui, -apple-system, sans-serif';

        // Populate sticky labels
        const labelsContainerId = type === 'fixed' ? 'fixedHeatmapLabels' : 'basisHeatmapLabels';
        const labelsContainer = document.getElementById(labelsContainerId);
        labelsContainer.innerHTML = locations.map(loc =>
            `<div class="heatmap-label">${loc}</div>`
        ).join('');

        // Reset cell positions
        this.state.cellPositions[type] = [];

        // Draw column headers (contracts)
        ctx.fillStyle = '#374151';
        contracts.forEach((contract, colIndex) => {
            const x = xOffset + colIndex * cellWidth;
            ctx.fillText(contract, x + 5, 16);
        });

        // Draw rows
        locations.forEach((location, rowIndex) => {
            const y = yOffset + rowIndex * cellHeight;

            // Draw cells
            const locationData = heatmapData[location];
            contracts.forEach((contract, colIndex) => {
                const x = xOffset + colIndex * cellWidth;
                const cellData = locationData[contract];

                if (!cellData || cellData.change === null) {
                    // Missing data
                    ctx.fillStyle = '#f3f4f6';
                    ctx.fillRect(x, y, cellWidth, cellHeight);
                    ctx.strokeStyle = '#d1d5db';
                    ctx.strokeRect(x, y, cellWidth, cellHeight);
                    ctx.fillStyle = '#9ca3af';
                    ctx.fillText('N/A', x + 15, y + 16);

                    this.state.cellPositions[type].push({
                        x, y, width: cellWidth, height: cellHeight,
                        location, contract, change: null,
                        startPrice: null, endPrice: null
                    });
                } else {
                    // Has data - color by change value
                    const change = cellData.change;
                    const intensity = Math.min(Math.abs(change) / 0.5, 1); // Scale: 0.5 = full intensity

                    if (change >= 0) {
                        ctx.fillStyle = `rgba(34, 197, 94, ${0.2 + intensity * 0.6})`; // Green
                    } else {
                        ctx.fillStyle = `rgba(239, 68, 68, ${0.2 + intensity * 0.6})`; // Red
                    }

                    ctx.fillRect(x, y, cellWidth, cellHeight);
                    ctx.strokeStyle = '#d1d5db';
                    ctx.strokeRect(x, y, cellWidth, cellHeight);

                    // Draw value
                    ctx.fillStyle = '#1f2937';
                    const displayValue = change.toFixed(3);
                    ctx.fillText(displayValue, x + 3, y + 16);

                    this.state.cellPositions[type].push({
                        x, y, width: cellWidth, height: cellHeight,
                        location, contract, change,
                        startPrice: cellData.start_price,
                        endPrice: cellData.end_price
                    });
                }
            });
        });
    },

    copyTable: function() {
        if (!this.state.data) return;

        const headers = ['Location', 'Start Fixed', 'End Fixed', 'Fixed Change', 'Start Basis', 'End Basis', 'Basis Change'];
        const lines = [headers.join('\t')];

        this.state.data.table_data.forEach(row => {
            const rowData = [
                row.location,
                row.start_fixed !== null ? row.start_fixed.toFixed(3) : 'N/A',
                row.end_fixed !== null ? row.end_fixed.toFixed(3) : 'N/A',
                row.fixed_change !== null ? row.fixed_change.toFixed(3) : 'N/A',
                row.start_basis !== null ? row.start_basis.toFixed(3) : 'N/A',
                row.end_basis !== null ? row.end_basis.toFixed(3) : 'N/A',
                row.basis_change !== null ? row.basis_change.toFixed(3) : 'N/A'
            ];
            lines.push(rowData.join('\t'));
        });

        const content = lines.join('\n');
        this.copyToClipboard(content, 'Table copied to clipboard');
        this.log('Copied summary table to clipboard.');
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
document.addEventListener('DOMContentLoaded', () => ForwardHeatmap.init());
