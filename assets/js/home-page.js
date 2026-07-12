document.addEventListener("DOMContentLoaded", async () => {
  const wrapper = document.getElementById("featured-projects-wrapper");
  if (!wrapper) return;

  const items = await loadProjectItems();
  const projects = selectLatestProjects(items);

  if (!projects.length) {
    wrapper.innerHTML = emptySlide();
  } else {
    wrapper.innerHTML = projects
      .map((project, index) => projectSlideMarkup(project, index))
      .join("");
  }

  if (typeof window.initProjectsSwiper === "function") {
    window.initProjectsSwiper();
  }
});

async function loadProjectItems() {
  if (window.location.protocol === "file:") {
    const cachedItems = readProjectItemsFromLocalStorage();
    if (cachedItems.length) return cachedItems;

    const embeddedItems = readProjectItemsFromEmbeddedSeed();
    if (embeddedItems.length) return embeddedItems;
  }

  try {
    const response = await fetch(`data/certificates-data.json?t=${Date.now()}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const payload = await response.json();
    const items = Array.isArray(payload.items) ? payload.items : [];
    if (items.length) return items;
  } catch (error) {
    // Fallbacks below handle direct file:// browsing and offline use.
  }

  const cachedItems = readProjectItemsFromLocalStorage();
  if (cachedItems.length) return cachedItems;

  return readProjectItemsFromEmbeddedSeed();
}

function selectLatestProjects(items) {
  return (Array.isArray(items) ? items : [])
    .filter((item) => item.type === "project")
    .sort((left, right) => {
      const byYear = (right.year || 0) - (left.year || 0);
      if (byYear) return byYear;
      return Number(right.id || 0) - Number(left.id || 0);
    })
    .slice(0, 4);
}

function readProjectItemsFromLocalStorage() {
  try {
    const cached = localStorage.getItem("portfolio_cache");
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && Array.isArray(parsed.items)) {
        return parsed.items;
      }
    }
  } catch (error) {
    // Fall through to the local data copy.
  }

  try {
    const local = localStorage.getItem("portfolio_local");
    const parsed = local ? JSON.parse(local) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function readProjectItemsFromEmbeddedSeed() {
  const payload = window.PORTFOLIO_CERTIFICATES_DATA;
  return payload && Array.isArray(payload.items) ? payload.items : [];
}

function projectSlideMarkup(project, index) {
  const category = getProjectLabel(project);
  const subtitleParts = [project.year, project.technologies || project.category]
    .filter(Boolean)
    .map((value) => escapeHtml(String(value)));

  const actionUrl = getArchiveDetailUrl(project);
  const imageUrl = sanitizeImageUrl(getPrimaryImage(project)) || "assets/img/projects/portfolio.png";

  return `
    <article class="projects__card swiper-slide">
      <div class="blob"></div>

      <div class="projects__number">
        <h1>${String(index + 1).padStart(2, "0")}</h1>
        <h3>${escapeHtml(category)}</h3>
      </div>

      <div class="projects__data">
        <h1 class="projects__title">${escapeHtml(project.title)}</h1>
        <p class="projects__subtitle">${subtitleParts.join(" . ")}</p>
      </div>

      <div class="projects__image">
        <img
          src="${escapeHtml(imageUrl)}"
          alt="${escapeHtml(project.title)}"
          class="projects__img"
          loading="lazy"
          onerror="this.src='assets/img/projects/portfolio.png'"
        >
        <a href="${escapeHtml(actionUrl)}" class="projects__button" aria-label="View project details">
          <i class="ri-arrow-right-line"></i>
        </a>
      </div>
    </article>
  `;
}

function getProjectLabel(project) {
  const value = (project.category || project.type || "project").toString();
  const label = value
    .replace(/[-_]/g, " ")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

  return label || "Project";
}

function getExcerpt(text, limit) {
  const value = (text || "").replace(/\s+/g, " ").trim();
  if (value.length <= limit) return value;
  return `${value.slice(0, limit).trimEnd()}...`;
}

function getPrimaryImage(item) {
  const images = Array.isArray(item && item.images) ? item.images : [];
  const primary = images.find(Boolean);
  return primary || item.image || "";
}

function getArchiveDetailUrl(item) {
  const id = item && item.id != null ? String(item.id).trim() : "";
  return id ? `archive-item.html?id=${encodeURIComponent(id)}` : "certificates.html";
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
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.href : "";
  } catch (error) {
    return "";
  }
}

function sanitizeImageUrl(url) {
  const value = (url || "").trim();
  if (!value) return "";
  if (value.startsWith("data:image/")) return value;
  return sanitizeUrl(value);
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value == null ? "" : String(value);
  return div.innerHTML;
}

function emptySlide() {
  return `
    <article class="projects__card swiper-slide">
      <div class="blob"></div>

      <div class="projects__number">
        <h1>00</h1>
        <h3>Info</h3>
      </div>

      <div class="projects__data">
        <h1 class="projects__title">Projects will appear here</h1>
        <p class="projects__subtitle">Add items in the archive admin</p>
      </div>

      <div class="projects__image">
        <img src="assets/img/projects/portfolio.png" alt="Portfolio project placeholder" class="projects__img">
        <a href="certificates.html" class="projects__button">
          <i class="ri-arrow-right-line"></i>
        </a>
      </div>
    </article>
  `;
}
