"""
剪纸风格 AI 图片生成 API 服务器
连接 ComfyUI 进行图片生成
"""

from fastapi import FastAPI, HTTPException, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import requests
import json
import uuid
import time
import os
import base64
import random

from typing import Optional
from dotenv import load_dotenv

# 加载.env配置文件
load_dotenv()

app = FastAPI(title="Paper-Cutting AI API")

# 配置CORS允许前端访问
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ComfyUI服务地址
COMFYUI_URL = os.getenv("COMFYUI_URL", "http://10.0.0.11:8188")

# 上传服务地址
UPLOAD_API_URL = os.getenv("UPLOAD_API_URL", "https://threebody-test.vitoreality.com/yuangu-ar/api")


# ============ 数据模型 ============

class PaperCuttingRequest(BaseModel):
    """剪纸风格生成请求 (Base64 模式，保留用于向后兼容)"""
    input_image_base64: str  # base64编码的输入图片
    seed: Optional[int] = None  # 随机种子，可选


class GenerateResponse(BaseModel):
    """生成响应"""
    success: bool
    image_url: Optional[str] = None
    prompt_id: Optional[str] = None
    error: Optional[str] = None


# ============ 工具函数 ============

def load_paper_cutting_workflow():
    """加载剪纸风格工作流 JSON"""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    workflow_path = os.path.join(script_dir, "02_qwen_Image_edit_subgraphed.json")
    
    if os.path.exists(workflow_path):
        with open(workflow_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    
    raise FileNotFoundError("未找到工作流文件 02_qwen_Image_edit_subgraphed.json")


def upload_binary_to_comfyui(image_data: bytes, original_filename: str = None) -> str:
    """上传二进制图片到 ComfyUI 服务器 (高效方式)"""
    from PIL import Image
    import io
    
    print(f"[DEBUG] 接收到图片数据: {len(image_data)} 字节")
    
    # 打开图片验证格式
    try:
        image = Image.open(io.BytesIO(image_data))
        print(f"[DEBUG] 图片格式: {image.format}, 尺寸: {image.size}, 模式: {image.mode}")
    except Exception as e:
        print(f"[ERROR] 无法打开图片: {e}")
        raise
    
    # 生成文件名
    filename = original_filename or f"paper_cutting_{int(time.time())}.png"
    if not filename.endswith('.png'):
        filename = filename.rsplit('.', 1)[0] + '.png'
    
    print(f"[DEBUG] 使用文件名: {filename}")
    
    # 转换为 PNG 格式的字节流
    img_byte_arr = io.BytesIO()
    image.save(img_byte_arr, format='PNG')
    img_byte_arr.seek(0)
    
    png_size = img_byte_arr.getbuffer().nbytes
    print(f"[DEBUG] PNG 转换后大小: {png_size} 字节")
    
    # 上传到 ComfyUI
    upload_url = f"{COMFYUI_URL}/upload/image"
    print(f"[DEBUG] 上传到: {upload_url}")
    
    files = {'image': (filename, img_byte_arr, 'image/png')}
    data = {'overwrite': 'true'}
    
    response = requests.post(upload_url, files=files, data=data, timeout=30)
    
    print(f"[DEBUG] ComfyUI 响应状态: {response.status_code}")
    print(f"[DEBUG] ComfyUI 响应内容: {response.text[:500] if response.text else 'empty'}")
    
    if response.status_code == 200:
        result = response.json()
        uploaded_filename = result.get('name', filename)
        print(f"   图片已上传到 ComfyUI: {uploaded_filename}")
        return uploaded_filename
    else:
        raise Exception(f"上传失败: {response.status_code} - {response.text}")


def upload_base64_to_comfyui(base64_str: str) -> str:
    """上传 base64 图片到 ComfyUI 服务器 (保留用于向后兼容)"""
    # 移除 base64 头部 (data:image/png;base64,)
    if ',' in base64_str:
        base64_str = base64_str.split(',', 1)[1]
    
    # 解码 base64 为二进制
    image_data = base64.b64decode(base64_str)
    
    # 使用通用的二进制上传函数
    return upload_binary_to_comfyui(image_data)


def upload_to_remote_server(image_data: bytes, filename: str) -> str:
    """上传图片到远程服务器，返回访问链接"""
    upload_url = f"{UPLOAD_API_URL}/system/v1/upload"
    
    files = {'file': (filename, image_data, 'image/png')}
    data = {'file_category': '2', 'namespace': 'camera'}
    
    print(f"正在上传到远程服务器: {upload_url}")
    response = requests.post(upload_url, files=files, data=data, timeout=30)
    
    if response.status_code == 200:
        result = response.json()
        online_url = result.get('value')
        if online_url:
            print(f"[OK] 上传成功: {online_url}")
            return online_url
        else:
            raise Exception(f"响应中未包含地址: {result}")
    else:
        raise Exception(f"上传失败: {response.status_code} - {response.text}")


# ============ API 端点 ============

@app.get("/")
async def root():
    """根路径"""
    return {"message": "Paper-Cutting AI API Server", "status": "running"}


@app.get("/api/health")
async def health_check():
    """检查 ComfyUI 服务是否可用"""
    try:
        response = requests.get(f"{COMFYUI_URL}/system_stats", timeout=5)
        if response.status_code == 200:
            return {"status": "healthy", "comfyui": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "comfyui": "disconnected", "error": str(e)}
    
    return {"status": "unhealthy", "comfyui": "disconnected"}


@app.get("/api/image/{filename}")
async def proxy_image(filename: str, type: str = "output", subfolder: str = ""):
    """图片代理接口 - 绕过 CORS 限制"""
    try:
        image_url = f"{COMFYUI_URL}/view?filename={filename}&type={type}"
        if subfolder:
            image_url += f"&subfolder={subfolder}"
        
        response = requests.get(image_url, timeout=30, stream=True)
        
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail="无法获取图片")
        
        content_type = response.headers.get('content-type', 'image/png')
        
        return StreamingResponse(
            response.iter_content(chunk_size=8192),
            media_type=content_type,
            headers={"Cache-Control": "public, max-age=3600", "Access-Control-Allow-Origin": "*"}
        )
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=503, detail=f"无法连接到 ComfyUI: {str(e)}")


@app.post("/api/paper-cutting/generate", response_model=GenerateResponse)
async def generate_paper_cutting(
    image: UploadFile = File(..., description="上传的图片文件"),
    seed: Optional[int] = Form(None, description="随机种子")
):
    """
    生成剪纸风格图片 (FormData 二进制上传，高效模式)
    
    - **image**: 上传的图片文件 (multipart/form-data)
    - **seed**: 可选的随机种子
    """
    try:
        # 加载工作流
        workflow = load_paper_cutting_workflow()
        print("开始生成剪纸风格图片 (二进制上传)...")
        
        # 读取上传的图片
        image_data = await image.read()
        if not image_data:
            raise HTTPException(status_code=400, detail="缺少输入图片")
        
        print(f"   接收到图片: {image.filename}, 大小: {len(image_data) / 1024:.2f} KB")
        
        # 上传图片到 ComfyUI (使用二进制方式)
        input_image_filename = upload_binary_to_comfyui(image_data, image.filename)
        
        # 设置节点 78 (LoadImage) - 输入图片
        if "78" in workflow:
            workflow["78"]["inputs"]["image"] = input_image_filename
            print(f"   设置输入图片: {input_image_filename}")
        
        # 设置随机种子
        actual_seed = seed if seed else random.randint(1, 2**32 - 1)
        print(f"   使用种子: {actual_seed}")
        
        # 设置节点 115:3 (KSampler) - 种子
        if "115:3" in workflow:
            workflow["115:3"]["inputs"]["seed"] = actual_seed
        
        # 提交工作流
        client_id = str(uuid.uuid4())
        print(f"提交工作流到 ComfyUI: {COMFYUI_URL}")
        
        response = requests.post(
            f"{COMFYUI_URL}/prompt",
            json={"prompt": workflow, "client_id": client_id},
            timeout=10
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=500, detail=f"ComfyUI 错误: {response.text}")
        
        prompt_id = response.json().get('prompt_id')
        if not prompt_id:
            raise HTTPException(status_code=500, detail="未能获取 prompt_id")
        
        print(f"Prompt ID: {prompt_id}")
        
        # 轮询等待生成完成（最多 5 分钟）
        max_wait = 300
        start_time = time.time()
        
        while time.time() - start_time < max_wait:
            try:
                history_response = requests.get(f"{COMFYUI_URL}/history/{prompt_id}", timeout=30)
                
                if history_response.status_code == 200:
                    history_data = history_response.json()
                    
                    if prompt_id in history_data:
                        outputs = history_data[prompt_id].get('outputs', {})
                        
                        # 从节点 60 (SaveImage) 获取图片
                        if "60" in outputs:
                            images = outputs["60"].get("images", [])
                            if images:
                                filename = images[0].get('filename')
                                subfolder = images[0].get('subfolder', '')
                                folder_type = images[0].get('type', 'output')
                                
                                # 获取图片
                                image_url = f"{COMFYUI_URL}/view?filename={filename}&type={folder_type}"
                                if subfolder:
                                    image_url += f"&subfolder={subfolder}"
                                
                                print(f"正在获取生成的图片: {filename}")
                                img_response = requests.get(image_url, timeout=30)
                                
                                if img_response.status_code == 200:
                                    # 上传到远程服务器
                                    try:
                                        online_url = upload_to_remote_server(img_response.content, filename)
                                        print(f"剪纸图片生成完成: {online_url}")
                                        return GenerateResponse(success=True, image_url=online_url, prompt_id=prompt_id)
                                    except Exception as upload_err:
                                        # 上传失败，使用代理地址
                                        print(f"上传失败，使用代理地址: {upload_err}")
                                        proxy_url = f"http://localhost:8080/api/image/{filename}?type={folder_type}"
                                        return GenerateResponse(success=True, image_url=proxy_url, prompt_id=prompt_id)
                                else:
                                    raise Exception("无法下载生成的图片")
            except requests.exceptions.Timeout:
                print(f"   查询超时，继续等待... ({int(time.time() - start_time)}秒)")
            except Exception as e:
                print(f"   查询出错: {str(e)}, 继续等待...")
            
            time.sleep(3)
        
        raise HTTPException(status_code=408, detail="生成超时")
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] 生成失败: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"生成失败: {str(e)}")


@app.post("/api/paper-cutting/generate-base64", response_model=GenerateResponse)
async def generate_paper_cutting_base64(request: PaperCuttingRequest):
    """
    生成剪纸风格图片 (Base64 模式，向后兼容)
    
    - **input_image_base64**: base64 编码的截图
    - **seed**: 可选的随机种子
    """
    try:
        # 加载工作流
        workflow = load_paper_cutting_workflow()
        print("开始生成剪纸风格图片 (Base64 模式)...")
        
        # 上传图片到 ComfyUI
        if not request.input_image_base64:
            raise HTTPException(status_code=400, detail="缺少输入图片")
        
        input_image_filename = upload_base64_to_comfyui(request.input_image_base64)
        
        # 设置节点 78 (LoadImage) - 输入图片
        if "78" in workflow:
            workflow["78"]["inputs"]["image"] = input_image_filename
            print(f"   设置输入图片: {input_image_filename}")
        
        # 设置随机种子
        seed = request.seed if request.seed else random.randint(1, 2**32 - 1)
        print(f"   使用种子: {seed}")
        
        # 设置节点 115:3 (KSampler) - 种子
        if "115:3" in workflow:
            workflow["115:3"]["inputs"]["seed"] = seed
        
        # 提交工作流
        client_id = str(uuid.uuid4())
        print(f"提交工作流到 ComfyUI: {COMFYUI_URL}")
        
        response = requests.post(
            f"{COMFYUI_URL}/prompt",
            json={"prompt": workflow, "client_id": client_id},
            timeout=10
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=500, detail=f"ComfyUI 错误: {response.text}")
        
        prompt_id = response.json().get('prompt_id')
        if not prompt_id:
            raise HTTPException(status_code=500, detail="未能获取 prompt_id")
        
        print(f"Prompt ID: {prompt_id}")
        
        # 轮询等待生成完成（最多 5 分钟）
        max_wait = 300
        start_time = time.time()
        
        while time.time() - start_time < max_wait:
            try:
                history_response = requests.get(f"{COMFYUI_URL}/history/{prompt_id}", timeout=30)
                
                if history_response.status_code == 200:
                    history_data = history_response.json()
                    
                    if prompt_id in history_data:
                        outputs = history_data[prompt_id].get('outputs', {})
                        
                        # 从节点 60 (SaveImage) 获取图片
                        if "60" in outputs:
                            images = outputs["60"].get("images", [])
                            if images:
                                filename = images[0].get('filename')
                                subfolder = images[0].get('subfolder', '')
                                folder_type = images[0].get('type', 'output')
                                
                                # 获取图片
                                image_url = f"{COMFYUI_URL}/view?filename={filename}&type={folder_type}"
                                if subfolder:
                                    image_url += f"&subfolder={subfolder}"
                                
                                print(f"正在获取生成的图片: {filename}")
                                img_response = requests.get(image_url, timeout=30)
                                
                                if img_response.status_code == 200:
                                    # 上传到远程服务器
                                    try:
                                        online_url = upload_to_remote_server(img_response.content, filename)
                                        print(f"剪纸图片生成完成: {online_url}")
                                        return GenerateResponse(success=True, image_url=online_url, prompt_id=prompt_id)
                                    except Exception as upload_err:
                                        # 上传失败，使用代理地址
                                        print(f"上传失败，使用代理地址: {upload_err}")
                                        proxy_url = f"http://localhost:8080/api/image/{filename}?type={folder_type}"
                                        return GenerateResponse(success=True, image_url=proxy_url, prompt_id=prompt_id)
                                else:
                                    raise Exception("无法下载生成的图片")
            except requests.exceptions.Timeout:
                print(f"   查询超时，继续等待... ({int(time.time() - start_time)}秒)")
            except Exception as e:
                print(f"   查询出错: {str(e)}, 继续等待...")
            
            time.sleep(3)
        
        raise HTTPException(status_code=408, detail="生成超时")
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] 生成失败: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"生成失败: {str(e)}")


# ============ 主入口 ============

if __name__ == "__main__":
    import uvicorn
    print("=" * 50)
    print("启动剪纸风格 AI API 服务器")
    print("=" * 50)
    print(f"ComfyUI 地址: {COMFYUI_URL}")
    print(f"上传 API 地址: {UPLOAD_API_URL}")
    print(f"API 服务地址: http://0.0.0.0:8080")
    print("=" * 50)
    uvicorn.run(app, host="0.0.0.0", port=8080)
