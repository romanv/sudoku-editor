<template>
  <div class="container">
    <div class="controls">
      <div class="btn-container">
        <div class="btn-container">
          <div class="btn-icon" :class="{ 'btn--toggled': this.fieldEditModeEnabled }" @click="toggleFieldEditMode()">
            <img draggable="false" src="../assets/images/edit.svg">
          </div>
        </div>
        <div class="btn-container">
          <div
            class="timer"
            :class="{ 'timer--paused': this.isPaused }"
            v-on:dblclick="timeSpent = 0"
          >
            {{ this.timeSpentString }}
          </div>
          <div class="btn-icon btn-small" @click="pauseResumeTimer()" :class="{ 'btn--toggled': this.isPaused }">
            <img draggable="false" src="../assets/images/pause.svg" style="width: 20px; height: 20px;">
          </div>
        </div>
      </div>
      <div
        class="controls__editmode"
        :style="{ color: this.editMode === 'digit' ? '#ff9000' : '#60c2fd' }"
      >
        <div></div>
        <div class="editmode-indicator">{{ this.editMode === 'digit' ? 'Digit' : 'Hint' }}</div>
        <div class="controls__hint-colors">
          <div
            v-if="this.editMode === 'hint'"
            class="controls__hint-color-black"
            :class="{ 'hint-color--selected': this.activeHintColor === '#000000'}"
            data-color="#000000"
            @click="activeHintColor = $event.target.dataset.color"
          ></div>
          <div
            v-if="this.editMode === 'hint'"
            class="controls__hint-color-green"
            :class="{ 'hint-color--selected': this.activeHintColor !== '#000000'}"
            data-color="#32a42c"
            @click="activeHintColor = $event.target.dataset.color"
          ></div>
        </div>
      </div>
      <div class="btn-container">
        <div class="btn-icon" @click="saveField()">
          <img draggable="false" src="../assets/images/save.svg">
        </div>
        <div class="btn-icon" @click="loadField()">
          <img draggable="false" src="../assets/images/open.svg">
        </div>
        <div class="btn-icon" @click="resetField()">
          <img draggable="false" src="../assets/images/clear.svg" style="width: 24px; height: 24px;">
        </div>
      </div>
    </div>
    <div
      class="field__base"
      :class="{
        'field--mode-hint': this.editMode === 'hint' ,
        'field--paused': this.isPaused,
      }"
    >
      <div
        v-for="cell in cells"
        :key="cell.idx"
        class="field__cell"
        :class="{
          'cell--top': cell.row === 0,
          'cell--bot': cell.row === 8,
          'cell--left': cell.col === 0,
          'cell--right': cell.col === 8,
          'cell--selected': cell.col === activeCol && cell.row === activeRow,
          'cell--right-nonette': cell.col % 3 === 2,
          'cell--left-nonette': cell.col % 3 === 0,
          'cell--bot-nonette': cell.row % 3 === 2,
          'cell--top-nonette': cell.row % 3 === 0,
          'cell--given': cell.isGiven,
          'cell--error': cell.isError,
        }"
        @click="onCellClick(cell)"
      >
        <div class="cell__content">
          <div class="cell__markers" v-if="cell.digit === undefined">
            <div
              v-for="(marker, idx) in cell.markers"
              :key="idx"
              :style="`color: ${marker.color}`"
              class="cell__marker"
            >
              {{ marker.value }}
            </div>
          </div>
          <div class="cell__digit">{{ cell.digit }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
const remote = require('electron').remote;
const fs = require('fs');
const path = require('path');

const isDevMode = process.mainModule.filename.includes('node_modules');

let timer;

export default {
  props: {
  },
  data() {
    return {
      cells: [],
      activeRow: 0,
      activeCol: 0,
      activeCell: null,
      editMode: 'digit',
      fieldEditModeEnabled: false,
      undoHistory: [],
      redoHistory: [],
      timeSpent: 0,
      isPaused: false,
      appPath: isDevMode
        ? remote.app.getAppPath()
        : path.join(process.resourcesPath, '..'),
      activeHintColor: '#000000',
    };
  },
  methods: {
    onKeyPress(evt) {
      // unpause the game on any keypress
      if (this.isPaused) {
        this.pauseResumeTimer();
      }

      switch (evt.key) {
        case 'ArrowRight':
          this.moveSelectionRight();
          break;
        case 'ArrowLeft':
          this.moveSelectionLeft();
          break;
        case 'ArrowUp':
          this.moveSelectionUp();
          break;
        case 'ArrowDown':
          this.moveSelectionDown();
          break;
        case ' ':
          this.toggleEditMode(evt);
          break;
        case 'Delete':
          this.clearCell();
          break;
        case 'z':
        case 'Z':
          if (evt.ctrlKey) this.undo();
          break;
        case 'y':
        case 'Y':
          if (evt.ctrlKey) this.redo();
          break;
        case 'Tab':
          this.toggleMarkerColor();
          break;
        default:
          if (evt.key >= '1' && evt.key <= '9') {
            this.inputNumber(parseInt(evt.key));
          }
          break;
      }
    },
    moveSelectionRight() {
      this.activeCol = Math.min(this.activeCol + 1, 8);
      this.activeCell = this.cells.find(c => c.row === this.activeRow && c.col === this.activeCol);
    },
    moveSelectionLeft() {
      this.activeCol = Math.max(this.activeCol - 1, 0);
      this.activeCell = this.cells.find(c => c.row === this.activeRow && c.col === this.activeCol);
    },
    moveSelectionUp() {
      this.activeRow = Math.max(this.activeRow - 1, 0);
      this.activeCell = this.cells.find(c => c.row === this.activeRow && c.col === this.activeCol);
    },
    moveSelectionDown() {
      this.activeRow = Math.min(this.activeRow + 1, 8);
      this.activeCell = this.cells.find(c => c.row === this.activeRow && c.col === this.activeCol);
    },
    inputNumber(number) {
      if (!this.activeCell || (this.activeCell.isGiven && !this.fieldEditModeEnabled)) return;

      this.undoHistory.push(this.cloneActiveCell());

      if (this.editMode === 'digit') {
        const oldValue = this.activeCell.digit;
        this.activeCell.digit = number;
        this.checkCellForErrors(this.activeCell, oldValue);
        this.$forceUpdate();
        if (this.fieldEditModeEnabled) {
          this.activeCell.isGiven = true;
        }
        this.checkSolutionStatus();
      } else {
        this.activeCell.digit = undefined;

        // remove the value only if color and pressed digit are both equal to existing marker
        // otherwise just change the color of an existing marker
        if (
          this.activeCell.markers[number - 1].value === number
          && this.activeCell.markers[number - 1].color === this.activeHintColor
        ) {
          this.$set(this.activeCell.markers[number - 1], 'value', ' ');
        } else {
          this.$set(this.activeCell.markers[number - 1], 'value', number);
        }
        this.$set(this.activeCell.markers[number - 1], 'color', this.activeHintColor);
      }
    },
    checkSolutionStatus() {
      const isSolved = !this.cells.some(c => c.digit === undefined || c.isError);
      if (isSolved) {
        setTimeout(() => {
          remote.dialog.showMessageBox({
            message: `Solved in ${this.timeSpentString}`,
            type: 'info',
          });
        }, 75);
      }
    },
    cloneActiveCell() {
      return {
        ...this.activeCell,
        markers: this.activeCell.markers.map(m => Object.assign({}, m)),
      };
    },
    toggleEditMode(evt) {
      evt.preventDefault();
      if (this.editMode === 'digit') {
        this.editMode = 'hint';
      } else {
        this.editMode = 'digit';
      }
    },
    toggleFieldEditMode() {
      this.fieldEditModeEnabled = !this.fieldEditModeEnabled;
    },
    toggleMarkerColor() {
      this.activeHintColor = this.activeHintColor === '#000000' ? '#32a42c' : '#000000';
    },
    clearCell() {
      if (this.activeCell.isGiven && !this.fieldEditModeEnabled) return;

      this.undoHistory.push(this.cloneActiveCell());

      if (this.activeCell.digit) {
        const oldValue = this.activeCell.digit;
        this.activeCell.digit = undefined;
        this.activeCell.isError = false;
        this.checkCellForErrors(this.activeCell, oldValue);
        if (this.activeCell.isGiven) {
          this.activeCell.isGiven = false;
        }
        this.$forceUpdate();
      } else {
        this.activeCell.markers.forEach((m, idx) => this.$set(this.activeCell.markers[idx], 'value', ' '));
      }
    },
    undo() {
      if (this.undoHistory.length > 0) {
        const cellToReplace = this.undoHistory.pop();
        const oldValue = this.cells[cellToReplace.idx].digit;
        this.$set(this.cells, cellToReplace.idx, cellToReplace);
        if (this.activeCell.idx === cellToReplace.idx) {
          this.activeCell = cellToReplace;
        }
        this.checkCellForErrors(cellToReplace, oldValue);
      }
    },
    resetField() {
      if (this.fieldEditModeEnabled) {
        // remove all cells
        this.cells = this.populateCompressedField([]);
      } else {
        // remove all cells expect given ones
        this.cells
          .filter(c => !c.isGiven
            && c.digit !== undefined
            || c.markers.some(m => m.value !== ' '))
          .forEach((c) => {
            c.digit = undefined;
            c.markers = Array.from({ length: 9 }, () => ({ value: ' ', color: '#333' }));
          });
        this.cells.filter(c => c.isError).forEach((c) => { c.isError = false; });
        this.timeSpent = 0;
      }
    },
    saveField() {
      if (!fs.existsSync(this.savesPath)) {
        fs.mkdirSync(this.savesPath);
      }

      const fileName = remote.dialog.showSaveDialog({
        defaultPath: this.savesPath,
        filters: [
          {
            name: 'JSON Save file',
            extensions: ['json'],
          },
        ],
      });

      if (!fileName || fileName.trim() === '') return;

      const data = JSON.stringify({
        field: this.getCompressedField(),
        timeSpent: this.timeSpent,
      }, null, 2);
      try {
        fs.writeFileSync(fileName.replace(/\.json$/, '') + '.json', data, 'utf-8');
      } catch (e) {
        alert('Cannot save file:', e);
      }
    },
    loadField() {
      const filePath = remote.dialog.showOpenDialog({
        filters: [
          {
            name: 'JSON Save file',
            extensions: ['json'],
          },
        ],
        defaultPath: this.savesPath,
      });

      if (!filePath || filePath.length === 0) return;

      try {
        const data = JSON.parse(fs.readFileSync(filePath[0]));
        this.cells = this.populateCompressedField(data.field);
        this.timeSpent = data.timeSpent;
      } catch (e) {
        alert('Cannot open file:', e.message);
      }
    },
    getCompressedField() {
      const compressed = [];
      const nonEmptyCells = this.cells.filter(c => c.digit !== undefined || c.markers.some(m => m.value !== ' '));
      nonEmptyCells.forEach((c) => {
        compressed.push({
          ...c,
          markers: c.markers.filter(m => m.value !== ' '),
        });
      });
      return compressed;
    },
    populateCompressedMarkers(markers = []) {
      const populated = [];
      for (let i = 0; i < 9; i++) {
        const existingMarker = markers.find(m => m.idx === i);
        populated.push(existingMarker || { idx: i, value: ' ', color: '#333' });
      }
      return populated;
    },
    populateCompressedField(field) {
      const populated = [];
      for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
          const existingCell = field.find(c => c.idx === row * 9 + col);
          if (existingCell) {
            existingCell.markers = this.populateCompressedMarkers(existingCell.markers);
            populated.push(existingCell);
          } else {
            populated.push({
              idx: row * 9 + col,
              row,
              col,
              markers: this.populateCompressedMarkers(),
              isGiven: false,
              isError: false,
              digit: undefined,
            });
          }
        }
      }
      return populated;
    },
    checkCellForErrors(cell, oldValue) {
      // find all errored neighbors with old value and clean them
      this.getCellNeighbors(cell)
        .filter(n => n.isError && n.digit === oldValue)
        .forEach((n) => { n.isError = false; });
      if (cell.digit === undefined) {
        this.getCellNeighbors(cell).filter(c => c.digit === oldValue).forEach((c) => { c.isError = false; });
      } else {
        const duplicates = this.getCellNeighbors(cell).filter(c => c.digit === cell.digit);
        if (duplicates.length > 0) {
          duplicates.forEach((d) => { d.isError = true; });
          cell.isError = true;
        } else {
          cell.isError = false;
        }
      }
    },
    getCellNeighbors(cell) {
      const nonEmptyCells = this.cells.filter(c => c.digit !== undefined);

      const row = nonEmptyCells.filter(c => c.row === cell.row && c.idx !== cell.idx);
      const col = nonEmptyCells.filter(c => c.col === cell.col && c.idx !== cell.idx);

      const leftBound = Math.floor(cell.col / 3) * 3;
      const topBound = Math.floor(cell.row / 3) * 3;
      const nonette = nonEmptyCells.filter(c => (
        c.row >= topBound
        && c.row < topBound + 3
        && c.col >= leftBound
        && c.col < leftBound + 3
        && c.idx !== cell.idx
      ));

      const allUnique = [...new Set([...row, ...col, ...nonette])];
      return allUnique;
    },
    pauseResumeTimer() {
      if (this.isPaused) {
        timer = setInterval(() => {
          this.timeSpent++;
        }, 1000);
      } else {
        clearInterval(timer);
      }
      this.isPaused = !this.isPaused;
    },
    onWindowClose() {
      const bounds = remote.getCurrentWindow().getBounds();

      const data = JSON.stringify({
        window: {
          left: bounds.x,
          top: bounds.y,
          width: bounds.width,
          height: bounds.height,
        },
        field: this.cells,
        timeSpent: this.timeSpent,
      }, null, 2);

      try {
        fs.writeFileSync(this.appPath + '\\state.json', data, 'utf-8');
      } catch (e) {
        alert('Cannot save file:', e);
      }
    },
    onCellClick(cell) {
      this.activeCell = cell;
      this.activeCol = cell.col;
      this.activeRow = cell.row;
    },
  },
  computed: {
    timeSpentString() {
      const h = Math.floor(this.timeSpent / 3600);
      const m = Math.floor((this.timeSpent - h * 60) / 60);
      const s = this.timeSpent - h * 3600 - m * 60;
      return h.toString().padStart(2, 0) + ':' + m.toString().padStart(2, 0) + ':' + s.toString().padStart(2, 0);
    },
    savesPath() {
      return path.join(this.appPath, '//saves');
    },
  },
  mounted() {
    try {
      const stateFilePath = this.appPath + '\\state.json';
      const savedData = fs.existsSync(stateFilePath)
        ? JSON.parse(fs.readFileSync(stateFilePath))
        : { field: [], timeSpent: 0 };
      this.cells = this.populateCompressedField(savedData.field);
      this.timeSpent = savedData.timeSpent !== undefined ? savedData.timeSpent : 0;
      this.activeCell = this.cells[0];
      this.activeCell.isSelected = true;

      timer = setInterval(() => {
        this.timeSpent++;
      }, 1000);
    } catch (err) {
      console.error(err);
    }
  },
};
</script>

<style>
.container {
  display: flex;
  flex-direction: column;
}
/* Controls */
.controls {
  max-width: 600px;
  width: calc(100vw);
  height: 56px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  color: #5ca7c6;
  justify-content: space-between;
}
.controls > div {
  flex: 1;
}
.controls__editmode {
  font-size: 24px;
  font-weight: bold;
  display: flex;
}
.editmode-indicator {
  display: flex;
  justify-content: center;
  user-select: none;
}
.controls__editmode > div {
  flex: 1;
  display: flex;
  align-items: center;
}
.controls__hint-colors {
  justify-content: flex-end;
}
.controls__hint-colors > div {
  width: 24px;
  height: 24px;
  margin: 0 2px;
  border: 2px solid white;
}
.controls__hint-colors > div:last-child {
  margin-right: 0;
}
.controls__hint-color-black {
  background: #000;
}
.controls__hint-color-green {
  background: #32a42c;
}
div.hint-color--selected {
  border-color: #60c2fd;
}
.btn-container {
  display: flex;
  align-items: center;
  margin: 0 8px;
}
.btn-container:first-child {
  margin-left: 0;
}
.btn-container:last-child {
  margin-right: 0;
  justify-content: flex-end;
}
.btn {
  border: 1px solid #5ca7c6;
  border-radius: 4px;
  padding: 8px 16px;
  cursor: pointer;
  user-select: none;
}
.btn:hover {
  background: #e6f0f4;
}
.btn:active {
  background: #cef1ff;
}
.btn--toggled {
  background: #d4f3cc;
}
.btn-icon {
  height: 48px;
  min-width: 48px;
  border-radius: 4px;
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 0 3px;
}
.btn-icon img {
  height: 32px;
  width: 32px;
}
.btn-icon:hover {
  background: #ddedf9;
}
.btn-icon:active {
  background: #a9c3d7;
}
.btn-icon.btn--toggled {
  background: #a9c3d7;
}
.btn-small {
  width: 32px;
  height: 32px;
  min-width: 32px;
}
.timer {
  color: black;
  font-size: 18px;
  font-weight: bold;
  margin-top: 2px;
  margin-right: 4px;
  margin-left: 8px;
  user-select: none;
  cursor: default;
}
.timer--paused {
  color: #777;
}
/* Field */
.field__base {
  align-content: center;
  border: 4px solid black;
  display: grid;
  grid-gap: 0rem;
  grid-template-columns: repeat(9, 1fr);
  grid-template-rows: repeat(9, 1fr);
  height: calc(100vh - 106px);
  width: calc(100vw);
  justify-content: center;
  margin: auto;
  margin-top: 0;
  max-width: 600px;
  max-height: 600px;
}
.field__cell {
 background: white;
 border: 1px solid #aaa;
 display: flex;
 flex-direction: column;
 justify-content: center;
 padding: 4px;
}
.field--paused {
  opacity: 0.5;
}
.cell__content {
  align-items: center;
  background: white;
  color: black;
  display: flex;
  font-size: 5.2vw;
  font-weight: bold;
  height: 100%;
  justify-content: center;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
}
.cell__markers {
  font-size: 12px;
  display: flex;
  flex-flow: row wrap;
  width: 100%;
  height: 100%;
  margin: auto;
}
.cell__marker {
  width: 33%;
  height: 33%;
  display: flex;
  justify-content: center;
  align-items: center;
}
.cell__digit {
  position: absolute;
}
.cell--right-nonette {
  border-right: 2px solid #a8a8a8;
}
.cell--left-nonette {
  border-left: 2px solid #a8a8a8;
}
.cell--top-nonette {
  border-top: 2px solid #a8a8a8;
}
.cell--bot-nonette {
  border-bottom: 2px solid #a8a8a8;
}
.cell--left {
  border-left: 0;
}
.cell--right {
  border-right: 0;
}
.cell--top {
  border-top: 0;
}
.cell--bot {
  border-bottom: 0;
}
.cell--given,
.cell--given .cell__content {
  background: #dedede;
}
.cell--selected {
  background: #ffba00;
}
/* Errors */
.cell--error.cell--given,
.cell--error.cell--given .cell__content {
  background: #972b2b;
  color: white;
}
.cell--error,
.cell--error .cell__content {
  background: #d83939;
  color: white;
}
.cell--error.cell--selected {
  background: #ff9000;
}
.field--mode-hint .cell--selected {
  background: #60c2fd;
}
</style>
