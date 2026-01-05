# 青花瓷AI - 启动脚本说明

本目录包含青花瓷AI项目的启动和管理脚本。

## 📁 文件说明

### 启动脚本

项目提供三个启动脚本版本：

**`start_api.ps1` (推荐)**
- PowerShell脚本，完美支持中文显示
- 彩色输出，更好的用户体验
- 适用于 Windows PowerShell / PowerShell Core

**`start_api_en.bat`**
- 英文版批处理脚本，避免编码问题
- 可以双击运行或在cmd中执行
- 推荐给遇到中文乱码的用户

**`start_api.bat`**
- 中文版批处理脚本（可能有编码问题）
- 如遇乱码，请使用上述两个版本

所有脚本都会自动执行以下操作：

1. 检查Python环境
2. 检查并创建 `.env` 配置文件
3. 安装或验证依赖包
4. 检测ComfyUI服务连接状态
5. 启动FastAPI服务器

### `check_comfyui.py`

ComfyUI服务状态检测工具，用于：

- 验证ComfyUI服务是否正常运行
- 检查配置的ComfyUI地址是否可访问
- 显示ComfyUI系统信息

## 🚀 快速开始

### 1. 配置环境变量

首次使用前，需要配置 `.env` 文件：

```bash
# 进入scripts目录，复制配置模板
cd scripts
copy .env.example .env
```

然后编辑 `scripts/.env` 文件，设置ComfyUI服务地址：

```env
# ComfyUI 服务配置
COMFYUI_URL=http://10.0.0.95:8188

# API 服务配置
API_HOST=127.0.0.1
API_PORT=8080
```

### 2. 启动服务

**方式一：PowerShell 运行（推荐）**

```powershell
cd scripts
.\start_api.ps1
```

或者直接从项目根目录：

```powershell
.\scripts\start_api.ps1
```

**方式二：双击运行**

- PowerShell版本：右键 `start_api.ps1` → "使用 PowerShell 运行"
- 批处理版本：双击 `start_api_en.bat`

**方式三：命令提示符(cmd)**

```cmd
cd scripts
start_api_en.bat
```

### 3. 访问服务

启动成功后，可以访问：

- **API服务**: <http://localhost:8080>
- **API文档**: <http://localhost:8080/docs>
- **健康检查**: <http://localhost:8080/api/health>

## 🔧 手动检测ComfyUI

如需单独检测ComfyUI服务状态：

```bash
cd scripts
python check_comfyui.py
```

## ⚙️ 环境变量说明

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `COMFYUI_URL` | ComfyUI服务地址 | `http://10.0.0.95:8188` |
| `API_HOST` | API服务监听地址 | `127.0.0.1` |
| `API_PORT` | API服务监听端口 | `8080` |

## 📝 常见问题

### Q: 无法连接到ComfyUI服务？

**解决方法：**

1. 确认ComfyUI已启动并运行
2. 检查 `.env` 文件中的 `COMFYUI_URL` 是否正确
3. 尝试在浏览器访问 `COMFYUI_URL/system_stats`
4. 检查防火墙设置

### Q: 启动脚本报错找不到依赖？

**解决方法：**

```bash
# 手动安装依赖
pip install -r requirements.txt
```

### Q: 如何修改API服务端口？

**解决方法：**

1. 编辑 `.env` 文件，修改 `API_PORT` 值
2. 重启API服务

## 🔒 安全提示

- `.env` 文件包含敏感配置，已被 `.gitignore` 排除，不会提交到版本控制
- 生产环境请修改 `CORS` 配置，限制允许的域名
- 建议使用环境变量管理工具或密钥管理服务

## 📞 技术支持

如遇到问题，请检查：

1. Python版本（需要3.8+）
2. ComfyUI服务状态
3. 网络连接和防火墙设置
4. 查看API服务日志输出
