(function () {
  const STORAGE_KEY = "portfolio-theme";

  function applyTheme(theme) {
    const nextTheme = theme === "light" ? "light" : "dark";
    document.documentElement.dataset.theme = nextTheme;
    localStorage.setItem(STORAGE_KEY, nextTheme);

    document.querySelectorAll("[data-theme-label]").forEach((node) => {
      node.textContent = nextTheme === "light" ? "Light" : "Dark";
    });

    document.querySelectorAll("[data-theme-icon]").forEach((node) => {
      node.className = nextTheme === "light" ? "ri-sun-line" : "ri-moon-clear-line";
    });
  }

  function setHeaderOffset() {
    const header = document.getElementById("header");
    const offset = header ? header.offsetHeight + 24 : 88;
    document.documentElement.style.setProperty("--header-offset", `${offset}px`);
  }

  function highlightCurrentPage() {
    const currentPath = window.location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll("[data-nav-page]").forEach((link) => {
      const target = link.getAttribute("data-nav-page");
      const isArticleDetail = currentPath === "article.html" && target === "articles.html";
      link.classList.toggle("is-active", target === currentPath || isArticleDetail);
    });
  }

  function setupNavigation() {
    const navMenu = document.querySelector("[data-nav-menu]");
    const navToggle = document.querySelector("[data-nav-toggle]");
    const navClose = document.querySelector("[data-nav-close]");

    if (!navMenu || !navToggle) return;

    const setOpen = (isOpen) => {
      navMenu.classList.toggle("is-open", isOpen);
      navToggle.setAttribute("aria-expanded", String(isOpen));
      document.body.classList.toggle("nav-open", isOpen);
    };

    navToggle.addEventListener("click", () => {
      setOpen(!navMenu.classList.contains("is-open"));
    });

    if (navClose) {
      navClose.addEventListener("click", () => setOpen(false));
    }

    navMenu.querySelectorAll(".nav__link").forEach((link) => {
      link.addEventListener("click", () => {
        if (window.innerWidth < 768) {
          setOpen(false);
        }
      });
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth >= 768) {
        setOpen(false);
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    const savedTheme = localStorage.getItem(STORAGE_KEY) || document.documentElement.dataset.theme || "dark";
    applyTheme(savedTheme);
    setHeaderOffset();
    highlightCurrentPage();
    setupNavigation();

    document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
      button.addEventListener("click", () => {
        const currentTheme = document.documentElement.dataset.theme === "light" ? "light" : "dark";
        applyTheme(currentTheme === "light" ? "dark" : "light");
      });
    });
  });

  window.addEventListener("resize", setHeaderOffset);
  window.addEventListener("load", setHeaderOffset);
})();
