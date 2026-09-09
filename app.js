const candidates = window.RECRUITMENT_DATA || [];
const skillNames = ["活动策划", "中英文表达", "行政事务", "对外沟通", "海报设计", "财务记录", "公众号"];
const directoryOrder = ["策划", "外联", "行政", "未填写"];
const bestKeywords = new Map([
  [1, "沉敛"], [2, "沟通"], [3, "创造力"], [4, "创意"], [5, "沟通能力"],
  [6, "创意"], [7, "判断力"], [8, "审美力"], [9, "执行力"], [10, "开放"],
  [11, null], [12, "好奇心"], [13, null], [14, null], [15, "执行力"],
  [16, "沟通"], [17, "灵活"], [18, "战略性"], [19, "思辨洞察力"], [20, "系统性思维"],
]);
const groups = {
  策划: candidates.filter((candidate) => candidate.choices[0] === "策划"),
  外联: candidates.filter((candidate) => candidate.choices[0] === "外联"),
};

const directory = document.querySelector("#candidate-directory");
const search = document.querySelector("#search");
const status = document.querySelector("#result-status");
const empty = document.querySelector("#empty-state");
const dialog = document.querySelector("#candidate-dialog");
const dialogCard = document.querySelector("#dialog-card");
const closeButton = document.querySelector(".dialog-close");
let opener = null;

const escapeHTML = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
const initials = (name) => /[\u3400-\u9fff]/.test(name) ? name.slice(-2) : name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
const directoryGroup = (candidate) => candidate.choices[0] || "未填写";

function profileCard(candidate) {
  const bestKeyword = bestKeywords.get(candidate.id);
  const choices = candidate.choices.map((choice, index) => `<li><b>${index + 1}</b><span class="${choice ? "" : "choice-empty"}">${escapeHTML(choice || "未填写")}</span></li>`).join("");
  const skills = skillNames.map((name) => {
    const value = Number(candidate.skills[name]) || 0;
    return `<div class="skill-row"><span>${name}</span><span class="skill-track" aria-hidden="true"><i class="skill-fill" style="width:${value * 20}%"></i></span><span class="skill-value">${value}</span></div>`;
  }).join("");
  const leadership = candidate.leadership.types.length
    ? candidate.leadership.types.map((type) => `<span>${escapeHTML(type)}</span>`).join("")
    : `<span class="none">未标注类别</span>`;
  const source = [candidate.source, candidate.sourceDetail].filter((item) => item && item !== "N/A").join(" · ") || "未记录";
  const keywords = candidate.keywords.map((word) => {
    const isBest = word === bestKeyword;
    return `<span class="keyword${isBest ? " keyword--best" : ""}">${isBest ? "<small>最符合</small>" : ""}<strong>${escapeHTML(word)}</strong></span>`;
  }).join("");

  return `<article class="profile-card">
    <div class="card-head">
      <div class="avatar" aria-hidden="true">${escapeHTML(initials(candidate.name))}</div>
      <div class="identity"><h2 id="dialog-title">${escapeHTML(candidate.name)}</h2><p>NO. ${String(candidate.id).padStart(2, "0")}</p></div>
      ${candidate.note ? `<span class="note-tag">${escapeHTML(candidate.note)}</span>` : ""}
    </div>
    <ol class="choice-list" aria-label="志愿顺序">${choices}</ol>
    <div>
      <p class="card-label">三个关键词</p>
      <div class="keyword-list">${keywords}</div>
      <p class="best-keyword-note">${bestKeyword ? `本人认为最符合：<strong>${escapeHTML(bestKeyword)}</strong>` : "未明确选择单一关键词"}</p>
    </div>
    <div><p class="card-label">能力自评</p><div class="skill-list">${skills}</div></div>
    <div><p class="card-label">领导经历${candidate.leadership.reported ? " · 问卷选择有" : ""}</p><div class="leadership-list">${leadership}</div></div>
    <div class="card-foot"><span>报名来源</span><span>${escapeHTML(source)}</span></div>
  </article>`;
}

function renderDirectory() {
  const term = search.value.trim().toLocaleLowerCase("zh-CN");
  const filtered = candidates.filter((candidate) => {
    const haystack = [candidate.name, candidate.note, ...candidate.keywords, ...candidate.choices].join(" ").toLocaleLowerCase("zh-CN");
    return !term || haystack.includes(term);
  });

  directory.innerHTML = directoryOrder.map((group) => {
    const members = filtered.filter((candidate) => directoryGroup(candidate) === group);
    if (!members.length) return "";
    const names = members.map((candidate) => `<button class="name-entry" type="button" data-candidate-id="${candidate.id}" aria-label="打开 ${escapeHTML(candidate.name)} 的候选人卡片">
      <span class="name-entry__number">${String(candidate.id).padStart(2, "0")}</span>
      <strong>${escapeHTML(candidate.name)}</strong>
      ${candidate.note ? `<span class="name-entry__note">${escapeHTML(candidate.note)}</span>` : ""}
      <span class="name-entry__action" aria-hidden="true">查看</span>
    </button>`).join("");
    return `<section class="directory-group" aria-labelledby="group-${escapeHTML(group)}">
      <div class="group-head"><h3 id="group-${escapeHTML(group)}">${escapeHTML(group)}</h3><span>${members.length} 人</span></div>
      <div class="name-list">${names}</div>
    </section>`;
  }).join("");

  empty.hidden = filtered.length > 0;
  status.textContent = `显示 ${filtered.length} 位候选人`;
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
  const outside = event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
  if (outside) dialog.close();
});
dialog.addEventListener("close", () => opener?.focus({ preventScroll: true }));

let searchTimer;
search.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(renderDirectory, 250);
});

const average = (items, selector) => items.length ? items.reduce((sum, item) => sum + selector(item), 0) / items.length : 0;

function renderOverview() {
  const planningLead = Math.round(average(groups.策划, (candidate) => candidate.leadership.reported ? 100 : 0));
  const outreachLead = Math.round(average(groups.外联, (candidate) => candidate.leadership.reported ? 100 : 0));
  document.querySelector("#stat-overview").innerHTML = `
    <article class="stat-card stat-card--planning"><strong>${groups.策划.length}</strong><p>第一志愿策划</p></article>
    <article class="stat-card stat-card--outreach"><strong>${groups.外联.length}</strong><p>第一志愿外联</p></article>
    <article class="stat-card"><strong>${planningLead}% / ${outreachLead}%</strong><p>问卷明确选择有领导经历 · 策划 / 外联</p></article>`;
}

function renderSkillComparison() {
  document.querySelector("#skill-comparison").innerHTML = skillNames.map((name) => {
    const planning = average(groups.策划, (candidate) => Number(candidate.skills[name]) || 0);
    const outreach = average(groups.外联, (candidate) => Number(candidate.skills[name]) || 0);
    return `<div class="comparison-row"><span class="comparison-label">${name}</span><div class="compare-bars">
      <div class="compare-bar compare-bar--planning"><span>策划</span><i style="width:${planning * 20}%"></i><b>${planning.toFixed(1)}</b></div>
      <div class="compare-bar compare-bar--outreach"><span>外联</span><i style="width:${outreach * 20}%"></i><b>${outreach.toFixed(1)}</b></div>
    </div></div>`;
  }).join("");
}

function counts(items, selector) {
  return items.reduce((result, item) => {
    const value = selector(item) || "未填写";
    result[value] = (result[value] || 0) + 1;
    return result;
  }, {});
}

function renderSecondChoice() {
  document.querySelector("#second-choice").innerHTML = Object.entries(groups).map(([group, items]) => {
    const values = counts(items, (candidate) => candidate.choices[1]);
    const max = Math.max(...Object.values(values));
    const rows = Object.entries(values).sort((a, b) => b[1] - a[1]).map(([choice, count]) => `<div class="flow-item"><span>${escapeHTML(choice)}</span><span class="flow-line"><i style="width:${count / max * 100}%"></i></span><b>${count}</b></div>`).join("");
    return `<div class="flow-group"><h4>第一志愿 ${group}</h4>${rows}</div>`;
  }).join("");
}

const keywordAliases = new Map([
  ["沟通能力", "沟通"], ["沟通协作", "沟通"], ["高效沟通", "沟通"], ["共情能力", "共情"], ["共情力", "共情"],
  ["创造力", "创意"], ["洞察力", "洞察"], ["思辨洞察力", "洞察"], ["负责", "责任心"], ["责任感", "责任心"], ["注重细节", "细节"], ["细节把控", "细节"],
]);

function keywordCounts(items) {
  const result = {};
  items.flatMap((candidate) => candidate.keywords).forEach((word) => {
    const normalized = keywordAliases.get(word) || word;
    result[normalized] = (result[normalized] || 0) + 1;
  });
  return Object.entries(result).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-CN")).slice(0, 8);
}

function renderKeywords() {
  document.querySelector("#keyword-clouds").innerHTML = Object.entries(groups).map(([group, items]) => `<div class="cloud-group"><h4>${group}</h4><div class="cloud">${keywordCounts(items).map(([word, count]) => `<span>${escapeHTML(word)} <b>×${count}</b></span>`).join("")}</div></div>`).join("");
}

function topSkill(group) {
  return skillNames.map((name) => [name, average(groups[group], (candidate) => Number(candidate.skills[name]) || 0)]).sort((a, b) => b[1] - a[1])[0];
}

function renderTakeaways() {
  const planningTop = topSkill("策划");
  const outreachTop = topSkill("外联");
  const planningCross = groups.策划.filter((candidate) => candidate.choices[1] === "外联").length;
  const outreachCross = groups.外联.filter((candidate) => candidate.choices[1] === "策划").length;
  document.querySelector("#takeaways").innerHTML = [
    `策划组最高的平均自评是“${planningTop[0]}” ${planningTop[1].toFixed(1)} 分；面试可追问他们如何把优势落到一次具体活动。`,
    `外联组最高的平均自评是“${outreachTop[0]}” ${outreachTop[1].toFixed(1)} 分；可用情景题验证自评与实际表达是否一致。`,
    `双向兴趣明显：策划组有 ${planningCross}/${groups.策划.length} 人把外联放在第二志愿，外联组有 ${outreachCross}/${groups.外联.length} 人把策划放在第二志愿。`,
  ].map((text, index) => `<div class="takeaway"><b>${index + 1}</b><p>${text}</p></div>`).join("");
}

renderDirectory();
renderOverview();
renderSkillComparison();
renderSecondChoice();
renderKeywords();
renderTakeaways();
