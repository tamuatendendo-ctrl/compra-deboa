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


// Busca as imagens reais dos anúncios pela API pública do Mercado Livre.
// Mantém o link afiliado original no botão de compra.
document.querySelectorAll(".catalog-product[data-item-id]").forEach(async (card) => {
  const itemId = card.dataset.itemId;
  const area = card.querySelector(".product-image-area");
  if (!itemId || !area) return;
  try {
    let response = await fetch("https://api.mercadolibre.com/items/" + encodeURIComponent(itemId));
    if (!response.ok) response = await fetch("https://api.mercadolibre.com/products/" + encodeURIComponent(itemId));
    if (!response.ok) throw new Error("API não retornou imagem");
    const data = await response.json();
    const picture = data.pictures?.[0]?.secure_url || data.pictures?.[0]?.url || data.thumbnail || data.picture;
    if (!picture) throw new Error("Imagem não encontrada");
    const discountText = area.querySelector(".offer-discount")?.textContent || "";
    const img = document.createElement("img");
    img.src = picture.replace(/^http:/, "https:");
    img.alt = card.querySelector("h3")?.textContent || "Foto do produto";
    img.loading = "lazy";
    img.className = "real-product-image";
    img.onerror = () => { img.remove(); };
    area.replaceChildren(img);
    if (discountText) {
      const discount = document.createElement("span");
      discount.className = "offer-discount";
      discount.textContent = discountText;
      area.appendChild(discount);
    }
  } catch (error) {
    area.querySelector("small")?.replaceChildren(document.createTextNode("Imagem indisponível"));
  }
});
