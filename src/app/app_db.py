import sqlite3
import os

# 数据库路径
# 获取项目路径下resource/db/apps.db文件路径
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'resource', 'db', 'apps.db')


# 初始化数据库
def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # 创建应用表
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS apps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        tags TEXT,
        description TEXT,
        params TEXT,
        code TEXT NOT NULL,
        position INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    
    # 创建系统设置表
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS system_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE NOT NULL,
        value TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    
    # 创建应用历史记录表
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS app_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        app_id INTEGER NOT NULL,
        app_name TEXT NOT NULL,
        tags TEXT,
        description TEXT,
        params TEXT,
        code TEXT NOT NULL,
        note TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (app_id) REFERENCES apps (id)
    )
    ''')
    
    # 插入默认设置
    cursor.execute('INSERT OR IGNORE INTO system_settings (key, value, description) VALUES (?, ?, ?)', 
                   ('sqlite_path', DB_PATH, 'SQLite数据库文件路径'))
    
    conn.commit()
    conn.close()

# 获取数据库连接 - 为每个请求创建新连接，避免线程安全问题
def get_db():
    db_conn = sqlite3.connect(DB_PATH)
    db_conn.row_factory = sqlite3.Row
    return db_conn

# 应用启动时初始化数据库
init_db()