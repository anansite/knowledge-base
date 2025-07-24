# 知识库 - Markdown文件展示系统

一个基于GitHub Pages的静态Markdown文件展示系统，专注于优雅地展示你的Markdown文档。

## ✨ 功能特性

- 📁 **文件树展示**：自动扫描并展示所有Markdown文件
- 🔍 **搜索功能**：快速搜索文档
- 📖 **Markdown渲染**：完整的Markdown语法支持
- 🎨 **美观界面**：现代化的UI设计
- 📱 **响应式设计**：支持移动端访问
- 🔄 **自动更新**：GitHub Actions自动更新文件列表
- 📥 **下载分享**：支持文档下载和分享链接
- 🛠️ **维护工具**：工具文件统一管理

## 🚀 快速开始

### 本地开发

1. **克隆仓库**
   ```bash
   git clone https://github.com/yourusername/knowledge-base.git
   cd knowledge-base
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **启动本地服务器**
   ```bash
   npm run dev
   ```
   然后在浏览器中访问 `http://localhost:8000`

### 部署到GitHub Pages

1. **推送代码到GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **启用GitHub Pages**
   - 进入仓库设置 → Pages
   - Source选择 "Deploy from a branch"
   - Branch选择 `main` 或 `master`
   - 保存设置

3. **自动更新**
   - 当你添加、修改或删除Markdown文件时
   - GitHub Actions会自动更新文件列表
   - 无需手动操作

## 📁 项目结构

```
knowledge-base/
├── index.html              # 主页面
├── .github/workflows/      # GitHub Actions
│   └── update-file-list.yml   # 自动更新文件列表
├── project-files/          # 项目文件
│   ├── generate-file-list.js  # 文件列表生成工具
│   └── file-list.json
├── knowledgebase/          # 知识库文档
│   └── mysql/MySQL锁机制详解.md
└── package.json
```

## 🔧 脚本说明

### 开发脚本

- `npm run dev` - 启动本地服务器
- `npm run build` - 生成文件列表
- `npm run preview` - 打开预览页面

### 工具说明

项目包含一个自动化的文件列表生成工具：

- **扫描范围**：`knowledgebase/` 目录中的所有 `.md` 文件
- **生成文件**：`project-files/file-list.json`
- **前端加载**：`index.html` 自动加载JSON文件列表
- **自动排除**：隐藏文件和系统目录
- **元信息**：包含文件大小、修改时间等信息

### GitHub Actions

- **自动触发**：推送包含markdown文件的提交时
- **自动提交**：生成的文件列表会自动提交到仓库

## 📝 添加新文档

1. 添加新的 `.md` 文件到项目中
2. 提交并推送到GitHub：
   ```bash
   git add .
   git commit -m "Add new document"
   git push origin main
   ```
3. GitHub Actions会自动更新文件列表

## 🎨 自定义样式

- 修改 `index.html` 中的CSS来自定义界面
- 支持主题色、字体、布局等自定义

## 🔗 锚点跳转

文档中的目录链接支持锚点跳转：
- 点击目录中的链接会自动跳转到对应章节
- 支持平滑滚动和高亮效果

## 📊 文件统计

- 自动统计文档数量
- 显示文件大小和修改时间
- 支持文件类型识别

## 🤝 贡献

欢迎提交Issue和Pull Request！

## �� 许可证

MIT License 