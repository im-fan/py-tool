from flask import Flask, request, jsonify, send_from_directory
import json
import os

import app.app_db as app_db

# 设置静态文件目录
STATIC_FOLDER = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'static')

app = Flask(__name__, static_folder=STATIC_FOLDER, static_url_path='/static')

# 应用启动时初始化数据库
app_db.init_db()

# 主页路由
@app.route('/')
def index():
    return send_from_directory(STATIC_FOLDER, 'index.html')

# 获取所有应用
@app.route('/api/apps', methods=['GET'])
def get_apps():
    db_conn = app_db.get_db()
    cursor = db_conn.cursor()
    cursor.execute('SELECT * FROM apps ORDER BY position ASC')
    apps = cursor.fetchall()
    db_conn.close()
    
    # 转换为字典列表
    apps_list = [dict(app) for app in apps]
    return jsonify(apps_list)

# 获取单个应用
@app.route('/api/apps/<int:app_id>', methods=['GET'])
def get_app(app_id):
    db_conn = app_db.get_db()
    cursor = db_conn.cursor()
    cursor.execute('SELECT * FROM apps WHERE id = ?', (app_id,))
    app = cursor.fetchone()
    db_conn.close()
    
    if app:
        return jsonify(dict(app))
    else:
        return jsonify({'success': False, 'message': '应用不存在'}), 404

# 新增应用
@app.route('/api/apps', methods=['POST'])
def add_app():
    data = request.get_json()
    
    if not data or not data.get('name') or not data.get('code'):
        return jsonify({'success': False, 'message': '应用名称和代码不能为空'}), 400
    db_conn = app_db.get_db()
    cursor = db_conn.cursor()
    
    # 获取最大位置值
    cursor.execute('SELECT COALESCE(MAX(position), 0) + 1 AS new_position FROM apps')
    new_position = cursor.fetchone()['new_position']
    
    cursor.execute('''
    INSERT INTO apps (name, tags, description, params, code, position)
    VALUES (?, ?, ?, ?, ?, ?)
    ''', (
        data['name'],
        data.get('tags', ''),
        data.get('description', ''),
        data.get('params', ''),
        data['code'],
        new_position
    ))
    
    db_conn.commit()
    db_conn.close()
    
    return jsonify({'success': True, 'message': '应用添加成功'})

# 编辑应用
@app.route('/api/apps/<int:app_id>', methods=['PUT'])
def update_app(app_id):
    data = request.get_json()
    
    if not data or not data.get('name') or not data.get('code'):
        return jsonify({'success': False, 'message': '应用名称和代码不能为空'}), 400
    db_conn = app_db.get_db()
    cursor = db_conn.cursor()
    
    cursor.execute('''
    UPDATE apps SET 
        name = ?, 
        tags = ?, 
        description = ?, 
        params = ?, 
        code = ?, 
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
    ''', (
        data['name'],
        data.get('tags', ''),
        data.get('description', ''),
        data.get('params', ''),
        data['code'],
        app_id
    ))
    
    if cursor.rowcount == 0:
        conn.close()
        return jsonify({'success': False, 'message': '应用不存在'}), 404
    
    db_conn.commit()
    db_conn.close()
    
    return jsonify({'success': True, 'message': '应用更新成功'})

# 删除应用
@app.route('/api/apps/<int:app_id>', methods=['DELETE'])
def delete_app(app_id):
    db_conn = app_db.get_db()
    cursor = db_conn.cursor()
    
    # 先获取要删除应用的位置
    cursor.execute('SELECT position FROM apps WHERE id = ?', (app_id,))
    app = cursor.fetchone()
    
    if not app:
        db_conn.close()
        return jsonify({'success': False, 'message': '应用不存在'}), 404
    
    position = app['position']
    
    # 删除应用
    cursor.execute('DELETE FROM apps WHERE id = ?', (app_id,))
    
    # 更新后续应用的位置
    cursor.execute('UPDATE apps SET position = position - 1 WHERE position > ?', (position,))
    
    db_conn.commit()
    db_conn.close()
    
    return jsonify({'success': True, 'message': '应用删除成功'})

# 重新排序应用
@app.route('/api/apps/reorder', methods=['PUT'])
def reorder_apps():
    data = request.get_json()
    
    if not data or not data.get('order'):
        return jsonify({'success': False, 'message': '排序数据不能为空'}), 400
    
    db_conn = app_db.get_db()
    cursor = db_conn.cursor()
    
    # 更新每个应用的位置
    for idx, app_id in enumerate(data['order']):
        cursor.execute('UPDATE apps SET position = ? WHERE id = ?', (idx + 1, app_id))
    
    db_conn.commit()
    db_conn.close()
    
    return jsonify({'success': True, 'message': '应用排序更新成功'})

# 执行应用
@app.route('/api/apps/<int:app_id>/execute', methods=['POST'])
def execute_app(app_id):
    import io
    import sys
    import traceback
    import subprocess
    import tempfile
    from datetime import datetime
    
    db_conn = app_db.get_db()
    cursor = db_conn.cursor()
    cursor.execute('SELECT code, params, name FROM apps WHERE id = ?', (app_id,))
    app = cursor.fetchone()
    db_conn.close()
    
    if not app:
        return jsonify({'success': False, 'message': '应用不存在'}), 404
    
    code = app['code']
    params = app['params']
    app_name = app['name']
    print(f"param={params}")
    
    # 解析参数
    params_dict = {}
    params_code = ""
    if params and params.strip():
        try:
            params_dict = json.loads(params)
            # 生成参数代码，插入到Python文件开头
            # 1. 定义SysParam类
            # 2. 将params_dict转换为SysParam对象
            params_code = f"# 预设自定义参数\nclass SysParam:\n    def __init__(self, **kwargs):\n        for key, value in kwargs.items():\n            setattr(self, key, value)\n\n# 转换为SysParam对象\nparams = SysParam(**{params_dict})\n\n"
            print(f"[INFO] 预设参数: {params_dict}")
        except json.JSONDecodeError as e:
            print(f"[WARNING] 参数解析错误: {str(e)}")
    
    # 创建临时Python文件，在开头插入参数代码
    temp_file = tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False)
    temp_file.write(params_code + code)
    temp_file.close()
    print(f"[INFO] 临时文件创建: {temp_file.name}")
    
    try:
        # 构建命令
        cmd = [sys.executable, temp_file.name]
        
        # 执行代码，使用subprocess创建宽松的沙盒环境
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=30,  # 设置超时时间，防止无限循环
            env={'PYTHONPATH': '.'}  # 设置环境变量
        )
        output = result.stdout
        if result.stderr:
            output += f"\n\n错误信息:\n{result.stderr}"
        
        # 输出到控制台日志
        print(f"\n[INFO] 应用执行完成")
        print(f"[INFO] 应用ID: {app_id}")
        print(f"[INFO] 应用名称: {app_name}")
        print(f"[INFO] 执行时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"[INFO] 退出码: {result.returncode}")
        print(f"[INFO] 执行输出:\n{output}")
        print(f"[INFO] {'-'*50}")
        
        # 返回结果
        return jsonify({
            'success': result.returncode == 0,
            'output': output,
            'exit_code': result.returncode,
            'console_output': f"执行命令: {' '.join(cmd)}\n\n" + output
        })
    except subprocess.TimeoutExpired:
        # 输出到控制台日志
        error_msg = "执行超时（超过30秒）"
        print(f"\n[ERROR] 应用执行超时")
        print(f"[ERROR] 应用ID: {app_id}")
        print(f"[ERROR] 应用名称: {app_name}")
        print(f"[ERROR] 执行时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"[ERROR] 错误信息: {error_msg}")
        print(f"[ERROR] {'-'*50}")
        
        return jsonify({
            'success': False,
            'error': error_msg,
            'output': "",
            'exit_code': -1
        })
    except Exception as e:
        # 输出到控制台日志
        print(f"\n[ERROR] 应用执行失败")
        print(f"[ERROR] 应用ID: {app_id}")
        print(f"[ERROR] 应用名称: {app_name}")
        print(f"[ERROR] 执行时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"[ERROR] 错误信息: {str(e)}")
        print(f"[ERROR] 详细信息:\n{traceback.format_exc()}")
        print(f"[ERROR] {'-'*50}")
        
        return jsonify({
            'success': False,
            'error': str(e),
            'output': "",
            'exit_code': -1,
            'details': traceback.format_exc()
        })
    finally:
        # 确保临时文件被删除
        try:
            if os.path.exists(temp_file.name):
                os.unlink(temp_file.name)
                print(f"[INFO] 临时文件已删除: {temp_file.name}")
            else:
                print(f"[INFO] 临时文件不存在: {temp_file.name}")
        except Exception as e:
            print(f"[WARNING] 删除临时文件失败: {temp_file.name}, 错误: {str(e)}")
            pass

# 获取系统设置
@app.route('/api/settings', methods=['GET'])
def get_settings():
    db_conn = app_db.get_db()
    cursor = db_conn.cursor()
    cursor.execute('SELECT key, value, description FROM system_settings')
    settings = cursor.fetchall()
    db_conn.close()
    
    settings_dict = {}
    for setting in settings:
        settings_dict[setting['key']] = {
            'value': setting['value'],
            'description': setting['description']
        }
    
    return jsonify(settings_dict)

# 保存系统设置
@app.route('/api/settings', methods=['POST'])
def save_settings():
    import shutil
    
    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'message': '设置数据不能为空'}), 400
    
    db_conn = app_db.get_db()
    cursor = db_conn.cursor()
    
    try:
        # 检查是否需要迁移数据库
        new_db_path = data.get('sqlite_path', {}).get('value')
        if new_db_path:
            # 获取当前数据库路径
            cursor.execute('SELECT value FROM system_settings WHERE key = "sqlite_path"')
            current_db_path = cursor.fetchone()['value']
            
            if new_db_path != current_db_path:
                # 检查新路径是否存在
                new_dir = os.path.dirname(new_db_path)
                if new_dir and not os.path.exists(new_dir):
                    os.makedirs(new_dir, exist_ok=True)
                
                # 复制数据库文件
                shutil.copy2(current_db_path, new_db_path)
                print(f"[INFO] 数据库文件已复制: {current_db_path} -> {new_db_path}")
                
                # 删除原数据库文件
                os.remove(current_db_path)
                print(f"[INFO] 原数据库文件已删除: {current_db_path}")
        
        # 保存设置
        for key, setting in data.items():
            cursor.execute('''
            INSERT OR REPLACE INTO system_settings (key, value, description, updated_at)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            ''', (key, setting['value'], setting.get('description')))
        
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': '设置保存成功'})
    except Exception as e:
        conn.rollback()
        conn.close()
        print(f"[ERROR] 保存设置失败: {str(e)}")
        return jsonify({'success': False, 'message': f'设置保存失败: {str(e)}'})

# 重启应用
@app.route('/api/restart', methods=['POST'])
def restart_app():
    # 在开发环境中，直接返回成功，实际重启需要使用进程管理工具
    return jsonify({'success': True, 'message': '应用将重启'})

# 静态文件服务
@app.route('/<path:filename>')
def static_files(filename):
    return send_from_directory(STATIC_FOLDER, filename)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)