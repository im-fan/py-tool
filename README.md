# Python应用管理系统

一个基于Python+HTML5的应用管理系统，支持列表展示、搜索、拖拽排序、在线代码编辑以及应用的增删改查功能。

## 功能特性

### 1. 列表卡片展示
- ✅ 卡片式展示应用信息
- ✅ 支持按名称模糊搜索
- ✅ 支持拖拽调整卡片位置
- ✅ 卡片显示应用名、分类标签、功能描述

### 2. 应用管理
- ✅ 新增Python应用
- ✅ 编辑已有应用
- ✅ 删除应用（带二次确认）
- ✅ 数据持久化到SQLite数据库

### 3. 在线代码编辑器
- ✅ 集成CodeMirror编辑器
- ✅ Python语法高亮
- ✅ 代码缩进和自动闭合括号
- ✅ 支持多行代码编辑

### 4. 表单功能
- ✅ 应用名、分类标签、功能描述
- ✅ 自定义入参（JSON格式）
- ✅ 在线代码编写

## 技术栈

- **后端**：Python 3.x + Flask
- **前端**：HTML5 + CSS3 + JavaScript
- **数据库**：SQLite
- **代码编辑器**：CodeMirror
- **拖拽排序**：Sortable.js
- **图标库**：Font Awesome

## 项目结构

```
my-tool/
├── index.html          # 前端页面
├── app.py             # Flask后端服务
├── requirements.txt   # Python依赖包
├── apps.db            # SQLite数据库（自动生成）
└── README.md          # 项目说明文档
```

## 安装和运行

### 1. 安装依赖

```bash
pip3 install -r requirements.txt
```

### 2. 启动应用

```bash
python3 app.py
```

### 3. 访问应用

在浏览器中打开：http://127.0.0.1:5000

## 使用说明

### 1. 新增应用

1. 点击页面右上角的"新增应用"按钮
2. 填写应用信息：
   - 应用名称：必填项
   - 分类标签：用逗号分隔，如 "工具,数据分析"
   - 功能描述：简单描述应用功能
   - 自定义入参：JSON格式，如 `{"url": "https://example.com"}`
   - Python代码：在线编写Python代码
3. 点击"保存"按钮，应用将添加到列表中

### 2. 编辑应用

1. 点击卡片右上角的编辑按钮（铅笔图标）
2. 修改应用信息
3. 点击"保存"按钮更新应用

### 3. 删除应用

1. 点击卡片右上角的删除按钮（垃圾桶图标）
2. 在弹出的确认框中点击"删除"按钮
3. 应用将被从列表中移除

### 4. 搜索应用

1. 在搜索框中输入关键词
2. 系统将实时过滤显示匹配的应用

### 5. 调整卡片位置

1. 鼠标按住卡片并拖动到目标位置
2. 松开鼠标，卡片位置将自动保存

## API接口

### GET /api/apps
获取所有应用列表，按位置排序

### GET /api/apps/{id}
获取单个应用详情

### POST /api/apps
新增应用

### PUT /api/apps/{id}
更新应用

### DELETE /api/apps/{id}
删除应用

### PUT /api/apps/reorder
重新排序应用

## 数据库结构

### apps表

| 字段名 | 类型 | 描述 |
| --- | --- | --- |
| id | INTEGER | 主键，自增 |
| name | TEXT | 应用名称 |
| tags | TEXT | 分类标签，逗号分隔 |
| description | TEXT | 功能描述 |
| params | TEXT | 自定义入参，JSON格式 |
| code | TEXT | Python代码 |
| position | INTEGER | 显示位置 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

## 浏览器支持

- Chrome (推荐)
- Firefox
- Safari
- Edge

## 开发说明

### 前端技术
- 使用原生JavaScript实现交互逻辑
- 集成CodeMirror实现代码编辑
- 使用Sortable.js实现拖拽排序
- 使用Font Awesome提供图标

### 后端技术
- 使用Flask框架提供API服务
- SQLite数据库存储应用数据
- RESTful API设计风格

## 注意事项

1. 本应用为开发环境使用，请勿直接用于生产环境
2. 数据库文件存储在当前目录，请注意备份
3. 在线编写的Python代码将直接执行，请注意安全
4. 建议在本地环境使用，避免暴露敏感信息

## 许可证

MIT License

## 更新日志

### v1.0.0 (2025-12-09)
- 初始版本发布
- 实现应用的增删改查功能
- 集成在线代码编辑器
- 支持拖拽排序和搜索功能

## 联系方式

如有问题或建议，欢迎提出Issue或Pull Request。