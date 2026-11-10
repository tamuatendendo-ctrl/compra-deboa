/* Busca, filtros e paginação unificados — Compra de Boa */
(() => {
  const grid = document.querySelector(".catalog-grid");
  const input = document.querySelector("#product-search");
  if (!grid || !input) return;

  const minInput = document.querySelector("#search-price-min");
  const maxInput = document.querySelector("#search-price-max");
  const discountOnly = document.querySelector("#search-discount-only");
  const sortSelect = document.querySelector("#search-sort");
  const clearButton = document.querySelector("#clear-product-search");
  const storeSelect = document.querySelector("#store-filter");
  const status = document.querySelector("#catalog-status");
  const pagination = document.querySelector("#catalog-pagination");
  const empty = document.querySelector("#catalog-empty");
  const categoryButtons = document.querySelectorAll("[data-category].filter-pill,.category-filter-card");
  const resetFilters = document.querySelector("#reset-filters");
  const pageSize = 16;

  const validCategories = new Set(["all","eletronicos","casa","dia-a-dia","bem-estar","moda","alimentos-bebidas","natal","black-friday"]);
  const categoryParam = "categoria";

  function readCategoryFromUrl() {
    const value = new URL(window.location.href).searchParams.get(categoryParam) || "all";
    return validCategories.has(value) ? value : "all";
  }

  function writeCategoryToUrl(category, mode = "push") {
    const url = new URL(window.location.href);
    if (category === "all") url.searchParams.delete(categoryParam);
    else url.searchParams.set(categoryParam, category);
    // Mantém a URL amigável: o deslocamento até os produtos é feito via JavaScript.
    url.hash = "";
    const nextUrl = url.pathname + url.search;
    const currentUrl = window.location.pathname + window.location.search;
    if (nextUrl === currentUrl) return;
    if (mode === "replace") window.history.replaceState({ category }, "", nextUrl);
    else window.history.pushState({ category }, "", nextUrl);
  }

  let activeCategory = readCategoryFromUrl();
  let currentPage = 1;
  let applying = false;

  const categoryAliases = {
    "eletronicos":["eletronicos","eletronico","eletronica"],
    "casa":["casa","decoracao","cozinha","organizacao","lar"],
    "dia-a-dia":["dia-a-dia","utilidades","dia a dia"],
    "bem-estar":["bem-estar","beleza","fitness","saude"],
    "alimentos-bebidas":["alimentos-bebidas","alimentos e bebidas","bebidas","whisky"],
    "moda":["moda"],
    "natal":["natal"],
    "black-friday":["black-friday","black friday","blackfriday"]
  };

  const normalize = (value) => String(value || "")
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  const synonymMap = {
    mae:["presente","dia das maes","maternidade","mae"],
    presente:["presente","gift","lembranca","kit"],
    academia:["treino","fitness","esporte","musculacao"],
    tenis:["calcado","sneaker","sapato"],
    celular:["smartphone","telefone","iphone"],
    smartphone:["celular","telefone","iphone"],
    barato:["economico","custo beneficio","menor preco"],
    cozinha:["utensilios","panelas","casa"],
    organizar:["organizacao","organizador","armazenamento"],
    natal:["natalino","natalina","arvore","pisca pisca"]
  };

  function words(value) {
    return normalize(value).split(/\s+/).filter(Boolean);
  }

  function extractBudget(query) {
    const match = String(query || "").match(/(?:ate|até|menos de|no maximo|maximo|max)\s*(?:r\$\s*)?(\d[\d.]*)(?:,(\d{1,2}))?/i);
    if (!match) return null;
    const integer = match[1].replace(/\./g, "");
    return Number(integer + (match[2] ? "." + match[2] : ""));
  }

  function parsePrice(card) {
    const text = card.querySelector(".offer-price strong")?.textContent || "";
    const normalized = text.replace(/[^0-9,.]/g, "");
    if (!normalized) return 0;
    // Formato brasileiro: 1.299,90 -> 1299.90; 299,90 -> 299.90
    return Number(normalized.replace(/\./g, "").replace(",", ".")) || 0;
  }

  function cardData(card, index) {
    const title = card.querySelector("h3")?.textContent?.trim() || "";
    const category = normalize(card.dataset.categories || "");
    const store = normalize(card.dataset.store || "");
    const discountText = card.querySelector(".offer-discount")?.textContent || "";
    const ratingText = card.querySelector(".offer-rating")?.textContent || "";
    return {
      card, index, title, normalizedTitle: normalize(title), category, store,
      price: parsePrice(card),
      discount: Number(discountText.replace(/[^0-9]/g, "")) || 0,
      rating: Number((ratingText.match(/[0-9]+[,.]?[0-9]*/)||[])[0]?.replace(",", ".")) || 0,
      searchable: normalize(title + " " + category + " " + store)
    };
  }

  function selectedCategoryMatch(data) {
    if (activeCategory === "all") return true;
    const aliases = categoryAliases[activeCategory] || [activeCategory];
    return aliases.some(alias => data.category.includes(normalize(alias)));
  }

  function queryIntent(query) {
    const q = normalize(query);
    if (/\b(celular|smartphone|iphone|telefone)\b/.test(q)) return "phone";
    if (/\b(tenis|sneaker|calcado|sapato)\b/.test(q) &&
        /\b(academia|treino|fitness|esporte|corrida|musculacao)\b/.test(q)) return "sports-shoe";
    if (/\b(presente|gift)\b/.test(q) && /\b(mae|mãe|pai|namorada|namorado|crianca|criança)\b/.test(q)) return "gift";
    return "";
  }

  function matchesIntent(data, intent) {
    const title = data.normalizedTitle;
    if (intent === "phone") {
      return /\b(celular|smartphone|iphone|telefone)\b/.test(title) &&
        !/\b(capa|case|carregador|cabo|adaptador|pelicula|suporte|cooler|mouse|teclado|fone|acessorio|acessório)\b/.test(title);
    }
    if (intent === "sports-shoe") {
      return /\b(tenis|sneaker|calcado|sapato)\b/.test(title) &&
        !/\b(whey|creatina|suplemento|legging|short|camiseta)\b/.test(title);
    }
    if (intent === "gift") {
      return !/\b(cabo|carregador|pelicula|peca de reposicao)\b/.test(title);
    }
    return true;
  }

  function scoreProduct(data, query) {
    const original = words(query);
    if (!original.length) return 0;
    const expanded = new Set(original);
    original.forEach(word => (synonymMap[word] || []).forEach(term => words(term).forEach(w => expanded.add(w))));
    let score = 0;
    original.forEach(word => {
      if (data.normalizedTitle.includes(word)) score += data.normalizedTitle.startsWith(word) ? 12 : 8;
      else if (data.searchable.includes(word)) score += 4;
    });
    // Sinônimos ajudam a descoberta, mas têm peso menor para evitar resultados distantes.
    [...expanded].filter(word => !original.includes(word)).forEach(word => {
      if (data.normalizedTitle.includes(word)) score += 2;
      else if (data.searchable.includes(word)) score += 1;
    });
    if (original.length > 1 && original.every(word => data.normalizedTitle.includes(word))) score += 7;

    const intent = queryIntent(query);
    if (intent === "sports-shoe" && /\b(tenis|sneaker|calcado)\b/.test(data.normalizedTitle)) score += 10;
    if (intent === "phone" && /\b(celular|smartphone|iphone|telefone)\b/.test(data.normalizedTitle)) score += 10;
    if (intent === "gift" && /\b(kit|presente|perfume|livro|brinquedo|boneca|bolsa|colar|relogio)\b/.test(data.normalizedTitle)) score += 3;
    return score;
  }

  function setCategory(category, options = {}) {
    const nextCategory = validCategories.has(category) ? category : "all";
    const changed = nextCategory !== activeCategory;
    activeCategory = nextCategory;
    currentPage = 1;
    categoryButtons.forEach(button => {
      const active = button.dataset.category === activeCategory;
      if (button.classList.contains("filter-pill")) button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    if (options.updateUrl !== false && changed) writeCategoryToUrl(activeCategory, options.historyMode || "push");
    apply();
  }

  function renderPagination(totalPages) {
    if (!pagination) return;
    pagination.innerHTML = "";
    pagination.classList.remove("search-pagination-hidden");
    pagination.hidden = totalPages <= 1;
    if (totalPages <= 1) return;

    const addButton = (label, page, options = {}) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "pagination-button" + (options.active ? " active" : "");
      button.textContent = label;
      button.disabled = Boolean(options.disabled);
      button.setAttribute("aria-label", options.ariaLabel || label);
      if (options.active) button.setAttribute("aria-current", "page");
      button.addEventListener("click", () => {
        currentPage = page;
        apply();
        document.querySelector("#ofertas")?.scrollIntoView({behavior:"smooth", block:"start"});
      });
      pagination.appendChild(button);
    };

    addButton("‹", Math.max(1, currentPage - 1), {disabled:currentPage === 1, ariaLabel:"Página anterior"});
    const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
    const end = Math.min(totalPages, start + 4);
    if (start > 1) {
      addButton("1", 1);
      if (start > 2) {
        const dots = document.createElement("span");
        dots.className = "pagination-info";
        dots.textContent = "…";
        pagination.appendChild(dots);
      }
    }
    for (let page = start; page <= end; page++) addButton(String(page), page, {active:page === currentPage});
    if (end < totalPages) {
      if (end < totalPages - 1) {
        const dots = document.createElement("span");
        dots.className = "pagination-info";
        dots.textContent = "…";
        pagination.appendChild(dots);
      }
      addButton(String(totalPages), totalPages);
    }
    addButton("›", Math.min(totalPages, currentPage + 1), {disabled:currentPage === totalPages, ariaLabel:"Próxima página"});
    const info = document.createElement("span");
    info.className = "pagination-info";
    info.textContent = "Página " + currentPage + " de " + totalPages;
    pagination.appendChild(info);
  }

  function apply() {
    if (applying) return;
    applying = true;
    const query = input.value.trim();
    const queryBudget = extractBudget(query);
    const minPrice = minInput && minInput.value !== "" ? Number(minInput.value) : 0;
    const maxPrice = maxInput && maxInput.value !== "" ? Number(maxInput.value) : queryBudget;
    const intent = queryIntent(query);
    const store = storeSelect?.value || "all";
    const searchActive = Boolean(query || minPrice || maxPrice || discountOnly?.checked ||
      (sortSelect && sortSelect.value !== "relevance") || activeCategory !== "all" || store !== "all");

    const all = Array.from(grid.querySelectorAll(".catalog-product"));
    let results = all.map((card, index) => cardData(card, index)).filter(data => {
      if (!selectedCategoryMatch(data)) return false;
      if (store !== "all" && data.card.dataset.store !== store) return false;
      if (minPrice > 0 && data.price < minPrice) return false;
      if (maxPrice !== null && maxPrice > 0 && data.price > maxPrice) return false;
      if (discountOnly?.checked && data.discount <= 0) return false;
      if (!matchesIntent(data, intent)) return false;
      if (query && scoreProduct(data, query) <= 0) return false;
      return true;
    });

    results.sort((a, b) => {
      if (sortSelect?.value === "price-asc") return (a.price || Infinity) - (b.price || Infinity);
      if (sortSelect?.value === "discount") return b.discount - a.discount || b.rating - a.rating;
      if (sortSelect?.value === "newest") return b.index - a.index;
      const scoreDiff = scoreProduct(b, query) - scoreProduct(a, query);
      if (query && scoreDiff) return scoreDiff;
      if (queryBudget !== null) {
        const aInBudget = a.price > 0 && a.price <= queryBudget;
        const bInBudget = b.price > 0 && b.price <= queryBudget;
        if (aInBudget !== bInBudget) return aInBudget ? -1 : 1;
      }
      return b.rating - a.rating || b.discount - a.discount || a.price - b.price;
    });

    const totalPages = Math.max(1, Math.ceil(results.length / pageSize));
    currentPage = Math.min(currentPage, totalPages);
    const pageResults = results.slice((currentPage - 1) * pageSize, currentPage * pageSize);
    const visible = new Set(pageResults.map(item => item.card));

    window.__catalogSearchActive = true;
    all.forEach(card => {
      card.hidden = !visible.has(card);
      card.classList.toggle("search-hidden", !visible.has(card));
    });

    renderPagination(totalPages);
    if (empty) empty.hidden = results.length > 0;
    if (status) {
      const count = results.length;
      status.textContent = count === 1 ? "1 produto encontrado" : count + " produtos encontrados";
      if (query && results.length > pageSize) status.textContent += " · página " + currentPage + " de " + totalPages;
    }

    // A página de catálogo tem apenas um reset; mantemos os controles visuais sincronizados.
    if (resetFilters) resetFilters.hidden = results.length > 0 && !searchActive;
    applying = false;
  }

  categoryButtons.forEach(button => button.addEventListener("click", () => {
    setCategory(button.dataset.category);
    if (button.classList.contains("category-filter-card")) {
      // Ao escolher um card da seção de categorias, leva o visitante aos produtos filtrados.
      requestAnimationFrame(() => {
        document.querySelector("#ofertas")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }));
  storeSelect?.addEventListener("change", () => { currentPage = 1; apply(); });
  [input, minInput, maxInput, discountOnly, sortSelect].forEach(element => {
    if (!element) return;
    element.addEventListener("input", () => { currentPage = 1; apply(); });
    element.addEventListener("change", () => { currentPage = 1; apply(); });
  });

  function clearAll() {
    input.value = "";
    if (minInput) minInput.value = "";
    if (maxInput) maxInput.value = "";
    if (discountOnly) discountOnly.checked = false;
    if (sortSelect) sortSelect.value = "relevance";
    if (storeSelect) storeSelect.value = "all";
    setCategory("all");
    currentPage = 1;
    apply();
    input.focus();
  }
  clearButton?.addEventListener("click", clearAll);
  resetFilters?.addEventListener("click", clearAll);

  // O catálogo é carregado de forma assíncrona; reaplica busca e filtros quando novos cards chegam.
  const observer = new MutationObserver(mutations => {
    if (mutations.some(mutation => [...mutation.addedNodes, ...mutation.removedNodes].some(node =>
      node.nodeType === 1 && (node.matches?.(".catalog-product") || node.querySelector?.(".catalog-product"))))) {
      currentPage = 1;
      apply();
    }
  });
  observer.observe(grid, {childList:true});

  // O script antigo também escuta categorias/loja. Este renderizador passa a ser a fonte única
  // de visibilidade e paginação, evitando conflito entre os dois estados.
  window.renderCatalog = apply;

  // Abre a categoria indicada na URL e acompanha navegação voltar/avançar do navegador.
  setCategory(activeCategory, { updateUrl: false });
  window.addEventListener("popstate", () => {
    setCategory(readCategoryFromUrl(), { updateUrl: false });
  });
})();
