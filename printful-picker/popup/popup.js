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

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  pickedList = await loadList();
  renderList();

  // 查询当前激活标签页
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab || !tab.url || !tab.url.includes("printful.com/custom/")) {
    loadingState.style.display = "none";
    errorState.style.display   = "block";
    return;
  }

  // 向 content script 请求商品信息
  try {
    const response = await chrome.tabs.sendMessage(tab.id, { type: "GET_PRODUCT_INFO" });
    if (response && response.success) {
      currentProduct = response.data;
      renderCurrentProduct(currentProduct);
    } else {
      loadingState.style.display = "none";
      errorState.style.display   = "block";
    }
  } catch (_) {
    // content script 未注入（页面刚加载）时，尝试注入后重试
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content_script.js"],
      });
      const response = await chrome.tabs.sendMessage(tab.id, { type: "GET_PRODUCT_INFO" });
      if (response && response.success) {
        currentProduct = response.data;
        renderCurrentProduct(currentProduct);
      } else {
        loadingState.style.display = "none";
        errorState.style.display   = "block";
      }
    } catch (_) {
      loadingState.style.display = "none";
      errorState.style.display   = "block";
    }
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
