
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

let playerCount = 2;
let players = [];
let currentPlayer = 0;
let round = 1;
let timer = null;
let timeLeft = 180;
let secretCode = "";
let attempts = 0;
let busy = false;

const MAX_TIME = 180;
const MAX_ATTEMPTS = 10;

const colors = ["🟦", "🟣", "🟢", "🟠"];

// TẠO Ô NHẬP TÊN
function renderNameFields() {
  $("#nameFields").innerHTML = "";

  for (let i = 0; i < playerCount; i++) {
    const input = document.createElement("input");
    input.id = `playerName${i}`;
    input.placeholder = `Tên người chơi ${i + 1}`;
    input.value = `Người chơi ${i + 1}`;
    input.maxLength = 16;

    $("#nameFields").appendChild(input);
  }
}

$$(".count").forEach(button => {
  button.addEventListener("click", () => {
    $$(".count").forEach(b => b.classList.remove("active"));

    button.classList.add("active");
    playerCount = Number(button.dataset.count);

    renderNameFields();
  });
});

renderNameFields();

// TẠO MẬT MÃ NGẪU NHIÊN
function generateSecret() {
  const numbers = [];

  while (numbers.length < 4) {
    const number = Math.floor(Math.random() * 10);

    if (!numbers.includes(number)) {
      numbers.push(number);
    }
  }

  return numbers.join("");
}

// CHUYỂN MÀN HÌNH
function showScreen(screen) {
  ["#passScreen", "#puzzleScreen", "#resultScreen"].forEach(id => {
    $(id).classList.add("hidden");
  });

  $(screen).classList.remove("hidden");
}

// CHỐNG CHÈN HTML TỪ TÊN NGƯỜI CHƠI
function escapeHTML(text) {
  return text.replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

// HIỂN THỊ DANH SÁCH NGƯỜI CHƠI
function renderPlayers() {
  $("#players").innerHTML = players.map((player, index) => `
    <div class="player ${index === currentPlayer ? "active" : ""} ${player.out ? "out" : ""}">
      <div class="avatar">${colors[index]}</div>
      <b>${escapeHTML(player.name)}</b>
      <small>
        ${player.out ? "ĐÃ BỊ LOẠI" : `⭐ ${player.points} điểm`}
      </small>
    </div>
  `).join("");
}

// BẮT ĐẦU GAME
function startGame() {
  players = [];

  for (let i = 0; i < playerCount; i++) {
    const name = $(`#playerName${i}`).value.trim();

    players.push({
      name: name || `Người chơi ${i + 1}`,
      points: 0,
      out: false
    });
  }

  currentPlayer = 0;
  round = 1;
  busy = false;

  $("#setup").classList.add("hidden");
  $("#game").classList.remove("hidden");

  $("#round").textContent = round;
  $("#phaseTitle").textContent = "CHUYỀN BOM";

  renderPlayers();
  updateHolder();

  $("#timer").textContent = "180.0";
  $("#timerBar").style.width = "100%";
  $("#timerHint").textContent = "Hãy nhanh tay!";

  showScreen("#passScreen");
}

// CẬP NHẬT NGƯỜI GIỮ BOM
function updateHolder() {
  $("#holderTitle").textContent =
    `${players[currentPlayer].name} đang giữ bom`;
}

// DỪNG ĐỒNG HỒ
function stopTimer() {
  if (timer !== null) {
    clearInterval(timer);
    timer = null;
  }
}

// CẬP NHẬT ĐỒNG HỒ
function updateTimer() {
  $("#timer").textContent = timeLeft.toFixed(1);

  $("#timer").classList.toggle(
    "danger",
    timeLeft <= 5
  );

  $("#timerBar").style.width =
    `${Math.max(0, timeLeft / MAX_TIME * 100)}%`;
}

// BẮT ĐẦU ĐẾM NGƯỢC
function startTimer() {
  stopTimer();

  timeLeft = MAX_TIME;
  updateTimer();

  timer = setInterval(() => {
    timeLeft = Math.max(0, timeLeft - 0.1);

    updateTimer();

    if (timeLeft <= 0) {
      stopTimer();
      eliminatePlayer();
    }
  }, 100);
}

// DANH SÁCH NGƯỜI CHƠI CÒN LẠI
function getAlivePlayers() {
  return players
    .map((player, index) => player.out ? -1 : index)
    .filter(index => index !== -1);
}

// NGƯỜI CHƠI HẾT GIỜ
function eliminatePlayer() {
  if (busy) return;

  busy = true;
  players[currentPlayer].out = true;

  renderPlayers();

  $("#timerHint").textContent =
    `${players[currentPlayer].name} đã hết giờ!`;

  const alive = getAlivePlayers();

  if (alive.length <= 1) {
    setTimeout(() => endGame(alive[0] ?? null), 1200);
  } else {
    setTimeout(nextPlayer, 1200);
  }
}

// CHUYỂN LƯỢT
function nextPlayer() {
  stopTimer();

  const alive = getAlivePlayers();

  if (alive.length <= 1) {
    endGame(alive[0] ?? null);
    return;
  }

  const currentPosition = alive.indexOf(currentPlayer);

  currentPlayer =
    alive[(currentPosition + 1) % alive.length];

  round++;

  busy = false;

  $("#round").textContent = round;
  $("#phaseTitle").textContent = "CHUYỀN BOM";
  $("#timer").textContent = "180.0";
  $("#timerBar").style.width = "100%";
  $("#timerHint").textContent = "Chuyển thiết bị cho người tiếp theo.";

  renderPlayers();
  updateHolder();

  showScreen("#passScreen");
}

// NGƯỜI CHƠI XÁC NHẬN SẴN SÀNG
function beginPuzzle() {
  if (busy) return;

  busy = true;

  secretCode = generateSecret();
  attempts = 0;

  $("#phaseTitle").textContent = "PHÁ MẬT MÃ";
  $("#feedback").textContent =
    "Nhập 4 chữ số khác nhau để mở khóa.";

  $("#history").innerHTML = "";

  $$(".code-inputs input").forEach(input => {
    input.value = "";
  });

  showScreen("#puzzleScreen");

  busy = false;

  $$(".code-inputs input")[0].focus();

  $("#timerHint").textContent =
    "Bạn có 180 giây để giải mật mã.";

  startTimer();
}

// KIỂM TRA MẬT MÃ
function checkCode() {
  if (busy || timer === null) return;

  const inputs = $$(".code-inputs input");
  const guess = inputs.map(input => input.value).join("");

  if (!/^\d{4}$/.test(guess)) {
    $("#feedback").textContent =
      "Vui lòng nhập đủ 4 chữ số.";
    return;
  }

  if (new Set(guess).size !== 4) {
    $("#feedback").textContent =
      "Không được nhập các chữ số trùng nhau.";
    return;
  }

  attempts++;

  let correctPosition = 0;
  let correctNumber = 0;

  for (let i = 0; i < 4; i++) {
    if (guess[i] === secretCode[i]) {
      correctPosition++;
    } else if (secretCode.includes(guess[i])) {
      correctNumber++;
    }
  }

  // HIỂN THỊ LỊCH SỬ
  const historyItem = document.createElement("div");

  historyItem.textContent =
    `${guess} → ${correctPosition} đúng vị trí, ${correctNumber} sai vị trí`;

  $("#history").prepend(historyItem);

  // ĐOÁN ĐÚNG
  if (correctPosition === 4) {
    stopTimer();
    busy = true;

    players[currentPlayer].points += 1;

    renderPlayers();

    $("#feedback").textContent =
      "🎉 CHÍNH XÁC! Bạn đã giải mã thành công!";

    $("#timerHint").textContent =
      "Chuẩn bị chuyền bom cho người tiếp theo.";

    setTimeout(nextPlayer, 1200);
    return;
  }

  // HẾT LƯỢT ĐOÁN
  if (attempts >= MAX_ATTEMPTS) {
    stopTimer();

    $("#feedback").textContent =
      "HẾT 10 LẦN ĐOÁN! Bom đã phát nổ!";

    eliminatePlayer();
    return;
  }

  // CHƯA ĐÚNG
  $("#feedback").textContent =
    `${correctPosition} số đúng vị trí | ` +
    `${correctNumber} số đúng nhưng sai vị trí. ` +
    `Còn ${MAX_ATTEMPTS - attempts} lượt.`;

  inputs.forEach(input => input.value = "");
  inputs[0].focus();
}

// KẾT THÚC GAME
function endGame(winnerIndex) {
  stopTimer();

  busy = true;

  showScreen("#resultScreen");

  $("#phaseTitle").textContent = "KẾT THÚC";

  if (winnerIndex === null) {
    $("#resultTitle").textContent =
      "Không có người chiến thắng!";

    $("#resultText").textContent =
      "Tất cả người chơi đã bị loại.";
  } else {
    $("#resultTitle").textContent =
      `🏆 ${players[winnerIndex].name} chiến thắng!`;

    $("#resultText").textContent =
      `Bạn đã sống sót qua ${round} vòng đấu!`;
  }

  // BẢNG ĐIỂM CUỐI
  const ranking = [...players].sort((a, b) => {
    if (a.out !== b.out) return a.out ? 1 : -1;
    return b.points - a.points;
  });

  $("#finalScores").innerHTML = ranking.map((player, index) => `
    <div class="score-line">
      <span>${index + 1}. ${escapeHTML(player.name)}</span>
      <b>${player.points} điểm ${player.out ? "— Bị loại" : "— Sống sót"}</b>
    </div>
  `).join("");
}

// TRỞ VỀ SẢNH CHỜ
function backToSetup() {
  stopTimer();

  busy = false;

  $("#game").classList.add("hidden");
  $("#setup").classList.remove("hidden");

  $("#timer").classList.remove("danger");
}

// SỰ KIỆN NÚT
$("#startBtn").addEventListener("click", startGame);

$("#readyBtn").addEventListener("click", beginPuzzle);

$("#guessBtn").addEventListener("click", checkCode);

$("#restartBtn").addEventListener("click", backToSetup);

$("#againBtn").addEventListener("click", backToSetup);

// NHẬP MẬT MÃ BẰNG BÀN PHÍM
$$(".code-inputs input").forEach((input, index, inputs) => {
  input.addEventListener("input", () => {
    input.value = input.value.replace(/\D/g, "").slice(0, 1);

    if (input.value && index < 3) {
      inputs[index + 1].focus();
    }
  });

  input.addEventListener("keydown", event => {
    if (
      event.key === "Backspace" &&
      !input.value &&
      index > 0
    ) {
      inputs[index - 1].focus();
    }

    if (event.key === "Enter") {
      checkCode();
    }
  });
});
