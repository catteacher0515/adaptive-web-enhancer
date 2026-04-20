// Chrome 扩展 Content Script - 自动注入无障碍增强面板

(function () {
  // 防止重复注入
  if (document.getElementById('awe-panel')) {
    return;
  }

  // ===== 配置 =====
  const CONFIG = {
    DEEPSEEK_API_KEY: 'sk-a4700311dcf940edab100900fbf0f33e',
    DEEPSEEK_API_URL: 'https://api.deepseek.com/v1/chat/completions',
    DEEPSEEK_MODEL: 'deepseek-chat',
  };

  // ===== 注入面板 HTML =====
  const panel = document.createElement('div');
  panel.id = 'awe-panel';
  panel.setAttribute('role', 'complementary');
  panel.setAttribute('aria-label', '无障碍增强控制面板');
  panel.innerHTML = '<div id=\'awe-panel-header\'><div class=\'panel-title\'><span>♿</span><span>无障碍增强</span></div><button id=\'awe-panel-toggle\' aria-label=\'收起面板\'>−</button></div><div id=\'awe-panel-body\'><div class=\'awe-btn-group\'><button class=\'awe-btn awe-btn-primary\' id=\'awe-btn-summary\'><span class=\'btn-icon\'>📄</span><span class=\'btn-label\'>生成页面摘要</span></button><button class=\'awe-btn awe-btn-primary\' id=\'awe-btn-image\'><span class=\'btn-icon\'>🖼️</span><span class=\'btn-label\'>图片语义增强</span></button><button class=\'awe-btn awe-btn-secondary\' id=\'awe-btn-simplify\'><span class=\'btn-icon\'>✂️</span><span class=\'btn-label\'>简化展示</span></button><button class=\'awe-btn awe-btn-restore\' id=\'awe-btn-restore\'><span class=\'btn-icon\'>↩️</span><span class=\'btn-label\'>恢复默认页面</span></button></div><div id=\'awe-status\' class=\'status-message status-info\' role=\'status\' aria-live=\'polite\'>就绪 — 选择一项功能开始体验</div><div id=\'awe-result-content\' aria-live=\'polite\'><p class=\'placeholder\'>功能结果将显示在这里...</p></div></div>';
  document.body.appendChild(panel);

  // ===== 工具函数 =====
  function setStatus(msg, type = 'info') {
    const el = document.getElementById('awe-status');
    if (el) {
      el.textContent = msg;
      el.className = `status-message status-${type}`;
    }
  }

  function setResult(html) {
    const el = document.getElementById('awe-result-content');
    if (el) el.innerHTML = html;
  }

  function getPageText() {
    const clone = document.body.cloneNode(true);
    clone.querySelectorAll('script, style, noscript, #awe-panel').forEach(el => el.remove());
    return clone.innerText.replace(/\s+/g, ' ').trim();
  }

  // ===== AI 调用 =====
  async function callDeepSeek(messages, maxTokens = 300) {
    const res = await fetch(CONFIG.DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: CONFIG.DEEPSEEK_MODEL,
        messages,
        temperature: 0.5,
        max_tokens: maxTokens
      })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || res.status);
    }
    const data = await res.json();
    return data.choices[0].message.content.trim();
  }

  // ===== 页面摘要 =====
  async function handleSummary() {
    setStatus('正在提取页面内容...', 'loading');
    setResult('<p class=\'placeholder\'>生成中，请稍候...</p>');
    const text = getPageText();
    if (!text) {
      setStatus('未能提取到页面文本', 'error');
      return;
    }
    const truncated = text.length > 3000 ? text.substring(0, 3000) + '...' : text;
    setStatus('正在调用 AI 生成摘要...', 'loading');
    try {
      const summary = await callDeepSeek([
        { role: 'system', content: '你是一个网页内容摘要助手。请用简洁的语言总结网页的核心内容，包括：1) 这是什么页面 2) 主要内容是什么 3) 用户可以做什么。控制在 100 字以内。' },
        { role: 'user', content: `请总结以下网页内容：\n\n${truncated}` }
      ]);
      setResult(`<h3>📄 页面摘要</h3><p>${summary}</p>`);
      setStatus('摘要生成完成', 'success');
    } catch (e) {
      setStatus('生成失败: ' + e.message, 'error');
      setResult(`<p class=\'placeholder\'>❌ ${e.message}</p>`);
    }
  }

  // ===== 图片语义增强 =====
  async function handleImageEnhance() {
    const images = Array.from(document.querySelectorAll('img')).filter(img =>
      !img.closest('#awe-panel') && (img.naturalWidth || img.width) > 50
    );
    if (images.length === 0) {
      setStatus('当前页面未找到有效图片', 'info');
      setResult('<p class=\'placeholder\'>没有找到需要增强的图片。</p>');
      return;
    }
    const total = Math.min(images.length, 10);
    setStatus(`找到 ${images.length} 张图片，正在处理前 ${total} 张...`, 'loading');
    const results = [];
    for (let i = 0; i < total; i++) {
      const img = images[i];
      const existingAlt = img.alt ? img.alt.trim() : '';
      let desc;
      if (existingAlt.length > 2) {
        desc = `已有描述：${existingAlt}`;
      } else {
        setStatus(`正在处理第 ${i + 1}/${total} 张图片...`, 'loading');
        try {
          // 向上最多找 4 层父元素，提取最有意义的文本（标题、描述等）
          let contextText = '';
          let el = img.parentElement;
          for (let depth = 0; depth < 4 && el; depth++) {
            const text = el.innerText ? el.innerText.replace(/\s+/g, ' ').trim() : '';
            if (text.length > contextText.length && text.length < 300) {
              contextText = text;
            }
            el = el.parentElement;
          }
          // 同级的 aria-label / title / figcaption 也纳入
          const ariaLabel = img.closest('figure')?.querySelector('figcaption')?.innerText || '';
          const titleAttr = img.title || '';
          const extraContext = [ariaLabel, titleAttr].filter(Boolean).join(' / ');

          desc = await callDeepSeek([{
            role: 'user',
            content: `你是网页无障碍助手。请根据以下信息为图片生成一句简洁的中文 alt 描述（15字以内，不要加引号）。\n周边文字（最重要的参考）：${contextText || '无'}\n额外信息：${extraContext || '无'}\n\n注意：周边文字通常就是图片的标题或说明，直接用它来描述图片内容。只输出描述文字本身。`
          }], 40);
        } catch (e) {
          desc = '图片';
        }
        img.setAttribute('alt', desc);
        img.setAttribute('title', desc);
      }
      results.push(`<li><strong>图片 ${i + 1}：</strong>${desc}</li>`);
    }
    const noteText = images.length > total ? `<p class=\'note\'>已处理前 ${total} 张，共 ${images.length} 张</p>` : '';
    setResult(`<h3>🖼️ 图片语义增强结果</h3><ul>${results.join('')}</ul>${noteText}`);
    setStatus(`已完成 ${total} 张图片语义增强`, 'success');
  }

  // ===== 简化展示 — 两层架构 =====
  const hiddenEls = [];
  let simplified = false;

  // Layer A：平台专用适配
  const PLATFORM_RULES = {
    'sina.com': {
      name: '新浪新闻',
      selectors: [
        '#header', '#nav', '#footer', '#side', '#right',
        '.top-nav', '.nav-wrap', '.side-bar', '.right-bar', '.right-side',
        '.footer-wrap', '.bottom-bar',
        '[class*="recommend"]', '[class*="hot-news"]', '[class*="side-"]',
        '[class*="ad-"]', '[id*="ad-"]', '[class*="float"]',
        '[class*="related"]', '[class*="more-news"]',
      ]
    },
    'toutiao.com': {
      name: '今日头条',
      selectors: [
        // 顶部区域
        '.toutiao-header', '.search-container',
        '[class*="header-notification"]', '[class*="header-publisher"]',
        // 右侧整个侧边栏
        '.right-container',
        // 热榜和下载横幅
        '.home-hotboard', '.ttp-hot-board', '.download-app-banner',
        // 通用干扰元素
        '[class*="ad"]', '[class*="float"]', '[class*="fixed"]',
        '[class*="recommend"]', '[class*="related"]',
        '[class*="footer"]', '[class*="bottom"]',
      ]
    },
    'xiaohongshu.com': {
      name: '小红书',
      selectors: [
        '[class*="side-bar"]', '[class*="sidebar"]',
        '[class*="header"]', '[class*="nav-bar"]',
        '[class*="search-bar"]', '[class*="login"]',
        '[class*="guide"]', '[class*="float"]',
        '[class*="download"]', '[class*="app-"]',
        '[class*="footer"]', '[class*="bottom"]',
      ]
    },
    'baidu.com': {
      name: '百度',
      selectors: [
        '#s_top_wrap', '#head', '#bottom_layer', '#foot',
        '#content_right', '#rs_top_new', '#rs_new',
        '[class*="right-wrap"]', '[class*="aside"]',
        '[class*="recommend"]', '[class*="hot"]',
        '[id*="con-ar"]', '[class*="ad"]',
      ]
    },
  };

  // Layer B：通用兜底逻辑
  const FALLBACK_SELECTORS = [
    'nav', 'header', 'footer', 'aside',
    '[class*="sidebar"]', '[class*="banner"]',
    '[class*="ad"]', '[class*="popup"]',
    '[class*="modal"]', '[class*="overlay"]',
    '[id*="sidebar"]', '[id*="header"]', '[id*="footer"]', '[id*="nav"]',
  ];

  function getSelectors() {
    const host = location.hostname;
    for (const [domain, rule] of Object.entries(PLATFORM_RULES)) {
      if (host.includes(domain)) {
        return { selectors: rule.selectors, platformName: rule.name };
      }
    }
    return { selectors: FALLBACK_SELECTORS, platformName: null };
  }

  function handleSimplify() {
    if (simplified) {
      hiddenEls.forEach(el => { el.style.display = ''; });
      hiddenEls.length = 0;
      simplified = false;
      document.querySelector('#awe-btn-simplify .btn-label').textContent = '简化展示';
      setStatus('已恢复原始页面', 'info');
      setResult('<p class=\'placeholder\'>已退出简化模式。</p>');
      return;
    }

    const { selectors, platformName } = getSelectors();
    selectors.forEach(sel => {
      try {
        document.querySelectorAll(sel).forEach(el => {
          if (!el.closest('#awe-panel') && el.style.display !== 'none') {
            el.style.display = 'none';
            hiddenEls.push(el);
          }
        });
      } catch (e) { /* 忽略无效选择器 */ }
    });

    simplified = true;
    document.querySelector('#awe-btn-simplify .btn-label').textContent = '恢复展示';
    const label = platformName ? `（${platformName}专项适配）` : '（通用模式）';
    setStatus(`已隐藏 ${hiddenEls.length} 个干扰元素 ${label}`, 'success');
    setResult(`<h3>✂️ 简化展示</h3><p>已隐藏 ${hiddenEls.length} 个干扰区域${label}。</p><p>点击「恢复默认页面」可撤销。</p>`);
  }

  // ===== 恢复默认 =====
  function handleRestore() {
    if (simplified) {
      hiddenEls.forEach(el => { el.style.display = ''; });
      hiddenEls.length = 0;
      simplified = false;
      document.querySelector('#awe-btn-simplify .btn-label').textContent = '简化展示';
    }
    setStatus('已恢复页面原始状态', 'success');
    setResult('<p class=\'placeholder\'>所有增强效果已撤销。</p>');
  }

  // ===== 事件绑定 =====
  document.getElementById('awe-btn-summary').addEventListener('click', handleSummary);
  document.getElementById('awe-btn-image').addEventListener('click', handleImageEnhance);
  document.getElementById('awe-btn-simplify').addEventListener('click', handleSimplify);
  document.getElementById('awe-btn-restore').addEventListener('click', handleRestore);

  document.getElementById('awe-panel-toggle').addEventListener('click', function () {
    const body = document.getElementById('awe-panel-body');
    const collapsed = body.style.display === 'none';
    body.style.display = collapsed ? '' : 'none';
    this.textContent = collapsed ? '−' : '+';
  });

})();
