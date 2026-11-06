const menuButton = document.querySelector(".menu-toggle");
const nav = document.querySelector(".nav");

if (menuButton && nav) {
  menuButton.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("open");
    menuButton.setAttribute("aria-expanded", String(isOpen));
    menuButton.setAttribute("aria-label", isOpen ? "Fechar menu" : "Abrir menu");
  });
  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      nav.classList.remove("open");
      menuButton.setAttribute("aria-expanded", "false");
    });
  });
}

const year = document.querySelector("#year");
if (year) year.textContent = new Date().getFullYear();

// Catálogo: filtro + paginação (16 produtos por página).
const categoryButtons = document.querySelectorAll("[data-category].filter-pill");
const categoryCards = document.querySelectorAll(".category-filter-card");
const storeSelect = document.querySelector("#store-filter");
const products = Array.from(document.querySelectorAll(".catalog-product"));
const emptyState = document.querySelector("#catalog-empty");
const catalogStatus = document.querySelector("#catalog-status");
const pagination = document.querySelector("#catalog-pagination");
const resetFilters = document.querySelector("#reset-filters");
const pageSize = 16;
let selectedCategory = "all";
let currentPage = 1;

function getFilteredProducts() {
  const selectedStore = storeSelect ? storeSelect.value : "all";
  return products.filter((product) => {
    const categories = (product.dataset.categories || "").split(/\s+/).filter(Boolean);
    const categoryMatch = selectedCategory === "all" || categories.includes(selectedCategory);
    const storeMatch = selectedStore === "all" || product.dataset.store === selectedStore;
    return categoryMatch && storeMatch;
  });
}

function renderPagination(totalPages) {
  if (!pagination) return;
  pagination.innerHTML = "";
  if (totalPages <= 1) {
    pagination.hidden = true;
    return;
  }
  pagination.hidden = false;

  const addButton = (label, page, options = {}) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "pagination-button" + (options.active ? " active" : "");
    button.textContent = label;
    button.disabled = Boolean(options.disabled);
    if (options.active) button.setAttribute("aria-current", "page");
    button.setAttribute("aria-label", options.ariaLabel || label);
    button.addEventListener("click", () => {
      currentPage = page;
      renderCatalog();
      document.querySelector("#ofertas")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    pagination.appendChild(button);
  };

  addButton("‹", Math.max(1, currentPage - 1), {disabled:currentPage === 1, ariaLabel:"Página anterior"});
  for (let page = 1; page <= totalPages; page++) {
    addButton(String(page), page, {active:page === currentPage, ariaLabel:"Página " + page});
  }
  addButton("›", Math.min(totalPages, currentPage + 1), {disabled:currentPage === totalPages, ariaLabel:"Próxima página"});
  const info = document.createElement("span");
  info.className = "pagination-info";
  info.textContent = "Página " + currentPage + " de " + totalPages;
  pagination.appendChild(info);
}

function renderCatalog() {
  const filtered = getFilteredProducts();
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  if (currentPage > totalPages) currentPage = totalPages;
  const start = (currentPage - 1) * pageSize;
  const pageProducts = new Set(filtered.slice(start, start + pageSize));

  products.forEach((product) => {
    product.hidden = !pageProducts.has(product);
  });

  if (emptyState) emptyState.hidden = filtered.length > 0;
  if (catalogStatus) {
    catalogStatus.textContent = filtered.length === 1
      ? "1 produto encontrado"
      : filtered.length + " produtos encontrados";
  }
  renderPagination(totalPages);
}

function setCategory(category) {
  selectedCategory = category;
  currentPage = 1;
  categoryButtons.forEach((button) => {
    const active = button.dataset.category === category;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  renderCatalog();
  document.querySelector("#ofertas")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

categoryButtons.forEach((button) => button.addEventListener("click", () => setCategory(button.dataset.category)));
categoryCards.forEach((button) => button.addEventListener("click", () => setCategory(button.dataset.category)));
if (storeSelect) storeSelect.addEventListener("change", () => { currentPage = 1; renderCatalog(); });
if (resetFilters) resetFilters.addEventListener("click", () => {
  selectedCategory = "all";
  currentPage = 1;
  if (storeSelect) storeSelect.value = "all";
  categoryButtons.forEach((button) => {
    const active = button.dataset.category === "all";
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  renderCatalog();
});
renderCatalog();

// Importação do catálogo piloto da Shopee (250 produtos selecionados).
// O JSON fica separado do código para facilitar atualização e manutenção.
async function loadShopeeCatalog() {
  const grid = document.querySelector(".catalog-grid");
  if (!grid) return;
  try {
    const response = await fetch("catalogo-shopee-teste-250.json", {cache:"no-cache"});
    if (!response.ok) throw new Error("Catálogo Shopee não encontrado");
    const catalog = await response.json();
    const money = (value) => new Intl.NumberFormat("pt-BR", {
      style:"currency", currency:"BRL"
    }).format(Number(value) || 0);

    catalog.forEach((item) => {
      if (!item || !item.title || !item.affiliateUrl || !item.image) return;
      let affiliateUrl, imageUrl;
      try {
        affiliateUrl = new URL(item.affiliateUrl);
        imageUrl = new URL(item.image);
      } catch (_) { return; }
      if (affiliateUrl.protocol !== "https:" || imageUrl.protocol !== "https:") return;

      const card = document.createElement("article");
      card.className = "offer-card catalog-product";
      card.dataset.categories = item.category || "utilidades";
      const store = item.store || "shopee";
      const storeLabel = store === "mercado-livre" ? "Mercado Livre" : "Shopee";
      card.dataset.store = store;

      const imageArea = document.createElement("div");
      imageArea.className = "product-image-area";
      imageArea.setAttribute("aria-label", "Imagem de " + item.title);

      const img = document.createElement("img");
      img.className = "real-product-image";
      img.src = imageUrl.href;
      img.alt = item.title;
      img.loading = "lazy";
      img.decoding = "async";
      imageArea.appendChild(img);

      if (Number(item.discount) > 0) {
        const badge = document.createElement("span");
        badge.className = "offer-discount";
        badge.textContent = Math.round(Number(item.discount)) + "% OFF";
        imageArea.appendChild(badge);
      }

      const info = document.createElement("div");
      info.className = "offer-info";

      const title = document.createElement("h3");
      title.textContent = item.title;
      info.appendChild(title);

      if (Number.isFinite(Number(item.rating)) && Number(item.rating) > 0) {
        const rating = document.createElement("div");
        rating.className = "offer-rating";
        rating.textContent = "★ " + Number(item.rating).toLocaleString("pt-BR", {
          minimumFractionDigits:1, maximumFractionDigits:2
        }) + "/5";
        info.appendChild(rating);
      }

      const prices = document.createElement("div");
      prices.className = "offer-price";
      if (Number(item.originalPrice) > Number(item.price)) {
        const oldPrice = document.createElement("del");
        oldPrice.textContent = money(item.originalPrice);
        prices.appendChild(oldPrice);
      }
      const currentPrice = document.createElement("strong");
      currentPrice.textContent = money(item.price);
      prices.appendChild(currentPrice);
      info.appendChild(prices);

      const disclaimer = document.createElement("p");
      disclaimer.className = "offer-disclaimer";
      disclaimer.textContent = "Preço e disponibilidade podem mudar. Confira as condições no " + storeLabel + ".";
      info.appendChild(disclaimer);

      const link = document.createElement("a");
      link.className = "button button-yellow offer-button";
      link.href = affiliateUrl.href;
      link.target = "_blank";
      link.rel = "noopener noreferrer sponsored";
      link.appendChild(document.createTextNode("Ver oferta no " + storeLabel + " "));
      const arrow = document.createElement("span");
      arrow.textContent = "↗";
      link.appendChild(arrow);
      info.appendChild(link);

      card.appendChild(imageArea);
      card.appendChild(info);
      grid.appendChild(card);
      products.push(card);
    });

    renderCatalog();
  } catch (error) {
    console.warn("Catálogo Shopee não carregado:", error);
  }
}

loadShopeeCatalog();
