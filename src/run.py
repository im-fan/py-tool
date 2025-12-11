import sys
import os

# 添加当前目录到Python路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.app_api import app

if __name__ == '__main__':
    # 重启服务
    try:
        app.run(debug=True, host='0.0.0.0', port=5000)
    except OSError as e:
        if 'Address already in use' in str(e):
            print("端口 5000 已被占用，请更换端口或关闭占用该端口的程序后重试。")
        else:
            raise
    app.run(debug=True, host='0.0.0.0', port=5000)