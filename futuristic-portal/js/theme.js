/* theme.js — dark/light (neon) theme toggle, persisted in localStorage.
   Loaded early in <head> on every page so the theme applies before paint.

   This module ONLY applies the saved theme and exposes window.NexusTheme
   for toggling. It does NOT auto-wire any buttons -- each page wires its
   own .theme-toggle-btn exactly once (in auth.js for app pages, or inline
   for index.html / admin.html), to avoid double-binding click handlers. */
(function () {
  const KEY = "nexus_theme";

  function apply(theme) {
    document.documentElement.setAttribute("data-theme", theme);
  }

  const saved = localStorage.getItem(KEY) || "dark";
  apply(saved);

  window.NexusTheme = {
    toggle() {
      const cur = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
      const next = cur === "light" ? "dark" : "light";
      apply(next);
      localStorage.setItem(KEY, next);
      return next;
    },
    current() {
      return document.documentElement.getAttribute("data-theme") || "dark";
    },
    wireButton(btn) {
      if (!btn || btn.dataset.themeWired) return;
      btn.dataset.themeWired = "true";
      const setIcon = () => { btn.textContent = window.NexusTheme.current() === "light" ? "🌙" : "☀️"; };
      setIcon();
      btn.addEventListener("click", () => { window.NexusTheme.toggle(); setIcon(); });
    }
  };
})();
