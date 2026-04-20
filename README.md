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

3. 启动本地服务器（调用 AI 功能必须通过 HTTP 协议，不能直接双击打开）
```bash
python3 -m http.server 8080
```
访问 http://localhost:8080/index.html

## 功能说明

| 功能 | 说明 | 是否需要 API Key |
|------|------|----------------|
| 生成页面摘要 | AI 生成当前页面核心内容摘要 | 是 |
| 图片语义增强 | 为无 alt 图片生成语义描述 | 否（演示版） |
| 简化展示 | 隐藏导航/侧栏/页脚等干扰区域 | 否 |
| 恢复默认页面 | 撤销所有增强效果 | 否 |

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

- **必须通过 HTTP 服务器访问**：由于浏览器 CORS 策略，直接双击打开 HTML 文件无法调用 DeepSeek API，必须通过 `python3 -m http.server` 启动本地服务器
- `config.js` 已加入 `.gitignore`，不会被提交到 GitHub
- 演示版图片语义功能使用模拟描述，不消耗 API 额度
- 项目为纯前端，无需后端服务和数据库
