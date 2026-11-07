/* URLs compartilháveis de produtos — Compra de Boa
   URLs no formato compradeboa.com/#produto=slug.
   O hash permite deep-link sem configuração de rotas no Cloudflare Pages. */
(() => {
  const grid = document.querySelector(".catalog-grid");
  if (!grid) return;

  const slugify = (value) => String(value || "")
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90);

  const getTitle = (card) => card.querySelector("h3")?.textContent?.trim() || "produto";
  const getSlug = (card) => card.dataset.shareSlug || slugify(getTitle(card));

  function prepareCard(card) {
    if (!(card instanceof HTMLElement) || !card.classList.contains("catalog-product")) return;
    const baseSlug = slugify(getTitle(card)) || "produto";
    const allCards = Array.from(grid.querySelectorAll(".catalog-product"));
    const sameTitleIndex = allCards.filter((item) => slugify(getTitle(item)) === baseSlug).indexOf(card);
    const slug = sameTitleIndex > 0 ? baseSlug + "-" + (sameTitleIndex + 1) : baseSlug;
    card.dataset.shareSlug = slug;

    const title = card.querySelector("h3");
    const image = card.querySelector(".product-image-area");
    [title, image].forEach((element) => {
      if (!element || element.dataset.shareReady === "true") return;
      element.dataset.shareReady = "true";
      element.classList.add("share-product-trigger");
      element.setAttribute("tabindex", "0");
      element.setAttribute("role", "link");
      element.setAttribute("aria-label", "Abrir link compartilhável: " + getTitle(card));
      element.addEventListener("click", (event) => {
        if (event.target.closest("a,button")) return;
        openProduct(card, true);
      });
      element.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openProduct(card, true);
        }
      });
    });

    const info = card.querySelector(".offer-info");
    if (info && !info.querySelector(".product-share-button")) {
      const shareButton = document.createElement("button");
      shareButton.type = "button";
      shareButton.className = "button button-share product-share-button";
      shareButton.textContent = "Compartilhar produto";
      shareButton.addEventListener("click", async (event) => {
        event.preventDefault();
        event.stopPropagation();
        const url = makeProductURL(card);
        const shareData = { title: getTitle(card), text: "Olha esse achado no Compra de Boa:", url };
        try {
          if (navigator.share) {
            await navigator.share(shareData);
          } else if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(url);
            shareButton.textContent = "Link copiado!";
            setTimeout(() => { shareButton.textContent = "Compartilhar produto"; }, 1800);
          } else {
            window.prompt("Copie o link do produto:", url);
          }
        } catch (error) {
          if (error?.name !== "AbortError") window.prompt("Copie o link do produto:", url);
        }
      });
      const affiliateButton = info.querySelector(".offer-button");
      if (affiliateButton) affiliateButton.insertAdjacentElement("beforebegin", shareButton);
      else info.appendChild(shareButton);
    }
  }

  function makeProductURL(card) {
    const url = new URL(window.location.href);
    url.hash = "produto=" + encodeURIComponent(getSlug(card));
    return url.href;
  }

  function openProduct(card, updateURL) {
    if (!card) return;
    if (updateURL) {
      const nextURL = makeProductURL(card);
      if (window.location.href !== nextURL) history.pushState({ productSlug: getSlug(card) }, "", nextURL);
    }
    document.querySelectorAll(".product-share-target").forEach((item) => item.classList.remove("product-share-target"));
    card.hidden = false;
    card.classList.remove("search-hidden");
    card.classList.add("product-share-target");
    card.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function findBySlug(slug) {
    return Array.from(grid.querySelectorAll(".catalog-product")).find((card) => getSlug(card) === slug);
  }

  function handleCurrentURL() {
    const match = window.location.hash.match(/^#produto=(.+)$/);
    if (!match) {
      document.querySelectorAll(".product-share-target").forEach((item) => item.classList.remove("product-share-target"));
      return;
    }
    let slug;
    try { slug = decodeURIComponent(match[1]); } catch (_) { slug = match[1]; }
    const card = findBySlug(slug);
    if (card) openProduct(card, false);
  }

  const style = document.createElement("style");
  style.textContent = `
    .share-product-trigger { cursor: pointer; }
    .share-product-trigger:focus-visible { outline: 3px solid #f4c542; outline-offset: 3px; border-radius: 6px; }
    .product-share-button { margin: 0 0 10px; cursor: pointer; border: 0; font: inherit; }
    .button-share { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 10px 14px; border-radius: 999px; background: #f1e8ff; color: #4b0d91; font-weight: 800; }
    .product-share-target { outline: 3px solid #f4c542; outline-offset: 4px; border-radius: 14px; }
    .product-share-target .product-image-area { scroll-margin-top: 100px; }
    @media (max-width: 600px) { .product-share-button { width: 100%; } }
  `;
  document.head.appendChild(style);

  function prepareAll() {
    grid.querySelectorAll(".catalog-product").forEach(prepareCard);
    handleCurrentURL();
  }

  prepareAll();
  const observer = new MutationObserver((mutations) => {
    if (mutations.some((mutation) => mutation.addedNodes.length)) prepareAll();
  });
  observer.observe(grid, { childList: true });

  window.addEventListener("popstate", handleCurrentURL);
  window.addEventListener("hashchange", handleCurrentURL);
})();
