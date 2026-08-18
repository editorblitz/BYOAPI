// ../../../mnt/c/Users/chris/Dropbox/CLOUD DESKTOP/02_PROJECTS/tableizer reboot 2026/handsontable/packages/core/src/cell-types/text.ts
var TextCellType = {
  parse(raw) {
    return { value: raw };
  },
  format(value) {
    return value;
  },
  validate(value) {
    return "ok";
  },
  compare(a, b) {
    return a.localeCompare(b);
  }
};

// ../../../mnt/c/Users/chris/Dropbox/CLOUD DESKTOP/02_PROJECTS/tableizer reboot 2026/handsontable/packages/core/src/cell-types/number.ts
var NumberCellType = {
  parse(raw) {
    let cleaned = raw.trim();
    if (cleaned === "") {
      return { error: "Invalid number" };
    }
    let isNegative = false;
    if (cleaned.startsWith("(") && cleaned.endsWith(")")) {
      isNegative = true;
      cleaned = cleaned.substring(1, cleaned.length - 1).trim();
    }
    cleaned = cleaned.replace(/^[£€$¥₹]|[£€$¥₹]$/g, "").trim();
    cleaned = cleaned.replace(/,/g, "");
    if (cleaned.startsWith("-")) {
      isNegative = true;
      cleaned = cleaned.substring(1);
    }
    if (cleaned === "") {
      return { error: "Invalid number" };
    }
    if (!/^\d*\.?\d+$/.test(cleaned)) {
      return { error: "Invalid number" };
    }
    const value = parseFloat(cleaned);
    if (isNaN(value)) {
      return { error: "Invalid number" };
    }
    return { value: isNegative ? -value : value };
  },
  format(value, context) {
    if (typeof value !== "number" || isNaN(value)) {
      return String(value);
    }
    const { parenthesesNegatives = false, decimals = 2 } = context || {};
    let formatted = value.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      useGrouping: true
    });
    if (parenthesesNegatives && value < 0) {
      formatted = `(${formatted.substring(1)})`;
    }
    return formatted;
  },
  validate(value) {
    if (typeof value === "number" && !isNaN(value)) {
      return "ok";
    }
    return "Invalid number";
  },
  compare(a, b) {
    return a - b;
  }
};

// ../../../mnt/c/Users/chris/Dropbox/CLOUD DESKTOP/02_PROJECTS/tableizer reboot 2026/handsontable/packages/core/src/cell-types/date.ts
var DateCellType = {
  parse(raw, context) {
    const { dateFormat = "MM/DD/YYYY" } = context || {};
    const trimmed = raw.trim();
    if (dateFormat === "MM/DD/YYYY") {
      const parts = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (parts) {
        const month = parseInt(parts[1], 10);
        const day = parseInt(parts[2], 10);
        const year = parseInt(parts[3], 10);
        const date = new Date(year, month - 1, day);
        if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
          return { value: date };
        }
      }
    }
    return { error: "Invalid date format" };
  },
  format(value, context) {
    if (!(value instanceof Date) || isNaN(value.getTime())) {
      return String(value);
    }
    const { dateFormat = "MM/DD/YYYY" } = context || {};
    if (dateFormat === "MM/DD/YYYY") {
      const month = (value.getMonth() + 1).toString().padStart(2, "0");
      const day = value.getDate().toString().padStart(2, "0");
      const year = value.getFullYear();
      return `${month}/${day}/${year}`;
    }
    return value.toDateString();
  },
  validate(value) {
    if (value instanceof Date && !isNaN(value.getTime())) {
      return "ok";
    }
    return "Invalid date";
  },
  compare(a, b) {
    return a.getTime() - b.getTime();
  }
};

// ../../../mnt/c/Users/chris/Dropbox/CLOUD DESKTOP/02_PROJECTS/tableizer reboot 2026/handsontable/packages/core/src/cell-types/percent.ts
var PercentCellType = {
  parse(raw) {
    let cleaned = raw.trim();
    if (cleaned === "") {
      return { error: "Invalid percentage" };
    }
    if (cleaned.endsWith("%")) {
      cleaned = cleaned.slice(0, -1).trim();
    } else if (cleaned.endsWith("%)")) {
      cleaned = cleaned.slice(0, -2).trimEnd() + ")";
    }
    const result = NumberCellType.parse(cleaned);
    return result.error ? { error: "Invalid percentage" } : result;
  },
  format(value, context) {
    if (typeof value !== "number" || isNaN(value)) {
      return String(value);
    }
    return `${NumberCellType.format(value, context)}%`;
  },
  validate(value) {
    if (typeof value === "number" && !isNaN(value)) {
      return "ok";
    }
    return "Invalid percentage";
  },
  compare(a, b) {
    return a - b;
  }
};

// ../../../mnt/c/Users/chris/Dropbox/CLOUD DESKTOP/02_PROJECTS/tableizer reboot 2026/handsontable/packages/core/src/virtualization.ts
var Virtualization = class {
  container;
  itemCount;
  itemHeight;
  buffer;
  scrollTop = 0;
  constructor(options) {
    this.container = options.container;
    this.itemCount = options.itemCount;
    this.itemHeight = options.itemHeight;
    this.buffer = options.buffer || 5;
  }
  updateScrollTop(scrollTop) {
    this.scrollTop = scrollTop;
  }
  get totalHeight() {
    return this.itemCount * this.itemHeight;
  }
  get startIndex() {
    return Math.max(0, Math.floor(this.scrollTop / this.itemHeight) - this.buffer);
  }
  get endIndex() {
    const visibleItemCount = Math.ceil(this.container.clientHeight / this.itemHeight);
    return Math.min(
      this.itemCount - 1,
      this.startIndex + visibleItemCount + 2 * this.buffer
    );
  }
  get visibleRange() {
    return { start: this.startIndex, end: this.endIndex };
  }
};

// ../../../mnt/c/Users/chris/Dropbox/CLOUD DESKTOP/02_PROJECTS/tableizer reboot 2026/handsontable/packages/core/src/history.ts
var History = class {
  undoStack = [];
  redoStack = [];
  add(action) {
    this.undoStack.push(action);
    this.redoStack = [];
  }
  undo() {
    const action = this.undoStack.pop();
    if (action) {
      action.undo();
      this.redoStack.push(action);
    }
  }
  redo() {
    const action = this.redoStack.pop();
    if (action) {
      action.redo();
      this.undoStack.push(action);
    }
  }
};

// ../../../mnt/c/Users/chris/Dropbox/CLOUD DESKTOP/02_PROJECTS/tableizer reboot 2026/handsontable/packages/core/src/parser.ts
function detectDelimiter(text) {
  const delimiters = [",", "	", ";", "|"];
  const lines = text.replace(/\r\n/g, "\n").split("\n").slice(0, 5);
  const delimiterCounts = {};
  delimiters.forEach((delimiter) => {
    delimiterCounts[delimiter] = 0;
  });
  lines.forEach((line) => {
    delimiters.forEach((delimiter) => {
      let count = 0;
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        if (line[i] === '"') {
          inQuotes = !inQuotes;
        } else if (!inQuotes && line[i] === delimiter) {
          count++;
        }
      }
      delimiterCounts[delimiter] += count;
    });
  });
  let maxCount = -1;
  let detectedDelimiter = "	";
  for (const delimiter of delimiters) {
    if (delimiterCounts[delimiter] > maxCount) {
      maxCount = delimiterCounts[delimiter];
      detectedDelimiter = delimiter;
    } else if (delimiterCounts[delimiter] === maxCount && delimiter === "	") {
      detectedDelimiter = "	";
    }
  }
  if (maxCount <= 1) {
    return "	";
  }
  return detectedDelimiter;
}
function parseDelimited(text, delimiter) {
  const rows = [];
  let currentRow = [];
  let currentField = "";
  let inQuotes = false;
  let i = 0;
  while (i < text.length) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          currentField += '"';
          i += 2;
        } else {
          inQuotes = false;
          i++;
        }
      } else {
        currentField += char;
        i++;
      }
    } else {
      if (char === '"' && currentField === "") {
        inQuotes = true;
        i++;
      } else if (char === delimiter) {
        currentRow.push(currentField);
        currentField = "";
        i++;
      } else if (char === "\r" && i + 1 < text.length && text[i + 1] === "\n") {
        currentRow.push(currentField);
        currentField = "";
        rows.push(currentRow);
        currentRow = [];
        i += 2;
      } else if (char === "\n") {
        currentRow.push(currentField);
        currentField = "";
        rows.push(currentRow);
        currentRow = [];
        i++;
      } else {
        currentField += char;
        i++;
      }
    }
  }
  currentRow.push(currentField);
  if (currentRow.length > 1 || currentRow[0] !== "") {
    rows.push(currentRow);
  }
  return rows;
}
function inferHeader(firstRow) {
  return firstRow.map((header, index) => header.trim() || `Column ${index + 1}`);
}

// ../../../mnt/c/Users/chris/Dropbox/CLOUD DESKTOP/02_PROJECTS/tableizer reboot 2026/handsontable/packages/core/src/hookbus.ts
var ConcreteHookBus = class {
  listeners = {};
  on(eventName, callback) {
    if (!this.listeners[eventName]) {
      this.listeners[eventName] = [];
    }
    this.listeners[eventName].push(callback);
  }
  off(eventName, callback) {
    if (!this.listeners[eventName]) {
      return;
    }
    this.listeners[eventName] = this.listeners[eventName].filter(
      (listener) => listener !== callback
    );
  }
  emit(eventName, ...args) {
    if (!this.listeners[eventName]) {
      return;
    }
    this.listeners[eventName].forEach((listener) => listener(...args));
  }
};

// ../../../mnt/c/Users/chris/Dropbox/CLOUD DESKTOP/02_PROJECTS/tableizer reboot 2026/handsontable/packages/core/src/inference.ts
function inferCellType(rawValue) {
  const numberParseResult = NumberCellType.parse(rawValue);
  if (!numberParseResult.error) {
    return { type: "number", confidence: 0.9 };
  }
  const trimmed = rawValue.trim();
  if ((trimmed.endsWith("%") || trimmed.endsWith("%)")) && !PercentCellType.parse(rawValue).error) {
    return { type: "percent", confidence: 0.9 };
  }
  const dateParseResult = DateCellType.parse(rawValue);
  if (!dateParseResult.error) {
    return { type: "date", confidence: 0.8 };
  }
  return { type: "text", confidence: 0.5 };
}
function inferSchemaTypes(rawDataRows, sampleSize = 200) {
  if (rawDataRows.length === 0) {
    return [];
  }
  const numColumns = rawDataRows[0].length;
  const inferredColumnDefs = [];
  for (let colIndex = 0; colIndex < numColumns; colIndex++) {
    const typeScores = {
      text: 0,
      number: 0,
      percent: 0,
      date: 0
    };
    let sampleCount = 0;
    for (let rowIndex = 0; rowIndex < rawDataRows.length && sampleCount < sampleSize; rowIndex++) {
      const cellValue = rawDataRows[rowIndex][colIndex];
      if (cellValue !== void 0 && cellValue !== null && cellValue.trim() !== "") {
        const inferredType = inferCellType(cellValue);
        typeScores[inferredType.type] += inferredType.confidence;
        sampleCount++;
      }
    }
    let bestType = "text";
    let maxScore = -1;
    for (const type in typeScores) {
      if (typeScores[type] > maxScore) {
        maxScore = typeScores[type];
        bestType = type;
      }
    }
    if (bestType === "number" && maxScore < sampleCount * 0.5) {
      bestType = "text";
    }
    if (bestType === "percent" && maxScore < sampleCount * 0.5) {
      bestType = "text";
    }
    if (bestType === "date" && maxScore < sampleCount * 0.4) {
      bestType = "text";
    }
    inferredColumnDefs.push({
      id: `col-${colIndex}`,
      // Temporary ID, will be updated by header inference
      title: `Column ${colIndex + 1}`,
      type: bestType
    });
  }
  return inferredColumnDefs;
}

// ../../../mnt/c/Users/chris/Dropbox/CLOUD DESKTOP/02_PROJECTS/tableizer reboot 2026/handsontable/packages/core/src/grid.ts
var EditAction = class {
  constructor(grid, row, col, oldValue, newValue) {
    this.grid = grid;
    this.row = row;
    this.col = col;
    this.oldValue = oldValue;
    this.newValue = newValue;
  }
  grid;
  row;
  col;
  oldValue;
  newValue;
  undo() {
    this.grid.setDataAt(this.row, this.col, this.oldValue.value, false, this.oldValue.raw);
  }
  redo() {
    this.grid.setDataAt(this.row, this.col, this.newValue.value, false, this.newValue.raw);
  }
};
var PasteAction = class {
  constructor(grid, changes) {
    this.grid = grid;
    this.changes = changes;
  }
  grid;
  changes;
  undo() {
    for (const change of this.changes) {
      this.grid.setDataAt(change.row, change.col, change.oldValue.value, false, change.oldValue.raw);
    }
  }
  redo() {
    for (const change of this.changes) {
      this.grid.setDataAt(change.row, change.col, change.newValue.value, false, change.newValue.raw);
    }
  }
};
var AddRowAction = class {
  constructor(grid, rowIndex, rowData) {
    this.grid = grid;
    this.rowIndex = rowIndex;
    this.rowData = rowData;
  }
  grid;
  rowIndex;
  rowData;
  undo() {
    this.grid.removeRowInternal(this.rowIndex);
  }
  redo() {
    this.grid.insertRowInternal(this.rowIndex, this.rowData);
  }
};
var DeleteRowAction = class {
  constructor(grid, rowIndex, rowData) {
    this.grid = grid;
    this.rowIndex = rowIndex;
    this.rowData = rowData;
  }
  grid;
  rowIndex;
  rowData;
  undo() {
    this.grid.insertRowInternal(this.rowIndex, this.rowData);
  }
  redo() {
    this.grid.removeRowInternal(this.rowIndex);
  }
};
var AddColumnAction = class {
  constructor(grid, colIndex, colDef, cellValues) {
    this.grid = grid;
    this.colIndex = colIndex;
    this.colDef = colDef;
    this.cellValues = cellValues;
  }
  grid;
  colIndex;
  colDef;
  cellValues;
  undo() {
    this.grid.removeColumnInternal(this.colIndex);
  }
  redo() {
    this.grid.insertColumnInternal(this.colIndex, this.colDef, this.cellValues);
  }
};
var DeleteColumnAction = class {
  constructor(grid, colIndex, colDef, cellValues) {
    this.grid = grid;
    this.colIndex = colIndex;
    this.colDef = colDef;
    this.cellValues = cellValues;
  }
  grid;
  colIndex;
  colDef;
  cellValues;
  undo() {
    this.grid.insertColumnInternal(this.colIndex, this.colDef, this.cellValues);
  }
  redo() {
    this.grid.removeColumnInternal(this.colIndex);
  }
};
var SortAction = class {
  constructor(grid, preData, postData, preSortState, postSortState) {
    this.grid = grid;
    this.preData = preData;
    this.postData = postData;
    this.preSortState = preSortState;
    this.postSortState = postSortState;
  }
  grid;
  preData;
  postData;
  preSortState;
  postSortState;
  undo() {
    this.grid.applyDataOrder(this.preData, this.preSortState);
  }
  redo() {
    this.grid.applyDataOrder(this.postData, this.postSortState);
  }
};
var ColumnTypeChangeAction = class {
  constructor(grid, colIndex, oldColDef, newColDef, oldData, newData) {
    this.grid = grid;
    this.colIndex = colIndex;
    this.oldColDef = oldColDef;
    this.newColDef = newColDef;
    this.oldData = oldData;
    this.newData = newData;
  }
  grid;
  colIndex;
  oldColDef;
  newColDef;
  oldData;
  newData;
  undo() {
    this.grid.applyColumnTypeChange(this.colIndex, this.oldColDef, this.oldData);
  }
  redo() {
    this.grid.applyColumnTypeChange(this.colIndex, this.newColDef, this.newData);
  }
};
var GridCore = class {
  container;
  data;
  schema;
  selections = [];
  plugins = [];
  hookBus;
  cellTypes = /* @__PURE__ */ new Map();
  virtualization;
  table = null;
  tbody = null;
  rowHeight;
  editingCell = null;
  isSelecting = false;
  selectionStartCell = null;
  blurTimeout = null;
  historyManager;
  selectionAnchor = null;
  sortState = null;
  contextMenuEl = null;
  boundDismissContextMenu;
  boundContextMenu;
  boundContextMenuKeyDown;
  // Column resizing state
  resizingCol = null;
  resizeStartX = 0;
  resizeStartWidth = 0;
  MIN_COL_WIDTH = 40;
  colgroup = null;
  boundResizeMouseMove;
  boundResizeMouseUp;
  // Column properties panel state
  columnPropertiesPanelEl = null;
  columnPropertiesPanelColIndex = null;
  boundDismissColumnPanel;
  boundColumnPanelKeyDown;
  // First row as label
  firstRowAsLabel = false;
  // Search/filter state
  searchBarEl = null;
  searchInputEl = null;
  searchQuery = "";
  filteredRowIndices = null;
  isSearchVisible = false;
  // Bound event handlers (stored for proper cleanup)
  boundOnScroll;
  boundOnDoubleClick;
  boundOnMouseDown;
  boundOnMouseMove;
  boundOnMouseUp;
  boundOnCopy;
  boundOnPaste;
  boundOnKeyDown;
  constructor(options) {
    this.container = options.container;
    this.schema = options.schema;
    this.rowHeight = options.rowHeight || 20;
    this.hookBus = new ConcreteHookBus();
    this.registerCellType("text", TextCellType);
    this.registerCellType("number", NumberCellType);
    this.registerCellType("percent", PercentCellType);
    this.registerCellType("date", DateCellType);
    this.data = this.parseCellData(options.data, this.schema);
    this.virtualization = new Virtualization({
      container: this.container,
      itemCount: this.data.length,
      itemHeight: this.rowHeight
    });
    this.historyManager = new History();
    this.boundOnScroll = this.onScroll.bind(this);
    this.boundOnDoubleClick = this.onDoubleClick.bind(this);
    this.boundOnMouseDown = this.onMouseDown.bind(this);
    this.boundOnMouseMove = this.onMouseMove.bind(this);
    this.boundOnMouseUp = this.onMouseUp.bind(this);
    this.boundOnCopy = this.onCopy.bind(this);
    this.boundOnPaste = this.onPaste.bind(this);
    this.boundOnKeyDown = this.onKeyDown.bind(this);
    this.boundContextMenu = this.onContextMenu.bind(this);
    this.boundDismissContextMenu = this.onDismissContextMenu.bind(this);
    this.boundContextMenuKeyDown = this.onContextMenuKeyDown.bind(this);
    this.boundResizeMouseMove = this.onResizeMouseMove.bind(this);
    this.boundResizeMouseUp = this.onResizeMouseUp.bind(this);
    this.boundDismissColumnPanel = this.onDismissColumnPanel.bind(this);
    this.boundColumnPanelKeyDown = this.onColumnPanelKeyDown.bind(this);
    this.container.addEventListener("scroll", this.boundOnScroll);
    this.container.addEventListener("dblclick", this.boundOnDoubleClick);
    this.container.addEventListener("mousedown", this.boundOnMouseDown);
    this.container.addEventListener("mousemove", this.boundOnMouseMove);
    this.container.addEventListener("mouseup", this.boundOnMouseUp);
    this.container.addEventListener("copy", this.boundOnCopy);
    this.container.addEventListener("paste", this.boundOnPaste);
    this.container.addEventListener("keydown", this.boundOnKeyDown);
    this.container.addEventListener("contextmenu", this.boundContextMenu);
    this.container.setAttribute("tabindex", "0");
  }
  /** Parse a raw 2D array into CellValue[][] using the registered cell types and schema. */
  parseCellData(data, schema) {
    return data.map(
      (row) => row.map((cell, colIndex) => {
        const raw = String(cell ?? "");
        const colDef = schema[colIndex];
        const cellType = colDef ? this.getCellType(colDef.type) : void 0;
        if (cellType) {
          const parsed = cellType.parse(raw);
          return { raw, value: parsed.error ? raw : parsed.value, error: parsed.error };
        }
        return { raw, value: cell };
      })
    );
  }
  registerCellType(name, cellType) {
    this.cellTypes.set(name, cellType);
  }
  getCellType(name) {
    return this.cellTypes.get(name);
  }
  mount() {
    this.render();
    if (this.data.length > 0 && this.schema.length > 0) {
      this.selectCell(0, 0);
    }
  }
  destroy() {
    if (this.blurTimeout !== null) {
      clearTimeout(this.blurTimeout);
      this.blurTimeout = null;
    }
    if (this.resizingCol !== null) {
      document.removeEventListener("mousemove", this.boundResizeMouseMove);
      document.removeEventListener("mouseup", this.boundResizeMouseUp);
      document.body.style.cursor = "";
      this.resizingCol = null;
    }
    this.container.removeEventListener("scroll", this.boundOnScroll);
    this.container.removeEventListener("dblclick", this.boundOnDoubleClick);
    this.container.removeEventListener("mousedown", this.boundOnMouseDown);
    this.container.removeEventListener("mousemove", this.boundOnMouseMove);
    this.container.removeEventListener("mouseup", this.boundOnMouseUp);
    this.container.removeEventListener("copy", this.boundOnCopy);
    this.container.removeEventListener("paste", this.boundOnPaste);
    this.container.removeEventListener("keydown", this.boundOnKeyDown);
    this.container.removeEventListener("contextmenu", this.boundContextMenu);
    this.dismissContextMenu();
    this.dismissColumnPropertiesPanel();
    this.hideSearch();
    this.container.innerHTML = "";
  }
  render() {
    if (!this.table) {
      this.container.innerHTML = "";
      this.container.style.overflow = "auto";
      this.container.style.position = "relative";
      this.table = document.createElement("table");
      this.table.className = "datagrid-table";
      this.table.createTHead();
      this.tbody = document.createElement("tbody");
      this.table.appendChild(this.tbody);
      this.container.appendChild(this.table);
    }
    if (this.isSearchVisible) {
      if (!this.searchBarEl) {
        this.searchBarEl = document.createElement("div");
        this.searchBarEl.className = "datagrid-search-bar";
        this.searchInputEl = document.createElement("input");
        this.searchInputEl.type = "text";
        this.searchInputEl.className = "datagrid-search-input";
        this.searchInputEl.placeholder = "Search...";
        this.searchInputEl.value = this.searchQuery;
        this.searchInputEl.addEventListener("input", () => {
          this.searchQuery = this.searchInputEl.value;
          this.applySearchFilter();
        });
        this.searchInputEl.addEventListener("keydown", (e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            this.hideSearch();
          }
        });
        const filterLabel = document.createElement("label");
        filterLabel.className = "datagrid-search-filter-toggle";
        const filterCheckbox = document.createElement("input");
        filterCheckbox.type = "checkbox";
        filterCheckbox.addEventListener("change", () => {
          this.applySearchFilter();
        });
        filterLabel.appendChild(filterCheckbox);
        filterLabel.appendChild(document.createTextNode(" Filter rows"));
        const closeBtn = document.createElement("button");
        closeBtn.className = "datagrid-search-close";
        closeBtn.textContent = "\xD7";
        closeBtn.addEventListener("click", () => this.hideSearch());
        this.searchBarEl.appendChild(this.searchInputEl);
        this.searchBarEl.appendChild(filterLabel);
        this.searchBarEl.appendChild(closeBtn);
      }
      if (this.searchBarEl.parentElement !== this.container) {
        this.container.insertBefore(this.searchBarEl, this.table);
      }
    } else if (this.searchBarEl) {
      this.searchBarEl.remove();
      this.searchBarEl = null;
      this.searchInputEl = null;
    }
    const columnCount = this.schema.length || (this.data[0]?.length ?? 0);
    let existingColgroup = this.table.querySelector("colgroup");
    if (existingColgroup) existingColgroup.remove();
    const colgroup = document.createElement("colgroup");
    const rowHeaderCol = document.createElement("col");
    rowHeaderCol.style.width = "36px";
    colgroup.appendChild(rowHeaderCol);
    let hasExplicitWidth = false;
    for (let colIndex = 0; colIndex < columnCount; colIndex++) {
      const col = document.createElement("col");
      const width = this.schema[colIndex]?.width;
      if (width) {
        col.style.width = `${width}px`;
        hasExplicitWidth = true;
      }
      colgroup.appendChild(col);
    }
    this.table.insertBefore(colgroup, this.table.firstChild);
    this.colgroup = colgroup;
    if (hasExplicitWidth) {
      this.table.style.width = "auto";
      this.table.style.minWidth = "100%";
    } else {
      this.table.style.width = "100%";
      this.table.style.minWidth = "";
    }
    const thead = this.table.tHead ?? this.table.createTHead();
    thead.innerHTML = "";
    const headerRow = document.createElement("tr");
    const cornerTh = document.createElement("th");
    cornerTh.className = "datagrid-corner-header";
    headerRow.appendChild(cornerTh);
    for (let colIndex = 0; colIndex < columnCount; colIndex++) {
      const th = document.createElement("th");
      th.className = "datagrid-col-header";
      th.dataset.colIndex = String(colIndex);
      let headerText = this.columnIndexToLetter(colIndex);
      if (this.sortState && this.sortState.colIndex === colIndex) {
        headerText += this.sortState.direction === "asc" ? " \u25B2" : " \u25BC";
      }
      const textSpan = document.createElement("span");
      textSpan.textContent = headerText;
      th.appendChild(textSpan);
      const dropdownBtn = document.createElement("span");
      dropdownBtn.className = "datagrid-col-dropdown-btn";
      dropdownBtn.textContent = "\u25BC";
      th.appendChild(dropdownBtn);
      if (this.isColumnSelected(colIndex)) {
        th.classList.add("datagrid-header-selected");
      }
      const column = this.schema[colIndex];
      if (column?.title) {
        th.title = column.title;
      }
      headerRow.appendChild(th);
    }
    thead.appendChild(headerRow);
    if (!this.tbody) {
      this.tbody = document.createElement("tbody");
      this.table.appendChild(this.tbody);
    }
    this.renderVisibleRows();
  }
  renderVisibleRows() {
    if (!this.tbody) {
      return;
    }
    const fragment = document.createDocumentFragment();
    const columnCount = this.schema.length || (this.data[0]?.length ?? 0);
    const effectiveRowCount = this.filteredRowIndices ? this.filteredRowIndices.length : this.data.length;
    if (effectiveRowCount === 0 || columnCount === 0) {
      this.tbody.innerHTML = "";
      return;
    }
    const { start, end } = this.virtualization.visibleRange;
    const labelRowDataIndex = this.firstRowAsLabel ? this.filteredRowIndices ? this.filteredRowIndices[0] : 0 : -1;
    if (this.firstRowAsLabel && this.data.length > 0) {
      const labelRow = this.createDataRow(labelRowDataIndex, columnCount, "");
      labelRow.classList.add("datagrid-label-row");
      const thead = this.table.tHead;
      const headerHeight = thead ? thead.getBoundingClientRect().height : 21;
      const cells = labelRow.querySelectorAll("td");
      cells.forEach((td) => {
        td.style.position = "sticky";
        td.style.top = `${headerHeight}px`;
        td.style.zIndex = "1";
      });
      fragment.appendChild(labelRow);
    }
    const renderStart = this.firstRowAsLabel ? Math.max(start, 1) : start;
    const topSpacerHeight = (this.firstRowAsLabel ? Math.max(0, renderStart - 1) : renderStart) * this.rowHeight;
    if (topSpacerHeight > 0) {
      fragment.appendChild(this.createSpacerRow(topSpacerHeight, columnCount));
    }
    const searchLower = this.searchQuery.toLowerCase();
    for (let virtualIndex = renderStart; virtualIndex <= end && virtualIndex < effectiveRowCount; virtualIndex++) {
      const rowIndex = this.filteredRowIndices ? this.filteredRowIndices[virtualIndex] : virtualIndex;
      const row = document.createElement("tr");
      row.dataset.rowIndex = String(rowIndex);
      const rowHeader = document.createElement("td");
      rowHeader.className = "datagrid-row-header";
      if (this.isRowSelected(rowIndex)) {
        rowHeader.classList.add("datagrid-header-selected");
      }
      rowHeader.textContent = String(rowIndex + 1);
      rowHeader.style.height = `${this.rowHeight}px`;
      row.appendChild(rowHeader);
      for (let colIndex = 0; colIndex < columnCount; colIndex++) {
        const td = document.createElement("td");
        td.dataset.colIndex = String(colIndex);
        td.style.height = `${this.rowHeight}px`;
        const cellValue = this.data[rowIndex]?.[colIndex];
        const isEditing = this.editingCell?.row === rowIndex && this.editingCell?.col === colIndex;
        if (isEditing) {
          const input = document.createElement("input");
          input.className = "grid-editor";
          input.value = cellValue?.raw ?? "";
          input.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              this.endEdit(true);
              this.moveSelection(1, 0);
            } else if (event.key === "Escape") {
              event.preventDefault();
              this.endEdit(false);
            } else if (event.key === "Tab") {
              event.preventDefault();
            }
          });
          input.addEventListener("blur", () => {
            this.blurTimeout = setTimeout(() => {
              this.blurTimeout = null;
              if (this.editingCell) {
                this.endEdit(true);
              }
            }, 100);
          });
          const editMode = this.editingCell?.mode;
          requestAnimationFrame(() => {
            input.focus();
            if (editMode === "replace") {
              input.select();
            } else {
              const len = input.value.length;
              input.setSelectionRange(len, len);
            }
          });
          td.appendChild(input);
        } else {
          const colDef = this.schema[colIndex];
          const cellType = this.getCellType(colDef?.type);
          let displayValue;
          if (cellValue?.error) {
            displayValue = cellValue.raw ?? "";
          } else if (cellType && cellValue?.value !== void 0 && cellValue?.value !== null) {
            displayValue = cellType.format(cellValue.value, colDef?.formattingOptions);
          } else {
            displayValue = cellValue?.value !== void 0 && cellValue?.value !== null ? String(cellValue.value) : "";
          }
          td.textContent = displayValue;
          if (searchLower && displayValue) {
            const rawLower = (cellValue?.raw ?? "").toLowerCase();
            const displayLower = displayValue.toLowerCase();
            if (rawLower.includes(searchLower) || displayLower.includes(searchLower)) {
              td.classList.add("datagrid-cell-search-match");
            }
          }
        }
        if (cellValue?.error) {
          td.title = cellValue.error;
          td.classList.add("datagrid-cell-error");
        }
        if (this.isCellSelected(rowIndex, colIndex) && !isEditing) {
          td.classList.add("datagrid-cell-selected");
        }
        row.appendChild(td);
      }
      fragment.appendChild(row);
    }
    const bottomSpacerHeight = Math.max(
      0,
      this.virtualization.totalHeight - (end + 1) * this.rowHeight
    );
    if (bottomSpacerHeight > 0) {
      fragment.appendChild(this.createSpacerRow(bottomSpacerHeight, columnCount));
    }
    this.tbody.innerHTML = "";
    this.tbody.appendChild(fragment);
  }
  createSpacerRow(height, columnCount) {
    const spacerRow = document.createElement("tr");
    spacerRow.dataset.spacer = "true";
    const spacerCell = document.createElement("td");
    spacerCell.colSpan = Math.max(columnCount + 1, 1);
    spacerCell.style.height = `${height}px`;
    spacerRow.appendChild(spacerCell);
    return spacerRow;
  }
  /** Build a single data <tr> for a given row index. Used for the sticky label row. */
  createDataRow(rowIndex, columnCount, searchLower) {
    const row = document.createElement("tr");
    row.dataset.rowIndex = String(rowIndex);
    const rowHeader = document.createElement("td");
    rowHeader.className = "datagrid-row-header";
    if (this.isRowSelected(rowIndex)) {
      rowHeader.classList.add("datagrid-header-selected");
    }
    rowHeader.textContent = String(rowIndex + 1);
    rowHeader.style.height = `${this.rowHeight}px`;
    row.appendChild(rowHeader);
    for (let colIndex = 0; colIndex < columnCount; colIndex++) {
      const td = document.createElement("td");
      td.dataset.colIndex = String(colIndex);
      td.style.height = `${this.rowHeight}px`;
      const cellValue = this.data[rowIndex]?.[colIndex];
      const colDef = this.schema[colIndex];
      const cellType = this.getCellType(colDef?.type);
      let displayValue;
      if (cellValue?.error) {
        displayValue = cellValue.raw ?? "";
      } else if (cellType && cellValue?.value !== void 0 && cellValue?.value !== null) {
        displayValue = cellType.format(cellValue.value, colDef?.formattingOptions);
      } else {
        displayValue = cellValue?.value !== void 0 && cellValue?.value !== null ? String(cellValue.value) : "";
      }
      td.textContent = displayValue;
      if (searchLower && displayValue) {
        const rawLower = (cellValue?.raw ?? "").toLowerCase();
        const displayLower = displayValue.toLowerCase();
        if (rawLower.includes(searchLower) || displayLower.includes(searchLower)) {
          td.classList.add("datagrid-cell-search-match");
        }
      }
      if (cellValue?.error) {
        td.title = cellValue.error;
        td.classList.add("datagrid-cell-error");
      }
      if (this.isCellSelected(rowIndex, colIndex)) {
        td.classList.add("datagrid-cell-selected");
      }
      row.appendChild(td);
    }
    return row;
  }
  /** Convert a 0-based column index to Excel-style letter (0→A, 25→Z, 26→AA, etc.) */
  columnIndexToLetter(index) {
    let letter = "";
    let i = index;
    while (i >= 0) {
      letter = String.fromCharCode(65 + i % 26) + letter;
      i = Math.floor(i / 26) - 1;
    }
    return letter;
  }
  isCellSelected(row, col) {
    return this.selections.some((selection) => {
      const startRow = Math.min(selection.start.row, selection.end.row);
      const endRow = Math.max(selection.start.row, selection.end.row);
      const startCol = Math.min(selection.start.col, selection.end.col);
      const endCol = Math.max(selection.start.col, selection.end.col);
      return row >= startRow && row <= endRow && col >= startCol && col <= endCol;
    });
  }
  /** Is this entire column selected (all rows in the selection span the full data)? */
  isColumnSelected(col) {
    if (this.data.length === 0) return false;
    return this.selections.some((selection) => {
      const startRow = Math.min(selection.start.row, selection.end.row);
      const endRow = Math.max(selection.start.row, selection.end.row);
      const startCol = Math.min(selection.start.col, selection.end.col);
      const endCol = Math.max(selection.start.col, selection.end.col);
      return col >= startCol && col <= endCol && startRow === 0 && endRow === this.data.length - 1;
    });
  }
  /** Is this entire row selected (all columns in the selection span the full schema)? */
  isRowSelected(row) {
    if (this.schema.length === 0) return false;
    return this.selections.some((selection) => {
      const startRow = Math.min(selection.start.row, selection.end.row);
      const endRow = Math.max(selection.start.row, selection.end.row);
      const startCol = Math.min(selection.start.col, selection.end.col);
      const endCol = Math.max(selection.start.col, selection.end.col);
      return row >= startRow && row <= endRow && startCol === 0 && endCol === this.schema.length - 1;
    });
  }
  onScroll() {
    this.virtualization.updateScrollTop(this.container.scrollTop);
    this.renderVisibleRows();
  }
  onDoubleClick(event) {
    const target = event.target;
    if (target.classList.contains("grid-editor")) return;
    const cell = target.closest("td");
    if (!cell || cell.classList.contains("datagrid-row-header")) return;
    const row = cell.parentElement;
    if (row.dataset.spacer) return;
    if (!cell.dataset.colIndex) return;
    const rowIndex = parseInt(row.dataset.rowIndex || "0");
    const colIndex = parseInt(cell.dataset.colIndex || "0");
    if (this.editingCell?.row === rowIndex && this.editingCell?.col === colIndex) return;
    this.editCell(rowIndex, colIndex);
  }
  onMouseDown(event) {
    const target = event.target;
    if (target.classList.contains("grid-editor")) return;
    if (this.editingCell) {
      if (this.blurTimeout !== null) {
        clearTimeout(this.blurTimeout);
        this.blurTimeout = null;
      }
      this.endEdit(true);
    }
    const colHeader = target.closest(".datagrid-col-header");
    if (colHeader && colHeader.dataset.colIndex !== void 0) {
      const rect = colHeader.getBoundingClientRect();
      const colIndex2 = parseInt(colHeader.dataset.colIndex);
      if (event.clientX >= rect.right - 6) {
        event.preventDefault();
        this.startColumnResize(colIndex2, event.clientX, rect.width);
        return;
      }
      if (target.classList.contains("datagrid-col-dropdown-btn")) {
        event.preventDefault();
        event.stopPropagation();
        this.showColumnPropertiesPanel(colIndex2, colHeader);
        this.container.focus();
        return;
      }
      if (this.data.length > 0) {
        this.selectRange(
          { row: 0, col: colIndex2 },
          { row: this.data.length - 1, col: colIndex2 }
        );
        this.container.focus();
        return;
      }
    }
    const cornerHeader = target.closest(".datagrid-corner-header");
    if (cornerHeader && this.data.length > 0 && this.schema.length > 0) {
      this.selectRange(
        { row: 0, col: 0 },
        { row: this.data.length - 1, col: this.schema.length - 1 }
      );
      this.container.focus();
      return;
    }
    const rowHeader = target.closest(".datagrid-row-header");
    if (rowHeader && this.schema.length > 0) {
      const row2 = rowHeader.parentElement;
      if (row2 && !row2.dataset.spacer && row2.dataset.rowIndex !== void 0) {
        const rowIndex2 = parseInt(row2.dataset.rowIndex);
        this.selectRange(
          { row: rowIndex2, col: 0 },
          { row: rowIndex2, col: this.schema.length - 1 }
        );
        this.container.focus();
        return;
      }
    }
    const cell = target.closest("td");
    if (!cell || !cell.dataset.colIndex) return;
    const row = cell.parentElement;
    if (row.dataset.spacer) return;
    const rowIndex = parseInt(row.dataset.rowIndex || "0");
    const colIndex = parseInt(cell.dataset.colIndex || "0");
    if (event.detail >= 2) {
      this.editCell(rowIndex, colIndex);
      return;
    }
    this.isSelecting = true;
    this.selectionStartCell = { row: rowIndex, col: colIndex };
    this.selectRange(this.selectionStartCell, this.selectionStartCell);
    this.container.focus();
  }
  onMouseMove(event) {
    const target = event.target;
    const colHeader = target.closest(".datagrid-col-header");
    if (colHeader && !this.isSelecting) {
      const rect = colHeader.getBoundingClientRect();
      if (event.clientX >= rect.right - 6) {
        this.container.style.cursor = "col-resize";
      } else {
        this.container.style.cursor = "";
      }
    } else if (!this.isSelecting) {
      this.container.style.cursor = "";
    }
    if (this.isSelecting && this.selectionStartCell) {
      const cell = target.closest("td");
      if (cell && !cell.classList.contains("datagrid-row-header") && cell.dataset.colIndex) {
        const row = cell.parentElement;
        if (row.dataset.spacer) return;
        const rowIndex = parseInt(row.dataset.rowIndex || "0");
        const colIndex = parseInt(cell.dataset.colIndex || "0");
        this.selectRange(this.selectionStartCell, { row: rowIndex, col: colIndex });
      }
    }
  }
  onMouseUp() {
    this.isSelecting = false;
    this.selectionStartCell = null;
  }
  onCopy(event) {
    event.preventDefault();
    const tsv = this.selectionToTSV();
    event.clipboardData?.setData("text/plain", tsv);
  }
  onPaste(event) {
    event.preventDefault();
    const text = event.clipboardData?.getData("text/plain");
    if (text) {
      this.pasteFromTSV(text);
    }
  }
  onKeyDown(event) {
    if ((event.ctrlKey || event.metaKey) && event.key === "f") {
      event.preventDefault();
      this.showSearch();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key === "z") {
      event.preventDefault();
      this.undo();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key === "y") {
      event.preventDefault();
      this.redo();
      return;
    }
    if (this.editingCell) {
      if (event.key === "Tab") {
        event.preventDefault();
        this.endEdit(true);
        this.moveSelection(0, event.shiftKey ? -1 : 1);
      }
      return;
    }
    if (this.selections.length === 0) return;
    const currentSelection = this.selections[0].start;
    const { row, col } = currentSelection;
    if (event.key === "ArrowUp") {
      event.preventDefault();
      event.shiftKey ? this.extendSelection(-1, 0) : this.moveSelection(-1, 0);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      event.shiftKey ? this.extendSelection(1, 0) : this.moveSelection(1, 0);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      event.shiftKey ? this.extendSelection(0, -1) : this.moveSelection(0, -1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      event.shiftKey ? this.extendSelection(0, 1) : this.moveSelection(0, 1);
    } else if (event.key === "Tab") {
      event.preventDefault();
      this.moveSelection(0, event.shiftKey ? -1 : 1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      this.editCell(row, col);
    } else if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      this.setDataAt(row, col, "", true, "");
    } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
      this.editCell(row, col, "replace");
      requestAnimationFrame(() => {
        const editor = this.container.querySelector(".grid-editor");
        if (editor) {
          editor.value = event.key;
          editor.setSelectionRange(1, 1);
        }
      });
    }
  }
  moveSelection(rowDelta, colDelta) {
    if (this.selections.length === 0) return;
    const currentSelection = this.selections[0].start;
    if (this.filteredRowIndices) {
      const currentFilteredIdx = this.filteredRowIndices.indexOf(currentSelection.row);
      let newFilteredIdx = (currentFilteredIdx === -1 ? 0 : currentFilteredIdx) + rowDelta;
      newFilteredIdx = Math.max(0, Math.min(newFilteredIdx, this.filteredRowIndices.length - 1));
      const newRow = this.filteredRowIndices[newFilteredIdx];
      let newCol = currentSelection.col + colDelta;
      newCol = Math.max(0, Math.min(newCol, this.schema.length - 1));
      this.selectionAnchor = null;
      this.selectCell(newRow, newCol);
      this.ensureCellVisible(newFilteredIdx, newCol);
    } else {
      let newRow = currentSelection.row + rowDelta;
      let newCol = currentSelection.col + colDelta;
      newRow = Math.max(0, Math.min(newRow, this.data.length - 1));
      newCol = Math.max(0, Math.min(newCol, this.schema.length - 1));
      this.selectionAnchor = null;
      this.selectCell(newRow, newCol);
      this.ensureCellVisible(newRow, newCol);
    }
  }
  extendSelection(rowDelta, colDelta) {
    if (this.selections.length === 0) return;
    const sel = this.selections[0];
    if (!this.selectionAnchor) {
      this.selectionAnchor = { row: sel.start.row, col: sel.start.col };
    }
    let newRow = sel.end.row + rowDelta;
    let newCol = sel.end.col + colDelta;
    newRow = Math.max(0, Math.min(newRow, this.data.length - 1));
    newCol = Math.max(0, Math.min(newCol, this.schema.length - 1));
    this.selectRange(this.selectionAnchor, { row: newRow, col: newCol });
    this.ensureCellVisible(newRow, newCol);
  }
  ensureCellVisible(row, col) {
    const { start, end } = this.virtualization.visibleRange;
    if (row < start) {
      this.container.scrollTop = row * this.rowHeight;
    } else if (row > end) {
      this.container.scrollTop = (row - (end - start)) * this.rowHeight;
    }
  }
  selectionToTSV() {
    if (this.selections.length === 0) return "";
    const selection = this.selections[0];
    const startRow = Math.min(selection.start.row, selection.end.row);
    const endRow = Math.max(selection.start.row, selection.end.row);
    const startCol = Math.min(selection.start.col, selection.end.col);
    const endCol = Math.max(selection.start.col, selection.end.col);
    let tsv = "";
    for (let i = startRow; i <= endRow; i++) {
      for (let j = startCol; j <= endCol; j++) {
        const cellValue = this.data[i][j];
        const colDef = this.schema[j];
        const cellType = this.getCellType(colDef.type);
        if (cellType) {
          tsv += cellType.format(cellValue.value, colDef.formattingOptions);
        } else {
          tsv += String(cellValue.value);
        }
        if (j < endCol) tsv += "	";
      }
      if (i < endRow) tsv += "\n";
    }
    return tsv;
  }
  exportTSV(options) {
    const formatted = options?.formatted !== false;
    const lines = [];
    lines.push(this.schema.map((col) => col.title).join("	"));
    for (let i = 0; i < this.data.length; i++) {
      const cells = [];
      for (let j = 0; j < this.schema.length; j++) {
        const cellValue = this.data[i]?.[j];
        if (!cellValue) {
          cells.push("");
          continue;
        }
        if (formatted) {
          const colDef = this.schema[j];
          const cellType = this.getCellType(colDef.type);
          if (cellValue.error) {
            cells.push(cellValue.raw ?? "");
          } else if (cellType && cellValue.value !== void 0 && cellValue.value !== null) {
            cells.push(cellType.format(cellValue.value, colDef.formattingOptions));
          } else {
            cells.push(cellValue.value !== void 0 && cellValue.value !== null ? String(cellValue.value) : "");
          }
        } else {
          cells.push(cellValue.raw ?? "");
        }
      }
      lines.push(cells.join("	"));
    }
    return lines.join("\n");
  }
  pasteFromTSV(text) {
    if (this.selections.length === 0) return;
    const selection = this.selections[0];
    const startRow = Math.min(selection.start.row, selection.end.row);
    const startCol = Math.min(selection.start.col, selection.end.col);
    const rows = text.replace(/\r\n/g, "\n").split("\n").map((row) => row.split("	"));
    if (rows.length > 0 && rows[rows.length - 1].length === 1 && rows[rows.length - 1][0] === "") {
      rows.pop();
    }
    const requiredRows = startRow + rows.length;
    const requiredCols = startCol + Math.max(...rows.map((r) => r.length));
    let schemaChanged = false;
    while (this.schema.length < requiredCols) {
      const colIndex = this.schema.length;
      this.schema.push({ id: `col-${colIndex}`, title: `Column ${colIndex + 1}`, type: "text" });
      schemaChanged = true;
    }
    if (schemaChanged) {
      for (const row of this.data) {
        while (row.length < this.schema.length) {
          row.push({ raw: "", value: "" });
        }
      }
    }
    while (this.data.length < requiredRows) {
      const newRow = new Array(this.schema.length).fill(null).map(() => ({ raw: "", value: "" }));
      this.data.push(newRow);
    }
    const changes = [];
    rows.forEach((rowData, rowIndex) => {
      rowData.forEach((cellRawValue, colIndex) => {
        const targetRow = startRow + rowIndex;
        const targetCol = startCol + colIndex;
        const oldValue = this.data[targetRow][targetCol];
        const colDef = this.schema[targetCol];
        const cellType = this.getCellType(colDef.type);
        let newValue;
        if (cellType) {
          const parsed = cellType.parse(cellRawValue);
          newValue = { raw: cellRawValue, value: parsed.error ? cellRawValue : parsed.value, error: parsed.error };
        } else {
          newValue = { raw: cellRawValue, value: cellRawValue };
        }
        if (oldValue.raw !== newValue.raw || oldValue.value !== newValue.value || oldValue.error !== newValue.error) {
          changes.push({ row: targetRow, col: targetCol, oldValue, newValue });
        }
        this.data[targetRow][targetCol] = newValue;
      });
    });
    this.virtualization = new Virtualization({
      container: this.container,
      itemCount: this.data.length,
      itemHeight: this.rowHeight
    });
    if (changes.length > 0) {
      this.historyManager.add(new PasteAction(this, changes));
    }
    this.render();
    if (schemaChanged) {
      this.hookBus.emit("schemaChange", this.getSchema());
    }
    if (changes.length > 0) {
      this.hookBus.emit("dataChange", this.getData());
    }
  }
  selectCell(row, col) {
    this.selectionAnchor = null;
    this.selections = [{ start: { row, col }, end: { row, col } }];
    this.updateSelectionStyles();
  }
  selectRange(start, end) {
    this.selections = [{ start, end }];
    this.updateSelectionStyles();
  }
  /** Update selection CSS classes in-place without rebuilding the DOM. */
  updateSelectionStyles() {
    if (!this.tbody) return;
    if (this.table?.tHead) {
      const colHeaders = this.table.tHead.querySelectorAll(".datagrid-col-header");
      colHeaders.forEach((th) => {
        const colIndex = parseInt(th.dataset.colIndex || "-1");
        if (this.isColumnSelected(colIndex)) {
          th.classList.add("datagrid-header-selected");
        } else {
          th.classList.remove("datagrid-header-selected");
        }
      });
    }
    const rows = this.tbody.querySelectorAll("tr:not([data-spacer])");
    rows.forEach((tr) => {
      const rowIndex = parseInt(tr.dataset.rowIndex || "-1");
      const rowHeader = tr.querySelector(".datagrid-row-header");
      if (rowHeader) {
        if (this.isRowSelected(rowIndex)) {
          rowHeader.classList.add("datagrid-header-selected");
        } else {
          rowHeader.classList.remove("datagrid-header-selected");
        }
      }
      const cells = tr.querySelectorAll("td:not(.datagrid-row-header)");
      cells.forEach((td) => {
        const colIndex = parseInt(td.dataset.colIndex || "-1");
        const isEditing = this.editingCell?.row === rowIndex && this.editingCell?.col === colIndex;
        if (this.isCellSelected(rowIndex, colIndex) && !isEditing) {
          td.classList.add("datagrid-cell-selected");
        } else {
          td.classList.remove("datagrid-cell-selected");
        }
      });
    });
  }
  editCell(row, col, mode = "cursor") {
    if (this.blurTimeout !== null) {
      clearTimeout(this.blurTimeout);
      this.blurTimeout = null;
    }
    if (this.editingCell) {
      this.endEdit(true);
    }
    this.editingCell = { row, col, mode };
    this.renderVisibleRows();
  }
  endEdit(commit, recordHistory = true) {
    if (!this.editingCell) return;
    const { row, col } = this.editingCell;
    const oldCellValue = this.data[row][col];
    let newRawValue = oldCellValue.raw;
    let newParsedValue = oldCellValue.value;
    let newError = oldCellValue.error;
    if (commit) {
      const editor = this.container.querySelector(".grid-editor");
      if (editor) {
        newRawValue = editor.value;
        const colDef = this.schema[col];
        const cellType = this.getCellType(colDef.type);
        if (cellType) {
          const parsed = cellType.parse(newRawValue);
          newParsedValue = parsed.error ? newRawValue : parsed.value;
          newError = parsed.error;
        } else {
          newParsedValue = newRawValue;
          newError = void 0;
        }
      }
    }
    const newCellValue = { raw: newRawValue, value: newParsedValue, error: newError };
    const dataChanged = oldCellValue.raw !== newCellValue.raw || oldCellValue.value !== newCellValue.value || oldCellValue.error !== newCellValue.error;
    if (recordHistory && commit && dataChanged) {
      this.historyManager.add(new EditAction(this, row, col, oldCellValue, newCellValue));
    }
    this.data[row][col] = newCellValue;
    this.editingCell = null;
    this.renderVisibleRows();
    if (commit && dataChanged) {
      this.hookBus.emit("dataChange", this.getData());
    }
  }
  setDataAt(row, col, value, recordHistory = true, raw) {
    const oldCellValue = this.data[row][col];
    const colDef = this.schema[col];
    const cellType = this.getCellType(colDef.type);
    let newRaw = raw !== void 0 ? raw : String(value);
    let newParsedValue = value;
    let newError = void 0;
    if (cellType) {
      const parsed = cellType.parse(newRaw);
      newParsedValue = parsed.error ? newRaw : parsed.value;
      newError = parsed.error;
    }
    const newCellValue = { raw: newRaw, value: newParsedValue, error: newError };
    const dataChanged = oldCellValue.raw !== newCellValue.raw || oldCellValue.value !== newCellValue.value || oldCellValue.error !== newCellValue.error;
    this.data[row][col] = newCellValue;
    if (recordHistory && dataChanged) {
      this.historyManager.add(new EditAction(this, row, col, oldCellValue, newCellValue));
    }
    this.renderVisibleRows();
    if (dataChanged) {
      this.hookBus.emit("dataChange", this.getData());
    }
  }
  undo() {
    this.historyManager.undo();
  }
  redo() {
    this.historyManager.redo();
  }
  importText(rawText, options) {
    this.dismissColumnPropertiesPanel();
    this.hookBus.emit("beforeImportParse", rawText, options);
    const detectedDelimiter = options?.delimiter || detectDelimiter(rawText);
    const parsedRawData = parseDelimited(rawText, detectedDelimiter);
    if (parsedRawData.length === 0) {
      this.data = [];
      this.schema = [];
      this.render();
      this.hookBus.emit("afterImportParse", this.data, this.schema);
      this.hookBus.emit("schemaChange", this.getSchema());
      this.hookBus.emit("dataChange", this.getData());
      return;
    }
    const firstRow = parsedRawData[0];
    const inferredTitles = inferHeader(firstRow);
    const inferredSchemaTypes = inferSchemaTypes(parsedRawData, 200);
    const newSchema = inferredTitles.map((title, colIndex) => ({
      ...inferredSchemaTypes[colIndex],
      id: `col-${colIndex}`,
      title
    }));
    this.schema = newSchema;
    this.data = this.parseCellData(parsedRawData, newSchema);
    this.virtualization = new Virtualization({
      container: this.container,
      itemCount: this.data.length,
      itemHeight: this.rowHeight
    });
    this.render();
    this.hookBus.emit("afterImportParse", this.data, this.schema);
    this.hookBus.emit("schemaChange", this.getSchema());
    this.hookBus.emit("dataChange", this.getData());
  }
  getData() {
    return this.data.map((row) => row.map((cell) => cell.value));
  }
  getRawData() {
    return this.data.map((row) => row.map((cell) => cell?.raw ?? ""));
  }
  setData(data, recordHistory = true, emitEvent = true) {
    this.dismissColumnPropertiesPanel();
    const currentData = this.getData();
    if (this.arraysEqual(currentData, data)) {
      return;
    }
    this.data = this.parseCellData(data, this.schema);
    this.virtualization = new Virtualization({
      container: this.container,
      itemCount: this.data.length,
      itemHeight: this.rowHeight
    });
    this.render();
    if (emitEvent) {
      this.hookBus.emit("dataChange", this.getData());
    }
  }
  arraysEqual(a, b) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!a[i] || !b[i] || a[i].length !== b[i].length) return false;
      for (let j = 0; j < a[i].length; j++) {
        if (a[i][j] !== b[i][j]) return false;
      }
    }
    return true;
  }
  getSchema() {
    return this.schema;
  }
  setSchema(schema, emitEvent = true) {
    this.dismissColumnPropertiesPanel();
    if (this.schemasEqual(this.schema, schema)) {
      return;
    }
    this.schema = schema;
    this.render();
    if (emitEvent) {
      this.hookBus.emit("schemaChange", this.getSchema());
    }
  }
  schemasEqual(a, b) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (JSON.stringify(a[i]) !== JSON.stringify(b[i])) return false;
    }
    return true;
  }
  getRowHeight() {
    return this.rowHeight;
  }
  setRowHeight(height) {
    if (this.rowHeight === height) return;
    this.rowHeight = height;
    this.virtualization = new Virtualization({
      container: this.container,
      itemCount: this.data.length,
      itemHeight: this.rowHeight
    });
    this.render();
  }
  getFirstRowAsLabel() {
    return this.firstRowAsLabel;
  }
  setFirstRowAsLabel(enabled) {
    if (this.firstRowAsLabel === enabled) return;
    this.firstRowAsLabel = enabled;
    this.render();
  }
  // ─── Row/Column CRUD internal helpers (used by Action classes) ───
  /** @internal Used by Action classes — do not call directly. */
  insertRowInternal(rowIndex, rowData) {
    this.data.splice(rowIndex, 0, rowData);
    this.rebuildVirtualization();
    this.clampSelection();
    this.render();
    this.hookBus.emit("dataChange", this.getData());
  }
  /** @internal Used by Action classes — do not call directly. */
  removeRowInternal(rowIndex) {
    const removed = this.data.splice(rowIndex, 1)[0] ?? [];
    this.rebuildVirtualization();
    this.clampSelection();
    this.render();
    this.hookBus.emit("dataChange", this.getData());
    return removed;
  }
  /** @internal Used by Action classes — do not call directly. */
  insertColumnInternal(colIndex, colDef, cellValues) {
    this.schema.splice(colIndex, 0, colDef);
    for (let i = 0; i < this.data.length; i++) {
      this.data[i].splice(colIndex, 0, cellValues[i] ?? { raw: "", value: "" });
    }
    this.clampSelection();
    this.render();
    this.hookBus.emit("schemaChange", this.getSchema());
    this.hookBus.emit("dataChange", this.getData());
  }
  /** @internal Used by Action classes — do not call directly. */
  removeColumnInternal(colIndex) {
    const colDef = this.schema.splice(colIndex, 1)[0];
    const cellValues = [];
    for (let i = 0; i < this.data.length; i++) {
      cellValues.push(this.data[i].splice(colIndex, 1)[0] ?? { raw: "", value: "" });
    }
    this.clampSelection();
    this.render();
    this.hookBus.emit("schemaChange", this.getSchema());
    this.hookBus.emit("dataChange", this.getData());
    return { colDef, cellValues };
  }
  /** @internal Used by SortAction — do not call directly. */
  applyDataOrder(data, sortState) {
    this.data = data.map((row) => [...row]);
    this.sortState = sortState;
    this.rebuildVirtualization();
    this.render();
    this.hookBus.emit("dataChange", this.getData());
  }
  /** @internal Used by ColumnTypeChangeAction — do not call directly. */
  applyColumnTypeChange(colIndex, colDef, data) {
    this.schema[colIndex] = colDef;
    this.data = data.map((row) => [...row]);
    this.sortState = null;
    this.render();
    this.hookBus.emit("schemaChange", this.getSchema());
    this.hookBus.emit("dataChange", this.getData());
  }
  rebuildVirtualization() {
    this.virtualization = new Virtualization({
      container: this.container,
      itemCount: this.data.length,
      itemHeight: this.rowHeight
    });
  }
  clampSelection() {
    if (this.selections.length === 0) return;
    const maxRow = Math.max(0, this.data.length - 1);
    const maxCol = Math.max(0, this.schema.length - 1);
    for (const sel of this.selections) {
      sel.start.row = Math.min(sel.start.row, maxRow);
      sel.start.col = Math.min(sel.start.col, maxCol);
      sel.end.row = Math.min(sel.end.row, maxRow);
      sel.end.col = Math.min(sel.end.col, maxCol);
    }
  }
  // ─── Public CRUD methods ───
  addRow(index) {
    if (this.editingCell) this.endEdit(true);
    const rowIndex = index !== void 0 ? index : this.data.length;
    const newRow = this.schema.map(() => ({ raw: "", value: "" }));
    this.data.splice(rowIndex, 0, newRow);
    this.sortState = null;
    this.rebuildVirtualization();
    this.render();
    if (this.searchQuery) this.applySearchFilter();
    this.historyManager.add(new AddRowAction(this, rowIndex, newRow));
    this.hookBus.emit("dataChange", this.getData());
  }
  deleteRow(index) {
    if (this.data.length === 0) return;
    if (this.editingCell) this.endEdit(true);
    const rowIndex = index !== void 0 ? index : this.data.length - 1;
    if (rowIndex < 0 || rowIndex >= this.data.length) return;
    const removedRow = this.data.splice(rowIndex, 1)[0];
    this.sortState = null;
    this.rebuildVirtualization();
    this.clampSelection();
    this.render();
    if (this.searchQuery) this.applySearchFilter();
    this.historyManager.add(new DeleteRowAction(this, rowIndex, removedRow));
    this.hookBus.emit("dataChange", this.getData());
  }
  addColumn(index, colDef) {
    if (this.editingCell) this.endEdit(true);
    const colIndex = index !== void 0 ? index : this.schema.length;
    const newColDef = colDef || {
      id: `col-${Date.now()}`,
      title: `Column ${this.schema.length + 1}`,
      type: "text"
    };
    const cellValues = this.data.map(() => ({ raw: "", value: "" }));
    this.schema.splice(colIndex, 0, newColDef);
    for (let i = 0; i < this.data.length; i++) {
      this.data[i].splice(colIndex, 0, cellValues[i]);
    }
    this.sortState = null;
    this.render();
    this.historyManager.add(new AddColumnAction(this, colIndex, newColDef, cellValues));
    this.hookBus.emit("schemaChange", this.getSchema());
    this.hookBus.emit("dataChange", this.getData());
  }
  deleteColumn(index) {
    if (this.schema.length === 0) return;
    if (this.editingCell) this.endEdit(true);
    const colIndex = index !== void 0 ? index : this.schema.length - 1;
    if (colIndex < 0 || colIndex >= this.schema.length) return;
    const removedColDef = this.schema.splice(colIndex, 1)[0];
    const removedCells = [];
    for (let i = 0; i < this.data.length; i++) {
      removedCells.push(this.data[i].splice(colIndex, 1)[0] ?? { raw: "", value: "" });
    }
    this.sortState = null;
    this.clampSelection();
    this.render();
    this.historyManager.add(new DeleteColumnAction(this, colIndex, removedColDef, removedCells));
    this.hookBus.emit("schemaChange", this.getSchema());
    this.hookBus.emit("dataChange", this.getData());
  }
  // ─── Sorting ───
  sortByColumn(colIndex, direction) {
    if (this.editingCell) this.endEdit(true);
    if (colIndex < 0 || colIndex >= this.schema.length) return;
    const preData = this.data.map((row) => [...row]);
    const preSortState = this.sortState ? { ...this.sortState } : null;
    const colDef = this.schema[colIndex];
    const cellType = this.getCellType(colDef.type);
    this.data.sort((a, b) => {
      const cellA = a[colIndex];
      const cellB = b[colIndex];
      const aIsEmpty = !cellA || cellA.value === "" || cellA.value === null || cellA.value === void 0;
      const bIsEmpty = !cellB || cellB.value === "" || cellB.value === null || cellB.value === void 0;
      const aIsError = !!cellA?.error;
      const bIsError = !!cellB?.error;
      if (aIsEmpty && bIsEmpty) return 0;
      if (aIsEmpty) return 1;
      if (bIsEmpty) return -1;
      if (aIsError && bIsError) return 0;
      if (aIsError) return 1;
      if (bIsError) return -1;
      let cmp;
      if (cellType?.compare) {
        cmp = cellType.compare(cellA.value, cellB.value);
      } else {
        cmp = String(cellA.value).localeCompare(String(cellB.value));
      }
      return direction === "asc" ? cmp : -cmp;
    });
    this.sortState = { colIndex, direction };
    this.rebuildVirtualization();
    this.render();
    if (this.searchQuery) this.applySearchFilter();
    const postData = this.data.map((row) => [...row]);
    this.historyManager.add(new SortAction(this, preData, postData, preSortState, this.sortState));
    this.hookBus.emit("dataChange", this.getData());
  }
  // ─── Column Type Change ───
  setColumnType(colIndexOrId, newType, options, strategy = "reparse") {
    if (this.editingCell) this.endEdit(true);
    let colIndex;
    if (typeof colIndexOrId === "string") {
      colIndex = this.schema.findIndex((col) => col.id === colIndexOrId);
      if (colIndex === -1) return;
    } else {
      colIndex = colIndexOrId;
    }
    if (colIndex < 0 || colIndex >= this.schema.length) return;
    const oldColDef = { ...this.schema[colIndex] };
    const oldData = this.data.map((row) => [...row]);
    const newCellType = this.getCellType(newType);
    const oldCellType = this.getCellType(oldColDef.type);
    const newColDef = {
      ...this.schema[colIndex],
      type: newType,
      formattingOptions: options?.formattingOptions ?? this.schema[colIndex].formattingOptions
    };
    this.schema[colIndex] = newColDef;
    for (let i = 0; i < this.data.length; i++) {
      const cell = this.data[i][colIndex];
      if (!cell) continue;
      let rawForNewParse;
      if (strategy === "convert" && oldCellType && !cell.error && cell.value !== "" && cell.value !== null && cell.value !== void 0) {
        rawForNewParse = oldCellType.format(cell.value, oldColDef.formattingOptions);
      } else {
        rawForNewParse = cell.raw;
      }
      if (newCellType) {
        const parsed = newCellType.parse(rawForNewParse);
        this.data[i][colIndex] = {
          raw: cell.raw,
          value: parsed.error ? rawForNewParse : parsed.value,
          error: parsed.error
        };
      } else {
        this.data[i][colIndex] = { raw: cell.raw, value: rawForNewParse };
      }
    }
    this.sortState = null;
    this.render();
    const newData = this.data.map((row) => [...row]);
    this.historyManager.add(new ColumnTypeChangeAction(this, colIndex, oldColDef, newColDef, oldData, newData));
    this.hookBus.emit("schemaChange", this.getSchema());
    this.hookBus.emit("dataChange", this.getData());
  }
  // ─── Context Menu ───
  onContextMenu(event) {
    event.preventDefault();
    if (this.editingCell) this.endEdit(true);
    const target = event.target;
    const cell = target.closest("td");
    if (cell && !cell.classList.contains("datagrid-row-header")) {
      const row = cell.parentElement;
      if (row && !row.dataset.spacer && cell.dataset.colIndex) {
        const rowIndex = parseInt(row.dataset.rowIndex || "0");
        const colIndex = parseInt(cell.dataset.colIndex || "0");
        if (!this.isCellSelected(rowIndex, colIndex)) {
          this.selectCell(rowIndex, colIndex);
        }
      }
    }
    this.showContextMenu(event.clientX, event.clientY);
  }
  showContextMenu(x, y) {
    this.dismissContextMenu();
    const menu = document.createElement("div");
    menu.className = "datagrid-context-menu";
    menu.style.position = "fixed";
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    menu.style.zIndex = "10000";
    const sel = this.selections[0];
    const rowIndex = sel ? Math.min(sel.start.row, sel.end.row) : 0;
    const colIndex = sel ? Math.min(sel.start.col, sel.end.col) : 0;
    const items = [
      { label: "Insert row above", action: () => this.addRow(rowIndex) },
      { label: "Insert row below", action: () => this.addRow(rowIndex + 1) },
      { label: "Delete row", action: () => this.deleteRow(rowIndex) },
      "separator",
      { label: "Insert column left", action: () => this.addColumn(colIndex) },
      { label: "Insert column right", action: () => this.addColumn(colIndex + 1) },
      { label: "Delete column", action: () => this.deleteColumn(colIndex) },
      "separator",
      { label: "Sort ascending", action: () => this.sortByColumn(colIndex, "asc") },
      { label: "Sort descending", action: () => this.sortByColumn(colIndex, "desc") }
    ];
    for (const item of items) {
      if (item === "separator") {
        const sep = document.createElement("div");
        sep.className = "datagrid-context-menu-separator";
        menu.appendChild(sep);
      } else {
        const menuItem = document.createElement("div");
        menuItem.className = "datagrid-context-menu-item";
        menuItem.textContent = item.label;
        menuItem.addEventListener("mousedown", (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.dismissContextMenu();
          item.action();
        });
        menu.appendChild(menuItem);
      }
    }
    document.body.appendChild(menu);
    this.contextMenuEl = menu;
    setTimeout(() => {
      document.addEventListener("mousedown", this.boundDismissContextMenu);
      document.addEventListener("keydown", this.boundContextMenuKeyDown);
    }, 0);
  }
  dismissContextMenu() {
    if (this.contextMenuEl) {
      this.contextMenuEl.remove();
      this.contextMenuEl = null;
      document.removeEventListener("mousedown", this.boundDismissContextMenu);
      document.removeEventListener("keydown", this.boundContextMenuKeyDown);
    }
  }
  onDismissContextMenu(e) {
    if (this.contextMenuEl && !this.contextMenuEl.contains(e.target)) {
      this.dismissContextMenu();
    }
  }
  onContextMenuKeyDown(e) {
    if (e.key === "Escape") {
      this.dismissContextMenu();
    }
  }
  // ─── Column Resizing ───
  startColumnResize(colIndex, clientX, currentWidth) {
    this.resizingCol = colIndex;
    this.resizeStartX = clientX;
    this.resizeStartWidth = currentWidth;
    document.body.style.cursor = "col-resize";
    document.addEventListener("mousemove", this.boundResizeMouseMove);
    document.addEventListener("mouseup", this.boundResizeMouseUp);
  }
  onResizeMouseMove(e) {
    if (this.resizingCol === null || !this.colgroup) return;
    const delta = e.clientX - this.resizeStartX;
    const newWidth = Math.max(this.MIN_COL_WIDTH, this.resizeStartWidth + delta);
    const colEl = this.colgroup.children[this.resizingCol + 1];
    if (colEl) {
      colEl.style.width = `${newWidth}px`;
    }
    if (this.table) {
      this.table.style.width = "auto";
      this.table.style.minWidth = "100%";
    }
  }
  onResizeMouseUp(e) {
    if (this.resizingCol !== null) {
      const delta = e.clientX - this.resizeStartX;
      const newWidth = Math.max(this.MIN_COL_WIDTH, this.resizeStartWidth + delta);
      if (this.schema[this.resizingCol]) {
        this.schema[this.resizingCol].width = newWidth;
      }
      this.resizingCol = null;
      document.body.style.cursor = "";
      document.removeEventListener("mousemove", this.boundResizeMouseMove);
      document.removeEventListener("mouseup", this.boundResizeMouseUp);
      this.hookBus.emit("schemaChange", this.getSchema());
    }
  }
  // ─── Column Properties Panel ───
  showColumnPropertiesPanel(colIndex, headerEl) {
    this.dismissColumnPropertiesPanel();
    this.dismissContextMenu();
    this.columnPropertiesPanelColIndex = colIndex;
    const colDef = this.schema[colIndex];
    if (!colDef) return;
    const rect = headerEl.getBoundingClientRect();
    const panel = document.createElement("div");
    panel.className = "datagrid-col-properties-panel";
    panel.style.position = "fixed";
    panel.style.left = `${rect.left}px`;
    panel.style.top = `${rect.bottom}px`;
    panel.style.zIndex = "10000";
    const titleSection = this.createPanelSection("Title");
    const titleInput = document.createElement("input");
    titleInput.type = "text";
    titleInput.className = "datagrid-panel-input";
    titleInput.value = colDef.title;
    titleInput.addEventListener("input", () => {
      this.schema[colIndex].title = titleInput.value;
      const th = this.container.querySelector(`th[data-col-index="${colIndex}"]`);
      if (th) th.title = titleInput.value;
      this.hookBus.emit("schemaChange", this.getSchema());
    });
    titleSection.appendChild(titleInput);
    panel.appendChild(titleSection);
    const typeSection = this.createPanelSection("Type");
    const typeSelect = document.createElement("select");
    typeSelect.className = "datagrid-panel-select";
    for (const typeName of ["text", "number", "percent", "date"]) {
      const opt = document.createElement("option");
      opt.value = typeName;
      opt.textContent = typeName.charAt(0).toUpperCase() + typeName.slice(1);
      if (colDef.type === typeName) opt.selected = true;
      typeSelect.appendChild(opt);
    }
    typeSelect.addEventListener("change", () => {
      const newType = typeSelect.value;
      if (newType !== this.schema[colIndex].type) {
        this.setColumnType(colIndex, newType);
        this.rebuildFormattingSection(panel, colIndex);
      }
    });
    typeSection.appendChild(typeSelect);
    panel.appendChild(typeSection);
    const formattingContainer = document.createElement("div");
    formattingContainer.dataset.formattingContainer = "true";
    panel.appendChild(formattingContainer);
    this.buildFormattingOptions(formattingContainer, colIndex, colDef.type);
    const missingSection = this.createPanelSection("Missing values");
    const missingSelect = document.createElement("select");
    missingSelect.className = "datagrid-panel-select";
    for (const val of ["null", "empty"]) {
      const opt = document.createElement("option");
      opt.value = val;
      opt.textContent = val === "null" ? "Show as null" : "Show as empty";
      if ((colDef.missingValueHandling || "null") === val) opt.selected = true;
      missingSelect.appendChild(opt);
    }
    missingSelect.addEventListener("change", () => {
      this.schema[colIndex].missingValueHandling = missingSelect.value;
      this.render();
      this.hookBus.emit("schemaChange", this.getSchema());
    });
    missingSection.appendChild(missingSelect);
    panel.appendChild(missingSection);
    document.body.appendChild(panel);
    this.columnPropertiesPanelEl = panel;
    setTimeout(() => {
      document.addEventListener("mousedown", this.boundDismissColumnPanel);
      document.addEventListener("keydown", this.boundColumnPanelKeyDown);
    }, 0);
  }
  createPanelSection(label) {
    const section = document.createElement("div");
    section.className = "datagrid-panel-section";
    const lbl = document.createElement("div");
    lbl.className = "datagrid-panel-label";
    lbl.textContent = label;
    section.appendChild(lbl);
    return section;
  }
  buildFormattingOptions(container, colIndex, type) {
    container.innerHTML = "";
    const colDef = this.schema[colIndex];
    const section = this.createPanelSection("Formatting");
    if (type === "number" || type === "percent") {
      const decLabel = document.createElement("div");
      decLabel.className = "datagrid-panel-sublabel";
      decLabel.textContent = "Decimal places";
      section.appendChild(decLabel);
      const decInput = document.createElement("input");
      decInput.type = "number";
      decInput.className = "datagrid-panel-input-small";
      decInput.min = "0";
      decInput.max = "10";
      decInput.value = String(colDef.formattingOptions?.decimals ?? "");
      decInput.placeholder = "auto";
      decInput.addEventListener("input", () => {
        if (!this.schema[colIndex].formattingOptions) {
          this.schema[colIndex].formattingOptions = {};
        }
        const val = decInput.value === "" ? void 0 : parseInt(decInput.value);
        this.schema[colIndex].formattingOptions.decimals = val;
        this.render();
        this.hookBus.emit("schemaChange", this.getSchema());
      });
      section.appendChild(decInput);
      const parenLabel = document.createElement("label");
      parenLabel.className = "datagrid-panel-sublabel";
      const parenCheckbox = document.createElement("input");
      parenCheckbox.type = "checkbox";
      parenCheckbox.checked = colDef.formattingOptions?.parenthesesNegatives ?? false;
      parenCheckbox.addEventListener("change", () => {
        if (!this.schema[colIndex].formattingOptions) {
          this.schema[colIndex].formattingOptions = {};
        }
        this.schema[colIndex].formattingOptions.parenthesesNegatives = parenCheckbox.checked;
        this.render();
        this.hookBus.emit("schemaChange", this.getSchema());
      });
      parenLabel.appendChild(parenCheckbox);
      parenLabel.appendChild(document.createTextNode(" Parentheses for negatives"));
      section.appendChild(parenLabel);
    } else if (type === "date") {
      const fmtLabel = document.createElement("div");
      fmtLabel.className = "datagrid-panel-sublabel";
      fmtLabel.textContent = "Date format";
      section.appendChild(fmtLabel);
      const fmtSelect = document.createElement("select");
      fmtSelect.className = "datagrid-panel-select";
      for (const fmt of ["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"]) {
        const opt = document.createElement("option");
        opt.value = fmt;
        opt.textContent = fmt;
        if ((colDef.formattingOptions?.dateFormat || "MM/DD/YYYY") === fmt) opt.selected = true;
        fmtSelect.appendChild(opt);
      }
      fmtSelect.addEventListener("change", () => {
        if (!this.schema[colIndex].formattingOptions) {
          this.schema[colIndex].formattingOptions = {};
        }
        this.schema[colIndex].formattingOptions.dateFormat = fmtSelect.value;
        this.render();
        this.hookBus.emit("schemaChange", this.getSchema());
      });
      section.appendChild(fmtSelect);
    } else {
      const hint = document.createElement("div");
      hint.className = "datagrid-panel-hint";
      hint.textContent = "No formatting options for text columns.";
      section.appendChild(hint);
    }
    container.appendChild(section);
  }
  rebuildFormattingSection(panel, colIndex) {
    const container = panel.querySelector("[data-formatting-container]");
    if (container) {
      this.buildFormattingOptions(container, colIndex, this.schema[colIndex].type);
    }
  }
  dismissColumnPropertiesPanel() {
    if (this.columnPropertiesPanelEl) {
      this.columnPropertiesPanelEl.remove();
      this.columnPropertiesPanelEl = null;
      this.columnPropertiesPanelColIndex = null;
      document.removeEventListener("mousedown", this.boundDismissColumnPanel);
      document.removeEventListener("keydown", this.boundColumnPanelKeyDown);
    }
  }
  onDismissColumnPanel(e) {
    if (this.columnPropertiesPanelEl && !this.columnPropertiesPanelEl.contains(e.target)) {
      this.dismissColumnPropertiesPanel();
    }
  }
  onColumnPanelKeyDown(e) {
    if (e.key === "Escape") {
      this.dismissColumnPropertiesPanel();
    }
  }
  // ─── Search / Filter ───
  showSearch() {
    if (this.isSearchVisible) {
      this.searchInputEl?.focus();
      return;
    }
    this.isSearchVisible = true;
    this.render();
    requestAnimationFrame(() => {
      this.searchInputEl?.focus();
    });
  }
  hideSearch() {
    if (!this.isSearchVisible) return;
    this.isSearchVisible = false;
    this.searchQuery = "";
    this.filteredRowIndices = null;
    this.rebuildVirtualization();
    this.render();
  }
  applySearchFilter() {
    if (!this.searchQuery) {
      this.filteredRowIndices = null;
      this.rebuildVirtualization();
      this.renderVisibleRows();
      return;
    }
    const queryLower = this.searchQuery.toLowerCase();
    const matchingRows = [];
    for (let i = 0; i < this.data.length; i++) {
      for (let j = 0; j < this.data[i].length; j++) {
        const cell = this.data[i][j];
        if (!cell) continue;
        const rawLower = (cell.raw ?? "").toLowerCase();
        let displayLower = "";
        const colDef = this.schema[j];
        const cellType = this.getCellType(colDef?.type);
        if (cell.error) {
          displayLower = rawLower;
        } else if (cellType && cell.value !== void 0 && cell.value !== null) {
          displayLower = cellType.format(cell.value, colDef?.formattingOptions).toLowerCase();
        } else {
          displayLower = String(cell.value ?? "").toLowerCase();
        }
        if (rawLower.includes(queryLower) || displayLower.includes(queryLower)) {
          matchingRows.push(i);
          break;
        }
      }
    }
    const filterCheckbox = this.searchBarEl?.querySelector('input[type="checkbox"]');
    if (filterCheckbox?.checked) {
      this.filteredRowIndices = matchingRows;
      this.virtualization = new Virtualization({
        container: this.container,
        itemCount: matchingRows.length,
        itemHeight: this.rowHeight
      });
    } else {
      this.filteredRowIndices = null;
      this.rebuildVirtualization();
    }
    this.renderVisibleRows();
  }
  getHookBus() {
    return this.hookBus;
  }
};
export {
  ConcreteHookBus,
  DateCellType,
  GridCore,
  History,
  NumberCellType,
  PercentCellType,
  TextCellType,
  detectDelimiter,
  inferCellType,
  inferHeader,
  inferSchemaTypes,
  parseDelimited
};
