// 正确地批量更新图片路径为使用 getPublicPath
const fs = require('fs');
const path = require('path');

const files = [
    'src/components/GeneratePage.tsx',
    'src/components/PostcardCustomizePage.tsx',
    'src/components/PostcardPreview.tsx',
    'src/components/PostcardPreviewExample.tsx',
];

files.forEach(file => {
    const filePath = path.join(__dirname, '..', file);
    if (!fs.existsSync(filePath)) {
        console.log(`File not found: ${filePath}`);
        return;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;

    // 添加 import (如果还没有)
    if (!content.includes('import { getPublicPath }')) {
        // 找到第一组 import 语句后插入
        const importMatch = content.match(/(import[^;]+;(\r?\n)?)+/);
        if (importMatch) {
            const insertPos = importMatch.index + importMatch[0].length;
            content = content.slice(0, insertPos) +
                'import { getPublicPath } from "../utils/path";\n' +
                content.slice(insertPos);
        }
    }

    // 替换模式 1: src="/path.png" => src={getPublicPath("/path.png")}
    content = content.replace(/src="(\/[^"]+\.(png|jpg|svg))"/g, 'src={getPublicPath("$1")}');

    // 替换模式 2: image: "/path.png" => image: getPublicPath("/path.png")  
    content = content.replace(/(\s+image:\s*)"(\/[^"]+\.png)"/g, '$1getPublicPath("$2")');
    content = content.replace(/(\s+thumbnail:\s*)"(\/[^"]+\.png)"/g, '$1getPublicPath("$2")');

    // 替换模式 3: 对象中的路径  "/path.png", => getPublicPath("/path.png"),
    content = content.replace(/:\s*"(\/(?:transparent|vase-outline|images)\/[^"]+)"/g, ': getPublicPath("$1")');

    // 替换模式 4: || "/path.png" => || getPublicPath("/path.png")
    content = content.replace(/\|\|\s*"(\/[^"]+\.png)"/g, '|| getPublicPath("$1")');

    // 替换模式 5: backgroundImage: "url(/path)" => backgroundImage: `url(${getPublicPath("/path")})`
    content = content.replace(/backgroundImage:\s*"url\((\/[^)]+)\)"/g, 'backgroundImage: `url(${getPublicPath("$1")})`');

    // 替换模式 6: 三元表达式中的 url
    content = content.replace(/\?\s*"url\((\/[^)]+)\)"/g, '? `url(${getPublicPath("$1")})`');
    content = content.replace(/:\s*"url\((\/[^)]+)\)"/g, ': `url(${getPublicPath("$1")})`');

    if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Updated: ${file}`);
    } else {
        console.log(`⏭️  Skipped (no changes): ${file}`);
    }
});

console.log('\n✨ All files processed!');
