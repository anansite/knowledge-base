const fs = require('fs');
const path = require('path');

/**
 * 递归扫描目录中的markdown文件
 * @param {string} dir 要扫描的目录
 * @param {string} basePath 基础路径
 * @returns {Array} 文件列表
 */
function scanMarkdownFiles(dir, basePath = '') {
    const files = [];
    
    try {
        const items = fs.readdirSync(dir);
        
        for (const item of items) {
            const fullPath = path.join(dir, item);
            const relativePath = path.join(basePath, item);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
                // 跳过隐藏目录和特殊目录
                if (!item.startsWith('.') && item !== 'node_modules' && item !== '.git') {
                    const subFiles = scanMarkdownFiles(fullPath, relativePath);
                    files.push(...subFiles);
                }
            } else if (stat.isFile() && item.toLowerCase().endsWith('.md')) {
                files.push({
                    name: item,
                    path: relativePath.replace(/\\/g, '/'), // 统一使用正斜杠
                    type: 'file',
                    size: stat.size,
                    modified: stat.mtime
                });
            }
        }
    } catch (error) {
        console.error(`扫描目录 ${dir} 时出错:`, error.message);
    }
    
    return files;
}

/**
 * 生成文件列表JSON
 */
function generateFileList() {
    const projectRoot = path.resolve(__dirname, '..');
    const files = scanMarkdownFiles(projectRoot);
    
    // 按路径排序
    files.sort((a, b) => a.path.localeCompare(b.path));
    
    const fileList = {
        generated: new Date().toISOString(),
        totalFiles: files.length,
        files: files
    };
    
    // 写入文件
    const outputPath = path.join(projectRoot, 'file-list.json');
    fs.writeFileSync(outputPath, JSON.stringify(fileList, null, 2));
    
    console.log(`✅ 已生成文件列表: ${outputPath}`);
    console.log(`📊 共找到 ${files.length} 个markdown文件:`);
    
    files.forEach(file => {
        console.log(`  📄 ${file.path}`);
    });
    
    return fileList;
}

/**
 * 生成HTML文件列表
 */
function generateHtmlFileList() {
    const fileList = generateFileList();
    const htmlContent = `// 自动生成的文件列表
const FILE_LIST = ${JSON.stringify(fileList, null, 2)};

// 导出文件列表
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FILE_LIST;
}
`;

    const outputPath = path.join(__dirname, '..', 'js', 'file-list.js');
    
    // 确保目录存在
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, htmlContent);
    console.log(`✅ 已生成HTML文件列表: ${outputPath}`);
}

// 如果直接运行此脚本
if (require.main === module) {
    generateHtmlFileList();
}

module.exports = {
    scanMarkdownFiles,
    generateFileList,
    generateHtmlFileList
}; 