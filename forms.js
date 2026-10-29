(function () {
  "use strict";

  function announce(status, message, tone) {
    if (!status) return;
    status.textContent = message;
    status.className = tone || "";
    status.tabIndex = -1;
    status.focus?.({ preventScroll: true });
  }

  document.querySelectorAll("[data-async-form]").forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (form.classList.contains("is-submitting")) return;
      if (!form.reportValidity()) return;

      const button = form.querySelector('[type="submit"]');
      const status = form.querySelector("[data-form-status]");
      const originalLabel = button.textContent;
      const payload = Object.fromEntries(new FormData(form).entries());
      payload.kind = form.dataset.formKind;

      form.classList.add("is-submitting");
      form.setAttribute("aria-busy", "true");
      button.disabled = true;
      button.setAttribute("aria-disabled", "true");
      button.textContent = "Sending…";
      announce(status, "Sending securely…", "muted");

      try {
        const response = await fetch("/api/submit", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify(payload)
        });
        const result = await response.json().catch(() => null);
        if (!response.ok || !result || typeof result.message !== "string") {
          throw new Error(result?.error || "We couldn’t send your inquiry. Please try again shortly.");
        }
        form.reset();
        announce(status, result.message, "success");
      } catch (error) {
        const message = error instanceof TypeError
          ? "Please check your connection and try again."
          : error.message || "Something went wrong. Please try again.";
        announce(status, message, "error");
      } finally {
        form.classList.remove("is-submitting");
        form.removeAttribute("aria-busy");
        button.disabled = false;
        button.removeAttribute("aria-disabled");
        button.textContent = originalLabel;
      }
    });
  });
})();
