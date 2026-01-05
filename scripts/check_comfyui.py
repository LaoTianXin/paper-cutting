"""
检测ComfyUI服务状态
"""
import os
import sys
import requests
from pathlib import Path

# 加载.env配置
from dotenv import load_dotenv
current_dir = Path(__file__).parent
env_path = current_dir / '.env'
load_dotenv(env_path)

# 从环境变量获取ComfyUI地址
COMFYUI_URL = os.getenv("COMFYUI_URL", "http://10.0.0.95:8188")

print(f"🔍 正在检测ComfyUI服务: {COMFYUI_URL}")
print()

try:
    response = requests.get(f"{COMFYUI_URL}/system_stats", timeout=3)
    if response.status_code == 200:
        print(f"✅ ComfyUI运行正常")
        print(f"   地址: {COMFYUI_URL}")
        print(f"   状态: 连接成功")
        stats = response.json()
        if 'system' in stats:
            print(f"   系统信息: {stats['system']}")
        print()
        exit(0)
    else:
        print(f"❌ ComfyUI响应异常: HTTP {response.status_code}")
        exit(1)
except requests.exceptions.ConnectionError:
    print(f"❌ 无法连接到ComfyUI服务")
    print()
    print("请确保:")
    print(f"1. ComfyUI正在运行在: {COMFYUI_URL}")
    print("2. 检查 .env 文件中的 COMFYUI_URL 配置是否正确")
    print("3. 如果ComfyUI在其他地址，请修改 .env 文件")
    print()
    exit(1)
except requests.exceptions.Timeout:
    print(f"❌ 连接超时")
    print(f"   ComfyUI服务可能响应缓慢: {COMFYUI_URL}")
    exit(1)
except Exception as e:
    print(f"❌ 检测失败: {str(e)}")
    exit(1)
