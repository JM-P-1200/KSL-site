import {
  STORAGE_KEY,
  canAccessResource,
  completeStage,
  createProject,
  overallProgress,
  progressForStage,
  stageIsUnlocked,
  validateProject
} from "./core.mjs";

const state = { data: null, project: null };
const dataUrl = new URL("../data/build-lab.json", import.meta.url);

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, (char) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  "\"": "&quot;",
  "'": "&#39;"
})[char]);

function emitAnalytics(eventName, payload = {}) {
  const event = { eventName, payload, at: new Date().toISOString() };
  window.dispatchEvent(new CustomEvent("ksl:analytics", { detail: event }));
  if (location.hostname === "localhost" || location.hostname === "127.0.0.1") console.info("[KSL analytics]", event);
}

async function loadData() {
  const response = await fetch(dataUrl);
  if (!response.ok) throw new Error("Build Lab content could not be loaded.");
  state.data = await response.json();
  return state.data;
}

function loadProject() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    state.project = saved || null;
  } catch {
    state.project = null;
  }
  return state.project;
}

function saveProject(project) {
  const next = { ...project, updatedAt: new Date().toISOString(), lastActivity: new Date().toISOString() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  state.project = next;
  return next;
}

function ensureProject() {
  if (!state.project) state.project = saveProject(createProject({}, state.data.stages));
  return state.project;
}

function stageBySlug(slug) {
  return state.data.stages.find((stage) => stage.slug === slug) || state.data.stages[0];
}

function nextStage(stage) {
  return state.data.stages.find((item) => item.order === stage.order + 1);
}

function stageUrl(slug) {
  return document.body.dataset.buildLabPage === "stage" ? `${slug}.html` : `stages/${slug}.html`;
}

function setText(selector, text) {
  const node = $(selector);
  if (node) node.textContent = text;
}

function renderRoadmap(container, project, options = {}) {
  if (!container) return;
  container.innerHTML = state.data.stages.map((stage) => {
    const progress = progressForStage(project, stage);
    const complete = project.completedStages?.includes(stage.slug);
    const unlocked = stageIsUnlocked(project, state.data.stages, stage.slug);
    const active = options.activeSlug === stage.slug || project.currentStage === stage.slug;
    const href = unlocked ? stageUrl(stage.slug) : "#";
    return `<a class="lab-stage-card ${active ? "is-active" : ""} ${complete ? "is-complete" : ""} ${!unlocked ? "is-locked" : ""}" href="${href}" ${!unlocked ? "aria-disabled=\"true\"" : ""}>
      <span>${String(stage.order).padStart(2, "0")}</span>
      <strong>${stage.title}</strong>
      <small>${unlocked ? `${progress}% complete` : "Locked until previous stage is complete"}</small>
    </a>`;
  }).join("");
}

function renderLanding() {
  const journey = $("#lab-journey");
  if (journey) {
    journey.innerHTML = state.data.stages.map((stage) => `<article class="journey-step">
      <span>${String(stage.order).padStart(2, "0")}</span>
      <h3>${stage.title}</h3>
      <p>${stage.summary}</p>
      <strong>Output: ${stage.deliverable}</strong>
    </article>`).join("");
  }
  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {"@type": "Question", "name": "Is KSL Build Lab a coding course?", "acceptedAnswer": {"@type": "Answer", "text": "No. It is a guided project workspace for planning, building, launching, marketing, monetizing, and operating a website business."}},
      {"@type": "Question", "name": "Can beginners use KSL Build Lab?", "acceptedAnswer": {"@type": "Answer", "text": "Yes. The lessons use plain language and help beginners create practical business assets step by step."}},
      {"@type": "Question", "name": "Does KSL Build Lab guarantee income or rankings?", "acceptedAnswer": {"@type": "Answer", "text": "No. It provides practical workflows and checklists, but income and search performance depend on execution, market demand, competition, and time."}}
    ]
  };
  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.textContent = JSON.stringify(faq);
  document.head.append(script);
  emitAnalytics("build_lab_viewed");
}

function renderDashboard() {
  const project = ensureProject();
  const active = stageBySlug(project.currentStage);
  setText("[data-learner-name]", project.learnerName);
  setText("[data-project-name]", project.projectName);
  setText("[data-project-description]", project.description);
  setText("[data-current-stage]", active.title);
  setText("[data-next-action]", active.tasks.find((_, index) => !(project.tasks?.[active.slug] || {})[index]) || `Review and complete ${active.title}.`);
  setText("[data-completion]", `${overallProgress(project, state.data.stages)}%`);
  setText("[data-website-url]", project.websiteUrl || "Add after launch");
  setText("[data-repository-url]", project.repositoryUrl || "Add when available");
  setText("[data-traffic]", project.metrics?.traffic ?? 0);
  setText("[data-leads]", project.metrics?.leads ?? 0);
  setText("[data-revenue]", `₱${Number(project.metrics?.revenue || 0).toLocaleString()}`);
  const bar = $("[data-progress-bar]");
  if (bar) bar.style.width = `${overallProgress(project, state.data.stages)}%`;
  const continueLink = $("[data-continue-link]");
  if (continueLink) continueLink.href = stageUrl(active.slug);
  renderRoadmap($("#stage-roadmap"), project);
  const milestones = $("#milestone-list");
  if (milestones) {
    milestones.innerHTML = project.milestones?.length
      ? project.milestones.map((item) => `<li>${stageBySlug(item.stage).title} completed <time>${new Date(item.completedAt).toLocaleDateString()}</time></li>`).join("")
      : "<li>No completed milestones yet. Discover is a good place to begin.</li>";
  }
  renderResourcePreview($("#recent-resources"), "free");
}

function renderResourcePreview(container, entitlement) {
  if (!container) return;
  container.innerHTML = state.data.resources.slice(0, 4).map((resource) => resourceCard(resource, entitlement)).join("");
}

function resourceCard(resource, entitlement) {
  const allowed = canAccessResource(resource, entitlement);
  return `<article class="resource-card ${!allowed ? "is-premium" : ""}">
    <span>${resource.type} · ${resource.difficulty}</span>
    <h3>${resource.title}</h3>
    <p>${resource.description}</p>
    <a href="${allowed ? "/" + resource.url : "#upgrade"}" data-resource-id="${resource.id}">${allowed ? "Open resource" : `Upgrade for ${resource.access}`}</a>
  </article>`;
}

function renderStart() {
  const project = loadProject();
  const form = $("#project-form");
  if (!form) return;
  if (project) {
    for (const [key, value] of Object.entries(project)) {
      const input = form.elements[key];
      if (input) input.value = value;
    }
  }
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = Object.fromEntries(new FormData(form));
    const result = validateProject(input);
    $$(".field-error", form).forEach((node) => node.remove());
    if (!result.valid) {
      for (const [field, message] of Object.entries(result.errors)) {
        const control = form.elements[field];
        if (control) control.insertAdjacentHTML("afterend", `<small class="field-error">${message}</small>`);
      }
      setText("[data-form-message]", "Please fix the highlighted fields.");
      return;
    }
    const saved = saveProject(createProject({ ...state.project, ...input }, state.data.stages));
    emitAnalytics("project_created", { mode: saved.mode });
    location.href = "dashboard.html";
  });
  $("[data-load-demo]")?.addEventListener("click", () => {
    saveProject(createProject({
      learnerName: "Demo Builder",
      projectName: "Local service website",
      description: "A beginner-friendly website for a small service business in the Philippines.",
      niche: "Local services",
      audience: "Small business owners and families nearby",
      businessModel: "services",
      buildMethod: "no-code",
      trafficTarget: 300,
      leadTarget: 12,
      revenueTarget: 15000
    }, state.data.stages));
    emitAnalytics("build_lab_started", { mode: "demo" });
    location.href = "dashboard.html";
  });
}

function renderStage() {
  const project = ensureProject();
  const slug = document.body.dataset.stage || location.pathname.split("/").pop().replace(".html", "");
  const stage = stageBySlug(slug);
  emitAnalytics("stage_started", { stage: stage.slug });
  const unlocked = stageIsUnlocked(project, state.data.stages, stage.slug);
  setText("[data-stage-title]", stage.title);
  setText("[data-stage-goal]", stage.goal);
  setText("[data-stage-deliverable]", stage.deliverable);
  setText("[data-stage-summary]", stage.summary);
  if (!unlocked) $("#locked-panel")?.removeAttribute("hidden");
  const tasks = $("#stage-tasks");
  if (tasks) {
    const taskState = project.tasks?.[stage.slug] || {};
    tasks.innerHTML = stage.tasks.map((task, index) => `<label class="task-row">
      <input type="checkbox" data-task-index="${index}" ${taskState[index] ? "checked" : ""} ${!unlocked ? "disabled" : ""}>
      <span>${task}</span>
    </label>`).join("");
  }
  const worksheet = $("#worksheet-fields");
  if (worksheet) {
    const answers = project.worksheets?.[stage.slug] || {};
    worksheet.innerHTML = stage.worksheet.map((field) => `<label class="field">
      <span>${field.label}</span>
      <textarea name="${field.id}" ${!unlocked ? "disabled" : ""}>${escapeHtml(answers[field.id] || "")}</textarea>
    </label>`).join("");
  }
  const resourceList = $("#stage-resources");
  if (resourceList) {
    const resources = state.data.resources.filter((resource) => stage.resources.includes(resource.id));
    resourceList.innerHTML = resources.map((resource) => resourceCard(resource, project.entitlement)).join("");
  }
  const progress = progressForStage(project, stage);
  setText("[data-stage-progress]", `${progress}%`);
  const bar = $("[data-stage-progress-bar]");
  if (bar) bar.style.width = `${progress}%`;
  const next = nextStage(stage);
  const nextLink = $("[data-next-stage]");
  if (nextLink) {
    nextLink.href = next ? `${next.slug}.html` : "../dashboard.html";
    nextLink.textContent = next ? `Next: ${next.title} →` : "Return to dashboard →";
  }
  renderRoadmap($("#stage-roadmap"), project, { activeSlug: stage.slug });
  $("#stage-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const taskState = {};
    $$("[data-task-index]").forEach((input) => taskState[input.dataset.taskIndex] = input.checked);
    const answers = Object.fromEntries(new FormData($("#stage-form")));
    const updated = saveProject({
      ...project,
      currentStage: stage.slug,
      tasks: { ...(project.tasks || {}), [stage.slug]: taskState },
      worksheets: { ...(project.worksheets || {}), [stage.slug]: answers }
    });
    state.project = completeStage(updated, stage);
    saveProject(state.project);
    emitAnalytics(progressForStage(state.project, stage) === 100 ? "stage_completed" : "task_completed", { stage: stage.slug });
    setText("[data-save-status]", "Progress saved.");
    renderStage();
  }, { once: true });
  $("[data-mark-complete]")?.addEventListener("click", () => {
    $$("[data-task-index]").forEach((input) => input.checked = true);
    $("#stage-form")?.requestSubmit();
  }, { once: true });
}

function renderResources() {
  const project = ensureProject();
  const grid = $("#resource-grid");
  const filters = $("#resource-filters");
  if (!grid || !filters) return;
  const render = () => {
    const form = new FormData(filters);
    const stage = form.get("stage");
    const type = form.get("type");
    const difficulty = form.get("difficulty");
    const access = form.get("access");
    const resources = state.data.resources.filter((resource) =>
      (!stage || resource.stage === stage) &&
      (!type || resource.type === type) &&
      (!difficulty || resource.difficulty === difficulty) &&
      (!access || resource.access === access)
    );
    grid.innerHTML = resources.length
      ? resources.map((resource) => resourceCard(resource, project.entitlement)).join("")
      : `<div class="empty-state"><h3>No resources match those filters.</h3><p>Try widening the stage, access, or difficulty.</p></div>`;
  };
  filters.innerHTML = [
    select("stage", "Stage", state.data.stages.map((stage) => [stage.slug, stage.title])),
    select("type", "Type", [...new Set(state.data.resources.map((resource) => resource.type))].map((item) => [item, item])),
    select("difficulty", "Difficulty", [["beginner", "Beginner"], ["intermediate", "Intermediate"]]),
    select("access", "Access", [["free", "Free"], ["builder", "Builder"], ["business", "Business"], ["managed", "Managed"]])
  ].join("");
  filters.addEventListener("change", render);
  render();
}

function select(name, label, options) {
  return `<label><span>${label}</span><select name="${name}"><option value="">All</option>${options.map(([value, text]) => `<option value="${value}">${text}</option>`).join("")}</select></label>`;
}

function renderProjectWorkspace() {
  const project = ensureProject();
  setText("[data-project-name]", project.projectName);
  setText("[data-project-description]", project.description);
  const form = $("#project-form");
  if (!form) return;
  for (const [key, value] of Object.entries(project)) {
    const input = form.elements[key];
    if (input) input.value = value;
  }
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = Object.fromEntries(new FormData(form));
    const result = validateProject(input);
    if (!result.valid) {
      setText("[data-form-message]", Object.values(result.errors)[0]);
      return;
    }
    saveProject({ ...project, ...input });
    setText("[data-form-message]", "Project updated.");
  });
}

async function init() {
  await loadData();
  loadProject();
  const page = document.body.dataset.buildLabPage;
  if (page === "landing") renderLanding();
  if (page === "dashboard") renderDashboard();
  if (page === "start") renderStart();
  if (page === "stage") renderStage();
  if (page === "resources") renderResources();
  if (page === "project") renderProjectWorkspace();
  document.addEventListener("click", (event) => {
    const resourceLink = event.target.closest("[data-resource-id]");
    if (resourceLink) emitAnalytics("resource_opened", { id: resourceLink.dataset.resourceId });
    if (event.target.closest("[href='#upgrade']")) emitAnalytics("upgrade_clicked");
  });
}

init().catch((error) => {
  console.error(error);
  const main = $("main");
  if (main) main.insertAdjacentHTML("afterbegin", `<div class="lab-alert">Build Lab could not load yet. Please refresh or try again shortly.</div>`);
});
