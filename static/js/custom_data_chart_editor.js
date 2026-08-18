/**
 * Data Editor pop-out for the Custom Data Chart.
 * Excel-like editing grid (GridCore from the tableizer project, bundled as
 * static/lib/datagrid.mjs). Opened by custom_data_chart.js via window.open;
 * the two windows talk over postMessage (same-origin only):
 *   editor -> opener: {type:'ngi-editor-ready'} on load
 *   opener -> editor: {type:'ngi-editor-init', text, hasHeader} current dataset
 *   editor -> opener: {type:'ngi-editor-data', text, hasHeader} on "Use This Data"
 */

import { GridCore } from '../lib/datagrid.mjs';

const ORIGIN = window.location.origin;
const BLANK_ROWS = 12;
const BLANK_COLS = 4;

const gridContainer = document.getElementById('gridContainer');
const headerCheckbox = document.getElementById('firstRowHeaders');
const statusMsg = document.getElementById('statusMsg');

const grid = new GridCore({
    container: gridContainer,
    data: [],
    schema: [],
    rowHeight: 24,
});
grid.mount();

function seedBlankGrid() {
    const schema = Array.from({ length: BLANK_COLS }, (_, i) => ({
        id: `col-${i}`,
        title: `Column ${i + 1}`,
        type: 'text',
    }));
    grid.setSchema(schema, false);
    grid.setData(Array.from({ length: BLANK_ROWS }, () => new Array(BLANK_COLS).fill('')), false, false);
}

function gridIsBlank() {
    return grid.getRawData().every(row => row.every(cell => String(cell || '').trim() === ''));
}

function updateStatus() {
    const raw = grid.getRawData();
    const filledRows = raw.filter(row => row.some(cell => String(cell || '').trim() !== '')).length;
    const cols = grid.getSchema().length;
    if (filledRows === 0) {
        statusMsg.textContent = 'Empty grid — paste your data to begin.';
    } else {
        const dataRows = headerCheckbox.checked ? Math.max(0, filledRows - 1) : filledRows;
        statusMsg.textContent = `${cols} column(s) × ${dataRows} data row(s)`;
    }
}

// Same heuristic as the chart page: if any value-column cell in row 1 is
// non-numeric, treat row 1 as series names.
function detectHeaderRow() {
    const raw = grid.getRawData();
    if (!raw.length) return false;
    const firstRowVals = raw[0].slice(1);
    const numeric = (s) => {
        const t = String(s).trim().replace(/[$€£%\s,()]/g, '');
        return t !== '' && /^[-+]?(\d+\.?\d*|\.\d+)$/.test(t);
    };
    return firstRowVals.some(c => String(c).trim() !== '' && !numeric(c));
}

function importText(text) {
    grid.importText(text);
    const hasHeader = detectHeaderRow();
    headerCheckbox.checked = hasHeader;
    grid.setFirstRowAsLabel(hasHeader);
    updateStatus();
}

// Serialize the grid back to tab-separated text, trimming trailing blank
// rows/columns so a padded blank grid doesn't send empty cells.
function serializeGrid() {
    const raw = grid.getRawData().map(row => row.map(cell => String(cell ?? '')));
    let lastRow = -1;
    let lastCol = -1;
    raw.forEach((row, r) => {
        row.forEach((cell, c) => {
            if (cell.trim() !== '') {
                if (r > lastRow) lastRow = r;
                if (c > lastCol) lastCol = c;
            }
        });
    });
    if (lastRow < 0) return '';
    return raw.slice(0, lastRow + 1)
        .map(row => row.slice(0, lastCol + 1).join('\t'))
        .join('\n');
}

// ---- Toolbar ----
document.getElementById('addRowBtn').addEventListener('click', () => { grid.addRow(); updateStatus(); });
document.getElementById('addColBtn').addEventListener('click', () => { grid.addColumn(); updateStatus(); });
document.getElementById('undoBtn').addEventListener('click', () => grid.undo());
document.getElementById('redoBtn').addEventListener('click', () => grid.redo());
document.getElementById('findBtn').addEventListener('click', () => grid.showSearch());
document.getElementById('clearBtn').addEventListener('click', () => {
    if (!gridIsBlank() && !confirm('Clear all data in the grid?')) return;
    seedBlankGrid();
    headerCheckbox.checked = false;
    grid.setFirstRowAsLabel(false);
    updateStatus();
});
headerCheckbox.addEventListener('change', () => {
    grid.setFirstRowAsLabel(headerCheckbox.checked);
    updateStatus();
});

grid.getHookBus().on('dataChange', () => updateStatus());
grid.getHookBus().on('schemaChange', () => updateStatus());

// Paste anywhere while the grid is blank -> full import with type inference.
// (With data present and a cell selected, the grid's own paste handler
// pastes at the selection and auto-grows the grid.)
window.addEventListener('paste', (e) => {
    const target = e.target;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
    if (!gridIsBlank()) return;
    const text = e.clipboardData ? e.clipboardData.getData('text/plain') : '';
    if (!text.trim()) return;
    e.preventDefault();
    e.stopPropagation();
    importText(text);
}, true);

// ---- Footer ----
document.getElementById('cancelBtn').addEventListener('click', () => window.close());
document.getElementById('useDataBtn').addEventListener('click', () => {
    const text = serializeGrid();
    if (!text) {
        alert('The grid is empty. Paste or type some data first.');
        return;
    }
    if (window.opener && !window.opener.closed) {
        window.opener.postMessage({
            type: 'ngi-editor-data',
            text,
            hasHeader: headerCheckbox.checked,
        }, ORIGIN);
        window.close();
    } else {
        alert('The chart page was closed. Copy your data before closing this window, then reopen the editor from the chart page.');
    }
});

// ---- Handshake with the opener ----
window.addEventListener('message', (e) => {
    if (e.origin !== ORIGIN) return;
    if (!e.data || e.data.type !== 'ngi-editor-init') return;
    if (e.data.text && e.data.text.trim()) {
        grid.importText(e.data.text);
        const hasHeader = !!e.data.hasHeader;
        headerCheckbox.checked = hasHeader;
        grid.setFirstRowAsLabel(hasHeader);
        updateStatus();
        statusMsg.textContent += ' — loaded from chart page';
    }
});

seedBlankGrid();
updateStatus();
gridContainer.focus({ preventScroll: true });

if (window.opener && !window.opener.closed) {
    window.opener.postMessage({ type: 'ngi-editor-ready' }, ORIGIN);
}
