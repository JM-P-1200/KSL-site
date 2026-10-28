(function () {
  "use strict";
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
      button.disabled = true;
      form.setAttribute("aria-busy", "true");
      button.textContent = "Sending…";
      status.className = "";
      status.textContent = "";
      try {
        const response = await fetch("/api/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const result = await response.json().catch(() => null);
        if (!response.ok || !result || typeof result.message !== "string") {
          throw new Error(result?.error || "We couldn’t send your inquiry. Please try again shortly.");
        }
        form.reset();
        status.textContent = result.message;
        status.className = "success";
      } catch (error) {
        status.textContent = error instanceof TypeError ? "Please check your connection and try again." : error.message || "Something went wrong. Please try again.";
        status.className = "error";
      } finally {
        form.classList.remove("is-submitting");
        form.removeAttribute("aria-busy");
        button.disabled = false;
        button.textContent = originalLabel;
      }
    });
  });
})();
