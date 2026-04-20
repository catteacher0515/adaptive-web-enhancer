document.getElementById('activate-btn').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      const panel = document.getElementById('awe-panel');
      if (panel) {
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
      }
    }
  });
  document.getElementById('status').textContent = '✅ 面板已切换';
  setTimeout(() => window.close(), 500);
});
