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


// Filtros da vitrine: cada produto pode pertencer a várias categorias.
const categoryButtons = document.querySelectorAll("[data-category].filter-pill");
const categoryCards = document.querySelectorAll(".category-filter-card");
const storeSelect = document.querySelector("#store-filter");
const products = document.querySelectorAll(".catalog-product");
const emptyState = document.querySelector("#catalog-empty");
const catalogStatus = document.querySelector("#catalog-status");
const resetFilters = document.querySelector("#reset-filters");
let selectedCategory = "all";

function filterCatalog() {
  const selectedStore = storeSelect ? storeSelect.value : "all";
  let visibleCount = 0;

  products.forEach((product) => {
    const categories = (product.dataset.categories || "").split(/\\s+/);
    const categoryMatch = selectedCategory === "all" || categories.includes(selectedCategory);
    const storeMatch = selectedStore === "all" || product.dataset.store === selectedStore;
    const visible = categoryMatch && storeMatch;
    product.hidden = !visible;
    if (visible) visibleCount += 1;
  });

  if (emptyState) emptyState.hidden = visibleCount > 0;
  if (catalogStatus) {
    catalogStatus.textContent = visibleCount === 1 ? "1 produto disponível" : `${visibleCount} produtos disponíveis`;
  }
}

function setCategory(category) {
  selectedCategory = category;
  categoryButtons.forEach((button) => {
    const active = button.dataset.category === category;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  filterCatalog();
  const offersSection = document.querySelector("#ofertas");
  if (offersSection) offersSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

categoryButtons.forEach((button) => {
  button.addEventListener("click", () => setCategory(button.dataset.category));
});
categoryCards.forEach((button) => {
  button.addEventListener("click", () => setCategory(button.dataset.category));
});
if (storeSelect) storeSelect.addEventListener("change", filterCatalog);
if (resetFilters) resetFilters.addEventListener("click", () => {
  setCategory("all");
  if (storeSelect) storeSelect.value = "all";
  filterCatalog();
});
filterCatalog();
