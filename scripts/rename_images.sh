#!/bin/bash

# 切换到 public 目录
cd "$(dirname "$0")/../public" || exit

# generate 目录
cd images/generate
mv "底板.png" "background.png" 2>/dev/null
mv "重新制作按钮.png" "remake-button.png" 2>/dev/null
cd ../..

# pattern-design 目录
cd images/pattern-design
mv "右侧底板.png" "right-panel.png" 2>/dev/null
mv "左侧底板.png" "left-panel.png" 2>/dev/null
mv "按钮.png" "button.png" 2>/dev/null
mv "按钮选中状态.png" "button-selected.png" 2>/dev/null
mv "标题【贴顶】.png" "title.png" 2>/dev/null
mv "生成按钮.png" "generate-button.png" 2>/dev/null
cd ../..

# share 目录
cd images/share
mv "分享瓶身底板.png" "vase-background.png" 2>/dev/null
cd ../..

# vase-selection 目录
cd images/vase-selection
mv "右侧底板.png" "right-panel.png" 2>/dev/null
mv "左侧底板.png" "left-panel.png" 2>/dev/null
mv "按钮底板.png" "button-bg.png" 2>/dev/null
mv "按钮选中状态.png" "button-selected.png" 2>/dev/null
mv "标题【贴顶】.png" "title.png" 2>/dev/null
cd ../..

# 青花瓷 目录重命名为 porcelain
mv "images/青花瓷" "images/porcelain" 2>/dev/null
cd images/porcelain
mv "力士纹.png" "warrior-pattern.png" 2>/dev/null
mv "花卉纹.png" "floral-pattern.png" 2>/dev/null
mv "花卉纹2.png" "floral-pattern2.png" 2>/dev/null
mv "资源 10.png" "resource-10.png" 2>/dev/null
mv "资源 170.png" "resource-170.png" 2>/dev/null
mv "资源 250.png" "resource-250.png" 2>/dev/null
mv "边框01.png" "border-thumb-01.png" 2>/dev/null
mv "边框02.png" "border-thumb-02.png" 2>/dev/null
mv "边框03.png" "border-thumb-03.png" 2>/dev/null
mv "边框04.png" "border-thumb-04.png" 2>/dev/null
mv "龙纹.png" "dragon-pattern.png" 2>/dev/null
cd ../..

# 花瓶轮廓 重命名为 vase-outline
mv "花瓶轮廓" "vase-outline" 2>/dev/null

# 透明底 重命名为 transparent
mv "透明底" "transparent" 2>/dev/null

echo "图片文件重命名完成！"
