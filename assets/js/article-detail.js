document.addEventListener("DOMContentLoaded", async () => {
  if (!window.ArticlesApp) return;

  const detailRoot = document.getElementById("article-detail-root");
  const moreRoot = document.getElementById("article-more-grid");
  const backButton = document.getElementById("article-back-btn");
  const adminLink = document.getElementById("article-edit-link");

  if (!detailRoot || !moreRoot) return;

  const repository = new ArticlesApp.ArticlesRepository();
  const items = await repository.loadArticles();
  const params = new URLSearchParams(window.location.search);
  const requestedSlug = params.get("slug");
  const article = items.find((item) => item.slug === requestedSlug) || null;

  ArticlesApp.setCurrentYear();
  ArticlesApp.setupCursor();

  if (!article) {
    detailRoot.innerHTML = `
      <div class="article-empty">
        <h2>Article not found</h2>
        <p>The article you opened could not be found. You can return to the article list and continue reading there.</p>
        <a class="button" href="articles.html">Go To Articles <i class="ri-arrow-right-line"></i></a>
      </div>
    `;
    moreRoot.innerHTML = "";
    ArticlesApp.revealElements();
    return;
  }

  updateArticleMeta(article);
  document.title = `${article.title} | Ruchira Wanigasinghe`;

  const paragraphs = ArticlesApp.splitParagraphs(article.description)
    .map((paragraph) => `<p>${ArticlesApp.escapeHtml(paragraph)}</p>`)
    .join("");

  const articleLinks = ArticlesApp.renderLinkPills(article.links);
  const isAdmin = localStorage.getItem(ArticlesApp.STORAGE_KEYS.admin) === "true";

  detailRoot.innerHTML = `
    <article class="article-detail" data-reveal>
      <div class="article-detail__cover">
        <img
          src="${ArticlesApp.escapeHtml(article.image)}"
          alt="${ArticlesApp.escapeHtml(article.title)}"
          class="article-detail__image"
          onerror="this.src='assets/img/home-perfil.png'"
        >
      </div>

      <div class="article-detail__hero">
        <span class="article-detail__eyebrow">
          <i class="ri-quill-pen-line"></i> Featured article
        </span>

        <div class="article-detail__meta">
          <span class="article-detail__meta-item">
            <i class="ri-calendar-event-line"></i> ${ArticlesApp.escapeHtml(ArticlesApp.formatDate(article.publishDate))}
          </span>
          <span class="article-detail__meta-item">
            <i class="ri-translate-2"></i> ${ArticlesApp.escapeHtml(article.language)}
          </span>
        </div>

        <div class="article-detail__summary">
          <h1 class="article-detail__title">${ArticlesApp.escapeHtml(article.title)}</h1>
          <p class="article-detail__intro">${ArticlesApp.escapeHtml(ArticlesApp.getExcerpt(article.description, 220))}</p>
        </div>
      </div>

      <div class="article-detail__content">
        ${paragraphs}
      </div>

      ${articleLinks ? `
        <div class="article-detail__links">
          ${articleLinks}
        </div>
      ` : ""}

      <div class="article-detail__actions">
        <button class="button" id="article-detail-back">
          Back <i class="ri-arrow-left-line"></i>
        </button>
        <a class="button" href="articles.html">
          More Articles <i class="ri-arrow-right-line"></i>
        </a>
      </div>
    </article>
  `;

  const related = ArticlesApp.sortArticles(items)
    .filter((item) => item.id !== article.id)
    .slice(0, 3);

  moreRoot.innerHTML = related.length
    ? related.map((item) => ArticlesApp.cardMarkup(item)).join("")
    : `
      <div class="article-empty">
        <h2>More articles coming soon</h2>
        <p>Add new writing from your admin panel and they will appear here automatically.</p>
      </div>
    `;

  document.getElementById("article-detail-back").addEventListener("click", () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = "articles.html";
    }
  });

  if (backButton) {
    backButton.addEventListener("click", () => {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = "articles.html";
      }
    });
  }

  if (adminLink) {
    adminLink.style.display = isAdmin ? "inline-flex" : "none";
    adminLink.href = `articles.html?edit=${encodeURIComponent(article.id)}`;
  }

  ArticlesApp.revealElements();
});

function updateArticleMeta(article) {
  const description = ArticlesApp.getExcerpt(article.description, 155);
  const image = article.image || "assets/img/projects/portfolio.png";
  const url = `${window.location.origin}${window.location.pathname}?slug=${encodeURIComponent(article.slug)}`;

  upsertMetaTag("name", "description", description);
  upsertMetaTag("property", "og:title", `${article.title} | Ruchira Wanigasinghe`);
  upsertMetaTag("property", "og:description", description);
  upsertMetaTag("property", "og:type", "article");
  upsertMetaTag("property", "og:url", url);
  upsertMetaTag("property", "og:image", image);
  upsertMetaTag("name", "twitter:card", "summary_large_image");
  upsertMetaTag("name", "twitter:title", `${article.title} | Ruchira Wanigasinghe`);
  upsertMetaTag("name", "twitter:description", description);
  upsertMetaTag("name", "twitter:image", image);

  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.setAttribute("rel", "canonical");
    document.head.appendChild(canonical);
  }
  canonical.setAttribute("href", url);
}

function upsertMetaTag(attribute, key, content) {
  let tag = document.head.querySelector(`meta[${attribute}="${key}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attribute, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}
