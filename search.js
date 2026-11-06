/* Busca inteligente local — Compra de Boa */
(() => {
  const grid = document.querySelector(".catalog-grid");
  const input = document.querySelector("#product-search");
  if (!grid || !input) return;
  const minInput = document.querySelector("#search-price-min");
  const maxInput = document.querySelector("#search-price-max");
  const discountOnly = document.querySelector("#search-discount-only");
  const sortSelect = document.querySelector("#search-sort");
  const clearButton = document.querySelector("#clear-product-search");
  const status = document.querySelector("#catalog-status");
  const pagination = document.querySelector("#catalog-pagination");
  const empty = document.querySelector("#catalog-empty");
  const similarSection = document.createElement("section");
  similarSection.className = "search-similar-section";
  similarSection.hidden = true;
  similarSection.innerHTML = '<h3>Talvez você também goste</h3><p>Não encontramos exatamente o que você procura. Veja alternativas próximas.</p><div class="offers-grid similar-products-grid"></div>';
  grid.insertAdjacentElement("afterend", similarSection);
  const similarGrid = similarSection.querySelector(".similar-products-grid");
  let activeCategory = "all";
  let activeStore = "all";
  let searchMode = false;
  const aliases = {
    "eletronicos":["eletronicos","eletronico","celular","smartphone","fone","tablet","computador","notebook","gadgets"],
    "casa":["casa","decoracao","cozinha","organizacao","organizar","lar","moveis","panelas","lençol"],
    "dia-a-dia":["utilidades","dia a dia","pratico","pratica","uso diario","presente","presentes"],
    "bem-estar":["beleza","fitness","saude","bem estar","academia","treino","skincare","creatina","whey","perfume","esporte","corrida"],
    "moda":["moda","roupa","roupas","tenis","sapato","acessorio","calcado","calçado"],
    "natal":["natal","natalino","natalina","arvore","pisca pisca"]
  };
  const normalize = (s) => String(s||"").toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").trim();
  const synonyms = {
    "mae":"mãe presente dia das maes maternidade","presente":"presente regalo gift","organizar":"organizacao organizador organizadora armazenamento","cozinha":"casa utensilios cozinha panelas","academia":"fitness treino esporte musculacao tenis whey creatina","barato":"economico custo beneficio menor preco","celular":"smartphone telefone mobile","fone":"fone de ouvido headphone headset","tenis":"tênis calcado sneaker","beleza":"skincare maquiagem cuidados pessoais perfume"
  };
  const expand = (q) => {
    let words=normalize(q).split(/\s+/).filter(Boolean);
    const extra=[];
    words.forEach(w=>{if(synonyms[w]) extra.push(...normalize(synonyms[w]).split(" "));});
    return [...new Set([...words,...extra])];
  };
  function distance(a,b){if(Math.abs(a.length-b.length)>2)return 99;let prev=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){let cur=[i];for(let j=1;j<=b.length;j++)cur[j]=Math.min(cur[j-1]+1,prev[j]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));prev=cur;}return prev[b.length];}
  function fuzzyToken(token, words){return words.some(w=>w===token || (token.length>=4 && w.length>=4 && distance(token,w)<=1));}
  function cardData(card){
    const title=card.querySelector("h3")?.textContent||"";
    const category=normalize(card.dataset.categories||"");
    const store=card.dataset.store||"";
    const priceText=card.querySelector(".offer-price strong")?.textContent||"";
    const price=Number(priceText.replace(/[^0-9,]/g,"").replace(".","").replace(",", "."))||0;
    const discountText=card.querySelector(".offer-discount")?.textContent||"";
    const discount=Number(discountText.replace(/[^0-9]/g,""))||0;
    const ratingText=card.querySelector(".offer-rating")?.textContent||"";
    const rating=Number((ratingText.match(/[0-9]+[,.]?[0-9]*/)||[])[0]?.replace(",", "."))||0;
    return {title,category,store,price,discount,rating,words:normalize(title+" "+category+" "+store).split(" ")};
  }
  function inferredCategory(q){
    const n=normalize(q);
    const queryWords=n.split(/\s+/).filter(Boolean);
    for(const [key,terms] of Object.entries(aliases)){
      const normalizedTerms=terms.map(normalize);
      if(normalizedTerms.some(t=>n.includes(t))) return key;
      // Tolera erros simples de digitação em palavras de categoria (ex.: "natalz").
      if(queryWords.some(qw=>normalizedTerms.some(term=>term.split(" ").some(t=>t.length>=4 && qw.length>=4 && distance(qw,t)<=1)))) return key;
    }
    return "";
  }
  function categoryMatch(data,cat){
    if(cat==="all")return true;
    const terms=aliases[cat]||[cat];
    return terms.some(t=>data.category.includes(normalize(t))) || data.category.includes(normalize(cat));
  }
  function extractBudget(q){
    const m=String(q||"").match(/(?:até|ate|menos de|no máximo|no maximo|maximo|max)\s*(?:R\$\s*)?(\d[\d.]*)(?:,(\d{1,2}))?/i);
    if(!m)return null;
    const whole=m[1].replace(/\./g,"");
    return Number(whole+(m[2]?"."+m[2]:""));
  }
  function queryIntent(query){
    const q=normalize(query);
    if(/\b(celular|smartphone|iphone|telefone)\b/.test(q)) return "cellphone";
    if(/\b(tenis|sneaker|calcado|sapato)\b/.test(q) && /\b(academia|treino|fitness|esporte|corrida|musculacao)\b/.test(q)) return "sports-shoe";
    return "";
  }
  function intentMatch(data,intent){
    const title=normalize(data.title);
    if(intent==="cellphone"){
      // A busca por celular deve retornar celulares, não acessórios eletrônicos.
      return /\b(celular|smartphone|iphone|telefone)\b/.test(title) &&
        !/\b(capa|case|carregador|cabo|adaptador|pelicula|suporte|cooler|mouse|teclado|fone|acessorio)\b/.test(title);
    }
    if(intent==="sports-shoe"){
      // "Tênis de academia" é uma busca por calçado esportivo, não por suplementos.
      return /\b(tenis|sneaker|calcado|sapato)\b/.test(title);
    }
    return true;
  }
  function score(data, query){
    const q=normalize(query);
    if(!q)return 0;
    const words=expand(query).filter(w=>w.length>1);
    let score=0;
    const title=normalize(data.title);
    words.forEach(w=>{
      if(title.includes(w))score+=title.startsWith(w)?9:6;
      else if(data.words.some(x=>fuzzyToken(w,[x])))score+=2;
    });
    const category=inferredCategory(query);
    if(category && categoryMatch(data,category))score+=5;
    if(/presente/.test(q) && /kit|presente|livro|boneca|perfume|acessorio/.test(title))score+=2;
    if(/academia|treino|fitness/.test(q) && /tenis|whey|creatina|fitness|esporte/.test(title))score+=3;
    const budget=extractBudget(query);
    if(budget!==null && data.price>0 && data.price<=budget)score+=4;
    return score;
  }
  function removeSmartBadges(){
    grid.querySelectorAll(".smart-buy-badge").forEach(el=>el.remove());
  }
  function apply(){
    const query=input.value.trim();
    searchMode=Boolean(query||minInput.value||maxInput.value||discountOnly.checked||sortSelect.value!=="relevance");
    const all=Array.from(grid.querySelectorAll(".catalog-product"));
    const qBudget=extractBudget(query);
    const maxBudget=maxInput.value!==""?Number(maxInput.value):qBudget;
    const minBudget=minInput.value!==""?Number(minInput.value):0;
    const cat=inferredCategory(query);
    const intent=queryIntent(query);
    let matches=all.map((card,index)=>({card,data:cardData(card),score:score(cardData(card),query),index})).filter(({data,score})=>{
      const catOk=categoryMatch(data,activeCategory);
      const storeOk=activeStore==="all"||data.store===activeStore;
      const priceOk=(!minBudget||data.price>=minBudget)&&(!maxBudget||data.price<=maxBudget);
      const discountOk=!discountOnly.checked||data.discount>0;
      const queryOk=!query||score>0;
      const intentOk=intentMatch(data,intent);
      return catOk&&storeOk&&priceOk&&discountOk&&queryOk&&intentOk;
    });
    matches.sort((a,b)=>{
      if(sortSelect.value==="price-asc")return a.data.price-b.data.price;
      if(sortSelect.value==="discount")return b.data.discount-a.data.discount;
      if(sortSelect.value==="newest")return a.index-b.index; // ordem de inclusão no catálogo
      if(query && qBudget!==null){
        const aWithin=a.data.price<=qBudget,bWithin=b.data.price<=qBudget;
        if(aWithin!==bWithin)return aWithin?-1:1;
      }
      return b.score-a.score || (b.data.rating-a.data.rating) || a.data.price-b.data.price;
    });
    const top=searchMode?matches.slice(0,12):matches;
    const visible=new Set(top.map(x=>x.card));
    window.__catalogSearchActive=searchMode;
    all.forEach(card=>{
      if(searchMode) card.hidden=false; // Busca controla a vitrine; não deixa a paginação antiga esconder resultados.
      card.classList.toggle("search-hidden",searchMode&&!visible.has(card));
    });
    // Ao limpar busca/filtros, devolve o controle à paginação normal do catálogo.
    if(!searchMode && typeof window.renderCatalog==="function" && !window.__catalogSearchRestoring){
      window.__catalogSearchRestoring=true;
      window.renderCatalog();
      window.__catalogSearchRestoring=false;
    }
    similarGrid.innerHTML="";
    similarSection.hidden=true;
    // Sem resultados: não sugerir produtos aleatórios ou interesses diferentes.\n    similarSection.hidden=true;\n    similarGrid.innerHTML="";\n    removeSmartBadges();
    if(top.length){
      const best=top.slice().sort((a,b)=>costBenefit(b.data)-costBenefit(a.data))[0];
      const info=best.card.querySelector(".offer-info");
      if(info && !info.querySelector(".smart-buy-badge")){
        const badge=document.createElement("span");badge.className="smart-buy-badge";badge.textContent="✦ Compra inteligente";info.insertBefore(badge,info.firstChild);
      }
    }
    if(status)status.textContent=query||searchMode?top.length+" produto(s) encontrado(s)"+(matches.length>12?" · mostrando os 12 mais relevantes":""):matches.length+" produtos encontrados";
    if(pagination)pagination.classList.toggle("search-pagination-hidden",searchMode);
    if(empty)empty.hidden=top.length>0;
    if(!query && !searchMode)similarSection.hidden=true;
  }
  function costBenefit(d){return (d.rating||0)*2 + Math.max(0,Math.min(d.discount,40))*.08 - Math.log10(Math.max(d.price,1));}
  const originalRender=window.renderCatalog;
  if(typeof originalRender==="function")window.renderCatalog=function(){originalRender();apply();};
  document.querySelectorAll("[data-category].filter-pill,.category-filter-card").forEach(btn=>{
    btn.addEventListener("click",()=>{activeCategory=btn.dataset.category||"all";setTimeout(apply,0);});
  });
  const store=document.querySelector("#store-filter");
  if(store)store.addEventListener("change",()=>{activeStore=store.value;setTimeout(apply,0);});
  [input,minInput,maxInput,discountOnly,sortSelect].forEach(el=>el&&el.addEventListener("input",apply));
  clearButton?.addEventListener("click",()=>{input.value="";minInput.value="";maxInput.value="";discountOnly.checked=false;sortSelect.value="relevance";apply();input.focus();});
  const observer=new MutationObserver((mutations)=>{
    if(mutations.some(m=>[...m.addedNodes,...m.removedNodes].some(n=>n.nodeType===1&&n.classList?.contains("catalog-product")))) apply();
  });
  observer.observe(grid,{childList:true});
  apply();
})();
