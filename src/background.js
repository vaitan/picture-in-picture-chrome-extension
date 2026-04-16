let isUpdating = false;

chrome.action.onClicked.addListener(async (tab) => {
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      files: ["script.js"],
    });
  } catch (err) {
    console.error("executeScript error:", err);
  }
});

chrome.runtime.onInstalled.addListener(async () => {
  await setupContextMenu();
  const { autoPip } = await chrome.storage.local.get({ autoPip: true });
  await safeUpdateContentScripts(autoPip);
});

chrome.runtime.onStartup.addListener(async () => {
  chrome.action.setBadgeBackgroundColor({ color: "#4285F4" });
  chrome.action.setBadgeTextColor({ color: "#fff" });

  const { autoPip } = await chrome.storage.local.get({ autoPip: true });
  await safeUpdateContentScripts(autoPip);
});

chrome.contextMenus.onClicked.addListener(async ({ checked }) => {
  await chrome.storage.local.set({ autoPip: checked });
  await safeUpdateContentScripts(checked);
});

async function setupContextMenu() {
  return new Promise((resolve) => {
    chrome.contextMenus.remove("autoPip", () => {
      chrome.contextMenus.create({
        id: "autoPip",
        contexts: ["action"],
        title: "Automatic picture-in-picture (BETA)",
        type: "checkbox",
        checked: true,
      });
      resolve();
    });
  });
}

async function safeUpdateContentScripts(autoPip) {
  if (isUpdating) return;
  isUpdating = true;

  try {
    chrome.action.setTitle({
      title: `Automatic picture-in-picture (${autoPip ? "on" : "off"})`,
    });

    chrome.action.setBadgeText({ text: autoPip ? "★" : "" });

    // 🔥 luôn unregister trước để tránh duplicate
    await chrome.scripting.unregisterContentScripts({
      ids: ["autoPip"],
    }).catch(() => {});

    if (!autoPip) return;

    await chrome.scripting.registerContentScripts([
      {
        id: "autoPip",
        js: ["autoPip.js"],
        matches: ["<all_urls>"],
        runAt: "document_start",
      },
    ]);
  } catch (err) {
    console.error("updateContentScripts error:", err);
  } finally {
    isUpdating = false;
  }
}
