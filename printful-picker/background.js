/**
 * Printful 选品助手 - Background Service Worker
 *
 * 职责：
 * 1. 监听 storage 变化，实时更新插件图标上的 Badge 数字
 * 2. 插件安装 / 更新时初始化默认数据
 */

// 初始化
chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === "install") {
    chrome.storage.local.set({ pickedList: [] });
    chrome.action.setBadgeBackgroundColor({ color: "#6c63ff" });
    chrome.action.setBadgeText({ text: "" });
  }
});

// 监听 storage 变化，同步更新 badge
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || !changes.pickedList) return;

  const newList = changes.pickedList.newValue || [];
  const count   = newList.length;

  chrome.action.setBadgeText({ text: count > 0 ? String(count) : "" });
  chrome.action.setBadgeBackgroundColor({ color: "#6c63ff" });
});
