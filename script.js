// 主逻辑模块 - DOM 操作、事件绑定、页面增强

// 状态管理
const state = {
  simplifiedMode: false,
  focusMode: false,
  hiddenElements: [],
  originalStyles: new Map(),
};

// ===== 工具函数 =====

function setStatus(message, type = 'info') {
  const statusEl = document.getElementById('status-message');
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.className = `status-message status-${type}`;
}

function setResult(html) {
  const resultEl = document.getElementById('result-content');
  if (!resultEl) return;
  resultEl.innerHTML = html;
}

function getPageText() {
  // 提取页面主要文本，过滤脚本和样式
  const clone = document.body.cloneNode(true);
  clone.querySelectorAll('script, style, noscript').forEach(el => el.remove());
  return clone.innerText.replace(/\s+/g, ' ').trim();
}

// ===== 页面摘要 =====

async function handleSummary() {
  setStatus('正在提取页面内容...', 'loading');
  setResult('<p class="placeholder">生成中，请稍候...</p>');

  const pageText = getPageText();
  if (!pageText) {
    setStatus('未能提取到页面文本', 'error');
    setResult('<p class="placeholder">当前页面没有可提取的文本内容。</p>');
    return;
  }

  setStatus('正在调用 AI 生成摘要...', 'loading');
  const summary = await generatePageSummary(pageText);

  setResult(`<div class="summary-box"><h3>页面摘要</h3><p>${summary}</p></div>`);
  setStatus('摘要生成完成', 'success');
}

// ===== 图片语义增强 =====

async function handleImageEnhance() {
  const images = Array.from(document.querySelectorAll('img')).filter(img => {
    // 过滤掉控制面板内的图片和过小的图片
    return !img.closest('#awe-panel') && img.naturalWidth > 50;
  });

  if (images.length === 0) {
    setStatus('当前页面未找到有效图片', 'info');
    setResult('<p class="placeholder">没有找到需要增强的图片。</p>');
    return;
  }

  setStatus(`找到 ${images.length} 张图片，正在处理...`, 'loading');

  const results = [];
  for (let i = 0; i < Math.min(images.length, 5); i++) {
    const img = images[i];
    const desc = await generateImageDescription(img);
    // 写入 alt 属性
    if (!img.alt || img.alt.trim() === '') {
      img.setAttribute('alt', desc);
    }
    // 添加视觉标注
    img.setAttribute('title', desc);
    results.push(`<li><strong>图片 ${i + 1}:</strong> ${desc}</li>`);
  }

  setResult(`<div class="image-results"><h3>图片语义增强结果</h3><ul>${results.join('')}</ul>${images.length > 5 ? `<p class="note">（仅展示前 5 张，共 ${images.length} 张）</p>` : ''}</div>`);
  setStatus('图片语义增强完成', 'success');
}

// ===== 简化展示 =====

function handleSimplify() {
  if (state.simplifiedMode) {
    // 恢复
    state.hiddenElements.forEach(el => {
      el.style.display = '';
    });
    state.hiddenElements = [];
    state.simplifiedMode = false;
    document.getElementById('btn-simplify').textContent = '简化展示';
    setStatus('已恢复原始页面', 'info');
    setResult('<p class="placeholder">已退出简化模式。</p>');
    return;
  }

  // 隐藏常见干扰元素
  const noiseSelectors = [
    'nav', 'header', 'footer', 'aside',
    '[class*="sidebar"]', '[class*="banner"]',
    '[class*="ad"]', '[class*="popup"]',
    '[id*="sidebar"]', '[id*="banner"]',
  ];

  noiseSelectors.forEach(selector => {
    document.querySelectorAll(selector).forEach(el => {
      if (!el.closest('#awe-panel') && el.style.display !== 'none') {
        el.style.display = 'none';
        state.hiddenElements.push(el);
      }
    });
  });

  state.simplifiedMode = true;
  document.getElementById('btn-simplify').textContent = '恢复原始';
  setStatus(`已隐藏 ${state.hiddenElements.length} 个干扰元素`, 'success');
  setResult(`<div class="simplify-result"><h3>简化展示</h3><p>已隐藏 ${state.hiddenElements.length} 个导航/侧栏/页脚等干扰区域。</p><p>点击「恢复原始」可撤销。</p></div>`);
}

// ===== 专注模式 =====

function handleFocusMode() {
  if (state.focusMode) {
    document.body.classList.remove('awe-focus-mode');
    state.focusMode = false;
    document.getElementById('btn-focus').textContent = '专注模式';
    setStatus('已退出专注模式', 'info');
    return;
  }

  document.body.classList.add('awe-focus-mode');
  state.focusMode = true;
  document.getElementById('btn-focus').textContent = '退出专注';
  setStatus('专注模式已开启', 'success');
  setResult('<div class="focus-result"><h3>专注模式</h3><p>页面已进入专注模式，降低视觉干扰，提升阅读体验。</p></div>');
}

// ===== 恢复全部 =====

function handleRestoreAll() {
  // 恢复简化模式
  if (state.simplifiedMode) {
    state.hiddenElements.forEach(el => { el.style.display = ''; });
    state.hiddenElements = [];
    state.simplifiedMode = false;
    document.getElementById('btn-simplify').textContent = '简化展示';
  }
  // 恢复专注模式
  if (state.focusMode) {
    document.body.classList.remove('awe-focus-mode');
    state.focusMode = false;
    document.getElementById('btn-focus').textContent = '专注模式';
  }
  setStatus('已恢复页面原始状态', 'success');
  setResult('<p class="placeholder">所有增强效果已撤销。</p>');
}

// ===== 事件绑定 =====

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-summary').addEventListener('click', handleSummary);
  document.getElementById('btn-image').addEventListener('click', handleImageEnhance);
  document.getElementById('btn-simplify').addEventListener('click', handleSimplify);
  document.getElementById('btn-focus').addEventListener('click', handleFocusMode);
  document.getElementById('btn-restore').addEventListener('click', handleRestoreAll);
});
