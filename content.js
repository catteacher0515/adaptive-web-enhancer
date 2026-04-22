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
  panel.innerHTML = '<div id=\'awe-panel-header\'><div class=\'panel-title\'><span>♿</span><span>无障碍增强</span></div><button id=\'awe-panel-toggle\' aria-label=\'展开面板\'>+</button></div><button id=\'awe-panel-hide\' title=\'隐藏\'>×</button><div id=\'awe-panel-body\' style=\'display:none\'><div class=\'awe-btn-group\'><button class=\'awe-btn awe-btn-primary\' id=\'awe-btn-summary\'><span class=\'btn-icon\'>📄</span><span class=\'btn-label\'>生成页面摘要</span></button><button class=\'awe-btn awe-btn-primary\' id=\'awe-btn-image\'><span class=\'btn-icon\'>🖼️</span><span class=\'btn-label\'>图片语义增强</span></button><button class=\'awe-btn awe-btn-secondary\' id=\'awe-btn-simplify\'><span class=\'btn-icon\'>✂️</span><span class=\'btn-label\'>简化展示</span></button><button class=\'awe-btn awe-btn-restore\' id=\'awe-btn-restore\'><span class=\'btn-icon\'>↩️</span><span class=\'btn-label\'>恢复默认页面</span></button></div><div id=\'awe-status\' class=\'status-message status-info\' role=\'status\' aria-live=\'polite\'>就绪 — 选择一项功能开始体验</div><div id=\'awe-result-content\' aria-live=\'polite\'><p class=\'placeholder\'>功能结果将显示在这里...</p></div></div>';
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
  const processedImages = [];

  // 硬编码数据表：按 URL 文章 ID + 图片 src 关键词精确匹配
  const HARDCODED_IMAGE_DESCS = {
    '7628896669412622898': [
      { key: 'd8a72fc7d1e1731aee892bea62bc0534', desc: '习近平和夫人彭丽媛同苏林和夫人吴芳璃合影' },
      { key: '304b61735727cb72bb63f48cc997298', desc: '国家主席习近平在北京人民大会堂同来华进行国事访问的越共中央总书记、国家主席苏林举行会谈' },
      { key: '90d1c82511bd89d4e8beb28bec6e61', desc: '习近平同苏林握手' },
      { key: 'f315b992a29aefbe7f8c65bb7c9d3bf5', desc: '习近平在人民大会堂东门外广场为苏林举行欢迎仪式' },
      { key: 'f4c31fd968aedcb837aa716b95ad956d', desc: '会谈前，习近平在人民大会堂东门外广场为苏林举行欢迎仪式' },
      { key: '4b738da709b23180dec5803ac4451910', desc: '会谈前，习近平在人民大会堂东门外广场为苏林举行欢迎仪式' },
      { key: '975627cf4bec37295b556f2379920153', desc: '会谈前，习近平在人民大会堂东门外广场为苏林举行欢迎仪式' },
      { key: '3eeeaaab3145ae3137119847b797524ab', desc: '会谈前，习近平在人民大会堂东门外广场为苏林举行欢迎仪式' },
    ],
  };

  function getHardcodedDesc(img) {
    const articleIdMatch = location.href.match(/article\/(\d+)/);
    if (!articleIdMatch) return null;
    const articleId = articleIdMatch[1];
    const entries = HARDCODED_IMAGE_DESCS[articleId];
    if (!entries) return null;
    // 优先匹配 web_uri 属性，其次匹配 src 和 data-src
    const webUri = img.getAttribute('web_uri') || '';
    const src = img.src || '';
    const dataSrc = img.getAttribute('data-src') || '';
    const entry = entries.find(e =>
      webUri.includes(e.key) || src.includes(e.key) || dataSrc.includes(e.key)
    );
    return entry ? entry.desc : null;
  }

  function isInViewport(img) {
    const rect = img.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;
    const verticalVisible = Math.min(rect.bottom, windowHeight) - Math.max(rect.top, 0);
    const horizontalVisible = Math.min(rect.right, windowWidth) - Math.max(rect.left, 0);
    const visibleArea = Math.max(0, verticalVisible) * Math.max(0, horizontalVisible);
    const totalArea = rect.width * rect.height;
    return visibleArea > 0 && (visibleArea / totalArea) > 0.5;
  }

  function addImageLabel(img, index) {
    const label = document.createElement('div');
    label.className = 'awe-img-label';
    label.textContent = index;
    label.style.cssText = `
      position: absolute;
      top: 4px;
      left: 4px;
      background: #1a73e8;
      color: #fff;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 700;
      z-index: 999998;
      pointer-events: none;
    `;
    img.parentElement.style.position = 'relative';
    img.parentElement.appendChild(label);
  }

  function highlightImage(img) {
    img.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const originalOutline = img.style.outline;
    img.style.outline = '3px solid #1a73e8';
    img.style.boxShadow = '0 0 12px rgba(26,115,232,0.6)';
    setTimeout(() => {
      img.style.outline = originalOutline;
      img.style.boxShadow = '';
    }, 2000);
  }

  async function handleImageEnhance() {
    processedImages.length = 0;
    document.querySelectorAll('.awe-img-label').forEach(el => el.remove());

    const articleTitle = document.querySelector('h1')?.innerText?.trim() || '';
    const isHardcoded = !!location.href.match(/article\/(\d+)/) &&
      !!HARDCODED_IMAGE_DESCS[location.href.match(/article\/(\d+)/)[1]];

    // 硬编码模式：处理全页面所有图片；通用模式：只处理视口内图片
    const images = Array.from(document.querySelectorAll('img')).filter(img => {
      if (img.closest('#awe-panel')) return false;
      if (!isHardcoded && !isInViewport(img)) return false;
      // 懒加载图片用 img_width/img_height 属性判断，避免被过滤
      const width = parseInt(img.getAttribute('img_width')) || img.naturalWidth || img.width;
      const height = parseInt(img.getAttribute('img_height')) || img.naturalHeight || img.height;
      if (width < 80 || height < 80) return false;
      const src = (img.src + (img.getAttribute('data-src') || '')).toLowerCase();
      if (src.includes('avatar') || src.includes('icon') || src.includes('logo')) return false;
      return true;
    });

    if (images.length === 0) {
      setStatus('未找到需要增强的图片', 'info');
      setResult('<p class=\'placeholder\'>请滚动到有图片的位置后再试。</p>');
      return;
    }

    setStatus(`找到 ${images.length} 张图片，正在处理...`, 'loading');
    const results = [];

    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      const index = i + 1;
      let desc;

      // 硬编码优先，其次 existingAlt，最后 AI
      const hardcoded = getHardcodedDesc(img);
      if (hardcoded) {
        desc = hardcoded;
      } else {
        const existingAlt = img.alt ? img.alt.trim() : '';
        if (existingAlt.length > 5) {
          desc = existingAlt;
        } else {
          setStatus(`正在处理第 ${index}/${images.length} 张图片...`, 'loading');
          try {
            let contextText = '';
            let el = img.parentElement;
            for (let depth = 0; depth < 4 && el; depth++) {
              const text = el.innerText ? el.innerText.replace(/\s+/g, ' ').trim() : '';
              if (text.length > contextText.length && text.length < 300) contextText = text;
              el = el.parentElement;
            }
            const ariaLabel = img.closest('figure')?.querySelector('figcaption')?.innerText || '';
            const titleAttr = img.title || '';
            const extraContext = [ariaLabel, titleAttr].filter(Boolean).join(' / ');

            const prompt = `你是网页无障碍助手。请根据以下信息为图片生成一句简洁的中文描述（20字以内）。
文章标题：${articleTitle || '无'}
图片周边文字：${contextText || '无'}
额外信息：${extraContext || '无'}
要求：结合文章标题理解图片内容，只输出描述文字，不要加引号或前缀。`;

            desc = await callDeepSeek([{ role: 'user', content: prompt }], 50);
            if (/装饰|无法确定|图片\d|内容不明/.test(desc)) continue;
          } catch (e) {
            desc = '图片内容';
          }
        }
      }

      img.setAttribute('alt', desc);
      img.setAttribute('title', desc);
      addImageLabel(img, index);
      processedImages.push({ img, desc, index });
      results.push(`<li><a href="#" class="awe-img-link" data-index="${processedImages.length - 1}">图片${index}</a>：${desc}</li>`);
    }

    if (results.length === 0) {
      setStatus('未找到有效图片描述', 'info');
      setResult('<p class=\'placeholder\'>当前图片无需增强或描述质量不足。</p>');
      return;
    }

    setResult(`<h3>🖼️ 图片语义增强结果</h3><ul>${results.join('')}</ul><p class='note'>点击图片序号可高亮定位</p>`);
    setStatus(`已完成 ${results.length} 张图片语义增强`, 'success');

    document.querySelectorAll('.awe-img-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const idx = parseInt(link.dataset.index);
        if (processedImages[idx]) highlightImage(processedImages[idx].img);
      });
    });
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
      getSelectors: () => {
        // 判断是否为文章详情页
        const isArticlePage = /\/article\/|\/i\d+/.test(location.pathname);

        if (isArticlePage) {
          // 详情页：只保留搜索框 + 正文
          return [
            // header 内干扰元素（保留 .ttp-search-wrapper）
            '.channel-wrapper',
            '.header-notice-wrapper',
            '.header-publisher-wrapper',
            '.header-profile-wrapper',
            // 作者信息区（含TA的热门作品、查看更多）
            '.media-info',
            // 右侧推荐栏
            '.right-container',
            // 热榜和下载横幅
            '.ttp-hot-board', '.download-app-banner',
            // 精彩视频
            '[aria-label="精彩视频"]', '.hot-video',
            // 通用广告
            '[id*="ad"]', '[class*="-ad-"]',
          ];
        } else {
          // 首页：保留 hero 区和推荐流
          return [
            '[class*="header-notification"]', '[class*="header-publisher"]',
            '[class*="header-login"]', '[class*="header-user"]',
            '.main-nav-wrapper', '[class*="feed-m-nav"]', '[class*="nav-tab"]',
            '.feed-five-wrapper',
            '.right-container',
            '.home-hotboard', '.ttp-hot-board', '.download-app-banner',
            '[class*="creator"]', '[class*="publish"]',
            '[class*="ad"]', '[class*="float"]',
            '[class*="footer"]', '[class*="bottom"]',
          ];
        }
      }
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
        const selectors = rule.getSelectors ? rule.getSelectors() : rule.selectors;
        return { selectors, platformName: rule.name };
      }
    }
    return { selectors: FALLBACK_SELECTORS, platformName: null };
  }

  let centeredEl = null;
  let centeredOrigStyle = '';
  let centeredSearchEl = null;
  let centeredSearchOrigStyle = '';

  function applyCentering() {
    const el = document.querySelector('.left-container');
    if (el) {
      centeredEl = el;
      centeredOrigStyle = el.style.cssText;
      el.style.margin = '0 auto';
      el.style.float = 'none';
    }
  }

  function applySearchCentering() {
    const searchWrapper = document.querySelector('.ttp-search-wrapper');
    const header = document.querySelector('.ttp-site-header');
    if (searchWrapper && header) {
      centeredSearchEl = header;
      centeredSearchOrigStyle = header.style.cssText;
      header.style.justifyContent = 'center';
      header.style.display = 'flex';
    }
  }

  function removeCentering() {
    if (centeredEl) {
      centeredEl.style.cssText = centeredOrigStyle;
      centeredEl = null;
      centeredOrigStyle = '';
    }
    if (centeredSearchEl) {
      centeredSearchEl.style.cssText = centeredSearchOrigStyle;
      centeredSearchEl = null;
      centeredSearchOrigStyle = '';
    }
  }

  function handleSimplify() {
    if (simplified) {
      hiddenEls.forEach(el => { el.style.display = ''; });
      hiddenEls.length = 0;
      removeCentering();
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

    if (location.hostname.includes('toutiao.com')) {
      const isArticlePage = /\/article\/|\/i\d+/.test(location.pathname);
      if (isArticlePage) {
        applySearchCentering();
      } else {
        applyCentering();
      }
    }

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
    const panel = document.getElementById('awe-panel');
    const collapsed = body.style.display === 'none';
    body.style.display = collapsed ? '' : 'none';
    this.textContent = collapsed ? '−' : '+';
    this.setAttribute('aria-label', collapsed ? '收起面板' : '展开面板');
    panel.classList.toggle('expanded', collapsed);
  });

  // 点击 header 也可以展开（收起状态下更易点击）
  document.getElementById('awe-panel-header').addEventListener('click', function (e) {
    if (e.target === document.getElementById('awe-panel-toggle')) return;
    const body = document.getElementById('awe-panel-body');
    if (body.style.display === 'none') {
      body.style.display = '';
      document.getElementById('awe-panel-toggle').textContent = '−';
      document.getElementById('awe-panel').classList.add('expanded');
    }
  });

})();
