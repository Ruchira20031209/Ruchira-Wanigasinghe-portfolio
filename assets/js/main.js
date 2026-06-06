let projectsSwiperInstance = null;

window.initProjectsSwiper = function initProjectsSwiper() {
  if (typeof Swiper === "undefined") return;

  const container = document.querySelector(".projects__swiper");
  if (!container) return;

  if (projectsSwiperInstance && typeof projectsSwiperInstance.destroy === "function") {
    projectsSwiperInstance.destroy(true, true);
  }

  projectsSwiperInstance = new Swiper(".projects__swiper", {
    loop: false,
    rewind: true,
    spaceBetween: 24,
    slidesPerView: "auto",
    grabCursor: true,
    speed: 600,
    autoplay: {
      delay: 3200,
      disableOnInteraction: false,
    },
    pagination: {
      el: ".projects .swiper-pagination",
      clickable: true,
    },
  });
};

function initSplitText() {
  const primary = document.querySelector(".home__profession-1");
  const secondary = document.querySelector(".home__profession-2");
  if (!primary || !secondary || !window.anime || !anime.text || !anime.animate) return;

  const { animate, text, stagger } = anime;
  const { chars: chars1 } = text.split(".home__profession-1", { chars: true });
  const { chars: chars2 } = text.split(".home__profession-2", { chars: true });

  animate(chars1, {
    y: [{ to: ["100%", "0%"] }, { to: "-100%", delay: 4000, ease: "in(3)" }],
    duration: 900,
    ease: "out(3)",
    delay: stagger(80),
    loop: true,
  });

  animate(chars2, {
    y: [{ to: ["100%", "0%"] }, { to: "-100%", delay: 4000, ease: "in(3)" }],
    duration: 900,
    ease: "out(3)",
    delay: stagger(80),
    loop: true,
  });
}

function initWorkTabs() {
  const tabs = document.querySelectorAll("[data-target]");
  const tabContents = document.querySelectorAll("[data-content]");
  if (!tabs.length || !tabContents.length) return;

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const targetSelector = tab.dataset.target;
      const targetContent = targetSelector ? document.querySelector(targetSelector) : null;
      if (!targetContent) return;

      tabContents.forEach((content) => content.classList.remove("work-active"));
      tabs.forEach((item) => item.classList.remove("work-active"));

      tab.classList.add("work-active");
      targetContent.classList.add("work-active");
    });
  });
}

function initCopyEmail() {
  const copyBtn = document.getElementById("contact-btn");
  const copyEmailNode = document.getElementById("contact-email");
  if (!copyBtn || !copyEmailNode || !navigator.clipboard) return;

  const copyEmail = copyEmailNode.textContent;
  copyBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(copyEmail).then(() => {
      copyBtn.innerHTML = 'Email copied <i class="ri-check-line"></i>';

      setTimeout(() => {
        copyBtn.innerHTML = 'Copy email <i class="ri-file-copy-line"></i>';
        const span = document.createElement("span");
        span.className = "contact__email";
        span.id = "contact-email";
        span.textContent = copyEmail;
        copyBtn.appendChild(span);
      }, 2000);
    });
  });
}

function setFooterYear() {
  const textYear = document.getElementById("footer-year");
  if (textYear) {
    textYear.textContent = new Date().getFullYear();
  }
}

function scrollActive() {
  const sections = document.querySelectorAll("section[id]");
  const scrollY = window.scrollY;

  sections.forEach((section) => {
    const id = section.getAttribute("id");
    const link = id
      ? document.querySelector(`.nav__menu a[href="#${id}"]`)
      : null;
    if (!link) return;

    const top = section.offsetTop - 80;
    const height = section.offsetHeight;
    const isActive = scrollY > top && scrollY <= top + height;
    link.classList.toggle("active-link", isActive);
  });
}

function initCursor() {
  const cursor = document.querySelector(".cursor");
  if (!cursor) return;

  if (window.matchMedia && window.matchMedia("(pointer: coarse)").matches) {
    cursor.style.display = "none";
    return;
  }

  let mouseX = 0;
  let mouseY = 0;

  const cursorMove = () => {
    cursor.style.left = `${mouseX}px`;
    cursor.style.top = `${mouseY}px`;
    cursor.style.transform = "translate(-50%, -50%)";
    requestAnimationFrame(cursorMove);
  };

  document.addEventListener("mousemove", (event) => {
    mouseX = event.clientX;
    mouseY = event.clientY;
  });

  document.querySelectorAll("a, button, img, input, textarea, select").forEach((item) => {
    item.addEventListener("mouseover", () => {
      cursor.classList.add("hide-cursor");
    });

    item.addEventListener("mouseleave", () => {
      cursor.classList.remove("hide-cursor");
    });
  });

  cursorMove();
}

function initScrollReveal() {
  if (typeof ScrollReveal === "undefined") return;

  const sr = ScrollReveal({
    origin: "top",
    distance: "60px",
    duration: 2000,
    delay: 300,
  });

  sr.reveal(
    ".home__image, .projects__container, .work__container, .testimonials__container, .contact__container, .articles__swiper"
  );
  sr.reveal(".home__data", { delay: 900, origin: "bottom" });
  sr.reveal(".home__info", { delay: 1200, origin: "bottom" });
  sr.reveal(".home__social, .home__cv", { delay: 1500 });
  sr.reveal(".about__data", { origin: "left" });
  sr.reveal(".about__image", { origin: "right" });
  sr.reveal(".articles__summary", { origin: "left" });
  sr.reveal(".articles__controls", { origin: "right", delay: 450 });
}

document.addEventListener("DOMContentLoaded", () => {
  initSplitText();
  window.initProjectsSwiper();
  initWorkTabs();
  initCopyEmail();
  setFooterYear();
  scrollActive();
  initCursor();
  initScrollReveal();
});

window.addEventListener("scroll", scrollActive);
