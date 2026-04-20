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
    return `❌ 生成摘要失败: ${error.message}`;
  }
}

/**
 * 生成图片语义描述（演示版本 - 使用模拟描述）
 * @param {HTMLImageElement} imgElement - 图片元素
 * @returns {Promise<string>} - 图片描述
 */
async function generateImageDescription(imgElement) {
  // 演示版本：返回基于图片属性的简单描述
  // 后续可接入 DeepSeek 的图像理解能力或其他视觉模型

  const src = imgElement.src;
  const alt = imgElement.alt;

  // 如果已有 alt，直接返回
  if (alt && alt.trim().length > 0) {
    return `已有描述: ${alt}`;
  }

  // 模拟描述（演示用）
  const filename = src.split('/').pop().split('?')[0];
  return `图片文件: ${filename}（演示模式 - 暂未接入图像识别）`;
}
