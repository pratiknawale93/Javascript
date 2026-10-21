(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const pegNames = ["A", "B", "C"];
  const state = {
    diskCount: 5,
    pegs: [[], [], []],
    selectedPeg: null,
    moveCount: 0,
    history: [],
    solution: [],
    solutionIndex: 0,
    running: false,
    paused: false,
    timer: null,
    speed: 350,
    mode: "manual",
    toastTimer: null
  };

  const diskPalette = [
    ["#6fcbb3", "#b2f5df", "#b6f8e5"],
    ["#8e9cff", "#c8ceff", "#c9d0ff"],
    ["#f1a36e", "#ffd0a5", "#ffd2aa"],
    ["#e7c66e", "#ffebaa", "#ffedb0"],
    ["#d58ee8", "#efc3ff", "#f0c8ff"],
    ["#62c8df", "#b0f0ff", "#b6f3ff"],
    ["#f17f9c", "#ffc0d0", "#ffc6d5"],
    ["#9aaec3", "#d7e5f4", "#d9e8f7"]
  ];

  function initPuzzle(count = state.diskCount) {
    stopSolver();
    state.diskCount = Number(count);
    state.pegs = [Array.from({ length: state.diskCount }, (_, i) => state.diskCount - i), [], []];
    state.selectedPeg = null;
    state.moveCount = 0;
    state.history = [];
    state.solution = [];
    state.solutionIndex = 0;
    state.mode = "manual";
    $("winBanner").classList.add("hidden");
    $("diskRange").value = state.diskCount;
    $("diskCountValue").textContent = state.diskCount;
    $("metricDiskCount").textContent = state.diskCount;
    $("minimumMoves").textContent = minimumMoves(state.diskCount);
    $("movesMade").innerHTML = `0<span class="metric-unit"> / ${minimumMoves(state.diskCount)}</span>`;
    $("progressBar").style.width = "0%";
    $("modeLabel").textContent = "MANUAL PLAY";
    $("modeDescription").textContent = "You control every move";
    $("solverStatus").textContent = "STANDBY";
    $("solveButtonText").textContent = "Solve with AI";
    $("solveBtn").disabled = false;
    $("pauseBtn").disabled = true;
    $("pauseBtn").textContent = "Ⅱ Pause";
    $("undoBtn").disabled = true;
    $("boardHint").textContent = "Select a top disk, then choose a destination peg";
    render();
    renderHistory();
  }

  function minimumMoves(n) { return Math.pow(2, n) - 1; }

  function render() {
    pegNames.forEach((name, pegIndex) => {
      const stack = $(`stack-${name}`);
      stack.innerHTML = "";
      state.pegs[pegIndex].forEach((diskSize) => {
        const disk = document.createElement("div");
        disk.className = "disk";
        disk.dataset.disk = diskSize;
        const maxWidth = Math.min(94, 27 + diskSize * (66 / state.diskCount));
        disk.style.width = `${maxWidth}%`;
        const colors = diskPalette[(diskSize - 1) % diskPalette.length];
        disk.style.background = `linear-gradient(90deg, ${colors[0]}, ${colors[1]})`;
        disk.style.borderColor = colors[2];
        if (state.selectedPeg === pegIndex && state.pegs[pegIndex][state.pegs[pegIndex].length - 1] === diskSize) {
          disk.classList.add("selected-disk");
        }
        stack.appendChild(disk);
      });
      const column = document.querySelector(`.peg-column[data-peg="${pegIndex}"]`);
      column.classList.toggle("selected", state.selectedPeg === pegIndex);
      column.classList.toggle("target", pegIndex === 2 && state.pegs[2].length > 0);
      column.setAttribute("aria-label", `Peg ${name}, ${state.pegs[pegIndex].length} disks`);
    });
    $("movesMade").innerHTML = `${state.moveCount}<span class="metric-unit"> / ${minimumMoves(state.diskCount)}</span>`;
    $("progressBar").style.width = `${Math.min(100, state.moveCount / minimumMoves(state.diskCount) * 100)}%`;
    $("undoBtn").disabled = state.history.length === 0 || state.running;
    const solved = state.pegs[2].length === state.diskCount;
    if (solved) {
      $("winBanner").classList.remove("hidden");
      $("boardHint").textContent = "Goal state reached — all disks are on Peg C";
      $("solverStatus").textContent = "COMPLETE";
    } else {
      $("winBanner").classList.add("hidden");
    }
  }

  function renderHistory() {
    const body = $("historyBody");
    $("historyCount").textContent = `${state.history.length} EVENT${state.history.length === 1 ? "" : "S"}`;
    if (!state.history.length) {
      body.innerHTML = '<tr class="empty-row"><td colspan="5"><span class="empty-symbol">⌁</span>No moves yet. Make your first move or start the AI solver.</td></tr>';
      return;
    }
    body.innerHTML = state.history.slice().reverse().slice(0, 8).map((entry) => `
      <tr>
        <td class="move-number">${String(entry.number).padStart(2, "0")}</td>
        <td><span class="disk-badge"><span class="disk-mini" style="width:${8 + entry.disk * 2}px"></span>D${entry.disk}</span></td>
        <td>Peg ${entry.from}</td>
        <td>Peg ${entry.to}</td>
        <td><span class="move-type">${entry.type === "AI" ? "AI SOLVER" : "MANUAL"}</span></td>
      </tr>`).join("");
  }

  function showToast(message) {
    const toast = $("toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => toast.classList.remove("show"), 2300);
  }

  function performMove(from, to, type = "MANUAL", record = true) {
    if (from === to || !state.pegs[from].length) return false;
    const disk = state.pegs[from][state.pegs[from].length - 1];
    const targetTop = state.pegs[to][state.pegs[to].length - 1];
    if (targetTop !== undefined && targetTop < disk) {
      showToast("Invalid move — a larger disk cannot sit on a smaller disk.");
      return false;
    }
    state.pegs[from].pop();
    state.pegs[to].push(disk);
    state.moveCount++;
    if (record) {
      state.history.push({ number: state.moveCount, disk, from: pegNames[from], to: pegNames[to], fromIndex: from, toIndex: to, type });
    }
    state.selectedPeg = null;
    render();
    renderHistory();
    if (state.pegs[2].length === state.diskCount) {
      stopSolver();
      state.mode = "complete";
      $("modeLabel").textContent = "COMPLETED";
      $("modeDescription").textContent = `Solved in ${state.moveCount} moves`;
      $("solverStatus").textContent = "COMPLETE";
      $("solveButtonText").textContent = "Solved successfully";
      $("solveBtn").disabled = true;
      $("pauseBtn").disabled = true;
      showToast(`Puzzle solved in ${state.moveCount} move${state.moveCount === 1 ? "" : "s"}!`);
    }
    return true;
  }

  function handlePegClick(pegIndex) {
    if (state.running && !state.paused) return;
    if (state.mode === "complete") return;
    if (state.selectedPeg === null) {
      if (!state.pegs[pegIndex].length) {
        showToast("Choose a peg that has a disk on it first.");
        return;
      }
      state.selectedPeg = pegIndex;
      $("boardHint").textContent = `Disk selected on Peg ${pegNames[pegIndex]} — choose a destination`;
      render();
      return;
    }
    if (state.selectedPeg === pegIndex) {
      state.selectedPeg = null;
      $("boardHint").textContent = "Select a top disk, then choose a destination peg";
      render();
      return;
    }
    const from = state.selectedPeg;
    if (performMove(from, pegIndex, "MANUAL")) {
      state.mode = "manual";
      $("modeLabel").textContent = "MANUAL PLAY";
      $("modeDescription").textContent = "You control every move";
      $("solverStatus").textContent = "STANDBY";
      $("solveButtonText").textContent = "Solve with AI";
      $("solveBtn").disabled = false;
      $("boardHint").textContent = "Select a top disk, then choose a destination peg";
    } else {
      state.selectedPeg = from;
      render();
    }
  }

  function generateSolution(n, from, to, auxiliary, output = []) {
    if (n === 0) return output;
    generateSolution(n - 1, from, auxiliary, to, output);
    output.push({ from, to });
    generateSolution(n - 1, auxiliary, to, from, output);
    return output;
  }

  function startSolver() {
    if (state.pegs[2].length === state.diskCount) {
      showToast("This puzzle is already solved. Reset to run it again.");
      return;
    }
    stopSolver();
    // Solve the current board by first moving every disk back to Peg A.
    // This ensures the solver always starts from a clean, valid initial state.
    if (state.moveCount > 0 || state.pegs[0].length !== state.diskCount) {
      initPuzzle(state.diskCount);
    }
    state.solution = generateSolution(state.diskCount, 0, 2, 1, []);
    state.solutionIndex = 0;
    state.mode = "ai";
    state.running = true;
    state.paused = false;
    $("modeLabel").textContent = "AI SOLVER";
    $("modeDescription").textContent = "Recursive solution executing";
    $("solverStatus").textContent = "RUNNING";
    $("solveButtonText").textContent = "Solving…";
    $("solveBtn").disabled = true;
    $("pauseBtn").disabled = false;
    $("pauseBtn").textContent = "Ⅱ Pause";
    $("boardHint").textContent = "AI solver is executing the optimal move sequence";
    runNextMove();
  }

  function runNextMove() {
    if (!state.running || state.paused) return;
    if (state.solutionIndex >= state.solution.length) {
      stopSolver();
      return;
    }
    const move = state.solution[state.solutionIndex];
    if (performMove(move.from, move.to, "AI")) {
      state.solutionIndex++;
    }
    if (state.running && !state.paused) {
      state.timer = setTimeout(runNextMove, state.speed);
    }
  }

  function stepOnce() {
    if (state.running && !state.paused) {
      showToast("Pause the AI solver before stepping manually.");
      return;
    }
    if (state.pegs[2].length === state.diskCount) {
      showToast("Puzzle already solved.");
      return;
    }
    if (state.mode !== "ai" || !state.solution.length) {
      if (state.moveCount > 0 || state.pegs[0].length !== state.diskCount) initPuzzle(state.diskCount);
      state.solution = generateSolution(state.diskCount, 0, 2, 1, []);
      state.solutionIndex = 0;
      state.mode = "ai";
      $("modeLabel").textContent = "AI STEP MODE";
      $("modeDescription").textContent = "One algorithm move at a time";
      $("solverStatus").textContent = "STEP MODE";
      $("solveButtonText").textContent = "Resume with AI";
      $("solveBtn").disabled = false;
    }
    const move = state.solution[state.solutionIndex];
    if (!move) return;
    if (performMove(move.from, move.to, "AI")) state.solutionIndex++;
  }

  function togglePause() {
    if (!state.running) return;
    state.paused = !state.paused;
    if (state.paused) {
      clearTimeout(state.timer);
      $("pauseBtn").textContent = "▷ Resume";
      $("solverStatus").textContent = "PAUSED";
      $("modeDescription").textContent = "Solver paused";
      $("boardHint").textContent = "Paused — resume the solver or reset the puzzle";
    } else {
      $("pauseBtn").textContent = "Ⅱ Pause";
      $("solverStatus").textContent = "RUNNING";
      $("modeDescription").textContent = "Recursive solution executing";
      $("boardHint").textContent = "AI solver is executing the optimal move sequence";
      runNextMove();
    }
  }

  function stopSolver() {
    clearTimeout(state.timer);
    state.timer = null;
    state.running = false;
    state.paused = false;
  }

  function undoMove() {
    if (!state.history.length || state.running) return;
    const last = state.history.pop();
    state.pegs[last.toIndex].pop();
    state.pegs[last.fromIndex].push(last.disk);
    state.moveCount = Math.max(0, state.moveCount - 1);
    state.selectedPeg = null;
    state.mode = "manual";
    $("modeLabel").textContent = "MANUAL PLAY";
    $("modeDescription").textContent = "You control every move";
    $("solverStatus").textContent = "STANDBY";
    $("solveButtonText").textContent = "Solve with AI";
    $("solveBtn").disabled = false;
    $("boardHint").textContent = "Select a top disk, then choose a destination peg";
    render();
    renderHistory();
  }

  $("diskRange").addEventListener("input", (event) => {
    $("diskCountValue").textContent = event.target.value;
  });
  $("diskRange").addEventListener("change", (event) => initPuzzle(Number(event.target.value)));
  document.querySelectorAll(".peg-column").forEach((column) => {
    column.addEventListener("click", () => handlePegClick(Number(column.dataset.peg)));
    column.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        handlePegClick(Number(column.dataset.peg));
      }
    });
  });
  document.querySelectorAll(".speed-options button").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".speed-options button").forEach((b) => b.classList.remove("selected"));
      button.classList.add("selected");
      state.speed = Number(button.dataset.speed);
      $("speedValue").textContent = button.dataset.speed === "700" ? "0.5×" : button.dataset.speed === "350" ? "1.0×" : button.dataset.speed === "120" ? "2.0×" : "FAST";
      if (state.running && !state.paused) {
        clearTimeout(state.timer);
        state.timer = setTimeout(runNextMove, state.speed);
      }
    });
  });
  $("solveBtn").addEventListener("click", () => {
    if (state.mode === "ai" && state.solution.length && state.solutionIndex < state.solution.length) {
      if (!state.running) {
        state.running = true;
        state.paused = false;
        $("solveBtn").disabled = true;
        $("pauseBtn").disabled = false;
        $("solverStatus").textContent = "RUNNING";
        runNextMove();
      }
    } else startSolver();
  });
  $("stepBtn").addEventListener("click", stepOnce);
  $("pauseBtn").addEventListener("click", togglePause);
  $("resetBtn").addEventListener("click", () => initPuzzle(state.diskCount));
  $("playAgainBtn").addEventListener("click", () => initPuzzle(state.diskCount));
  $("undoBtn").addEventListener("click", undoMove);
  document.addEventListener("keydown", (event) => {
    if (event.key.toLowerCase() === "r" && !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) initPuzzle(state.diskCount);
    if (event.key === "Escape") {
      state.selectedPeg = null;
      render();
    }
  });

  initPuzzle();
})();