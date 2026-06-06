(function () {
  const GITHUB_USER = "Ruchira20031209";
  const GITHUB_REPO = "Ruchira-Wanigasinghe-portfolio";
  const GITHUB_BRANCH = "main";
  const DATA_FILE = "data/articles-data.json";
  const GITHUB_RAW_URL = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${DATA_FILE}`;
  const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${DATA_FILE}`;

  const STORAGE_KEYS = {
    admin: "isAdmin",
    token: "github_token",
    cache: "articles_cache",
    local: "articles_local",
  };

  function isLocalPreview() {
    const host = window.location.hostname;
    return host === "127.0.0.1" || host === "localhost" || window.location.protocol === "file:";
  }

  function escapeHtml(text) {
    const value = text == null ? "" : String(text);
    const div = document.createElement("div");
    div.textContent = value;
    return div.innerHTML;
  }

  function sanitizeUrl(url) {
    const value = (url || "").trim();
    if (!value) return "";

    if (
      value.startsWith("/") ||
      value.startsWith("./") ||
      value.startsWith("../") ||
      value.startsWith("assets/")
    ) {
      return value;
    }

    try {
      const parsed = new URL(value, window.location.href);
      const allowedProtocols = ["http:", "https:", "mailto:", "tel:"];
      return allowedProtocols.includes(parsed.protocol) ? parsed.href : "";
    } catch (error) {
      return "";
    }
  }

  function sanitizeImageUrl(url) {
    const value = (url || "").trim();
    if (!value) return "";

    if (value.startsWith("data:image/")) {
      return value;
    }

    return sanitizeUrl(value);
  }

  function slugify(value) {
    const base = (value || "")
      .toString()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");

    return base || `article-${Date.now()}`;
  }

  function normalizeLinks(links) {
    if (!Array.isArray(links)) return [];

    return links
      .map((link) => ({
        label: (link && link.label ? String(link.label) : "").trim(),
        url: sanitizeUrl(link && link.url ? String(link.url) : ""),
      }))
      .filter((link) => link.label && link.url);
  }

  function normalizeDate(value) {
    const parsed = value ? new Date(value) : new Date();
    return Number.isNaN(parsed.getTime())
      ? new Date().toISOString().slice(0, 10)
      : parsed.toISOString().slice(0, 10);
  }

  function normalizeArticle(article, index) {
    const normalized = {
      id:
        article && article.id != null
          ? article.id
          : Date.now() + index,
      slug:
        article && article.slug
          ? slugify(article.slug)
          : slugify(article && article.title),
      title: article && article.title ? String(article.title).trim() : "",
      description:
        article && article.description ? String(article.description).trim() : "",
      image: sanitizeImageUrl(article && article.image ? String(article.image).trim() : ""),
      publishDate: normalizeDate(article && article.publishDate),
      language:
        article && article.language ? String(article.language).trim() : "English",
      links: normalizeLinks(article && article.links),
      updatedAt:
        article && article.updatedAt
          ? String(article.updatedAt)
          : new Date().toISOString(),
    };

    if (!normalized.slug) {
      normalized.slug = `article-${normalized.id}`;
    }

    return normalized;
  }

  function sortArticles(items) {
    return [...items].sort((left, right) => {
      const leftDate = new Date(left.publishDate || left.updatedAt || 0).getTime();
      const rightDate = new Date(right.publishDate || right.updatedAt || 0).getTime();
      return rightDate - leftDate;
    });
  }

  function getExcerpt(text, limit) {
    const compact = (text || "").replace(/\s+/g, " ").trim();
    const maxLength = limit || 145;

    if (compact.length <= maxLength) return compact;
    return `${compact.slice(0, maxLength).trimEnd()}...`;
  }

  function splitParagraphs(text) {
    return (text || "")
      .split(/\n{2,}/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);
  }

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  }

  function articleUrl(article) {
    return `article.html?slug=${encodeURIComponent(article.slug)}`;
  }

  function cardMarkup(article, options) {
    const settings = Object.assign(
      {
        showActions: "",
        className: "",
      },
      options || {}
    );

    return `
      <article class="article-card ${settings.className}" data-reveal>
        <a class="article-card__link" href="${articleUrl(article)}">
          <div class="article-card__media">
            <span class="article-card__language">${escapeHtml(article.language)}</span>
            <img
              src="${escapeHtml(article.image)}"
              alt="${escapeHtml(article.title)}"
              class="article-card__image"
              loading="lazy"
              onerror="this.src='assets/img/home-perfil.png'"
            >
          </div>

          <div class="article-card__body">
            <div class="article-card__meta">
              <span>${escapeHtml(formatDate(article.publishDate))}</span>
              <span><i class="ri-article-line"></i> Full article</span>
            </div>

            <h3 class="article-card__title">${escapeHtml(article.title)}</h3>
            <p class="article-card__excerpt">${escapeHtml(getExcerpt(article.description))}</p>
            <span class="article-card__cta">
              Read article <i class="ri-arrow-right-line"></i>
            </span>
          </div>
        </a>
        ${settings.showActions || ""}
      </article>
    `;
  }

  function renderLinkPills(links) {
    if (!Array.isArray(links) || !links.length) return "";

    return links
      .map((link) => {
        const url = sanitizeUrl(link.url);
        if (!url) return "";

        return `
          <a class="article-link-pill" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">
            ${escapeHtml(link.label)} <i class="ri-external-link-line"></i>
          </a>
        `;
      })
      .join("");
  }

  function setCurrentYear() {
    document.querySelectorAll("[data-current-year]").forEach((node) => {
      node.textContent = new Date().getFullYear();
    });
  }

  function setupCursor() {
    const cursor = document.querySelector(".cursor");
    if (!cursor) return;

    if (window.matchMedia("(pointer: coarse)").matches) {
      cursor.style.display = "none";
      return;
    }

    let mouseX = 0;
    let mouseY = 0;

    function animateCursor() {
      cursor.style.left = `${mouseX}px`;
      cursor.style.top = `${mouseY}px`;
      cursor.style.transform = "translate(-50%, -50%)";
      requestAnimationFrame(animateCursor);
    }

    document.addEventListener("mousemove", (event) => {
      mouseX = event.clientX;
      mouseY = event.clientY;
    });

    document.addEventListener("mouseover", (event) => {
      if (event.target.closest("a, button, input, textarea, select")) {
        cursor.classList.add("hide-cursor");
      }
    });

    document.addEventListener("mouseout", (event) => {
      if (event.target.closest("a, button, input, textarea, select")) {
        cursor.classList.remove("hide-cursor");
      }
    });

    animateCursor();
  }

  function revealElements(selector) {
    const nodes = document.querySelectorAll(selector || "[data-reveal]");
    if (!nodes.length) return;

    nodes.forEach((node, index) => {
      node.style.setProperty("--reveal-delay", `${(index % 6) * 70}ms`);
    });

    if (!("IntersectionObserver" in window)) {
      nodes.forEach((node) => node.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.12,
        rootMargin: "0px 0px -40px 0px",
      }
    );

    nodes.forEach((node) => observer.observe(node));
  }

  function serializeArticles(items) {
    const normalized = sortArticles(
      (Array.isArray(items) ? items : []).map((article, index) =>
        normalizeArticle(article, index)
      )
    );

    return JSON.stringify(
      {
        lastUpdated: new Date().toISOString(),
        items: normalized,
      },
      null,
      2
    );
  }

  function downloadTextFile(filename, content, mimeType) {
    const blob = new Blob([content], {
      type: mimeType || "application/octet-stream",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  async function prepareImageFile(file, options) {
    if (!(file instanceof File)) return "";

    const settings = Object.assign(
      {
        maxDimension: 1600,
        quality: 0.84,
      },
      options || {}
    );

    const originalDataUrl = await readFileAsDataUrl(file);
    const mimeType = (file.type || "").toLowerCase();

    if (
      !mimeType.startsWith("image/") ||
      mimeType === "image/svg+xml" ||
      typeof createImageBitmap !== "function"
    ) {
      return originalDataUrl;
    }

    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(
        1,
        settings.maxDimension / Math.max(bitmap.width, bitmap.height)
      );
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));

      const context = canvas.getContext("2d");
      if (!context) return originalDataUrl;

      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const outputType = mimeType === "image/png" ? "image/png" : "image/webp";
      return canvas.toDataURL(
        outputType,
        outputType === "image/webp" ? settings.quality : undefined
      );
    } catch (error) {
      return originalDataUrl;
    }
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
      reader.onerror = () => reject(reader.error || new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  }

  function getEmbeddedArticles() {
    const payload = window.PORTFOLIO_ARTICLES_DATA;
    if (!payload || !Array.isArray(payload.items)) return [];

    return sortArticles(
      payload.items.map((article, index) => normalizeArticle(article, index))
    );
  }

  class ArticlesRepository {
    constructor() {
      this.githubToken = localStorage.getItem(STORAGE_KEYS.token) || "";
      this.githubSha = null;
    }

    async loadArticles() {
      if (window.location.protocol === "file:") {
        const localItems = this.loadFromCache();
        if (localItems.length) {
          return localItems;
        }

        const embeddedItems = getEmbeddedArticles();
        if (embeddedItems.length) {
          this.cacheArticles(embeddedItems);
          return embeddedItems;
        }
      }

      const sources = isLocalPreview()
        ? [DATA_FILE, GITHUB_RAW_URL]
        : [GITHUB_RAW_URL, DATA_FILE];

      for (const source of sources) {
        try {
          const response = await fetch(`${source}?t=${Date.now()}`, {
            cache: "no-store",
          });

          if (!response.ok) {
            throw new Error(`Request failed with status ${response.status}`);
          }

          const data = await response.json();
          if (!data || !Array.isArray(data.items)) {
            throw new Error("Invalid data format");
          }

          const items = sortArticles(
            data.items.map((article, index) => normalizeArticle(article, index))
          );

          this.cacheArticles(items);
          if (this.githubToken && source === GITHUB_RAW_URL) {
            await this.getFileSha();
          }

          return items;
        } catch (error) {
          continue;
        }
      }

      const cachedItems = this.loadFromCache();
      if (cachedItems.length) {
        return cachedItems;
      }

      const embeddedItems = getEmbeddedArticles();
      if (embeddedItems.length) {
        this.cacheArticles(embeddedItems);
        return embeddedItems;
      }

      return [];
    }

    cacheArticles(items) {
      localStorage.setItem(
        STORAGE_KEYS.cache,
        JSON.stringify({
          items,
          timestamp: Date.now(),
        })
      );
      localStorage.setItem(STORAGE_KEYS.local, JSON.stringify(items));
    }

    loadFromCache() {
      try {
        const cached = localStorage.getItem(STORAGE_KEYS.cache);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && Array.isArray(parsed.items)) {
            return sortArticles(
              parsed.items.map((article, index) =>
                normalizeArticle(article, index)
              )
            );
          }
        }
      } catch (error) {
        // Fall through to local data.
      }

      try {
        const saved = localStorage.getItem(STORAGE_KEYS.local);
        if (!saved) return [];

        const parsed = JSON.parse(saved);
        if (!Array.isArray(parsed)) return [];
        return sortArticles(
          parsed.map((article, index) => normalizeArticle(article, index))
        );
      } catch (error) {
        return [];
      }
    }

    async getFileSha() {
      this.githubToken = localStorage.getItem(STORAGE_KEYS.token) || "";
      if (!this.githubToken) return null;

      try {
        const response = await fetch(GITHUB_API_URL, {
          headers: {
            Authorization: `token ${this.githubToken}`,
            Accept: "application/vnd.github.v3+json",
          },
        });

        if (!response.ok) return null;

        const data = await response.json();
        this.githubSha = data.sha || null;
        return this.githubSha;
      } catch (error) {
        return null;
      }
    }

    async saveArticles(items) {
      this.githubToken = localStorage.getItem(STORAGE_KEYS.token) || "";
      const normalized = sortArticles(
        items.map((article, index) => normalizeArticle(article, index))
      );

      this.cacheArticles(normalized);

      if (!this.githubToken) {
        return {
          ok: false,
          reason: "missing-token",
          items: normalized,
        };
      }

      if (!this.githubSha) {
        await this.getFileSha();
      }

      const content = serializeArticles(normalized);
      const encoded = btoa(unescape(encodeURIComponent(content)));

      const payload = {
        message: `Update articles data - ${new Date().toLocaleDateString()}`,
        content: encoded,
        branch: GITHUB_BRANCH,
      };

      if (this.githubSha) {
        payload.sha = this.githubSha;
      }

      try {
        const response = await fetch(GITHUB_API_URL, {
          method: "PUT",
          headers: {
            Authorization: `token ${this.githubToken}`,
            "Content-Type": "application/json",
            Accept: "application/vnd.github.v3+json",
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || "GitHub update failed");
        }

        const result = await response.json();
        this.githubSha = result && result.content ? result.content.sha : this.githubSha;
        this.cacheArticles(normalized);

        return {
          ok: true,
          items: normalized,
        };
      } catch (error) {
        return {
          ok: false,
          reason: "error",
          message: error.message,
          items: normalized,
        };
      }
    }
  }

  window.ArticlesApp = {
    STORAGE_KEYS,
    DATA_FILE,
    escapeHtml,
    sanitizeUrl,
    slugify,
    normalizeArticle,
    sortArticles,
    getExcerpt,
    splitParagraphs,
    formatDate,
    articleUrl,
    cardMarkup,
    renderLinkPills,
    setCurrentYear,
    setupCursor,
    revealElements,
    serializeArticles,
    downloadTextFile,
    prepareImageFile,
    ArticlesRepository,
  };
})();
