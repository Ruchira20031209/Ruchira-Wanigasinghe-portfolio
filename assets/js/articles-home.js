document.addEventListener("DOMContentLoaded", async () => {
  const wrapper = document.getElementById("articles-preview-wrapper");
  if (!wrapper || !window.ArticlesApp) return;

  const items = await loadArticlesForHome();
  const latestArticles = ArticlesApp.sortArticles(items).slice(0, 4);

  if (!latestArticles.length) {
    wrapper.innerHTML = `
      <div class="swiper-slide">
        <div class="article-empty">
          <h2>No articles yet</h2>
          <p>Your latest writing will appear here as soon as you publish it.</p>
        </div>
      </div>
    `;
    ArticlesApp.revealElements("#articles [data-reveal]");
    return;
  }

  wrapper.innerHTML = latestArticles
    .map((article) => {
      return `
        <div class="swiper-slide">
          ${ArticlesApp.cardMarkup(article)}
        </div>
      `;
    })
    .join("");

  if (typeof Swiper !== "undefined") {
    new Swiper(".articles__swiper", {
      loop: false,
      rewind: latestArticles.length > 1,
      slidesPerView: "auto",
      spaceBetween: 24,
      grabCursor: true,
      speed: 900,
      autoplay:
        latestArticles.length > 1
          ? {
              delay: 2800,
              disableOnInteraction: false,
            }
          : false,
      pagination: {
        el: ".articles .swiper-pagination",
        clickable: true,
      },
    });
  }

  ArticlesApp.revealElements("#articles [data-reveal]");
});

async function loadArticlesForHome() {
  if (window.location.protocol === "file:") {
    const localItems = readLocalArticleItems();
    if (localItems.length) return localItems;

    const embeddedItems = readEmbeddedArticleItems();
    if (embeddedItems.length) return embeddedItems;
  }

  const repository = new ArticlesApp.ArticlesRepository();
  const items = await repository.loadArticles();
  if (items.length) return items;

  const fallbackItems = readLocalArticleItems();
  if (fallbackItems.length) return fallbackItems;

  return readEmbeddedArticleItems();
}

function readLocalArticleItems() {
  try {
    const cached = localStorage.getItem("articles_cache");
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && Array.isArray(parsed.items)) {
        return parsed.items;
      }
    }
  } catch (error) {
    // Continue to local items.
  }

  try {
    const saved = localStorage.getItem("articles_local");
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function readEmbeddedArticleItems() {
  const payload = window.PORTFOLIO_ARTICLES_DATA;
  return payload && Array.isArray(payload.items) ? payload.items : [];
}
