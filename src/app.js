const video = document.getElementById("video");
const subtitleList = document.getElementById("subtitle-list");
const playPauseBtn = document.getElementById("play-pause");
const restartBtn = document.getElementById("restart");
const tooltip = document.getElementById("tooltip");

// Mock data to simulate /api/videos/{videoId}/subtitles response
const mockResponse = {
  videoId: "demo",
  lang: "en",
  target: "zh",
  cues: generateMockCues(),
};

// ---- Subtitle rendering ----
function renderSubtitles(cues) {
  subtitleList.innerHTML = "";
  const fragment = document.createDocumentFragment();

  cues.forEach((cue) => {
    const li = document.createElement("li");
    li.className = "subtitle-item";
    li.dataset.start = cue.startMs / 1000; // seconds
    li.dataset.end = cue.endMs / 1000;

    const en = document.createElement("p");
    en.className = "subtitle-en";
    cue.tokens.forEach((token) => {
      const span = document.createElement("span");
      span.textContent = token.t;
      span.classList.add("token");
      if (token.norm) {
        span.classList.add("word");
        span.addEventListener("click", (e) => handleWordClick(e, token.norm));
      }
      en.appendChild(span);
    });

    const zh = document.createElement("p");
    zh.className = "subtitle-zh";
    zh.textContent = cue.translation || "(无翻译)";

    li.appendChild(en);
    li.appendChild(zh);
    li.addEventListener("click", () => jumpTo(cue.startMs / 1000));

    fragment.appendChild(li);
  });

  subtitleList.appendChild(fragment);
}

// ---- Binary search to locate current cue ----
function findActiveCueIndex(cues, currentTime) {
  let left = 0;
  let right = cues.length - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const cue = cues[mid];
    const start = cue.startMs / 1000;
    const end = cue.endMs / 1000;

    if (currentTime >= start && currentTime <= end) return mid;
    if (currentTime < start) right = mid - 1;
    else left = mid + 1;
  }

  return -1;
}

let activeIndex = -1;
function updateActiveCue() {
  const cues = mockResponse.cues;
  const index = findActiveCueIndex(cues, video.currentTime);
  if (index === activeIndex) return;

  const items = subtitleList.querySelectorAll(".subtitle-item");
  if (activeIndex !== -1 && items[activeIndex]) {
    items[activeIndex].classList.remove("active");
  }

  if (index !== -1 && items[index]) {
    items[index].classList.add("active");
    items[index].scrollIntoView({ block: "center", behavior: "smooth" });
  }

  activeIndex = index;
}

function jumpTo(seconds) {
  video.currentTime = seconds;
  video.play();
}

// ---- Dictionary tooltip ----
function handleWordClick(event, term) {
  event.stopPropagation(); // Avoid triggering subtitle jump
  const rect = event.target.getBoundingClientRect();
  const { x, y } = calculateTooltipPosition(rect);
  renderTooltip({
    term,
    phonetic: "/demo/",
    meaning: "示例释义，后端可对接 /api/dict",
  });
  tooltip.style.left = `${x}px`;
  tooltip.style.top = `${y}px`;
  tooltip.classList.remove("hidden");
}

function calculateTooltipPosition(rect) {
  const padding = 12;
  const x = rect.left + window.scrollX;
  const y = rect.bottom + window.scrollY + padding;
  return { x, y };
}

function renderTooltip(data) {
  tooltip.innerHTML = `
    <h4>${data.term}</h4>
    <div class="phonetic">${data.phonetic || ""}</div>
    <p class="meaning">${data.meaning || "未查询到释义"}</p>
  `;
}

function hideTooltip() {
  tooltip.classList.add("hidden");
}

// ---- Event bindings ----
playPauseBtn.addEventListener("click", () => {
  if (video.paused) video.play();
  else video.pause();
});

restartBtn.addEventListener("click", () => {
  video.currentTime = 0;
  video.play();
});

video.addEventListener("timeupdate", updateActiveCue);
video.addEventListener("play", hideTooltip);
subtitleList.addEventListener("scroll", hideTooltip);

// ---- Mock data helpers ----
function generateMockCues() {
  const base = [
    {
      id: 1,
      startMs: 0,
      endMs: 2000,
      text: "Welcome to the demo.",
      translation: "欢迎来到示例。",
      tokens: tokensFromText("Welcome to the demo."),
    },
    {
      id: 2,
      startMs: 2000,
      endMs: 4200,
      text: "Click words to view dictionary popover.",
      translation: "点击单词查看词典弹窗。",
      tokens: tokensFromText("Click words to view dictionary popover."),
    },
    {
      id: 3,
      startMs: 4200,
      endMs: 7000,
      text: "Binary search keeps the sync efficient.",
      translation: "使用二分查找提升同步效率。",
      tokens: tokensFromText("Binary search keeps the sync efficient."),
    },
  ];

  // Extend to 50 cues to test scrolling & performance
  const cues = [...base];
  for (let i = 4; i <= 50; i++) {
    const start = (i - 1) * 1800;
    cues.push({
      id: i,
      startMs: start,
      endMs: start + 1500,
      text: `Sample sentence number ${i}.`,
      translation: `示例字幕 ${i}`,
      tokens: tokensFromText(`Sample sentence number ${i}.`),
    });
  }
  return cues;
}

function tokensFromText(text) {
  const tokens = [];
  const parts = text.split(/(\b[a-zA-Z']+\b)/);
  parts.forEach((part) => {
    if (!part) return;
    const isWord = /[a-zA-Z]/.test(part);
    tokens.push({ t: part, norm: isWord ? part.toLowerCase() : "" });
  });
  return tokens;
}

// ---- Init ----
renderSubtitles(mockResponse.cues);
updateActiveCue();
