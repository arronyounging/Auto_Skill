/**
 * Printful 选品助手 - Content Script
 * 注入到 printful.com/custom/* 页面，提取商品数据并响应 Popup 的查询
 */

/**
 * 从 URL 解析品类和 Product ID
 * Printful 有两种 URL 格式：
 *   1. /custom/{category}/{product_id}/{slug}  (含数字 ID)
 *   2. /custom/{gender}/{filter}/{slug}         (无数字 ID，需从页面提取)
 */
function parseFromUrl() {
  const url = window.location.href;
  const pathname = window.location.pathname;
  // 匹配 /custom/xxx/123/xxx 格式（第三段为纯数字）
  const match = pathname.match(/^\/custom\/([^/]+)\/(\d+)\/([^/]+)/);
  if (match) {
    return {
      category: match[1],
      product_id: match[2],
      slug: match[3],
      url,
    };
  }
  return { category: null, product_id: null, slug: null, url };
}

/**
 * 从页面 JSON-LD 结构化数据提取商品信息
 */
function parseFromJsonLd() {
  const scripts = document.querySelectorAll('script[type="application/ld+json"]');
  for (const script of scripts) {
    try {
      const data = JSON.parse(script.textContent);
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item["@type"] === "Product") {
          return {
            name: item.name || null,
            product_id: extractIdFromJsonLd(item),
          };
        }
      }
    } catch (_) {}
  }
  return { name: null, product_id: null };
}

/**
 * 尝试从 JSON-LD 的 url/sku/productID 字段提取数字 ID
 */
function extractIdFromJsonLd(item) {
  // 尝试从 url 字段解析
  const candidates = [item.url, item.sku, item.productID];
  for (const c of candidates) {
    if (!c) continue;
    const m = String(c).match(/\/(\d+)\//);
    if (m) return m[1];
    if (/^\d+$/.test(String(c))) return String(c);
  }
  return null;
}

/**
 * 从 URL 路径末尾的 slug 推断品类（兜底方案）
 * 例如 /custom/mens/all/all-over-print-recycled-unisex-sweatshirt
 * → 从页面面包屑或 meta 关键词提取
 */
function parseCategoryFromPage() {
  // 尝试面包屑
  const breadcrumbs = document.querySelectorAll(
    'nav[aria-label="breadcrumb"] a, .breadcrumb a, [class*="breadcrumb"] a'
  );
  if (breadcrumbs.length >= 2) {
    const crumb = breadcrumbs[breadcrumbs.length - 2];
    if (crumb) {
      const href = crumb.getAttribute("href") || "";
      const m = href.match(/\/custom\/([^/]+)/);
      if (m) return m[1];
      return crumb.textContent.trim().toLowerCase().replace(/\s+/g, "-");
    }
  }

  // 尝试 meta keywords
  const meta = document.querySelector('meta[name="keywords"]');
  if (meta) {
    const kw = meta.getAttribute("content") || "";
    const first = kw.split(",")[0].trim().toLowerCase().replace(/\s+/g, "-");
    if (first) return first;
  }

  // 从 URL 第二段猜测
  const m = window.location.pathname.match(/^\/custom\/([^/]+)/);
  return m ? m[1] : null;
}

/**
 * 从页面提取商品名称（多重兜底）
 */
function parseProductName() {
  // H1
  const h1 = document.querySelector("h1");
  if (h1 && h1.textContent.trim()) return h1.textContent.trim();

  // og:title
  const og = document.querySelector('meta[property="og:title"]');
  if (og) return og.getAttribute("content")?.trim() || null;

  // document.title
  return document.title.split("|")[0].trim() || null;
}

/**
 * 从 window.__NUXT__ / __INITIAL_STATE__ 等全局变量中提取 product_id
 */
function parseFromWindowState() {
  try {
    // Nuxt 2
    if (window.__NUXT__) {
      const str = JSON.stringify(window.__NUXT__);
      const m = str.match(/"product_id"\s*:\s*(\d+)/);
      if (m) return m[1];
      const m2 = str.match(/"productId"\s*:\s*(\d+)/);
      if (m2) return m2[1];
    }
    // 通用 window.__INITIAL_STATE__
    if (window.__INITIAL_STATE__) {
      const str = JSON.stringify(window.__INITIAL_STATE__);
      const m = str.match(/"product_id"\s*:\s*(\d+)/);
      if (m) return m[1];
    }
  } catch (_) {}
  return null;
}

/**
 * 综合提取：合并所有来源，优先级：URL > JSON-LD > window state > DOM
 */
function extractProductInfo() {
  const fromUrl = parseFromUrl();
  const fromJsonLd = parseFromJsonLd();
  const fromState = parseFromWindowState();

  const product_id =
    fromUrl.product_id ||
    fromJsonLd.product_id ||
    fromState ||
    null;

  const category =
    fromUrl.category ||
    parseCategoryFromPage() ||
    null;

  const name =
    fromJsonLd.name ||
    parseProductName() ||
    null;

  const url = fromUrl.url;

  return { product_id, category, name, url };
}

// ── 监听来自 Popup 的消息 ──────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "GET_PRODUCT_INFO") {
    const info = extractProductInfo();
    sendResponse({ success: true, data: info });
  }
  return true; // 保持 sendResponse 有效（异步）
});
