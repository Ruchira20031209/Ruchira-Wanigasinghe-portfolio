class ArchiveDetailPage {
  constructor() {
    this.root = document.getElementById("archive-detail-root");
    this.items = [];
  }

  async init() {
    if (!this.root) return;

    this.items = await this.loadItems();
    const itemId = new URLSearchParams(window.location.search).get("id");
    const item = this.items.find((entry) => String(entry.id) === String(itemId));

    if (!item) {
      this.renderNotFound();
      return;
    }

    this.renderItem(item);
    this.bindGallery();
    document.title = `${item.title} | Archive | Ruchira Wanigasinghe`;
  }

  async loadItems() {
    const embedded = this.readEmbeddedItems();

    if (window.location.protocol === "file:") {
      const localItems = this.readLocalItems();
      return localItems.length ? localItems : embedded;
    }

    const isLocalPreview =
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname === "localhost" ||
      window.location.protocol === "file:";

    const sources = isLocalPreview
      ? ["data/certificates-data.json"]
      : [
          "https://raw.githubusercontent.com/Ruchira20031209/Ruchira-Wanigasinghe-portfolio/main/data/certificates-data.json",
          "data/certificates-data.json",
        ];

    for (const source of sources) {
      try {
        const response = await fetch(`${source}?t=${Date.now()}`, { cache: "no-store" });
        if (!response.ok) continue;
        const data = await response.json();
        const items = this.normalizeItems(Array.isArray(data.items) ? data.items : []);
        if (items.length) return items;
      } catch (error) {
        // Try the next source or fallback below.
      }
    }

    const localItems = this.readLocalItems();
    return localItems.length ? localItems : embedded;
  }

  readLocalItems() {
    try {
      const cached = localStorage.getItem("portfolio_cache");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && Array.isArray(parsed.items)) {
          return this.normalizeItems(parsed.items);
        }
      }
    } catch (error) {
      // Fallback to portfolio_local.
    }

    try {
      const local = localStorage.getItem("portfolio_local");
      const parsed = local ? JSON.parse(local) : [];
      return this.normalizeItems(Array.isArray(parsed) ? parsed : []);
    } catch (error) {
      return [];
    }
  }

  readEmbeddedItems() {
    const payload = window.PORTFOLIO_CERTIFICATES_DATA;
    return payload && Array.isArray(payload.items) ? this.normalizeItems(payload.items) : [];
  }

  normalizeItems(items) {
    return (Array.isArray(items) ? items : [])
      .map((item) => this.normalizeItem(item))
      .filter((item) => item.title);
  }

  normalizeItem(item) {
    const type = item && item.type === "certificate" ? "certificate" : "project";
    const images = [...new Set([...(Array.isArray(item && item.images) ? item.images : []), item && item.image])]
      .map((value) => this.sanitizeUrl(value, true))
      .filter(Boolean);

    const safeImages = images.length ? images : ["assets/img/projects/portfolio.png"];

    return {
      id: item && item.id != null ? item.id : "",
      type,
      title: this.cleanText(item && item.title),
      description: this.cleanText(item && item.description),
      year: Number.isFinite(Number(item && item.year)) ? Number(item.year) : "",
      category: this.cleanText(item && item.category).toLowerCase(),
      technologies: this.cleanText(item && item.technologies),
      githubLink: this.sanitizeUrl(item && item.githubLink),
      liveLink: this.sanitizeUrl(item && item.liveLink),
      issuedBy: this.cleanText(item && item.issuedBy),
      images: safeImages,
      image: safeImages[0],
    };
  }

  renderItem(item) {
    const title = this.escapeHtml(item.title);
    const description = this.escapeHtml(
      item.description || "More detail text can be added from the archive admin panel at any time."
    );
    const pills = [
      this.getCategoryLabel(item),
      item.year ? String(item.year) : "",
      item.type === "certificate" ? item.issuedBy : item.technologies,
    ].filter(Boolean);

    const statsMarkup = pills
      .map((value) => `<span class="archive-detail__pill">${this.escapeHtml(value)}</span>`)
      .join("");

    const links = [];
    if (item.githubLink) {
      links.push(`
        <a class="archive-detail__link" href="${this.escapeHtml(item.githubLink)}" target="_blank" rel="noopener noreferrer">
          <i class="ri-github-line"></i> View Code
        </a>
      `);
    }
    if (item.liveLink) {
      links.push(`
        <a class="archive-detail__link archive-detail__link--primary" href="${this.escapeHtml(item.liveLink)}" target="_blank" rel="noopener noreferrer">
          <i class="ri-external-link-line"></i> Open Live
        </a>
      `);
    }

    this.root.innerHTML = `
      <div class="archive-detail__shell">
        <a href="certificates.html" class="archive-detail__crumb">
          <i class="ri-arrow-left-line"></i>
          Back to archive
        </a>

        <article class="archive-detail__card">
          <div class="archive-detail__media">
            <div class="archive-detail__hero">
              <img
                src="${this.escapeHtml(item.images[0])}"
                alt="${title}"
                class="archive-detail__image"
                id="archive-detail-main-image"
                onerror="this.src='assets/img/projects/portfolio.png'"
              >
            </div>

            ${
              item.images.length > 1
                ? `
              <div class="archive-detail__thumbs" id="archive-detail-thumbs">
                ${item.images
                  .map(
                    (image, index) => `
                      <button class="archive-detail__thumb ${index === 0 ? "is-active" : ""}" type="button" data-thumb-src="${this.escapeHtml(image)}" aria-label="View image ${index + 1}">
                        <img src="${this.escapeHtml(image)}" alt="${title} preview ${index + 1}" loading="lazy" onerror="this.src='assets/img/projects/portfolio.png'">
                      </button>
                    `
                  )
                  .join("")}
              </div>
            `
                : ""
            }
          </div>

          <div class="archive-detail__content">
            <div class="archive-detail__pills">${statsMarkup}</div>
            <h1 class="archive-detail__title">${title}</h1>
            <p class="archive-detail__description">${description}</p>

            ${
              item.type === "certificate"
                ? `
              <div class="archive-detail__section">
                <h2 class="archive-detail__section-title">Certificate information</h2>
                <div class="archive-detail__stats">
                  <span class="archive-detail__stat"><i class="ri-award-line"></i> ${this.escapeHtml(
                    item.issuedBy || "Issuer not added yet"
                  )}</span>
                </div>
              </div>
            `
                : `
              <div class="archive-detail__section">
                <h2 class="archive-detail__section-title">Project information</h2>
                <div class="archive-detail__stats">
                  <span class="archive-detail__stat"><i class="ri-stack-line"></i> ${this.escapeHtml(
                    item.technologies || "Technologies not added yet"
                  )}</span>
                </div>
              </div>
            `
            }

            ${
              links.length
                ? `
              <div class="archive-detail__section">
                <h2 class="archive-detail__section-title">Links</h2>
                <div class="archive-detail__links">${links.join("")}</div>
              </div>
            `
                : ""
            }
          </div>
        </article>
      </div>
    `;
  }

  bindGallery() {
    const mainImage = document.getElementById("archive-detail-main-image");
    const thumbs = document.querySelectorAll(".archive-detail__thumb");
    if (!mainImage || !thumbs.length) return;

    thumbs.forEach((thumb) => {
      thumb.addEventListener("click", () => {
        thumbs.forEach((node) => node.classList.remove("is-active"));
        thumb.classList.add("is-active");
        mainImage.src = thumb.dataset.thumbSrc || mainImage.src;
      });
    });
  }

  renderNotFound() {
    this.root.innerHTML = `
      <div class="archive-detail__empty">
        <h1 class="section__title">Item <span>Not Found</span></h1>
        <p>This archive item could not be loaded. Try going back to the archive and opening another card.</p>
        <p><a href="certificates.html" class="archive-detail__link archive-detail__link--primary">Back to archive</a></p>
      </div>
    `;
  }

  getCategoryLabel(item) {
    if (item.type === "certificate") {
      const labels = {
        certificate: "Certificate",
        award: "Award",
        achievement: "Achievement",
      };
      return labels[item.category] || "Certificate";
    }

    const labels = {
      web: "Web Project",
      iot: "IoT Project",
      practice: "Practice Project",
      design: "Design",
      mobile: "Mobile App",
      other: "Project",
    };
    return labels[item.category] || "Project";
  }

  cleanText(value) {
    return value == null ? "" : String(value).trim();
  }

  escapeHtml(value) {
    const node = document.createElement("div");
    node.textContent = value == null ? "" : String(value);
    return node.innerHTML;
  }

  sanitizeUrl(url, allowImage = false) {
    const value = this.cleanText(url);
    if (!value) return "";
    if (allowImage && value.startsWith("data:image/")) return value;

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
      const allowed = allowImage ? ["http:", "https:"] : ["http:", "https:", "mailto:", "tel:"];
      return allowed.includes(parsed.protocol) ? parsed.href : "";
    } catch (error) {
      return "";
    }
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const footerYear = document.getElementById("footer-year");
  if (footerYear) {
    footerYear.textContent = new Date().getFullYear();
  }

  const page = new ArchiveDetailPage();
  await page.init();
});
