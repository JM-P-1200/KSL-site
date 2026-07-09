(function () {
  "use strict";
  const container = document.getElementById("blog-posts");
  if (!container) return;
  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
  fetch("data/blogs.json").then((response) => {
    if (!response.ok) throw new Error("Notes unavailable");
    return response.json();
  }).then((data) => {
    container.innerHTML = data.blogs.map((post) => {
      const date = new Intl.DateTimeFormat("en", { year: "numeric", month: "short", day: "numeric" }).format(new Date(`${post.date}T12:00:00`));
      return `<article class="blog-post"><time datetime="${escapeHtml(post.date)}">${escapeHtml(date)}</time><h2>${escapeHtml(post.title)}</h2><p>${escapeHtml(post.excerpt)}</p><button type="button" data-expand aria-expanded="false">Read note →</button><div class="post-full" hidden><p>${escapeHtml(post.content)}</p></div></article>`;
    }).join("");
  }).catch(() => { container.innerHTML = '<p class="error">The notes could not load. Please refresh and try again.</p>'; });
  container.addEventListener("click", (event) => {
    const button = event.target.closest("[data-expand]");
    if (!button) return;
    const full = button.nextElementSibling;
    full.hidden = !full.hidden;
    button.setAttribute("aria-expanded", String(!full.hidden));
    button.textContent = full.hidden ? "Read note →" : "Close note ↑";
  });
})();
