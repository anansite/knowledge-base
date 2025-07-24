# 知识库 - Markdown文件树展示

一个基于GitHub Pages的Markdown文件树展示系统，可以自动扫描项目中的Markdown文件并提供在线浏览功能。

## ✨ 功能特性

- 📁 **自动文件扫描**：自动发现项目中的所有Markdown文件
- 🔍 **实时搜索**：支持文件名和路径的模糊搜索
- 📖 **在线预览**：直接在浏览器中查看Markdown内容
- 📱 **响应式设计**：支持桌面和移动设备
- 🎨 **美观界面**：采用GitHub风格的现代化设计
- ⚡ **快速加载**：优化的文件加载和渲染性能

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/yourusername/knowledge-base.git
cd knowledge-base
```

### 2. 生成文件列表

```bash
# 使用Node.js生成文件列表
node scripts/generate-file-list.js

# 或者使用npm脚本
npm run build
```

### 3. 本地预览

```bash
# 启动本地服务器
python -m http.server 8000

# 或者使用npm脚本
npm run dev
```

然后在浏览器中访问 `http://localhost:8000`

## 📁 项目结构

```
knowledge-base/
├── index.html              # 主页面
├── _config.yml            # Jekyll配置
├── package.json           # 项目配置
├── README.md              # 项目说明
├── scripts/
│   └── generate-file-list.js  # 文件扫描脚本
├── js/
│   └── file-list.js       # 自动生成的文件列表
├── mysql/
│   └── MySQL锁机制详解.md  # 示例Markdown文件
└── file-list.json         # 文件列表JSON
```

## 🔧 配置说明

### 文件扫描配置

在 `scripts/generate-file-list.js` 中可以配置：

- **扫描目录**：默认扫描项目根目录
- **文件过滤**：只扫描 `.md` 文件
- **目录排除**：自动排除 `.git`、`node_modules` 等目录

### 自定义样式

可以在 `index.html` 的 `<style>` 标签中修改CSS样式：

```css
/* 修改主题颜色 */
.tree-item.active {
    background-color: #your-color;
}

/* 修改字体 */
body {
    font-family: 'Your Font', sans-serif;
}
```

## 📝 添加新文件

1. 在项目中添加新的Markdown文件
2. 运行文件扫描脚本：
   ```bash
   npm run build
   ```
3. 提交更改到Git：
   ```bash
   git add .
   git commit -m "Add new markdown file"
   git push
   ```

## 🌐 部署到GitHub Pages

### 方法1：使用GitHub Actions（推荐）

创建 `.github/workflows/deploy.yml`：

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '16'
    
    - name: Generate file list
      run: node scripts/generate-file-list.js
    
    - name: Deploy to GitHub Pages
      uses: peaceiris/actions-gh-pages@v3
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: .
```

### 方法2：手动部署

1. 在GitHub仓库设置中启用GitHub Pages
2. 选择部署分支（通常是 `main` 或 `gh-pages`）
3. 确保 `index.html` 在根目录

## 🛠️ 开发指南

### 添加新功能

1. **修改主页**：编辑 `index.html`
2. **更新样式**：修改CSS样式
3. **添加脚本**：在 `<script>` 标签中添加JavaScript代码

### 自定义文件扫描

修改 `scripts/generate-file-list.js`：

```javascript
// 添加自定义文件过滤规则
function customFilter(file) {
    return file.name.includes('custom-pattern');
}

// 修改扫描逻辑
const files = scanMarkdownFiles(projectRoot).filter(customFilter);
```

## 📊 性能优化

### 文件大小优化

- 压缩Markdown文件
- 使用CDN加载外部资源
- 启用Gzip压缩

### 加载速度优化

- 使用懒加载
- 实现文件缓存
- 优化图片资源

## 🔍 故障排除

### 常见问题

1. **文件列表不更新**
   - 确保运行了 `npm run build`
   - 检查文件权限

2. **文件无法加载**
   - 检查文件路径是否正确
   - 确保文件编码为UTF-8

3. **样式显示异常**
   - 清除浏览器缓存
   - 检查CSS语法

### 调试模式

在浏览器控制台中查看详细日志：

```javascript
// 启用调试模式
localStorage.setItem('debug', 'true');
```

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- [Marked.js](https://marked.js.org/) - Markdown解析器
- [GitHub Primer](https://primer.style/) - 设计系统
- [Font Awesome](https://fontawesome.com/) - 图标库

## 📞 联系方式

- 项目主页：https://github.com/yourusername/knowledge-base
- 问题反馈：https://github.com/yourusername/knowledge-base/issues
- 邮箱：your.email@example.com

---

⭐ 如果这个项目对你有帮助，请给它一个星标！ 