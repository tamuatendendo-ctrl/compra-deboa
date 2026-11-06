export async function onRequest({ request, next }) {
  const url = new URL(request.url);

  // Redirect the legacy Cloudflare Pages hostname to the official domain.
  if (url.hostname === "compra-deboa.pages.dev") {
    url.hostname = "compradeboa.com";
    return Response.redirect(url.toString(), 301);
  }

  return next();
}
