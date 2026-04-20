// AI 语义处理模块 - DeepSeek API 调用封装

/**
 * 调用 DeepSeek API 生成页面摘要
 * @param {string} pageText - 页面文本内容
 * @returns {Promise<string>} - 生成的摘要
 */
async function generatePageSummary(pageText) {
  // 检查配置
  if (typeof CONFIG === 'undefined' || !CONFIG.DEEPSEEK_API_KEY || CONFIG.DEEPSEEK_API_KEY === 'your-api-key-here') {
    return '⚠️ 请先配置 DeepSeek API Key（复制 config.example.js 为 config.js 并填入真实 Key）';
  }

  // 截断过长文本（避免超出 token 限制）
  const maxLength = 3000;
  const truncatedText = pageText.length > maxLength
    ? pageText.substring(0, maxLength) + '...'
    : pageText;

  try {
    const response = await fetch(CONFIG.DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: CONFIG.DEEPSEEK_MODEL,
        messages: [
          {
            role: 'system',
            content: '你是一个网页内容摘要助手。请用简洁的语言总结网页的核心内容，包括：1) 这是什么页面 2) 主要内容是什么 3) 用户可以做什么。控制在 100 字以内。'
          },
          {
            role: 'user',
            content: `请总结以下网页内容：\n\n${truncatedText}`
          }
        ],
        temperature: 0.7,
        max_tokens: 300
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API 请求失败: ${response.status} - ${errorData.error?.message || '未知错误'}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error('DeepSeek API 调用失败:', error);

    // CORS 错误特殊提示
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      return `❌ 网络请求失败\n\n💡 如果你是用 file:// 协议直接打开的 HTML 文件，浏览器会阻止跨域请求。\n\n解决方案：\n1. 在项目目录运行：python3 -m http.server 8080\n2. 访问：http://localhost:8080`;
    }

    return `❌ 生成摘要失败: ${error.message}`;
  }
}

/**
 * 生成图片语义描述 — 基于上下文推断（deepseek-chat）
 * @param {HTMLImageElement} imgElement
 * @returns {Promise<string>}
 */
async function generateImageDescription(imgElement) {
  // 已有有意义的 alt，直接返回
  const existingAlt = imgElement.alt ? imgElement.alt.trim() : '';
  if (existingAlt.length > 2) {
    return `已有描述：${existingAlt}`;
  }

  if (typeof CONFIG === 'undefined' || !CONFIG.DEEPSEEK_API_KEY || CONFIG.DEEPSEEK_API_KEY === 'your-api-key-here') {
    const filename = imgElement.src.split('/').pop().split('?')[0];
    return `图片：${filename}（未配置 API Key）`;
  }

  // 收集上下文信息
  const src = imgElement.src;
  const title = imgElement.title || '';
  const width = imgElement.naturalWidth || imgElement.width || 0;
  const height = imgElement.naturalHeight || imgElement.height || 0;

  // 提取图片周边文本（父元素 + 兄弟元素）
  const parent = imgElement.parentElement;
  const surroundingText = parent
    ? parent.innerText.replace(/\s+/g, ' ').trim().substring(0, 200)
    : '';

  const prompt = `你是一个网页无障碍助手，请根据以下信息为图片生成一句简洁的中文 alt 描述（20字以内，不要加引号）：
- 图片 URL：${src}
- 尺寸：${width}×${height}px
- title 属性：${title || '无'}
- 周边文本：${surroundingText || '无'}

只输出描述文字本身，不要解释。`;

  try {
    const response = await fetch(CONFIG.DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: CONFIG.DEEPSEEK_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 60
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || response.status);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error('图片描述生成失败:', error);
    const filename = src.split('/').pop().split('?')[0];
    return `图片：${filename}`;
  }
}
