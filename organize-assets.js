import fs from 'fs';
import path from 'path';

// Define the image mappings for each page
const imageMappings = {
    '页面1': {
        targetDir: 'src/assets/images/page1',
        files: {
            'Frame 1.png': 'frame.png',
            '下框1.png': 'bottom-frame.png',
            '剪纸框.png': 'paper-cutting-frame.png',
            '纸间映像 遇见正定 1.png': 'logo.png',
            '背景_.png': 'background.png',
            '脚印.png': 'footprints.png'
        }
    },
    '页面2': {
        targetDir: 'src/assets/images/page2',
        files: {
            'Frame 2.png': 'frame.png',
            'Group 3.png': 'gesture-icon.png',
            '下框1.png': 'bottom-frame.png',
            '剪纸框.png': 'paper-cutting-frame.png',
            '纸间映像 遇见正定 1.png': 'logo.png',
            '背景_.png': 'background.png'
        }
    },
    '页面3': {
        targetDir: 'src/assets/images/page3',
        files: {
            'Frame 3.png': 'frame.png',
            'Group 4.png': 'countdown-icon.png',
            '下框1.png': 'bottom-frame.png',
            '剪纸框.png': 'paper-cutting-frame.png',
            '纸间映像 遇见正定 1.png': 'logo.png',
            '背景_.png': 'background.png'
        }
    },
    '页面4': {
        targetDir: 'src/assets/images/page4',
        files: {
            'Frame 4.png': 'frame.png',
            '图层 5 拷贝 3.png': 'shutter-effect-1.png',
            '图层 8 拷贝.png': 'shutter-effect-2.png',
            '图层 8.png': 'shutter-effect-3.png',
            '图层 9 拷贝 1.png': 'shutter-effect-4.png',
            '纸间映像 遇见正定 1.png': 'logo.png'
        }
    },
    '页面5': {
        targetDir: 'src/assets/images/page5',
        files: {
            'Frame 5.png': 'frame.png',
            'Mask group.png': 'mask-group.png',
            'Rectangle 3.png': 'photo-frame.png',
            '下框2 拷贝 1.png': 'bottom-frame.png',
            '图层 10 拷贝 2.png': 'decoration-1.png',
            '图层 12 1.png': 'decoration-2.png',
            '图层 14 拷贝 2.png': 'decoration-3.png',
            '图层 14.png': 'decoration-4.png',
            '图层 9 拷贝 5 1.png': 'decoration-5.png',
            '装饰.png': 'ornament.png',
            '边框 1.png': 'border.png'
        }
    }
};

// Function to create directory recursively
function createDirIfNotExists(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`✓ Created directory: ${dir}`);
    }
}

// Function to copy and rename files
function copyAndRenameFiles() {
    console.log('Starting image organization...\n');

    // Create font directory and copy font
    const fontDir = 'src/assets/fonts';
    createDirIfNotExists(fontDir);

    const fontSource = 'src/剪纸UI/方正大标宋简体.ttf';
    const fontTarget = path.join(fontDir, 'fangzheng-dabiaosong.ttf');

    if (fs.existsSync(fontSource)) {
        fs.copyFileSync(fontSource, fontTarget);
        console.log(`✓ Copied font: ${fontTarget}\n`);
    }

    // Process each page
    Object.entries(imageMappings).forEach(([pageFolder, config]) => {
        console.log(`Processing ${pageFolder}...`);

        // Create target directory
        createDirIfNotExists(config.targetDir);

        // Copy and rename each file
        Object.entries(config.files).forEach(([sourceFile, targetFile]) => {
            const sourcePath = path.join('src/剪纸UI', pageFolder, sourceFile);
            const targetPath = path.join(config.targetDir, targetFile);

            if (fs.existsSync(sourcePath)) {
                fs.copyFileSync(sourcePath, targetPath);
                console.log(`  ✓ ${sourceFile} → ${targetFile}`);
            } else {
                console.log(`  ✗ NOT FOUND: ${sourceFile}`);
            }
        });

        console.log('');
    });

    console.log('Image organization complete!');
}

// Run the script
try {
    copyAndRenameFiles();
} catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
}
