/**
 * Printful 选品助手 - Popup Script
 */

// ── DOM refs ──────────────────────────────────────────────────────────────────
const badge          = document.getElementById("badge");
const loadingState   = document.getElementById("loadingState");
const productInfo    = document.getElementById("productInfo");
const errorState     = document.getElementById("errorState");
const errorMsg       = document.getElementById("errorMsg");
const duplicateState = document.getElementById("duplicateState");
const pName          = document.getElementById("pName");
const pCategory      = document.getElementById("pCategory");
const pId            = document.getElementById("pId");
const addBtn         = document.getElementById("addBtn");
const emptyState     = document.getElementById("emptyState");
const productList    = document.getElementById("productList");
const footer         = document.getElementById("footer");
const clearBtn       = document.getElementById("clearBtn");
const exportBtn      = document.getElementById("exportBtn");

// ── State ─────────────────────────────────────────────────────────────────────
let currentProduct = null;
let pickedList     = [];

// ── Storage helpers ───────────────────────────────────────────────────────────
function loadList() {
  return new Promise((resolve) => {
    chrome.storage.local.get("pickedList", (data) => resolve(data.pickedList || []));
  });
}
function saveList(list) {
  return new Promise((resolve) => chrome.storage.local.set({ pickedList: list }, resolve));
}

// ── Render ────────────────────────────────────────────────────────────────────
function renderList() {
  badge.textContent = pickedList.length;
  const hasList = pickedList.length > 0;
  emptyState.style.display = hasList ? "none" : "block";
  footer.style.display     = hasList ? "flex"  : "none";
  productList.innerHTML    = "";
  pickedList.forEach((item, index) => {
    const li = document.createElement("li");
    li.className = "product-item";
    li.innerHTML = `
      <div class="product-item__body">
        <div class="product-item__name" title="${escHtml(item.name || "")}">${escHtml(item.name || "—")}</div>
        <div class="product-item__meta">
          <span class="product-item__category">${escHtml(item.category || "—")}</span>
          <span class="product-item__id">ID: ${escHtml(String(item.product_id || "—"))}</span>
        </div>
      </div>
      <button class="product-item__remove" data-index="${index}" title="移除">✕</button>
    `;
    productList.appendChild(li);
  });
}

function showError(msg) {
  loadingState.style.display   = "none";
  productInfo.style.display    = "none";
  duplicateState.style.display = "none";
  errorState.style.display     = "block";
  if (errorMsg) errorMsg.textContent = msg;
}

function renderCurrentProduct(data) {
  loadingState.style.display   = "none";
  errorState.style.display     = "none";
  duplicateState.style.display = "none";
  productInfo.style.display    = "none";

  if (!data || !data.product_id) {
    showError("⚠️ 未能提取到 Product ID，请刷新页面后重试");
    return;
  }

  const isDuplicate = pickedList.some((p) => String(p.product_id) === String(data.product_id));
  if (isDuplicate) {
    duplicateState.style.display = "block";
    return;
  }

  pName.textContent     = data.name     || "—";
  pCategory.textContent = data.category || "—";
  pId.textContent       = data.product_id;
  productInfo.style.display = "block";
}

// ── 注入到页面执行的提取函数（必须完全自包含，不能引用外部变量）────────────────
function extractFn() {
  const url      = window.location.href;
  const pathname = window.location.pathname;
  let product_id = null;
  let category   = null;
  let name       = null;

  // ── 辅助：从字符串中搜索 product_id 数字 ──────────────────────────────────
  function scanForId(str) {
    if (!str || str.length > 2000000) return null;
    const patterns = [
      // Printful Apollo 缓存键：PFCore://CatalogProduct/320
      /CatalogProduct\/(\d+)/,
      /["']PFCore:\/\/CatalogProduct\/(\d+)["']/,
      // GraphQL 响应字段
      /"productId"\s*:\s*(\d+)/,
      /"product_id"\s*:\s*(\d+)/,
      /"id"\s*:\s*"PFCore:\/\/CatalogProduct\/(\d+)"/,
      // 通用 Product 类型兜底
      /"__typename"\s*:\s*"CatalogProduct"[^}]*?"id"\s*[:\s]+(\d+)/,
      /product_id['":\s]+(\d{2,6})\b/,
      /productId['":\s]+(\d{2,6})\b/,
    ];
    for (const p of patterns) {
      const m = str.match(p);
      if (m) return m[1];
    }
    return null;
  }

  // ── 辅助：在对象中递归找 product id ────────────────────────────────────────
  function deepFindId(obj, depth) {
    if (depth <= 0 || !obj || typeof obj !== "object") return null;
    for (const key of Object.keys(obj)) {
      if (/^Product:(\d+)$/.test(key)) return key.match(/(\d+)$/)[1];
      if ((key === "product_id" || key === "productId" || key === "id") &&
          typeof obj[key] === "number" && obj[key] > 0) {
        // 确认附近有 Product 类型标志
        const str = JSON.stringify(obj);
        if (str.includes("Product") || str.includes("product")) return String(obj[key]);
      }
      const found = deepFindId(obj[key], depth - 1);
      if (found) return found;
    }
    return null;
  }

  // ── 1. URL 解析：/custom/{category}/{numeric_id}/{slug} ───────────────────
  const urlMatch = pathname.match(/^\/custom\/([^/]+)\/(\d+)\/([^/]+)/);
  if (urlMatch) {
    category   = urlMatch[1];
    product_id = urlMatch[2];
  }

  // ── 2. JSON-LD ────────────────────────────────────────────────────────────
  if (!product_id || !name) {
    document.querySelectorAll('script[type="application/ld+json"]').forEach((s) => {
      try {
        const d     = JSON.parse(s.textContent);
        const items = Array.isArray(d) ? d : [d];
        items.forEach((item) => {
          if (item["@type"] !== "Product") return;
          if (!name && item.name) name = item.name;
          if (!product_id) {
            for (const c of [item.url, item.sku, item.productID, item["@id"]]) {
              if (!c) continue;
              const m = String(c).match(/\/(\d+)\//);
              if (m) { product_id = m[1]; break; }
              if (/^\d{2,6}$/.test(String(c))) { product_id = String(c); break; }
            }
          }
          // JSON-LD 整体字符串兜底扫描
          if (!product_id) product_id = scanForId(JSON.stringify(item));
        });
      } catch (_) {}
    });
  }

  // ── 3. window.__NUXT__ ────────────────────────────────────────────────────
  if (!product_id) {
    try {
      if (window.__NUXT__) {
        // 先扫 Apollo 缓存键（Nuxt + Apollo 常见结构）
        const nuxtStr = JSON.stringify(window.__NUXT__);
        // "Product:320" 键
        const apolloKeyMatch = nuxtStr.match(/"Product:(\d+)"/);
        if (apolloKeyMatch) {
          product_id = apolloKeyMatch[1];
        } else {
          product_id = scanForId(nuxtStr);
        }
      }
    } catch (_) {}
  }

  // ── 4. window.__APOLLO_STATE__ ────────────────────────────────────────────
  if (!product_id) {
    try {
      // Apollo 把缓存存成 {"Product:320": {...}} 格式，键名直接含 ID
      const apolloData = window.__APOLLO_STATE__
        || (window.__APOLLO_CLIENT__ && window.__APOLLO_CLIENT__.cache && window.__APOLLO_CLIENT__.cache.data && window.__APOLLO_CLIENT__.cache.data.data)
        || null;
      if (apolloData) {
        // 先直接扫键名（最可靠）
        for (const key of Object.keys(apolloData)) {
          const m = key.match(/CatalogProduct\/(\d+)/) || key.match(/^Product:(\d+)$/);
          if (m) { product_id = m[1]; break; }
        }
        // 键名没找到则字符串扫描
        if (!product_id) product_id = scanForId(JSON.stringify(apolloData));
      }
    } catch (_) {}
  }

  // ── 4b. 遍历所有 window.__ 开头对象寻找 Apollo 缓存 ─────────────────────
  if (!product_id) {
    try {
      for (const key of Object.keys(window)) {
        if (!key.startsWith("__")) continue;
        const val = window[key];
        if (!val || typeof val !== "object") continue;
        // 找含 "Product:数字" 键的对象
        const keys = Object.keys(val);
        for (const k of keys) {
          const m = k.match(/CatalogProduct\/(\d+)/) || k.match(/^Product:(\d+)$/);
          if (m) { product_id = m[1]; break; }
        }
        if (product_id) break;
      }
    } catch (_) {}
  }

  // ── 5. 扫描所有内联 <script> 文本 ────────────────────────────────────────
  if (!product_id) {
    const scripts = document.querySelectorAll("script:not([src]):not([type='application/ld+json'])");
    for (const s of scripts) {
      const id = scanForId(s.textContent);
      if (id) { product_id = id; break; }
    }
  }

  // ── 6. 品类：面包屑 > URL 提取 ───────────────────────────────────────────
  if (!category) {
    const crumbSelectors = [
      'nav[aria-label="breadcrumb"] a',
      '[class*="breadcrumb"] a',
      '[class*="Breadcrumb"] a',
    ];
    for (const sel of crumbSelectors) {
      const crumbs = document.querySelectorAll(sel);
      if (crumbs.length >= 2) {
        const href = crumbs[crumbs.length - 2].getAttribute("href") || "";
        const m    = href.match(/\/custom\/([^/?#]+)/);
        if (m) { category = m[1]; break; }
      }
    }
  }
  if (!category) {
    // 取 URL 中 /custom/ 后第一段，过滤纯筛选词
    const m = pathname.match(/^\/custom\/([^/]+)/);
    if (m && !["mens","womens","kids","all","unisex"].includes(m[1])) category = m[1];
  }

  // ── 7. 商品名称兜底 ───────────────────────────────────────────────────────
  if (!name) {
    const h1 = document.querySelector("h1");
    if (h1) name = h1.textContent.trim();
  }
  if (!name) {
    const og = document.querySelector('meta[property="og:title"]');
    if (og) name = (og.getAttribute("content") || "").split("|")[0].trim() || null;
  }
  if (!name) {
    name = document.title.split("|")[0].trim() || null;
  }

  return { product_id, category, name, url };
}

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  pickedList = await loadList();
  renderList();

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab || !tab.url || !tab.url.includes("printful.com/custom/")) {
    showError("⚠️ 当前页面不是 Printful 商品页");
    return;
  }

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func:   extractFn,
      world:  "MAIN",   // 必须在页面主世界运行，才能访问 window.__NUXT__ / Apollo 缓存
    });
    const result = results && results[0] && results[0].result;
    currentProduct = result;
    renderCurrentProduct(currentProduct);
  } catch (err) {
    showError("⚠️ 脚本注入失败：" + (err && err.message ? err.message : String(err)));
  }
}

// ── Events ────────────────────────────────────────────────────────────────────
addBtn.addEventListener("click", async () => {
  if (!currentProduct || !currentProduct.product_id) return;
  const item = {
    product_id: currentProduct.product_id,
    name:       currentProduct.name     || null,
    category:   currentProduct.category || null,
    url:        currentProduct.url      || null,
    added_at:   new Date().toISOString(),
  };
  pickedList.push(item);
  await saveList(pickedList);
  renderList();
  productInfo.style.display    = "none";
  duplicateState.style.display = "block";
});

productList.addEventListener("click", async (e) => {
  const btn = e.target.closest(".product-item__remove");
  if (!btn) return;
  pickedList.splice(parseInt(btn.dataset.index, 10), 1);
  await saveList(pickedList);
  renderList();
  if (currentProduct) renderCurrentProduct(currentProduct);
});

clearBtn.addEventListener("click", async () => {
  if (!confirm(`确认清空全部 ${pickedList.length} 条选品记录？`)) return;
  pickedList = [];
  await saveList(pickedList);
  renderList();
  if (currentProduct) renderCurrentProduct(currentProduct);
});

exportBtn.addEventListener("click", () => {
  if (pickedList.length === 0) return;
  const exportData = {
    exported_at: new Date().toISOString(),
    total:       pickedList.length,
    products:    pickedList.map(({ product_id, name, category, url, added_at }) =>
                   ({ product_id, name, category, url, added_at })),
  };
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
  const a    = Object.assign(document.createElement("a"), {
    href:     URL.createObjectURL(blob),
    download: `printful_picks_${new Date().toISOString().slice(0, 10)}.json`,
  });
  a.click();
  URL.revokeObjectURL(a.href);
});

// ── Utils ─────────────────────────────────────────────────────────────────────
function escHtml(str) {
  return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

// ── Boot ──────────────────────────────────────────────────────────────────────
init();
