// 初始化Monaco Editor
let editor;
require.config({
    paths: {
        'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs'
    }
});

document.addEventListener('DOMContentLoaded', function() {
    // 初始化Monaco Editor
    require(['vs/editor/editor.main'], function() {
        editor = monaco.editor.create(document.getElementById('code-editor'), {
            value: '',
            language: 'python',
            theme: 'vs-dark',
            automaticLayout: true,
            minimap: {
                enabled: true
            },
            scrollBeyondLastLine: false,
            fontSize: 14,
            tabSize: 4,
            insertSpaces: true,
            lineNumbers: 'on',
            wordWrap: 'on',
            bracketPairColorization: {
                enabled: true
            },
            autoClosingBrackets: 'always',
            autoClosingQuotes: 'always',
            contextmenu: true,
            suggestOnTriggerCharacters: true,
            quickSuggestions: {
                other: true,
                comments: false,
                strings: false
            },
            parameterHints: {
                enabled: true
            },
            formatOnType: true
        });
    });
    
    loadApps();
    initSearch();
    initModal();
    initDeleteModal();
    initRunModal();
    initSortable();
    initSettingsModal();
});

// 加载应用列表
function loadApps() {
    fetch('/api/apps')
        .then(response => response.json())
        .then(data => {
            renderApps(data);
        })
        .catch(error => {
            console.error('加载应用失败:', error);
            alert('加载应用失败，请刷新页面重试');
        });
}

// 渲染应用卡片
function renderApps(apps) {
    const container = document.getElementById('cards-container');
    container.innerHTML = '';
    
    apps.forEach(app => {
        const card = document.createElement('div');
        card.className = 'card';
        card.dataset.id = app.id;
        
        const tagsHtml = app.tags ? app.tags.split(',').map(tag => 
            `<span class="tag">${tag.trim()}</span>`
        ).join('') : '';
        
        card.innerHTML = `
            <div class="card-header">
                <div>
                    <div class="card-title">${app.name}</div>
                    <div class="card-tags">${tagsHtml}</div>
                </div>
                <div class="card-actions">
                    <button class="run-btn" onclick="showRunModal(${app.id})" title="执行">
                        <i class="fas fa-play"></i>
                    </button>
                    <button class="edit-btn" onclick="editApp(${app.id})" title="编辑">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="delete-btn" onclick="showDeleteConfirm(${app.id})" title="删除">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="card-description">${app.description || '暂无描述'}</div>
        `;
        
        container.appendChild(card);
    });
}

// 搜索功能
function initSearch() {
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', function() {
        const keyword = this.value.toLowerCase();
        const cards = document.querySelectorAll('.card');
        
        cards.forEach(card => {
            const title = card.querySelector('.card-title').textContent.toLowerCase();
            if (title.includes(keyword)) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    });
}

// 初始化模态框
function initModal() {
    const modal = document.getElementById('app-modal');
    const addBtn = document.getElementById('add-app-btn');
    const closeBtn = document.getElementById('close-modal');
    const cancelBtn = document.getElementById('cancel-btn');
    const form = document.getElementById('app-form');
    
    // 打开新增模态框
    addBtn.addEventListener('click', function() {
        document.getElementById('modal-title').textContent = '新增应用';
        form.reset();
        // 显式清除app-id字段，确保是新增操作
        document.getElementById('app-id').value = '';
        if (editor) {
            editor.setValue('');
        }
        modal.style.display = 'block';
    });
    
    // 关闭模态框
    function closeModal() {
        modal.style.display = 'none';
    }
    
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    
    // 点击模态框外部关闭
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            closeModal();
        }
    });
    
    // 提交表单
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const formData = {
            id: document.getElementById('app-id').value || null,
            name: document.getElementById('app-name').value,
            tags: document.getElementById('app-tags').value,
            description: document.getElementById('app-description').value,
            params: document.getElementById('app-params').value,
            code: editor ? editor.getValue() : ''
        };
        
        const method = formData.id ? 'PUT' : 'POST';
        const url = formData.id ? `/api/apps/${formData.id}` : '/api/apps';
        
        fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                closeModal();
                loadApps();
            } else {
                alert('保存失败: ' + data.message);
            }
        })
        .catch(error => {
            console.error('保存失败:', error);
            alert('保存失败，请重试');
        });
    });
}

// 编辑应用
function editApp(id) {
    fetch(`/api/apps/${id}`)
        .then(response => response.json())
        .then(app => {
            document.getElementById('modal-title').textContent = '编辑应用';
            document.getElementById('app-id').value = app.id;
            document.getElementById('app-name').value = app.name;
            document.getElementById('app-tags').value = app.tags;
            document.getElementById('app-description').value = app.description;
            document.getElementById('app-params').value = app.params;
            
            // 设置Monaco Editor内容
            if (editor) {
                editor.setValue(app.code);
            } else {
                // 如果编辑器还未初始化，等待初始化后再设置
                setTimeout(() => {
                    if (editor) {
                        editor.setValue(app.code);
                    }
                }, 100);
            }
            
            document.getElementById('app-modal').style.display = 'block';
        })
        .catch(error => {
            console.error('加载应用详情失败:', error);
            alert('加载应用详情失败，请重试');
        });
}

// 初始化删除确认模态框
let currentDeleteId = null;

function initDeleteModal() {
    const modal = document.getElementById('delete-modal');
    const cancelBtn = document.getElementById('cancel-delete');
    const confirmBtn = document.getElementById('confirm-delete');
    
    function closeDeleteModal() {
        modal.style.display = 'none';
        currentDeleteId = null;
    }
    
    cancelBtn.addEventListener('click', closeDeleteModal);
    
    // 点击模态框外部关闭
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            closeDeleteModal();
        }
    });
    
    // 确认删除
    confirmBtn.addEventListener('click', function() {
        if (currentDeleteId) {
            fetch(`/api/apps/${currentDeleteId}`, {
                method: 'DELETE'
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    closeDeleteModal();
                    loadApps();
                } else {
                    alert('删除失败: ' + data.message);
                }
            })
            .catch(error => {
                console.error('删除失败:', error);
                alert('删除失败，请重试');
            });
        }
    });
}

// 显示删除确认
function showDeleteConfirm(id) {
    currentDeleteId = id;
    document.getElementById('delete-modal').style.display = 'block';
}

// 初始化执行模态框
let currentRunId = null;

function initRunModal() {
    const modal = document.getElementById('run-modal');
    const closeBtn = document.getElementById('close-run-modal');
    const cancelBtn = document.getElementById('cancel-run-btn');
    const executeBtn = document.getElementById('execute-btn');
    
    // 关闭模态框
    function closeRunModal() {
        modal.style.display = 'none';
        currentRunId = null;
    }
    
    closeBtn.addEventListener('click', closeRunModal);
    cancelBtn.addEventListener('click', closeRunModal);
    
    // 点击模态框外部关闭
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            closeRunModal();
        }
    });
    
    // 执行应用
    executeBtn.addEventListener('click', function() {
        if (currentRunId) {
            // 执行前准备
            executeBtn.disabled = true;
            executeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 执行中...';
            
            // 显示结果区域
            const resultsDiv = document.getElementById('run-results');
            resultsDiv.style.display = 'block';
            
            // 清空之前的控制台输出和结果
            const consoleOutputDiv = document.getElementById('console-output');
            const resultDiv = document.getElementById('execution-result');
            consoleOutputDiv.innerHTML = '';
            resultDiv.innerHTML = '';
            
            // 添加执行日志到控制台输出
            function addLog(message) {
                const now = new Date();
                const timeStr = now.toLocaleTimeString();
                consoleOutputDiv.innerHTML += `[${timeStr}] ${message}\n`;
                consoleOutputDiv.scrollTop = consoleOutputDiv.scrollHeight;
            }
            
            addLog('开始执行应用...');
            addLog('正在准备执行环境...');
            
            fetch(`/api/apps/${currentRunId}/execute`, {
                method: 'POST'
            })
            .then(response => {
                addLog('正在处理执行结果...');
                return response.json();
            })
            .then(data => {
                // 合并控制台输出
                if (data.console_output) {
                    consoleOutputDiv.innerHTML += data.console_output + '\n';
                }
                consoleOutputDiv.scrollTop = consoleOutputDiv.scrollHeight;
                
                if (data.success) {
                    addLog('应用执行成功！');
                    resultDiv.innerHTML = data.output;
                    resultDiv.style.color = '#27ae60';
                    resultDiv.style.backgroundColor = '#eafaf1';
                    resultDiv.style.borderColor = '#27ae60';
                } else {
                    addLog('应用执行失败！');
                    resultDiv.innerHTML = `错误：${data.error}\n\n详细信息：\n${data.details || ''}`;
                    resultDiv.style.color = '#e74c3c';
                    resultDiv.style.backgroundColor = '#fee';
                    resultDiv.style.borderColor = '#e74c3c';
                }
            })
            .catch(error => {
                addLog('网络请求失败！');
                resultDiv.innerHTML = `请求错误：${error.message}`;
                resultDiv.style.color = '#e74c3c';
                resultDiv.style.backgroundColor = '#fee';
                resultDiv.style.borderColor = '#e74c3c';
            })
            .finally(() => {
                // 恢复按钮状态
                executeBtn.disabled = false;
                executeBtn.innerHTML = '运行';
                addLog('执行流程结束');
            });
        }
    });
}

// 显示执行模态框
function showRunModal(id) {
    // 清空之前的控制台输出和结果
    document.getElementById('console-output').innerHTML = '';
    document.getElementById('execution-result').innerHTML = '';
    
    // 重置结果样式
    const resultDiv = document.getElementById('execution-result');
    resultDiv.style.color = '';
    resultDiv.style.backgroundColor = '';
    resultDiv.style.borderColor = '';
    
    // 隐藏结果区域
    document.getElementById('run-results').style.display = 'none';
    
    fetch(`/api/apps/${id}`)
        .then(response => response.json())
        .then(app => {
            currentRunId = id;
            document.getElementById('run-modal-title').textContent = `执行应用：${app.name}`;
            
            // 格式化参数显示
            let paramsHtml = '<pre>{}</pre>';
            if (app.params) {
                try {
                    const parsedParams = JSON.parse(app.params);
                    paramsHtml = '<pre>' + JSON.stringify(parsedParams, null, 2) + '</pre>';
                } catch (e) {
                    paramsHtml = `<pre style="color: #e74c3c;">参数格式错误：${app.params}</pre>`;
                }
            }
            
            // 生成模态框内容
            const modalBody = document.getElementById('run-modal-body');
            modalBody.innerHTML = `
                <div class="form-group">
                    <label>应用名称</label>
                    <div>${app.name}</div>
                </div>
                <div class="form-group">
                    <label>功能描述</label>
                    <div>${app.description || '暂无描述'}</div>
                </div>
                <div class="form-group">
                    <label>自定义入参</label>
                    ${paramsHtml}
                </div>
            `;
            
            document.getElementById('run-modal').style.display = 'block';
        })
        .catch(error => {
            console.error('加载应用详情失败:', error);
            alert('加载应用详情失败，请重试');
        });
}
        
// 初始化拖拽排序
function initSortable() {
    const container = document.getElementById('cards-container');
    
    // 检查Sortable库是否存在，避免错误中断后续代码执行
    if (typeof Sortable !== 'undefined') {
        new Sortable(container, {
            animation: 150,
            ghostClass: 'dragging',
            handle: '.card',
            onEnd: function(evt) {
                // 获取新的顺序
                const cards = container.querySelectorAll('.card');
                const newOrder = Array.from(cards).map(card => card.dataset.id);
                
                // 更新顺序到服务器
                fetch('/api/apps/reorder', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ order: newOrder })
                })
                .then(response => response.json())
                .then(data => {
                    if (!data.success) {
                        alert('更新顺序失败，请重试');
                        // 重新加载以恢复原始顺序
                        loadApps();
                    }
                })
                .catch(error => {
                    console.error('更新顺序失败:', error);
                    alert('更新顺序失败，请重试');
                    loadApps();
                });
            }
        });
    }
}

// 初始化设置模态框
function initSettingsModal() {
    const modal = document.getElementById('settings-modal');
    const settingsBtn = document.getElementById('settings-btn');
    const closeBtn = document.getElementById('close-settings-modal');
    const cancelBtn = document.getElementById('cancel-settings-btn');
    const saveBtn = document.getElementById('save-settings-btn');
    const confirmModal = document.getElementById('settings-confirm-modal');
    const cancelConfirmBtn = document.getElementById('cancel-settings-confirm');
    const confirmBtn = document.getElementById('confirm-settings-confirm');
    
    // 打开设置模态框
    settingsBtn.addEventListener('click', function() {
        loadSettings();
        modal.style.display = 'block';
    });
    
    // 关闭设置模态框
    function closeSettingsModal() {
        modal.style.display = 'none';
    }
    
    closeBtn.addEventListener('click', closeSettingsModal);
    cancelBtn.addEventListener('click', closeSettingsModal);
    
    // 点击模态框外部关闭
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            closeSettingsModal();
        }
    });
    
    // 保存设置按钮点击
    saveBtn.addEventListener('click', function() {
        // 显示确认模态框
        confirmModal.style.display = 'block';
    });
    
    // 取消保存设置
    cancelConfirmBtn.addEventListener('click', function() {
        confirmModal.style.display = 'none';
    });
    
    // 点击确认模态框外部关闭
    window.addEventListener('click', function(event) {
        if (event.target === confirmModal) {
            confirmModal.style.display = 'none';
        }
    });
    
    // 确认保存设置
    confirmBtn.addEventListener('click', function() {
        saveSettings();
        confirmModal.style.display = 'none';
    });
}
        
// 加载系统设置
function loadSettings() {
    fetch('/api/settings')
        .then(response => response.json())
        .then(settings => {
            // 填充设置表单
            if (settings.sqlite_path) {
                // 兼容不同格式的API返回结果
                const sqlitePathValue = typeof settings.sqlite_path === 'object' && settings.sqlite_path.value 
                    ? settings.sqlite_path.value 
                    : settings.sqlite_path;
                document.getElementById('sqlite-path').value = sqlitePathValue;
            }
        })
        .catch(error => {
            console.error('加载设置失败:', error);
            alert('加载设置失败，请刷新页面重试');
        });
}
        
// 保存系统设置
function saveSettings() {
    const sqlitePath = document.getElementById('sqlite-path').value;
    
    const settingsData = {
        sqlite_path: {
            value: sqlitePath,
            description: 'SQLite数据库文件路径'
        }
    };
    
    // 保存设置
    fetch('/api/settings', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(settingsData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // 保存成功，提示用户并重启应用
            alert('设置保存成功，应用将重启...');
            // 重启应用
            restartApp();
        } else {
            alert('保存设置失败: ' + data.message);
        }
    })
    .catch(error => {
        console.error('保存设置失败:', error);
        alert('保存设置失败，请重试');
    });
}

// 重启应用
function restartApp() {
    fetch('/api/restart', {
        method: 'POST'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // 延迟刷新页面，让服务器有时间重启
            setTimeout(function() {
                window.location.reload();
            }, 2000);
        } else {
            alert('重启应用失败: ' + data.message);
        }
    })
    .catch(error => {
        console.error('重启应用失败:', error);
        // 即使API调用失败，也尝试刷新页面
        setTimeout(function() {
            window.location.reload();
        }, 2000);
    });
}