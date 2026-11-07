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
      // Algumas fotos da Shopee incluem moldura preta na própria imagem. Recorte visual apenas nos produtos identificados.
      if (["51505316350", "24489035574"].includes(String(item.id))) {
        img.classList.add("real-product-image--crop-frame");
      }
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
    });

    window.renderCatalog?.();
  } catch (error) {
    console.warn("Catálogo Shopee não carregado:", error);
  }
}

loadShopeeCatalog();
