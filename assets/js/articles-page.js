class ArticlesPage {
  constructor() {
    this.repository = new ArticlesApp.ArticlesRepository();
    this.items = [];
    this.isAdmin = localStorage.getItem(ArticlesApp.STORAGE_KEYS.admin) === "true";
    this.editingArticle = null;
    this.toastTimer = null;
    this.password =
      typeof ADMIN_PASSWORD === "string" && ADMIN_PASSWORD.trim()
        ? ADMIN_PASSWORD.trim()
        : "";

    this.grid = document.getElementById("articles-grid");
    this.count = document.getElementById("articles-count");
    this.adminButton = document.getElementById("articles-admin-btn");
    this.modal = document.getElementById("articles-modal");
    this.modalTitle = document.getElementById("articles-modal-title");
    this.modalBody = document.getElementById("articles-modal-body");
    this.modalClose = document.getElementById("articles-modal-close");
    this.toast = document.getElementById("articles-toast");
  }

  async init() {
    this.items = await this.repository.loadArticles();
    this.renderArticles();
    this.updateAdminButton();
    this.bindEvents();
    this.handleDeepLinkEdit();
    ArticlesApp.setCurrentYear();
    ArticlesApp.setupCursor();
    ArticlesApp.revealElements();
  }

  bindEvents() {
    if (this.adminButton) {
      this.adminButton.addEventListener("click", () => {
        if (this.isAdmin) {
          this.showAdminPanel();
        } else {
          this.showLogin();
        }
      });
    }

    if (this.modalClose) {
      this.modalClose.addEventListener("click", () => this.hideModal());
    }

    if (this.modal) {
      this.modal.addEventListener("click", (event) => {
        if (event.target === this.modal) {
          this.hideModal();
        }
      });
    }

    if (this.grid) {
      this.grid.addEventListener("click", (event) => {
        const actionButton = event.target.closest("[data-action]");
        if (!actionButton) return;

        const articleId = Number(actionButton.dataset.id);
        if (!articleId) return;

        if (actionButton.dataset.action === "edit") {
          this.editArticle(articleId);
        }

        if (actionButton.dataset.action === "delete") {
          this.deleteArticle(articleId);
        }
      });
    }
  }

  handleDeepLinkEdit() {
    const params = new URLSearchParams(window.location.search);
    const editId = Number(params.get("edit"));
    if (this.isAdmin && editId) {
      this.editArticle(editId);
    }
  }

  renderArticles() {
    const sorted = ArticlesApp.sortArticles(this.items);
    this.items = sorted;

    if (this.count) {
      this.count.textContent = `${sorted.length} article${sorted.length === 1 ? "" : "s"} available`;
    }

    if (!this.grid) return;

    if (!sorted.length) {
      this.grid.innerHTML = `
        <div class="article-empty">
          <h2>No articles yet</h2>
          <p>Add your first article from the admin panel and it will appear here instantly.</p>
        </div>
      `;
      return;
    }

    this.grid.innerHTML = sorted
      .map((article) => {
        const actions = this.isAdmin
          ? `
            <div class="article-card__actions">
              <button class="article-card__action-btn" data-action="edit" data-id="${article.id}">
                <i class="ri-edit-line"></i> Edit
              </button>
              <button class="article-card__action-btn" data-action="delete" data-id="${article.id}">
                <i class="ri-delete-bin-line"></i> Delete
              </button>
            </div>
          `
          : "";

        return ArticlesApp.cardMarkup(article, { showActions: actions });
      })
      .join("");

    ArticlesApp.revealElements("#articles-grid [data-reveal]");
  }

  updateAdminButton() {
    if (!this.adminButton) return;
    this.adminButton.innerHTML = this.isAdmin
      ? '<i class="ri-settings-3-line"></i>'
      : '<i class="ri-admin-line"></i>';
  }

  showToast(message, tone) {
    if (!this.toast) return;

    this.toast.textContent = message;
    this.toast.dataset.tone = tone || "success";
    this.toast.classList.add("is-visible");

    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toast.classList.remove("is-visible");
    }, 3200);
  }

  showModal() {
    if (this.modal) {
      this.modal.classList.add("is-open");
    }
  }

  hideModal() {
    if (this.modal) {
      this.modal.classList.remove("is-open");
    }
    this.editingArticle = null;
  }

  showLogin() {
    this.modalTitle.textContent = "Admin Login";
    this.modalBody.innerHTML = `
      <div class="article-admin__login">
        <div class="article-admin__message">
          Sign in with the same admin password you use on the projects and certificates page.
        </div>
        <div class="article-admin__field">
          <label for="article-admin-password">Password</label>
          <input type="password" id="article-admin-password" placeholder="Enter admin password">
        </div>
        <div class="article-admin__actions">
          <button class="article-admin__primary" id="article-login-submit">
            <i class="ri-lock-unlock-line"></i> Login
          </button>
          <button class="article-admin__secondary" id="article-login-cancel">Cancel</button>
        </div>
      </div>
    `;

    this.modalBody.querySelector("#article-login-submit").addEventListener("click", () => {
      const value = this.modalBody.querySelector("#article-admin-password").value.trim();
      if (value === this.password) {
        this.isAdmin = true;
        localStorage.setItem(ArticlesApp.STORAGE_KEYS.admin, "true");
        this.updateAdminButton();
        this.showToast("Login successful", "success");
        this.showAdminPanel();
      } else {
        this.showToast("Incorrect password", "error");
      }
    });

    this.modalBody.querySelector("#article-login-cancel").addEventListener("click", () => {
      this.hideModal();
    });

    this.showModal();
  }

  showAdminPanel() {
    const tokenSet = !!localStorage.getItem(ArticlesApp.STORAGE_KEYS.token);
    const englishCount = this.items.filter((article) => article.language === "English").length;
    const sinhalaCount = this.items.filter((article) => article.language === "Sinhala").length;

    this.modalTitle.textContent = "Articles Admin";
    this.modalBody.innerHTML = `
      <div class="article-admin__panel">
        <div class="article-admin__stats">
          <div class="article-admin__stat">
            <strong>${this.items.length}</strong>
            <span>Total Articles</span>
          </div>
          <div class="article-admin__stat">
            <strong>${englishCount}</strong>
            <span>English</span>
          </div>
          <div class="article-admin__stat">
            <strong>${sinhalaCount}</strong>
            <span>Sinhala</span>
          </div>
        </div>

        <div class="article-admin__message">
          GitHub auto-update is <strong>${tokenSet ? "enabled" : "disabled"}</strong>.
          New articles always save in your browser first. ${
            tokenSet
              ? "Future changes can sync directly to your repository."
              : "Without a token, the fastest fallback is to download the JSON file and replace data/articles-data.json in your GitHub repo."
          }
        </div>

        <div class="article-admin__actions">
          <button class="article-admin__primary" id="article-add-btn">
            <i class="ri-quill-pen-line"></i> Add New Article
          </button>
          <button class="article-admin__secondary" id="article-sync-btn">
            <i class="ri-github-fill"></i> ${tokenSet ? "Sync to GitHub" : "Enable Auto-Update"}
          </button>
          <button class="article-admin__secondary" id="article-refresh-btn">
            <i class="ri-refresh-line"></i> Refresh Data
          </button>
        </div>

        <div class="article-admin__actions">
          <button class="article-admin__secondary" id="article-download-btn">
            <i class="ri-download-2-line"></i> Download JSON
          </button>
          <button class="article-admin__secondary" id="article-import-btn">
            <i class="ri-upload-cloud-line"></i> Import JSON
          </button>
          ${tokenSet ? `
            <button class="article-admin__danger" id="article-remove-token-btn">
              <i class="ri-delete-bin-line"></i> Remove GitHub Token
            </button>
          ` : ""}
          <button class="article-admin__secondary" id="article-logout-btn">
            <i class="ri-logout-box-line"></i> Logout
          </button>
        </div>
        <input type="file" id="article-import-file" accept="application/json,.json" hidden>
      </div>
    `;

    this.modalBody.querySelector("#article-add-btn").addEventListener("click", () => {
      this.showArticleForm();
    });

    this.modalBody.querySelector("#article-sync-btn").addEventListener("click", () => {
      if (tokenSet) {
        this.syncToGitHub();
      } else {
        this.showTokenSetup();
      }
    });

    this.modalBody.querySelector("#article-refresh-btn").addEventListener("click", async () => {
      this.items = await this.repository.loadArticles();
      this.renderArticles();
      this.showToast("Articles refreshed", "success");
      this.showAdminPanel();
    });

    this.modalBody.querySelector("#article-download-btn").addEventListener("click", () => {
      this.downloadArticlesData();
    });

    const importButton = this.modalBody.querySelector("#article-import-btn");
    const importInput = this.modalBody.querySelector("#article-import-file");

    if (importButton && importInput) {
      importButton.addEventListener("click", () => importInput.click());
      importInput.addEventListener("change", async (event) => {
        const file = event.target.files && event.target.files[0];
        if (!file) return;
        await this.importArticlesData(file);
        event.target.value = "";
      });
    }

    const removeTokenButton = this.modalBody.querySelector("#article-remove-token-btn");
    if (removeTokenButton) {
      removeTokenButton.addEventListener("click", () => {
        localStorage.removeItem(ArticlesApp.STORAGE_KEYS.token);
        this.repository.githubToken = "";
        this.repository.githubSha = null;
        this.showToast("GitHub token removed", "success");
        this.showAdminPanel();
      });
    }

    this.modalBody.querySelector("#article-logout-btn").addEventListener("click", () => {
      this.isAdmin = false;
      localStorage.removeItem(ArticlesApp.STORAGE_KEYS.admin);
      this.updateAdminButton();
      this.hideModal();
      this.renderArticles();
      this.showToast("Logged out", "success");
    });

    this.showModal();
  }

  showTokenSetup() {
    this.modalTitle.textContent = "Enable GitHub Auto-Update";
    this.modalBody.innerHTML = `
      <div class="article-admin__panel">
        <div class="article-admin__message">
          Create a GitHub Personal Access Token with <code>repo</code> permission, then paste it here.
          The token stays in this browser only and will let your article JSON sync directly to your GitHub repository.
        </div>

        <div class="article-admin__field">
          <label for="article-github-token">GitHub Token</label>
          <input type="password" id="article-github-token" placeholder="ghp_xxxxxxxxxxxxxxxxxxxx">
        </div>

        <div class="article-admin__actions">
          <button class="article-admin__primary" id="article-save-token-btn">
            <i class="ri-save-line"></i> Save Token
          </button>
          <button class="article-admin__secondary" id="article-token-back-btn">Back</button>
        </div>
      </div>
    `;

    this.modalBody.querySelector("#article-save-token-btn").addEventListener("click", async () => {
      const token = this.modalBody.querySelector("#article-github-token").value.trim();
      if (!token) {
        this.showToast("Please enter a GitHub token", "error");
        return;
      }

      localStorage.setItem(ArticlesApp.STORAGE_KEYS.token, token);
      this.repository.githubToken = token;
      this.repository.githubSha = null;
      this.showToast("Token saved", "success");
      await this.syncToGitHub(true);
    });

    this.modalBody.querySelector("#article-token-back-btn").addEventListener("click", () => {
      this.showAdminPanel();
    });

    this.showModal();
  }

  showArticleForm(article) {
    this.editingArticle = article || null;
    const current = article || {
      title: "",
      description: "",
      image: "",
      publishDate: new Date().toISOString().slice(0, 10),
      language: "English",
      links: [],
    };
    const isEdit = !!article;

    this.modalTitle.textContent = isEdit ? "Edit Article" : "Add Article";
    this.modalBody.innerHTML = `
      <form class="article-admin__form" id="article-form">
        <div class="article-admin__field">
          <label for="article-title">Article Title</label>
          <input type="text" id="article-title" required value="${ArticlesApp.escapeHtml(current.title)}">
        </div>

        <div class="article-admin__field">
          <label for="article-date">Publish Date</label>
          <input type="date" id="article-date" value="${ArticlesApp.escapeHtml(current.publishDate)}">
        </div>

        <div class="article-admin__field">
          <label for="article-language">Language</label>
          <select id="article-language">
            <option value="English">English</option>
            <option value="Sinhala">Sinhala</option>
            <option value="Bilingual">Bilingual</option>
          </select>
        </div>

        <div class="article-admin__field">
          <label for="article-image">Image Path, URL, or Saved Image Data</label>
          <input type="text" id="article-image" required value="${ArticlesApp.escapeHtml(current.image)}" placeholder="assets/img/projects/portfolio.png or https://...">
          <p class="article-admin__hint">Paste a portfolio image path, a public URL, or use the upload field below.</p>
        </div>

        <div class="article-admin__field">
          <label for="article-image-file">Upload Image From Device</label>
          <input type="file" id="article-image-file" accept="image/*">
          <p class="article-admin__hint">The image is resized in your browser for faster loading, then saved with the article data.</p>
        </div>

        <div class="article-admin__field">
          <label>Image Preview</label>
          <div class="article-admin__image-preview" id="article-image-preview"></div>
        </div>

        <div class="article-admin__field">
          <label for="article-description">Full Article Content</label>
          <textarea id="article-description" required placeholder="Write your full article here. Sinhala and English both work.">${ArticlesApp.escapeHtml(current.description)}</textarea>
          <p class="article-admin__hint">Use blank lines between paragraphs. Cards automatically show a short excerpt.</p>
        </div>

        <div class="article-admin__field">
          <label for="article-links">Links</label>
          <textarea id="article-links" placeholder="Portfolio Live | https://ruchirawanigasinghe.online/\nGitHub Profile | https://github.com/Ruchira20031209">${ArticlesApp.escapeHtml(this.serializeLinks(current.links))}</textarea>
          <p class="article-admin__hint">Add one link per line using this format: <code>Label | URL</code>.</p>
        </div>

        <div class="article-admin__actions">
          <button class="article-admin__primary" type="submit">
            <i class="ri-save-line"></i> ${isEdit ? "Update Article" : "Add Article"}
          </button>
          <button class="article-admin__secondary" type="button" id="article-form-cancel">Cancel</button>
        </div>
      </form>
    `;

    this.modalBody.querySelector("#article-language").value = current.language || "English";
    this.bindImageTools(current.image);

    this.modalBody.querySelector("#article-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      await this.saveArticle();
    });

    this.modalBody.querySelector("#article-form-cancel").addEventListener("click", () => {
      this.showAdminPanel();
    });

    this.showModal();
  }

  serializeLinks(links) {
    return (links || [])
      .map((link) => `${link.label} | ${link.url}`)
      .join("\n");
  }

  parseLinksInput(value) {
    return value
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const separatorIndex = line.indexOf("|");
        if (separatorIndex === -1) {
          return {
            label: "Article Link",
            url: line.trim(),
          };
        }

        return {
          label: line.slice(0, separatorIndex).trim(),
          url: line.slice(separatorIndex + 1).trim(),
        };
      })
      .map((link) => ({
        label: link.label,
        url: ArticlesApp.sanitizeUrl(link.url),
      }))
      .filter((link) => link.label && link.url);
  }

  bindImageTools(initialImage) {
    const imageInput = this.modalBody.querySelector("#article-image");
    const fileInput = this.modalBody.querySelector("#article-image-file");
    const preview = this.modalBody.querySelector("#article-image-preview");

    if (!imageInput || !preview) return;

    const renderPreview = (value) => {
      const source = (value || "").trim();
      preview.innerHTML = source
        ? `<img src="${ArticlesApp.escapeHtml(source)}" alt="Article preview image">`
        : "<span>No image selected yet.</span>";
    };

    imageInput.addEventListener("input", () => renderPreview(imageInput.value));

    if (fileInput) {
      fileInput.addEventListener("change", async () => {
        const file = fileInput.files && fileInput.files[0];
        if (!file) return;

        try {
          const imageData = await ArticlesApp.prepareImageFile(file);
          if (!imageData) {
            this.showToast("Could not prepare that image", "error");
            return;
          }

          imageInput.value = imageData;
          renderPreview(imageData);
          this.showToast("Image ready to save", "success");
        } catch (error) {
          this.showToast("Image upload failed", "error");
        }
      });
    }

    renderPreview(initialImage);
  }

  downloadArticlesData() {
    const content = ArticlesApp.serializeArticles(this.items);
    ArticlesApp.downloadTextFile("articles-data.json", content, "application/json");
    this.showToast("articles-data.json downloaded", "success");
  }

  async importArticlesData(file) {
    try {
      const rawText = await file.text();
      const parsed = JSON.parse(rawText);
      const items = Array.isArray(parsed) ? parsed : parsed && Array.isArray(parsed.items) ? parsed.items : null;

      if (!items) {
        this.showToast("Invalid JSON structure", "error");
        return;
      }

      const result = await this.repository.saveArticles(items);
      this.items = result.items;
      this.renderArticles();

      if (result.ok) {
        this.showToast("Articles imported and synced", "success");
      } else if (result.reason === "missing-token") {
        this.showToast("Articles imported locally", "success");
      } else {
        this.showToast(`Imported locally, but GitHub sync failed: ${result.message}`, "error");
      }

      this.showAdminPanel();
    } catch (error) {
      this.showToast("Could not read that JSON file", "error");
    }
  }

  async saveArticle() {
    const title = this.modalBody.querySelector("#article-title").value.trim();
    const publishDate = this.modalBody.querySelector("#article-date").value.trim();
    const language = this.modalBody.querySelector("#article-language").value;
    const image = this.modalBody.querySelector("#article-image").value.trim();
    const description = this.modalBody.querySelector("#article-description").value.trim();
    const links = this.parseLinksInput(
      this.modalBody.querySelector("#article-links").value
    );

    if (!title || !image || !description) {
      this.showToast("Please fill in the required fields", "error");
      return;
    }

    const article = ArticlesApp.normalizeArticle(
      {
        id: this.editingArticle ? this.editingArticle.id : Date.now(),
        slug: this.editingArticle ? this.editingArticle.slug : ArticlesApp.slugify(title),
        title,
        publishDate,
        language,
        image,
        description,
        links,
        updatedAt: new Date().toISOString(),
      },
      this.items.length
    );

    if (this.editingArticle) {
      this.items = this.items.map((item) => (item.id === this.editingArticle.id ? article : item));
      this.showToast("Article updated", "success");
    } else {
      this.items = [...this.items, article];
      this.showToast("Article added", "success");
    }

    const result = await this.repository.saveArticles(this.items);
    this.items = result.items;
    this.renderArticles();

    if (result.ok) {
      this.showToast("Article synced to GitHub", "success");
    } else if (result.reason === "missing-token") {
      this.showToast("Saved locally. Enable auto-update to sync GitHub.", "info");
    } else if (result.reason === "error") {
      this.showToast(`Saved locally, but GitHub sync failed: ${result.message}`, "error");
    }

    this.showAdminPanel();
  }

  async syncToGitHub(showPanelAfterSync) {
    const result = await this.repository.saveArticles(this.items);
    if (result.ok) {
      this.items = result.items;
      this.renderArticles();
      this.showToast("GitHub updated successfully", "success");
      if (showPanelAfterSync !== false) {
        this.showAdminPanel();
      }
      return;
    }

    if (result.reason === "missing-token") {
      this.showTokenSetup();
      return;
    }

    this.showToast(`GitHub sync failed: ${result.message}`, "error");
  }

  editArticle(id) {
    const article = this.items.find((item) => item.id === id);
    if (!article) return;
    this.showArticleForm(article);
  }

  async deleteArticle(id) {
    const article = this.items.find((item) => item.id === id);
    if (!article) return;

    const confirmed = window.confirm(`Delete "${article.title}"?`);
    if (!confirmed) return;

    this.items = this.items.filter((item) => item.id !== id);
    const result = await this.repository.saveArticles(this.items);
    this.items = result.items;
    this.renderArticles();

    if (result.ok) {
      this.showToast("Article deleted and synced", "success");
    } else if (result.reason === "missing-token") {
      this.showToast("Article deleted locally. Sync GitHub when ready.", "info");
    } else {
      this.showToast(`Deleted locally, but GitHub sync failed: ${result.message}`, "error");
    }
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  if (!window.ArticlesApp) return;
  window.articlesPage = new ArticlesPage();
  await window.articlesPage.init();
});
