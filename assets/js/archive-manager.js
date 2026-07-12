const ARCHIVE_GITHUB_USER = "Ruchira20031209";
const ARCHIVE_GITHUB_REPO = "Ruchira-Wanigasinghe-portfolio";
const ARCHIVE_GITHUB_BRANCH = "main";
const ARCHIVE_DATA_FILE = "data/certificates-data.json";
const ARCHIVE_ADMIN_PASSWORD =
  typeof ADMIN_PASSWORD === "string" && ADMIN_PASSWORD.trim() ? ADMIN_PASSWORD.trim() : "";

class ArchiveManager {
  constructor() {
    this.items = [];
    this.currentFilter = "all";
    this.editingItem = null;
    this.isAdmin = localStorage.getItem("isAdmin") === "true";
    this.githubToken = localStorage.getItem("github_token") || "";
    this.githubSha = null;

    this.gallery = document.getElementById("gallery-container");
    this.adminBtn = document.getElementById("admin-btn");
    this.modal = document.getElementById("admin-modal");
    this.modalTitle = document.getElementById("modal-title");
    this.modalBody = document.getElementById("modal-body");
    this.toast = document.getElementById("toast");
  }

  async init() {
    await this.loadData();
    this.bindStaticEvents();
    this.renderGallery();
    this.updateAdminButton();
    this.setupScrollReveal();
  }

  get rawDataUrl() {
    return `https://raw.githubusercontent.com/${ARCHIVE_GITHUB_USER}/${ARCHIVE_GITHUB_REPO}/${ARCHIVE_GITHUB_BRANCH}/${ARCHIVE_DATA_FILE}`;
  }

  get apiDataUrl() {
    return `https://api.github.com/repos/${ARCHIVE_GITHUB_USER}/${ARCHIVE_GITHUB_REPO}/contents/${ARCHIVE_DATA_FILE}`;
  }

  async loadData() {
    if (window.location.protocol === "file:") {
      this.loadFromStorage();
      if (this.items.length) return;

      const embedded = this.readEmbeddedItems();
      if (embedded.length) {
        this.items = embedded;
        this.persistLocal();
        return;
      }
    }

    const isLocalPreview =
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname === "localhost" ||
      window.location.protocol === "file:";

    const sources = isLocalPreview ? [ARCHIVE_DATA_FILE, this.rawDataUrl] : [this.rawDataUrl, ARCHIVE_DATA_FILE];

    for (const source of sources) {
      try {
        const response = await fetch(`${source}?t=${Date.now()}`, { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const data = await response.json();
        const items = this.normalizeItems(Array.isArray(data.items) ? data.items : []);
        if (!items.length) continue;

        this.items = items;
        this.persistLocal();

        if (this.githubToken && source === this.rawDataUrl) {
          await this.getFileSha();
        }
        return;
      } catch (error) {
        // Try the next source or fallback storage.
      }
    }

    this.loadFromStorage();
    if (!this.items.length) {
      this.items = this.readEmbeddedItems();
    }
  }

  readEmbeddedItems() {
    const payload = window.PORTFOLIO_CERTIFICATES_DATA;
    return payload && Array.isArray(payload.items) ? this.normalizeItems(payload.items) : [];
  }

  loadFromStorage() {
    try {
      const cached = localStorage.getItem("portfolio_cache");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && Array.isArray(parsed.items)) {
          this.items = this.normalizeItems(parsed.items);
          return;
        }
      }
    } catch (error) {
      // Fallback to local items below.
    }

    try {
      const local = localStorage.getItem("portfolio_local");
      const parsed = local ? JSON.parse(local) : [];
      this.items = this.normalizeItems(Array.isArray(parsed) ? parsed : []);
    } catch (error) {
      this.items = [];
    }
  }

  persistLocal() {
    localStorage.setItem("portfolio_local", JSON.stringify(this.items));
    localStorage.setItem(
      "portfolio_cache",
      JSON.stringify({
        items: this.items,
        timestamp: Date.now(),
      })
    );
  }

  normalizeItems(items) {
    return (Array.isArray(items) ? items : [])
      .map((item) => this.normalizeItem(item))
      .filter((item) => item.title);
  }

  normalizeItem(item) {
    const type = item && item.type === "certificate" ? "certificate" : "project";
    const category = this.normalizeCategory(item && item.category, type);
    const images = this.uniqueStrings([
      ...(Array.isArray(item && item.images) ? item.images : []),
      item && item.image,
    ])
      .map((value) => this.sanitizeUrl(value, true))
      .filter(Boolean);

    const safeImages = images.length ? images : ["assets/img/projects/portfolio.png"];

    return {
      id: item && item.id != null ? item.id : Date.now(),
      type,
      title: this.cleanText(item && item.title),
      description: this.cleanText(item && item.description),
      year: Number.isFinite(Number(item && item.year)) ? Number(item.year) : "",
      category,
      technologies: this.cleanText(item && item.technologies),
      githubLink: this.sanitizeUrl(item && item.githubLink),
      liveLink: this.sanitizeUrl(item && item.liveLink),
      issuedBy: this.cleanText(item && item.issuedBy),
      images: safeImages,
      image: safeImages[0],
    };
  }

  normalizeCategory(category, type) {
    const value = this.cleanText(category).toLowerCase();
    if (type === "certificate") {
      return ["award", "achievement"].includes(value) ? value : "certificate";
    }

    return ["web", "iot", "practice", "design", "mobile", "other"].includes(value) ? value : "other";
  }

  cleanText(value) {
    return value == null ? "" : String(value).trim();
  }

  uniqueStrings(values) {
    return [...new Set(values.map((value) => this.cleanText(value)).filter(Boolean))];
  }

  getItemImages(item) {
    return Array.isArray(item.images) && item.images.length ? item.images : [item.image].filter(Boolean);
  }

  getPrimaryImage(item) {
    return this.getItemImages(item)[0] || "assets/img/projects/portfolio.png";
  }

  getDetailUrl(item) {
    const id = item && item.id != null ? String(item.id).trim() : "";
    return id ? `archive-item.html?id=${encodeURIComponent(id)}` : "certificates.html";
  }

  filterItems() {
    if (this.currentFilter === "all") return [...this.items];
    if (this.currentFilter === "design") {
      return this.items.filter((item) => item.type === "project" && item.category === "design");
    }
    if (this.currentFilter === "project" || this.currentFilter === "certificate") {
      return this.items.filter((item) => item.type === this.currentFilter);
    }

    return this.items.filter((item) => item.category === this.currentFilter);
  }

  sortItems(items) {
    return [...items].sort((left, right) => {
      const yearDelta = Number(right.year || 0) - Number(left.year || 0);
      if (yearDelta) return yearDelta;
      return Number(right.id || 0) - Number(left.id || 0);
    });
  }

  renderGallery() {
    if (!this.gallery) return;

    const items = this.sortItems(this.filterItems());
    if (!items.length) {
      this.gallery.innerHTML = `
        <div class="empty-state">
          <h2>No items found</h2>
          <p>Try another filter or add a new archive entry from the admin panel.</p>
        </div>
      `;
      return;
    }

    this.gallery.innerHTML = items.map((item) => this.renderCard(item)).join("");
    this.setupScrollReveal();
  }

  renderCard(item) {
    const title = this.escapeHtml(item.title || (item.type === "certificate" ? "Certificate" : "Project"));
    const image = this.escapeHtml(this.getPrimaryImage(item));
    const detailUrl = this.escapeHtml(this.getDetailUrl(item));
    const categoryLabel = this.escapeHtml(this.getCategoryLabel(item));
    const year = item.year ? `<span class="gallery-year">${this.escapeHtml(String(item.year))}</span>` : "";
    const summary = this.escapeHtml(this.getCardSummary(item));

    return `
      <article class="gallery-item" data-item-id="${this.escapeHtml(String(item.id))}">
        <a class="gallery-card" href="${detailUrl}">
          <div class="gallery-media">
            <img
              src="${image}"
              alt="${title}"
              class="gallery-img"
              loading="lazy"
              onerror="this.src='assets/img/projects/portfolio.png'"
            >
          </div>

          <div class="gallery-content">
            <div class="gallery-top">
              <h2 class="gallery-title">${title}</h2>
              ${year}
            </div>

            <div class="gallery-summary">${summary}</div>

            <div class="gallery-meta">
              <span class="gallery-chip"><i class="ri-stack-line"></i> ${categoryLabel}</span>
              <span class="gallery-cta">View details <i class="ri-arrow-right-line"></i></span>
            </div>
          </div>
        </a>

        ${
          this.isAdmin
            ? `
          <div class="gallery-admin">
            <button class="admin-secondary" type="button" data-archive-action="edit" data-item-id="${this.escapeHtml(String(item.id))}">
              <i class="ri-edit-line"></i> Edit
            </button>
            <button class="admin-danger" type="button" data-archive-action="delete" data-item-id="${this.escapeHtml(String(item.id))}">
              <i class="ri-delete-bin-line"></i> Delete
            </button>
          </div>
        `
            : ""
        }
      </article>
    `;
  }

  getCardSummary(item) {
    if (item.type === "certificate") {
      return item.issuedBy || "Open to view the certificate details and preview image.";
    }

    if (item.technologies) return item.technologies;
    if (item.category === "design") return "Design work with extra screenshots and visual details.";
    return "Open to view the full project story, links, and image gallery.";
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

  bindStaticEvents() {
    document.querySelectorAll(".filter-btn").forEach((button) => {
      button.addEventListener("click", () => {
        document.querySelectorAll(".filter-btn").forEach((node) => node.classList.remove("active"));
        button.classList.add("active");
        this.currentFilter = button.dataset.filter || "all";
        this.renderGallery();
      });
    });

    if (this.adminBtn) {
      this.adminBtn.addEventListener("click", () => {
        if (this.isAdmin) {
          this.showAdminPanel();
        } else {
          this.showLoginPrompt();
        }
      });
    }

    const modalClose = document.getElementById("modal-close");
    if (modalClose) {
      modalClose.addEventListener("click", () => this.hideModal());
    }

    if (this.modal) {
      this.modal.addEventListener("click", (event) => {
        if (event.target === this.modal) {
          this.hideModal();
        }
      });
    }

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && this.modal && this.modal.classList.contains("is-open")) {
        this.hideModal();
      }
    });

    document.addEventListener("click", (event) => {
      const actionButton = event.target.closest("[data-archive-action]");
      if (!actionButton) return;

      const id = actionButton.dataset.itemId;
      if (!id) return;

      if (actionButton.dataset.archiveAction === "edit") {
        this.editItem(id);
      }

      if (actionButton.dataset.archiveAction === "delete") {
        this.deleteItem(id);
      }
    });
  }

  showLoginPrompt() {
    this.setModalContent(
      "Admin Login",
      `
        <div class="modal-form">
          <div class="form-group">
            <label for="admin-password-field">Enter admin password</label>
            <input type="password" id="admin-password-field" placeholder="Password">
          </div>
          <div class="modal-actions">
            <button class="admin-button" type="button" id="admin-login-btn">Login</button>
            <button class="admin-secondary" type="button" id="admin-login-cancel">Cancel</button>
          </div>
        </div>
      `
    );

    document.getElementById("admin-login-btn").addEventListener("click", () => {
      const value = document.getElementById("admin-password-field").value;
      if (!ARCHIVE_ADMIN_PASSWORD || value === ARCHIVE_ADMIN_PASSWORD) {
        this.isAdmin = true;
        localStorage.setItem("isAdmin", "true");
        this.updateAdminButton();
        this.renderGallery();
        this.showToast("Login successful", "success");
        this.showAdminPanel();
      } else {
        this.showToast("Incorrect password", "error");
      }
    });

    document.getElementById("admin-login-cancel").addEventListener("click", () => {
      this.hideModal();
    });
  }

  showAdminPanel() {
    const projectCount = this.items.filter((item) => item.type === "project").length;
    const certificateCount = this.items.filter((item) => item.type === "certificate").length;

    this.setModalContent(
      "Archive Admin",
      `
        <div class="modal-form">
          <div class="form-grid">
            <div class="form-group">
              <label>Total Projects</label>
              <input type="text" value="${projectCount}" readonly>
            </div>
            <div class="form-group">
              <label>Total Certificates</label>
              <input type="text" value="${certificateCount}" readonly>
            </div>
          </div>

          <div class="panel-actions">
            <button class="admin-button" type="button" id="add-project-btn"><i class="ri-folder-add-line"></i> Add Project</button>
            <button class="admin-button" type="button" id="add-certificate-btn"><i class="ri-award-line"></i> Add Certificate</button>
            <button class="admin-secondary" type="button" id="archive-github-btn"><i class="ri-github-line"></i> GitHub Token</button>
            <button class="admin-secondary" type="button" id="archive-export-btn"><i class="ri-download-2-line"></i> Export JSON</button>
            <button class="admin-secondary" type="button" id="archive-import-btn"><i class="ri-upload-2-line"></i> Import JSON</button>
            <button class="admin-danger" type="button" id="archive-logout-btn"><i class="ri-logout-box-r-line"></i> Logout</button>
          </div>

          <div class="form-group">
            <label>Sync status</label>
            <input type="text" value="${
              this.githubToken
                ? "GitHub token saved in this browser. Updates can sync to the repository."
                : "No GitHub token saved. Edits still save locally in this browser."
            }" readonly>
          </div>
        </div>
      `
    );

    document.getElementById("add-project-btn").addEventListener("click", () => this.showItemForm("project"));
    document.getElementById("add-certificate-btn").addEventListener("click", () => this.showItemForm("certificate"));
    document.getElementById("archive-github-btn").addEventListener("click", () => this.showGitHubSettings());
    document.getElementById("archive-export-btn").addEventListener("click", () => this.exportData());
    document.getElementById("archive-import-btn").addEventListener("click", () => this.showImportDialog());
    document.getElementById("archive-logout-btn").addEventListener("click", () => {
      this.isAdmin = false;
      localStorage.removeItem("isAdmin");
      this.updateAdminButton();
      this.hideModal();
      this.renderGallery();
      this.showToast("Logged out", "success");
    });
  }

  showGitHubSettings() {
    this.setModalContent(
      "GitHub Sync",
      `
        <div class="modal-form">
          <div class="form-group">
            <label for="github-token-field">Personal access token</label>
            <input type="password" id="github-token-field" placeholder="ghp_xxxxxxxxxxxxxxxxxxxx" value="${this.escapeHtml(this.githubToken)}">
            <div class="form-hint">The token stays only in this browser and is used to update <code>${ARCHIVE_DATA_FILE}</code>.</div>
          </div>
          <div class="modal-actions">
            <button class="admin-button" type="button" id="save-github-token-btn">Save Token</button>
            <button class="admin-secondary" type="button" id="remove-github-token-btn">Remove Token</button>
            <button class="admin-secondary" type="button" id="github-back-btn">Back</button>
          </div>
        </div>
      `
    );

    document.getElementById("save-github-token-btn").addEventListener("click", async () => {
      const token = document.getElementById("github-token-field").value.trim();
      if (!token) {
        this.showToast("Enter a token first", "error");
        return;
      }

      this.githubToken = token;
      localStorage.setItem("github_token", token);
      await this.getFileSha();
      this.showToast("GitHub token saved", "success");
      this.showAdminPanel();
    });

    document.getElementById("remove-github-token-btn").addEventListener("click", () => {
      this.githubToken = "";
      this.githubSha = null;
      localStorage.removeItem("github_token");
      this.showToast("GitHub token removed", "success");
      this.showAdminPanel();
    });

    document.getElementById("github-back-btn").addEventListener("click", () => this.showAdminPanel());
  }

  showItemForm(type, item = null) {
    this.editingItem = item;
    const isCertificate = type === "certificate";
    const images = item ? this.getItemImages(item).join("\n") : "";
    const title = item ? this.escapeHtml(item.title) : "";
    const description = item ? this.escapeHtml(item.description) : "";
    const year = item && item.year ? item.year : new Date().getFullYear();
    const issuedBy = item ? this.escapeHtml(item.issuedBy || "") : "";
    const technologies = item ? this.escapeHtml(item.technologies || "") : "";
    const githubLink = item ? this.escapeHtml(item.githubLink || "") : "";
    const liveLink = item ? this.escapeHtml(item.liveLink || "") : "";
    const category = item ? item.category : isCertificate ? "certificate" : "web";

    this.setModalContent(
      item ? `Edit ${isCertificate ? "Certificate" : "Project"}` : `Add ${isCertificate ? "Certificate" : "Project"}`,
      `
        <form class="modal-form" id="archive-item-form">
          <div class="form-grid">
            <div class="form-group">
              <label for="item-title">Title *</label>
              <input type="text" id="item-title" required value="${title}">
            </div>
            <div class="form-group">
              <label for="item-year">Year</label>
              <input type="number" id="item-year" min="2000" max="2035" value="${this.escapeHtml(String(year))}">
            </div>
          </div>

          <div class="form-group">
            <label for="item-description">Detail description</label>
            <textarea id="item-description" placeholder="Full detail text for the detail page.">${description}</textarea>
          </div>

          <div class="form-grid">
            <div class="form-group">
              <label for="item-category">Category</label>
              ${
                isCertificate
                  ? `
                <select id="item-category">
                  <option value="certificate">Certificate</option>
                  <option value="award">Award</option>
                  <option value="achievement">Achievement</option>
                </select>
              `
                  : `
                <select id="item-category">
                  <option value="web">Web Development</option>
                  <option value="iot">IoT</option>
                  <option value="practice">Practice Project</option>
                  <option value="design">Design</option>
                  <option value="mobile">Mobile App</option>
                  <option value="other">Other</option>
                </select>
              `
              }
            </div>

            <div class="form-group">
              <label for="${isCertificate ? "item-issued-by" : "item-technologies"}">${
                isCertificate ? "Issued by" : "Technologies"
              }</label>
              <input type="text" id="${isCertificate ? "item-issued-by" : "item-technologies"}" value="${
                isCertificate ? issuedBy : technologies
              }" placeholder="${isCertificate ? "University or organization" : "HTML, CSS, JavaScript"}">
            </div>
          </div>

          ${
            isCertificate
              ? ""
              : `
            <div class="form-grid">
              <div class="form-group">
                <label for="item-github">GitHub link</label>
                <input type="url" id="item-github" value="${githubLink}">
              </div>
              <div class="form-group">
                <label for="item-live">Live link</label>
                <input type="url" id="item-live" value="${liveLink}">
              </div>
            </div>
          `
          }

          <div class="form-group">
            <label for="item-images">Images *</label>
            <textarea id="item-images" required placeholder="One image path, URL, or saved image data entry per line.">${this.escapeHtml(images)}</textarea>
            <div class="form-hint">Add multiple lines for projects and design work. The first image becomes the main card cover.</div>
          </div>

          <div class="form-group">
            <label for="item-image-files">Upload image files</label>
            <input type="file" id="item-image-files" accept="image/*" multiple>
            <div class="form-hint">Uploads are resized in your browser and appended to the image list automatically.</div>
          </div>

          <div class="form-group">
            <label>Image preview</label>
            <div class="image-preview-grid" id="item-image-preview"></div>
          </div>

          <div class="modal-actions">
            <button class="admin-button" type="submit">${item ? "Update item" : "Save item"}</button>
            <button class="admin-secondary" type="button" id="item-form-cancel">Cancel</button>
          </div>
        </form>
      `
    );

    const categorySelect = document.getElementById("item-category");
    if (categorySelect) {
      categorySelect.value = category;
    }

    this.bindImageField("item-images", "item-image-files", "item-image-preview");

    document.getElementById("archive-item-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      await this.saveItem(type);
    });

    document.getElementById("item-form-cancel").addEventListener("click", () => this.showAdminPanel());
  }

  async saveItem(type) {
    const title = this.cleanText(document.getElementById("item-title").value);
    const description = this.cleanText(document.getElementById("item-description").value);
    const year = parseInt(document.getElementById("item-year").value, 10) || new Date().getFullYear();
    const category = document.getElementById("item-category").value;
    const images = this.parseImageList(document.getElementById("item-images").value);
    const technologies = type === "project" ? this.cleanText(document.getElementById("item-technologies").value) : "";
    const issuedBy = type === "certificate" ? this.cleanText(document.getElementById("item-issued-by").value) : "";
    const githubLink = type === "project" ? this.cleanText(document.getElementById("item-github").value) : "";
    const liveLink = type === "project" ? this.cleanText(document.getElementById("item-live").value) : "";

    if (!title || !images.length) {
      this.showToast("Title and at least one image are required", "error");
      return;
    }

    const nextItem = this.normalizeItem({
      id: this.editingItem ? this.editingItem.id : Date.now(),
      type,
      title,
      description,
      year,
      category,
      technologies,
      issuedBy,
      githubLink,
      liveLink,
      images,
      image: images[0],
    });

    if (this.editingItem) {
      this.items = this.items.map((item) => (String(item.id) === String(this.editingItem.id) ? nextItem : item));
      this.showToast("Item updated locally", "success");
    } else {
      this.items = [...this.items, nextItem];
      this.showToast("Item saved locally", "success");
    }

    this.persistLocal();
    await this.saveToGitHub();
    this.renderGallery();
    this.showAdminPanel();
  }

  editItem(id) {
    const item = this.items.find((entry) => String(entry.id) === String(id));
    if (!item) return;
    this.showItemForm(item.type, item);
  }

  async deleteItem(id) {
    const item = this.items.find((entry) => String(entry.id) === String(id));
    if (!item) return;

    const confirmed = window.confirm(`Delete "${item.title}"?`);
    if (!confirmed) return;

    this.items = this.items.filter((entry) => String(entry.id) !== String(id));
    this.persistLocal();
    await this.saveToGitHub();
    this.renderGallery();
    this.showToast("Item deleted", "success");
  }

  exportData() {
    const payload = JSON.stringify({ lastUpdated: new Date().toISOString(), items: this.items }, null, 2);
    this.downloadTextFile("certificates-data.json", payload, "application/json");
    this.showToast("Archive JSON downloaded", "success");
  }

  showImportDialog() {
    this.setModalContent(
      "Import Archive JSON",
      `
        <div class="modal-form">
          <div class="form-group">
            <label for="archive-import-file">Choose a JSON file</label>
            <input type="file" id="archive-import-file" accept=".json,application/json">
            <div class="form-hint">The file should contain an <code>items</code> array.</div>
          </div>
          <div class="modal-actions">
            <button class="admin-button" type="button" id="archive-import-confirm">Import</button>
            <button class="admin-secondary" type="button" id="archive-import-cancel">Cancel</button>
          </div>
        </div>
      `
    );

    document.getElementById("archive-import-confirm").addEventListener("click", async () => {
      const input = document.getElementById("archive-import-file");
      const file = input.files && input.files[0];
      if (!file) {
        this.showToast("Choose a JSON file first", "error");
        return;
      }

      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (!data || !Array.isArray(data.items)) {
          throw new Error("Invalid JSON structure");
        }

        this.items = this.normalizeItems(data.items);
        this.persistLocal();
        await this.saveToGitHub();
        this.renderGallery();
        this.showToast("Archive imported", "success");
        this.showAdminPanel();
      } catch (error) {
        this.showToast("Could not import that JSON file", "error");
      }
    });

    document.getElementById("archive-import-cancel").addEventListener("click", () => this.showAdminPanel());
  }

  bindImageField(textareaId, fileId, previewId) {
    const textarea = document.getElementById(textareaId);
    const fileInput = document.getElementById(fileId);
    const preview = document.getElementById(previewId);
    if (!textarea || !preview) return;

    const render = () => {
      const images = this.parseImageList(textarea.value);
      if (!images.length) {
        preview.innerHTML = `<div class="image-preview-empty">No images added yet.</div>`;
        return;
      }

      preview.innerHTML = images
        .map(
          (image, index) => `
            <img
              src="${this.escapeHtml(image)}"
              alt="Preview ${index + 1}"
              loading="lazy"
              onerror="this.src='assets/img/projects/portfolio.png'"
            >
          `
        )
        .join("");
    };

    textarea.addEventListener("input", render);

    if (fileInput) {
      fileInput.addEventListener("change", async () => {
        const files = Array.from(fileInput.files || []);
        if (!files.length) return;

        const prepared = [];
        for (const file of files) {
          const imageData = await this.prepareImageData(file);
          if (imageData) prepared.push(imageData);
        }

        const current = this.parseImageList(textarea.value);
        textarea.value = [...current, ...prepared].join("\n");
        fileInput.value = "";
        render();
        this.showToast("Image list updated", "success");
      });
    }

    render();
  }

  parseImageList(value) {
    return this.uniqueStrings(String(value || "").split(/\n+/)).map((entry) => this.sanitizeUrl(entry, true)).filter(Boolean);
  }

  async prepareImageData(file) {
    if (!(file instanceof File)) return "";

    const rawData = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
      reader.onerror = () => reject(reader.error || new Error("Could not read file"));
      reader.readAsDataURL(file);
    });

    const mimeType = (file.type || "").toLowerCase();
    if (!mimeType.startsWith("image/") || mimeType === "image/svg+xml" || typeof createImageBitmap !== "function") {
      return rawData;
    }

    try {
      const bitmap = await createImageBitmap(file);
      const maxDimension = 1600;
      const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));

      const context = canvas.getContext("2d");
      if (!context) return rawData;

      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const outputType = mimeType === "image/png" ? "image/png" : "image/webp";
      return canvas.toDataURL(outputType, outputType === "image/webp" ? 0.84 : undefined);
    } catch (error) {
      return rawData;
    }
  }

  async getFileSha() {
    if (!this.githubToken) return;

    try {
      const response = await fetch(this.apiDataUrl, {
        headers: {
          Authorization: `token ${this.githubToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      });

      if (!response.ok) return;
      const data = await response.json();
      this.githubSha = data.sha || null;
    } catch (error) {
      // Keep local-only editing available even if GitHub is unavailable.
    }
  }

  async saveToGitHub() {
    if (!this.githubToken) return false;
    if (!this.githubSha) {
      await this.getFileSha();
    }

    const payload = {
      message: `Update archive data - ${new Date().toLocaleDateString()}`,
      content: btoa(unescape(encodeURIComponent(JSON.stringify({
        lastUpdated: new Date().toISOString(),
        items: this.items,
      }, null, 2)))),
      branch: ARCHIVE_GITHUB_BRANCH,
    };

    if (this.githubSha) {
      payload.sha = this.githubSha;
    }

    try {
      this.showToast("Syncing GitHub data...", "info");
      const response = await fetch(this.apiDataUrl, {
        method: "PUT",
        headers: {
          Authorization: `token ${this.githubToken}`,
          "Content-Type": "application/json",
          Accept: "application/vnd.github.v3+json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || "GitHub update failed");
      }

      const result = await response.json();
      this.githubSha = result && result.content ? result.content.sha : this.githubSha;
      this.persistLocal();
      this.showToast("GitHub updated successfully", "success");
      return true;
    } catch (error) {
      this.showToast(`Saved locally only: ${error.message}`, "error");
      return false;
    }
  }

  updateAdminButton() {
    if (!this.adminBtn) return;
    this.adminBtn.innerHTML = this.isAdmin ? '<i class="ri-settings-3-line"></i>' : '<i class="ri-admin-line"></i>';
  }

  setModalContent(title, bodyHtml) {
    if (this.modalTitle) this.modalTitle.textContent = title;
    if (this.modalBody) this.modalBody.innerHTML = bodyHtml;
    if (this.modal) {
      this.modal.classList.add("is-open");
      this.modal.setAttribute("aria-hidden", "false");
    }
  }

  hideModal() {
    if (!this.modal) return;
    this.modal.classList.remove("is-open");
    this.modal.setAttribute("aria-hidden", "true");
    this.editingItem = null;
  }

  showToast(message, type = "success") {
    if (!this.toast) return;
    this.toast.textContent = message;
    this.toast.className = `toast ${type} show`;
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => {
      this.toast.classList.remove("show");
    }, 3000);
  }

  downloadTextFile(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  setupScrollReveal() {
    if (typeof ScrollReveal === "undefined") return;
    const sr = ScrollReveal({
      origin: "bottom",
      distance: "40px",
      duration: 900,
      delay: 120,
      reset: false,
    });
    sr.reveal(".gallery-item", { interval: 80 });
  }

  escapeHtml(value) {
    const node = document.createElement("div");
    node.textContent = value == null ? "" : String(value);
    return node.innerHTML;
  }

  sanitizeUrl(url, allowImage = false) {
    const value = this.cleanText(url);
    if (!value) return "";

    if (allowImage && value.startsWith("data:image/")) {
      return value;
    }

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
      const allowedProtocols = allowImage ? ["http:", "https:"] : ["http:", "https:", "mailto:", "tel:"];
      return allowedProtocols.includes(parsed.protocol) ? parsed.href : "";
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

  window.archiveManager = new ArchiveManager();
  await window.archiveManager.init();
});
