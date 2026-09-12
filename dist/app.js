const candidates = window.RECRUITMENT_DATA || [];
const skillNames = ["活动策划", "中英文表达", "行政事务", "对外沟通", "海报设计", "财务记录", "公众号"];
const bestKeywords = new Map([
  [1, "沉敛"], [4, "创意"], [5, "沟通能力"], [7, "判断力"], [9, "执行力"],
  [10, "开放"], [12, "好奇心"], [13, null], [14, null], [15, "执行力"],
  [16, "沟通"], [17, "灵活"], [19, "思辨洞察力"], [20, "系统性思维"],
]);

const directory = document.querySelector("#candidate-directory");
const search = document.querySelector("#search");
const status = document.querySelector("#result-status");
const empty = document.querySelector("#empty-state");
const dialog = document.querySelector("#candidate-dialog");
const dialogCard = document.querySelector("#dialog-card");
const closeButton = document.querySelector(".dialog-close");
let opener = null;

const escapeHTML = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
}[char]));
const initials = (name) => /[\u3400-\u9fff]/.test(name)
  ? name.slice(-2)
  : name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
const preferenceLabel = (candidate, role) => {
  const position = candidate.choices.indexOf(role);
  return position >= 0 ? `第${position + 1}志愿` : "";
};

function resumeSection(candidate) {
  if (!candidate.resume) return "";
  const education = candidate.resume.education.map((item) => `<li>${escapeHTML(item)}</li>`).join("");
  const highlights = candidate.resume.highlights.map((item) => `<li>${escapeHTML(item)}</li>`).join("");
  return `<section class="resume-block" aria-labelledby="resume-title-${candidate.id}">
    <div class="resume-head">
      <div>
        <p class="card-label">已上传材料</p>
        <h3 id="resume-title-${candidate.id}">个人简历</h3>
      </div>
      <a class="resume-link" href="${escapeHTML(candidate.resume.file)}" target="_blank" rel="noopener">查看完整 PDF</a>
    </div>
    <div class="resume-summary">
      <div><h4>教育背景</h4><ul>${education}</ul></div>
      <div><h4>经历亮点</h4><ul>${highlights}</ul></div>
    </div>
  </section>`;
}

function profileCard(candidate) {
  const bestKeyword = bestKeywords.get(candidate.id);
  const choices = candidate.choices.map((choice, index) => `<li>
    <b>${index + 1}</b><span class="${choice ? "" : "choice-empty"}">${escapeHTML(choice || "未填写")}</span>
  </li>`).join("");
  const skills = skillNames.map((name) => {
    const value = Number(candidate.skills[name]) || 0;
    return `<div class="skill-row">
      <span>${name}</span>
      <span class="skill-track" aria-hidden="true"><i class="skill-fill" style="width:${value * 20}%"></i></span>
      <span class="skill-value">${value}</span>
    </div>`;
  }).join("");
  const leadership = candidate.leadership.types.length
    ? candidate.leadership.types.map((type) => `<span>${escapeHTML(type)}</span>`).join("")
    : `<span class="none">未标注类别</span>`;
  const source = [candidate.source, candidate.sourceDetail]
    .filter((item) => item && item !== "N/A").join(" · ") || "未记录";
  const keywords = candidate.keywords.map((word) => {
    const isBest = word === bestKeyword;
    return `<span class="keyword${isBest ? " keyword--best" : ""}">
      ${isBest ? "<small>最符合</small>" : ""}<strong>${escapeHTML(word)}</strong>
    </span>`;
  }).join("");

  return `<article class="profile-card">
    <div class="card-head">
      <div class="avatar" aria-hidden="true">${escapeHTML(initials(candidate.name))}</div>
      <div class="identity">
        <h2 id="dialog-title">${escapeHTML(candidate.name)}</h2>
        <p>面试序号 ${String(candidate.interviewOrder).padStart(2, "0")}</p>
      </div>
      ${candidate.resume ? '<span class="note-tag">含简历</span>' : ""}
    </div>
    <ol class="choice-list" aria-label="志愿顺序">${choices}</ol>
    <div>
      <p class="card-label">三个关键词</p>
      <div class="keyword-list">${keywords}</div>
      <p class="best-keyword-note">${bestKeyword
        ? `本人认为最符合：<strong>${escapeHTML(bestKeyword)}</strong>`
        : "未明确选择单一关键词"}</p>
    </div>
    <div><p class="card-label">能力自评</p><div class="skill-list">${skills}</div></div>
    <div>
      <p class="card-label">领导经历${candidate.leadership.reported ? " · 问卷选择有" : ""}</p>
      <div class="leadership-list">${leadership}</div>
    </div>
    ${resumeSection(candidate)}
    <div class="card-foot"><span>报名来源</span><span>${escapeHTML(source)}</span></div>
  </article>`;
}

function candidateSearchText(candidate) {
  const resumeText = candidate.resume
    ? [...candidate.resume.education, ...candidate.resume.highlights].join(" ")
    : "";
  return [candidate.name, candidate.note, ...candidate.keywords, ...candidate.choices, resumeText]
    .join(" ").toLocaleLowerCase("zh-CN");
}

function renderDirectory() {
  const term = search.value.trim().toLocaleLowerCase("zh-CN");
  const filtered = candidates.filter((candidate) => !term || candidateSearchText(candidate).includes(term));
  const rows = filtered.map((candidate) => `<li>
    <button class="name-entry" type="button" data-candidate-id="${candidate.id}"
      aria-label="打开第 ${candidate.interviewOrder} 位 ${escapeHTML(candidate.name)} 的候选人卡片">
      <span class="name-entry__number">${String(candidate.interviewOrder).padStart(2, "0")}</span>
      <strong>${escapeHTML(candidate.name)}</strong>
      <span class="name-entry__choice">${escapeHTML(candidate.choices[0] || "未填写")}</span>
      ${candidate.resume ? '<span class="name-entry__note">含简历</span>' : ""}
      <span class="name-entry__action" aria-hidden="true">查看</span>
    </button>
  </li>`).join("");

  directory.innerHTML = `<ol class="interview-list">${rows}</ol>`;
  empty.hidden = filtered.length > 0;
  status.textContent = term ? `找到 ${filtered.length} 位候选人` : `显示全部 ${filtered.length} 位候选人`;
}

directory.addEventListener("click", (event) => {
  const button = event.target.closest("[data-candidate-id]");
  if (!button) return;
  const candidate = candidates.find((item) => item.id === Number(button.dataset.candidateId));
  if (!candidate) return;
  opener = button;
  dialogCard.innerHTML = profileCard(candidate);
  dialog.showModal();
  closeButton.focus();
});

closeButton.addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
  const rect = dialog.getBoundingClientRect();
  const outside = event.clientX < rect.left || event.clientX > rect.right
    || event.clientY < rect.top || event.clientY > rect.bottom;
  if (outside) dialog.close();
});
dialog.addEventListener("close", () => opener?.focus({ preventScroll: true }));

let searchTimer;
search.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(renderDirectory, 180);
});

const average = (items, selector) => items.length
  ? items.reduce((sum, item) => sum + selector(item), 0) / items.length
  : 0;
const firstChoiceGroups = {
  策划: candidates.filter((candidate) => candidate.choices[0] === "策划"),
  外联: candidates.filter((candidate) => candidate.choices[0] === "外联"),
};

function renderOverview() {
  const resumeCount = candidates.filter((candidate) => candidate.resume).length;
  document.querySelector("#stat-overview").innerHTML = `
    <article class="stat-card"><strong>${candidates.length}</strong><p>本轮面试人数</p></article>
    <article class="stat-card stat-card--planning"><strong>${firstChoiceGroups.策划.length}</strong><p>第一志愿策划</p></article>
    <article class="stat-card stat-card--outreach"><strong>${firstChoiceGroups.外联.length}</strong><p>第一志愿外联</p></article>
    <article class="stat-card"><strong>${resumeCount}</strong><p>已上传简历</p></article>`;
}

function skillMatrix(groupName, items) {
  const topSkill = skillNames
    .map((name) => [name, average(items, (candidate) => Number(candidate.skills[name]) || 0)])
    .sort((a, b) => b[1] - a[1])[0];
  const header = skillNames.map((name) => `<th scope="col">${escapeHTML(name)}</th>`).join("");
  const rows = items.map((candidate) => {
    const cells = skillNames.map((name) => {
      const value = Number(candidate.skills[name]) || 0;
      return `<td class="score-cell score-cell--${value}" aria-label="${escapeHTML(candidate.name)}，${escapeHTML(name)}，${value} 分"><span>${value}</span></td>`;
    }).join("");
    return `<tr><th scope="row"><span>${String(candidate.interviewOrder).padStart(2, "0")}</span>${escapeHTML(candidate.name)}</th>${cells}</tr>`;
  }).join("");
  return `<article class="matrix-panel">
    <div class="matrix-title">
      <div><p>第一志愿</p><h3>${escapeHTML(groupName)}</h3></div>
      <p>${items.length} 人 · 组内均分最高：<strong>${topSkill[0]} ${topSkill[1].toFixed(1)}</strong></p>
    </div>
    <div class="matrix-scroll" role="region" tabindex="0" aria-label="${escapeHTML(groupName)}组能力对比表，可横向滚动">
      <table class="score-matrix">
        <caption>${escapeHTML(groupName)}组候选人 7 项能力自评分</caption>
        <thead><tr><th scope="col">姓名</th>${header}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="score-legend" aria-label="分数颜色图例">
      <span>低</span>${[1, 2, 3, 4, 5].map((value) => `<i class="score-cell--${value}">${value}</i>`).join("")}<span>高</span>
    </div>
  </article>`;
}

function renderMatrices() {
  document.querySelector("#group-matrices").innerHTML =
    skillMatrix("策划", firstChoiceGroups.策划) + skillMatrix("外联", firstChoiceGroups.外联);
}

function rankingPanel(role, items, scoreLabel, getScore, getDetail) {
  const ranked = [...items].sort((a, b) => getScore(b) - getScore(a) || a.interviewOrder - b.interviewOrder);
  const rows = ranked.map((candidate, index) => {
    const score = getScore(candidate);
    return `<li class="ranking-item">
      <span class="ranking-number">${index + 1}</span>
      <div class="ranking-person">
        <strong>${escapeHTML(candidate.name)}</strong>
        <span>${preferenceLabel(candidate, role)} · 面试序号 ${String(candidate.interviewOrder).padStart(2, "0")}</span>
      </div>
      <div class="ranking-meter" aria-label="${escapeHTML(candidate.name)} ${escapeHTML(scoreLabel)} ${score.toFixed(1)} 分">
        <span><i style="width:${score * 20}%"></i></span>
        <b>${score.toFixed(1)}</b>
      </div>
      <small>${escapeHTML(getDetail(candidate))}</small>
    </li>`;
  }).join("");
  return `<article class="ranking-panel">
    <div class="panel-head"><h3>${escapeHTML(role)}候选人</h3><span>${ranked.length} 人 · ${escapeHTML(scoreLabel)}</span></div>
    <ol class="ranking-list">${rows}</ol>
  </article>`;
}

function renderRankings() {
  const publicity = candidates.filter((candidate) => candidate.choices.includes("宣传"));
  const admin = candidates.filter((candidate) => candidate.choices.includes("行政"));
  document.querySelector("#role-rankings").innerHTML =
    rankingPanel(
      "宣传",
      publicity,
      "宣传匹配分",
      (candidate) => (Number(candidate.skills.海报设计) + Number(candidate.skills.公众号)) / 2,
      (candidate) => `海报 ${candidate.skills.海报设计} · 公众号 ${candidate.skills.公众号}`,
    ) +
    rankingPanel(
      "行政",
      admin,
      "行政事务自评",
      (candidate) => Number(candidate.skills.行政事务) || 0,
      (candidate) => `行政事务 ${candidate.skills.行政事务} · 财务记录 ${candidate.skills.财务记录}`,
    );
}

renderDirectory();
renderOverview();
renderMatrices();
renderRankings();

