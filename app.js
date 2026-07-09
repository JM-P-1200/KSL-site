(function () {
  "use strict";
  const state = { tools: [], category: "All", query: "", sort: "featured", savedOnly: false };
  const $ = (selector) => document.querySelector(selector);
  const grid = $("#tool-grid");
  if (!grid) return;

  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
  const saved = new Set(JSON.parse(localStorage.getItem("ksl-saved") || "[]"));
  const updateSavedCount = () => { $("#saved-count").textContent = saved.size; };
  const persistSaved = () => { localStorage.setItem("ksl-saved", JSON.stringify([...saved])); updateSavedCount(); };
  const showToast = (message) => { const toast = $("#toast"); toast.textContent = message; toast.classList.add("visible"); window.setTimeout(() => toast.classList.remove("visible"), 1800); };

  function renderFilters() {
    const categories = ["All", ...new Set(state.tools.map((tool) => tool.category))];
    $("#category-filters").innerHTML = categories.map((category) =>
      `<button type="button" class="filter-button${state.category === category ? " active" : ""}" data-category="${escapeHtml(category)}">${escapeHtml(category)}</button>`
    ).join("");
  }

  function matches(tool) {
    const haystack = [tool.name, tool.tagline, tool.category, tool.bestFor, ...(tool.tags || [])].join(" ").toLowerCase();
    return (state.category === "All" || tool.category === state.category) &&
      (!state.query || haystack.includes(state.query.toLowerCase())) &&
      (!state.savedOnly || saved.has(tool.id));
  }

  function render() {
    let tools = state.tools.filter(matches);
    if (state.sort === "rating") tools.sort((a, b) => b.rating - a.rating);
    if (state.sort === "name") tools.sort((a, b) => a.name.localeCompare(b.name));
    if (state.sort === "featured") tools.sort((a, b) => a.rank - b.rank);
    grid.innerHTML = tools.map((tool) => `
      <article class="tool-card">
        <div class="tool-card-head"><div class="tool-logo" style="--logo:${escapeHtml(tool.color)}">${escapeHtml(tool.initials)}</div><button class="save-button${saved.has(tool.id) ? " saved" : ""}" data-save="${escapeHtml(tool.id)}" type="button" aria-label="${saved.has(tool.id) ? "Remove" : "Save"} ${escapeHtml(tool.name)}">${saved.has(tool.id) ? "♥" : "♡"}</button></div>
        <p class="tool-category">${escapeHtml(tool.category)} · ${escapeHtml(tool.price)}</p>
        <h3>${escapeHtml(tool.name)}</h3><p>${escapeHtml(tool.tagline)}</p>
        <div class="tool-tags">${tool.tags.slice(0, 3).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>
        <div class="tool-card-foot"><span class="rating">${tool.rating.toFixed(1)}</span><button class="view-tool" data-view="${escapeHtml(tool.id)}" type="button">Quick view →</button></div>
      </article>`).join("");
    $("#results-count").textContent = `${tools.length} ${tools.length === 1 ? "tool" : "tools"} ${state.savedOnly ? "saved" : "in this view"}`;
    $("#clear-filters").hidden = state.category === "All" && !state.query && !state.savedOnly;
    $("#empty-state").hidden = tools.length > 0;
    grid.hidden = tools.length === 0;
    renderFilters();
  }

  function reset() {
    state.category = "All"; state.query = ""; state.savedOnly = false;
    $("#directory-search").value = ""; $("#hero-search-input").value = "";
    render();
  }

  function searchFor(query) {
    state.query = query.trim(); state.savedOnly = false; $("#directory-search").value = state.query;
    render(); $("#directory").scrollIntoView({ behavior: "smooth" });
  }

  function openTool(id) {
    const tool = state.tools.find((item) => item.id === id);
    if (!tool) return;
    $("#dialog-content").innerHTML = `<div class="dialog-inner"><div class="tool-logo" style="--logo:${escapeHtml(tool.color)}">${escapeHtml(tool.initials)}</div><p class="kicker">${escapeHtml(tool.category)}</p><h2>${escapeHtml(tool.name)}</h2><p>${escapeHtml(tool.description)}</p><div class="dialog-meta"><div>Best for<strong>${escapeHtml(tool.bestFor)}</strong></div><div>Starting at<strong>${escapeHtml(tool.price)}</strong></div><div>KSL score<strong>${tool.rating.toFixed(1)} / 5</strong></div></div><a class="button" href="${escapeHtml(tool.url)}" target="_blank" rel="noopener noreferrer nofollow">Visit ${escapeHtml(tool.name)} <span>↗</span></a></div>`;
    $("#tool-dialog").showModal();
  }

  document.addEventListener("click", (event) => {
    const category = event.target.closest("[data-category]");
    const save = event.target.closest("[data-save]");
    const view = event.target.closest("[data-view]");
    const query = event.target.closest("[data-query]");
    if (category) { state.category = category.dataset.category; state.savedOnly = false; render(); }
    if (save) { const id = save.dataset.save; saved.has(id) ? saved.delete(id) : saved.add(id); persistSaved(); render(); showToast(saved.has(id) ? "Saved to your shortlist" : "Removed from shortlist"); }
    if (view) openTool(view.dataset.view);
    if (query) searchFor(query.dataset.query);
  });
  $("#hero-search").addEventListener("submit", (event) => { event.preventDefault(); searchFor($("#hero-search-input").value); });
  $("#directory-search").addEventListener("input", (event) => { state.query = event.target.value; state.savedOnly = false; render(); });
  $("#sort-select").addEventListener("change", (event) => { state.sort = event.target.value; render(); });
  $("#clear-filters").addEventListener("click", reset);
  $("#empty-reset").addEventListener("click", reset);
  $(".saved-trigger").addEventListener("click", () => { state.savedOnly = !state.savedOnly; state.category = "All"; state.query = ""; render(); $("#directory").scrollIntoView({ behavior: "smooth" }); });
  $(".dialog-close").addEventListener("click", () => $("#tool-dialog").close());
  $("#tool-dialog").addEventListener("click", (event) => { if (event.target === $("#tool-dialog")) $("#tool-dialog").close(); });
  $("#year").textContent = new Date().getFullYear();

  fetch("data/projects.json")
    .then((response) => { if (!response.ok) throw new Error("Directory unavailable"); return response.json(); })
    .then((data) => { state.tools = data.tools; $("#tool-total").textContent = data.tools.length; updateSavedCount(); render(); })
    .catch(() => { $("#results-count").textContent = "The directory could not load."; grid.innerHTML = '<p class="error">Please refresh the page or try again shortly.</p>'; });
})();
