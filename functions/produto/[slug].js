/**
 * Cloudflare Pages Function: previews Open Graph específicos por produto.
 * URL pública: /produto/<slug>
 */
const SITE_URL = "https://compradeboa.com";

function slugify(value) {
  return String(value || "")
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90);
}

function decodeHtml(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function attr(tag, name) {
  const match = tag.match(new RegExp(name + "\\s*=\\s*(['"])(.*?)\\1", "i"));
  return match ? decodeHtml(match[2]) : "";
}

function extractProducts(html) {
  const products = [];
  const cardRegex = /<article\b[^>]*class=["'][^"']*catalog-product[^"']*["'][^>]*>([\s\S]*?)<\/article>/gi;
  let match;
  while ((match = cardRegex.exec(html))) {
    const card = match[1];
    const titleMatch = card.match(/<h3\b[^>]*>([\s\S]*?)<\/h3>/i);
    const imageMatch = card.match(/<img\b[^>]*>/i);
    if (!titleMatch || !imageMatch) continue;
    const title = decodeHtml(titleMatch[1].replace(/<[^>]+>/g, "").trim());
    const image = attr(imageMatch[0], "src");
    const priceMatch = card.match(/<strong\b[^>]*>([\s\S]*?)<\/strong>/i);
    const price = priceMatch ? decodeHtml(priceMatch[1].replace(/<[^>]+>/g, "").trim()) : "";
    const storeMatch = card.match(/data-store=["']([^"']+)["']/i);
    products.push({ title, image, price, store: storeMatch ? storeMatch[1] : "" });
  }
  return products;
}

function makeAbsoluteImage(image, requestURL) {
  if (!image) return new URL("/images/logo-compra-de-boa.svg", SITE_URL).href;
  try { return new URL(image, SITE_URL).href; } catch (_) {
    return new URL("/images/logo-compra-de-boa.svg", SITE_URL).href;
  }
}

function htmlResponse(product, slug, requestURL) {
  const title = product.title + " | Compra de Boa";
  const priceText = product.price ? " Confira o preço: " + product.price + "." : "";
  const description = ("Veja este achado na Compra de Boa." + priceText + " Preço e disponibilidade podem mudar.").slice(0, 300);
  const image = makeAbsoluteImage(product.image, requestURL);
  const canonical = SITE_URL + "/produto/" + encodeURIComponent(slug);
  const destination = SITE_URL + "/#produto=" + encodeURIComponent(slug);
  const esc = (value) => String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonical)}">
<meta property="og:type" content="product">
<meta property="og:site_name" content="Compra de Boa">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:image:alt" content="${esc(product.title)}">
<meta property="og:url" content="${esc(canonical)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(image)}">
<meta http-equiv="refresh" content="0;url=${esc(destination)}">
</head>
<body>
<p>Abrindo o produto no Compra de Boa…</p>
<p><a href="${esc(destination)}">Se não abrir automaticamente, toque aqui para ver o produto.</a></p>
<script>window.location.replace(${JSON.stringify(destination)});</script>
</body>
</html>`;
  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=300, s-maxage=1800"
    }
  });
}

export async function onRequest(context) {
  const { request, env, params } = context;
  const slug = String(params.slug || "").toLowerCase();
  if (!slug || slug.length > 180) return new Response("Produto não encontrado", { status: 404 });

  try {
    const indexResponse = await env.ASSETS.fetch(new Request(new URL("/index.html", request.url)));
    if (!indexResponse.ok) throw new Error("Não foi possível carregar o catálogo");
    const indexHTML = await indexResponse.text();
    const products = extractProducts(indexHTML);

    // O catálogo Shopee é carregado no navegador por JSON; incluímos esses itens
    // também para que seus links compartilhados tenham metadados próprios.
    const catalogResponse = await env.ASSETS.fetch(new Request(new URL("/catalogo-shopee-teste-250.json", request.url)));
    if (catalogResponse.ok) {
      const catalog = await catalogResponse.json();
      for (const item of catalog) {
        if (item && item.title && item.image) products.push({
          title: item.title,
          image: item.image,
          price: item.price ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(item.price)) : "",
          store: item.store || "shopee"
        });
      }
    }

    // Slugs repetidos recebem sufixo numérico, igual ao script do catálogo.
    const seen = new Map();
    for (const product of products) {
      const base = slugify(product.title) || "produto";
      const index = seen.get(base) || 0;
      seen.set(base, index + 1);
      product.slug = index > 0 ? base + "-" + (index + 1) : base;
    }

    const product = products.find((item) => item.slug === slug);
    if (!product) return new Response("Produto não encontrado", { status: 404 });
    return htmlResponse(product, slug, new URL(request.url));
  } catch (error) {
    return new Response("Não foi possível abrir este produto agora. Acesse https://compradeboa.com", {
      status: 500,
      headers: { "content-type": "text/plain; charset=utf-8" }
    });
  }
}
