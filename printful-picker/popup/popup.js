/**
 * Printful 选品助手 - Popup Script
 */

// ── DOM refs ──────────────────────────────────────────────────────────────────
const badge        = document.getElementById("badge");
const loadingState = document.getElementById("loadingState");
const productInfo  = document.getElementById("productInfo");
const errorState   = document.getElementById("errorState");
const duplicateState = document.getElementById("duplicateState");
const pName        = document.getElementById("pName");
const pCategory    = document.getElementById("pCategory");
const pId          = document.getElementById("pId");
const addBtn       = document.getElementById("addBtn");
const emptyState   = document.getElementById("emptyState");
const productList  = document.getElementById("productList");
const footer       = document.getElementById("footer");
const clearBtn     = document.getElementById("clearBtn");
const exportBtn    = document.getElementById("exportBtn");

// ── State ─────────────────────────────────────────────────────────────────────
let currentProduct = null; // 当前页面商品数据
let pickedList = [];       // 已选品列表

// ── Storage helpers ───────────────────────────────────────────────────────────
function loadList() {
  return new Promise((resolve) => {
    chrome.storage.local.get("pickedList", (data) => {
      resolve(data.pickedList || []);
    });
  });
}

function saveList(list) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ pickedList: list }, resolve);
  });
}

// ── Render ────────────────────────────────────────────────────────────────────
function renderList() {
  badge.textContent = pickedList.length;
  const hasList = pickedList.length > 0;

  emptyState.style.display = hasList ? "none" : "block";
  footer.style.display      = hasList ? "flex"  : "none";

  productList.innerHTML = "";
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

function renderCurrentProduct(data) {
  loadingState.style.display   = "none";
  errorState.style.display     = "none";
  duplicateState.style.display = "none";
  productInfo.style.display    = "none";

  if (!data || !data.product_id) {
    errorState.style.display = "block";
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

// ── 直接注入函数提取数据（无需 sendMessage，避免时序问题）─────────────────────
function extractFn() {
  const url      = window.location.href;
  const pathname = window.location.pathname;

  // 1. URL 解析：/custom/{category}/{id}/{slug}
  let product_id = null;
  let category   = null;
  const urlMatch = pathname.match(/^\/custom\/([^/]+)\/(\d+)\/([^/]+)/);
  if (urlMatch) {
    category   = urlMatch[1];
    product_id = urlMatch[2];
  }

  // 2. JSON-LD 兜底
  if (!product_id) {
    document.querySelectorAll('script[type="application/ld+json"]').forEach((s) => {
      try {
        const d = JSON.parse(s.textContent);
        const items = Array.isArray(d) ? d : [d];
        items.forEach((item) => {
          if (item["@type"] === "Product" && !product_id) {
            [item.url, item.sku, item.productID].forEach((c) => {
              if (!c) return;
              const m = String(c).match(/\/(\d+)\//);
              if (m) product_id = m[1];
              else if (/^\d+$/.test(String(c))) product_id = String(c);
            });
          }
        });
      } catch (_) {}
    });
  }

  // 3. window.__NUXT__ 兜底
  if (!product_id) {
    try {
      if (window.__NUXT__) {
        const str = JSON.stringify(window.__NUXT__);
        const m = str.match(/"product_id"\s*:\s*(\d+)/) || str.match(/"productId"\s*:\s*(\d+)/);
        if (m) product_id = m[1];
      }
    } catch (_) {}
  }

  // 4. 品类：面包屑 > URL 第二段
  if (!category) {
    const crumbs = document.querySelectorAll('nav[aria-label="breadcrumb"] a, [class*="breadcrumb"] a');
    if (crumbs.length >= 2) {
      const href = crumbs[crumbs.length - 2].getAttribute("href") || "";
      const m = href.match(/\/custom\/([^/]+)/);
      if (m) category = m[1];
    }
  }
  if (!category) {
    const m = pathname.match(/^\/custom\/([^/]+)/);
    if (m) category = m[1];
  }

  // 5. 商品名称：JSON-LD > H1 > og:title
  let name = null;
  document.querySelectorAll('script[type="application/ld+json"]').forEach((s) => {
    try {
      const d = JSON.parse(s.textContent);
      const items = Array.isArray(d) ? d : [d];
      items.forEach((item) => { if (item["@type"] === "Product" && !name) name = item.name; });
    } catch (_) {}
  });
  if (!name) {
    const h1 = document.querySelector("h1");
    if (h1) name = h1.textContent.trim();
  }
  if (!name) {
    const og = document.querySelector('meta[property="og:title"]');
    if (og) name = og.getAttribute("content")?.trim();
  }

  return { product_id, category, name, url };
}

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  pickedList = await loadList();
  renderList();

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab || !tab.url || !tab.url.includes("printful.com/custom/")) {
    loadingState.style.display = "none";
    errorState.style.display   = "block";
    return;
  }

  // 直接向页面注入函数并获取返回值，无需 sendMessage
  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractFn,
    });
    currentProduct = result;
    renderCurrentProduct(currentProduct);
  } catch (err) {
    loadingState.style.display = "none";
    errorState.style.display   = "block";
  }
}

// ── Events ────────────────────────────────────────────────────────────────────
addBtn.addEventListener("click", async () => {
  if (!currentProduct || !currentProduct.product_id) return;

  const item = {
    product_id: currentProduct.product_id,
    name:       currentProduct.name || null,
    category:   currentProduct.category || null,
    url:        currentProduct.url || null,
    added_at:   new Date().toISOString(),
  };

  pickedList.push(item);
  await saveList(pickedList);
  renderList();
  // 切换为"已添加"提示
  productInfo.style.display    = "none";
  duplicateState.style.display = "block";
});

// 点击移除按钮（事件委托）
productList.addEventListener("click", async (e) => {
  const btn = e.target.closest(".product-item__remove");
  if (!btn) return;
  const index = parseInt(btn.dataset.index, 10);
  pickedList.splice(index, 1);
  await saveList(pickedList);
  renderList();
  // 重新判断当前商品是否还在列表中
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
    total: pickedList.length,
    products: pickedList.map((item) => ({
      product_id: item.product_id,
      name:       item.name,
      category:   item.category,
      url:        item.url,
      added_at:   item.added_at,
    })),
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a   = document.createElement("a");
  const ts  = new Date().toISOString().slice(0, 10);
  a.href     = url;
  a.download = `printful_picks_${ts}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

// ── Utils ─────────────────────────────────────────────────────────────────────
function escHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── Boot ──────────────────────────────────────────────────────────────────────
init();
