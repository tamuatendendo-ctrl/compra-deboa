/**
 * Compra de Boa — rastreamento explícito de cliques em links afiliados.
 * Arquivo isolado para não interferir no catálogo, filtros, compartilhamento ou layout.
 * Evento enviado ao GTM: affiliate_link_click
 */
(function () {
  "use strict";

  function normalizeMarketplace(value) {
    var store = String(value || "").toLowerCase().trim();
    if (store.indexOf("amazon") !== -1 || store.indexOf("amzn") !== -1) return "Amazon";
    if (store.indexOf("shopee") !== -1) return "Shopee";
    if (store.indexOf("mercado") !== -1 || store.indexOf("mercadolivre") !== -1 || store === "ml") return "Mercado Livre";
    return "";
  }

  function marketplaceFromLink(link, card) {
    var store = card && card.getAttribute("data-store");
    var normalized = normalizeMarketplace(store);
    if (normalized) return normalized;

    var href = (link && link.href || "").toLowerCase();
    if (href.indexOf("amazon") !== -1 || href.indexOf("amzn") !== -1) return "Amazon";
    if (href.indexOf("shopee") !== -1) return "Shopee";
    if (href.indexOf("meli.la") !== -1 || href.indexOf("mercadolivre") !== -1 || href.indexOf("mercadolibre") !== -1) return "Mercado Livre";
    return "";
  }

  document.addEventListener("click", function (event) {
    var target = event.target;
    var link = target && target.closest ? target.closest("a.offer-button[href]") : null;
    if (!link) return;

    var card = link.closest("article.offer-card");
    if (!card) return;

    var title = card.querySelector("h2, h3, .offer-title, .product-title");
    var productName = title ? title.textContent.trim() : "";
    var marketplace = marketplaceFromLink(link, card);

    if (!marketplace) return;

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: "affiliate_link_click",
      marketplace: marketplace,
      product_name: productName,
      affiliate_url: link.href
    });
  }, true);
})();
