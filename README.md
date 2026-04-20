# Adaptive Web Enhancer

网页无障碍增强原型系统 — 在不修改原网页源代码的前提下，通过前端注入技术提升视障用户、老年用户和临时障碍用户的网页使用体验。

## 快速开始

1. 克隆项目
```bash
git clone git@github.com:catteacher0515/adaptive-web-enhancer.git
cd adaptive-web-enhancer
```

2. 配置 API Key（可选，不配置也能体验简化/专注模式）
```bash
cp config.example.js config.js
# 编辑 config.js，填入你的 DeepSeek API Key
```

3. 直接用浏览器打开 `index.html` 即可，无需任何构建步骤。

## 功能说明

| 功能 | 说明 | 是否需要 API Key |
|------|------|----------------|
| 页面摘要 | AI 生成当前页面核心内容摘要 | 是 |
| 图片语义 | 为无 alt 图片生成语义描述 | 演示版不需要 |
| 简化展示 | 隐藏导航/侧栏/页脚等干扰区域 | 否 |
| 专注模式 | 降低非核心区域视觉权重 | 否 |
| 恢复原始 | 撤销所有增强效果 | 否 |

## 项目结构

```
adaptive-web-enhancer/
├── index.html          # 演示页 + 控制面板
├── style.css           # 面板样式、简化/专注模式样式
├── script.js           # DOM 操作、事件绑定、页面增强逻辑
├── ai.js               # DeepSeek API 调用封装
├── config.example.js   # API Key 配置示例
├── config.js           # 本地配置（不提交到 git）
├── README.md
└── CLAUDE.md           # 项目架构说明（供 Claude Code 使用）
```

## 获取 DeepSeek API Key

前往 [DeepSeek 开放平台](https://platform.deepseek.com) 注册并创建 API Key。

## 注意事项

- `config.js` 已加入 `.gitignore`，不会被提交到 GitHub
- 演示版图片语义功能使用模拟描述，不消耗 API 额度
- 项目为纯前端，无需后端服务，直接打开 HTML 文件即可运行
