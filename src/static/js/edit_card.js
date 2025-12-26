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
    
    // 初始化表单
    initForm();
    
    // 从URL获取应用ID，加载应用数据（如果是编辑模式）
    const urlParams = new URLSearchParams(window.location.search);
    const appId = urlParams.get('id');
    if (appId) {
        loadAppData(appId);
    } else {
        // 新增模式，设置标题为"新增应用"
        document.getElementById('page-title').textContent = '新增应用';
        document.title = '新增应用';
    }
});

// 加载应用数据
function loadAppData(id) {
    fetch(`/api/apps/${id}`)
        .then(response => response.json())
        .then(app => {
            // 编辑模式，设置标题为"编辑应用"
            document.getElementById('page-title').textContent = '编辑应用';
            document.title = '编辑应用';
            
            document.getElementById('app-id').value = app.id;
            document.getElementById('app-name').value = app.name;
            
            // 设置标签值到隐藏输入框
            document.getElementById('app-tags').value = app.tags;
            
            // 重新初始化标签输入功能，确保已有标签正确显示
            initTagsInput();
            
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
        })
        .catch(error => {
            console.error('加载应用详情失败:', error);
            alert('加载应用详情失败，请重试');
        });
}

// 初始化标签输入功能
function initTagsInput() {
    const tagsContainer = document.getElementById('tags-container');
    const tagsInput = document.getElementById('app-tags-input');
    const hiddenTagsInput = document.getElementById('app-tags');
    
    // 清空现有标签
    tagsContainer.innerHTML = '';
    
    // 标签数组
    let tags = [];
    
    // 添加标签
    function addTag(tagName) {
        // 去除空白字符
        tagName = tagName.trim();
        
        // 跳过空标签
        if (!tagName) return;
        
        // 跳过重复标签
        if (tags.includes(tagName)) return;
        
        // 添加到标签数组
        tags.push(tagName);
        
        // 创建标签元素
        const tagElement = document.createElement('div');
        tagElement.className = 'tag';
        tagElement.innerHTML = `
            <span>${tagName}</span>
            <span class="tag-remove" onclick="removeTag('${tagName}')">×</span>
        `;
        
        // 添加到容器
        tagsContainer.appendChild(tagElement);
        
        // 更新隐藏输入框的值
        updateHiddenInput();
        
        // 清空输入框
        tagsInput.value = '';
    }
    
    // 移除标签
    window.removeTag = function(tagName) {
        // 从数组中移除
        tags = tags.filter(tag => tag !== tagName);
        
        // 移除DOM元素
        const tagElements = tagsContainer.querySelectorAll('.tag');
        tagElements.forEach(tagElement => {
            if (tagElement.textContent.includes(tagName)) {
                tagElement.remove();
            }
        });
        
        // 更新隐藏输入框的值
        updateHiddenInput();
    };
    
    // 更新隐藏输入框的值
    function updateHiddenInput() {
        hiddenTagsInput.value = tags.join(',');
    }
    
    // 监听输入事件
    tagsInput.addEventListener('keydown', function(e) {
        // 支持中英文逗号
        if (e.key === ',' || e.key === '，') {
            e.preventDefault();
            addTag(tagsInput.value);
        }
    });
    
    // 监听失去焦点事件，添加当前输入的标签
    tagsInput.addEventListener('blur', function() {
        addTag(tagsInput.value);
    });
    
    // 初始化已有的标签
    function initExistingTags() {
        const existingTags = hiddenTagsInput.value;
        if (existingTags) {
            existingTags.split(',').forEach(tag => {
                addTag(tag);
            });
        }
    }
    
    // 初始化已有的标签
    initExistingTags();
}

// 初始化表单
function initForm() {
    const form = document.getElementById('app-form');
    
    // 初始化标签输入功能
    initTagsInput();
    
    // 提交表单
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // 确保当前输入的内容被添加为标签
        const tagsInput = document.getElementById('app-tags-input');
        if (tagsInput.value.trim()) {
            // 触发失去焦点事件，添加当前标签
            tagsInput.dispatchEvent(new Event('blur'));
        }
        
        const formData = {
            id: document.getElementById('app-id').value || null,
            name: document.getElementById('app-name').value,
            tags: document.getElementById('app-tags').value,
            description: document.getElementById('app-description').value,
            params: document.getElementById('app-params').value,
            code: editor ? editor.getValue() : '',
            note: document.getElementById('app-note').value
        };
        
        // 验证备注不能为空
        if (!formData.note.trim()) {
            alert('备注信息不能为空');
            return;
        }
        
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
                // 保存成功，返回应用列表页面
                window.location.href = 'index.html';
            } else {
                alert('保存失败: ' + data.message);
            }
        })
        .catch(error => {
            console.error('保存失败:', error);
            alert('保存失败，请重试');
        });
    });
    
    // 初始化历史记录功能
    initHistory();
}

// 初始化历史记录功能
function initHistory() {
    // 创建历史记录模态框
    createHistoryModal();
    
    // 创建详情查看模态框
    createDetailModal();
    
    // 绑定历史记录按钮事件
    const historyBtn = document.getElementById('history-btn');
    historyBtn.addEventListener('click', function() {
        const appId = document.getElementById('app-id').value;
        if (appId) {
            showHistoryModal(appId);
        } else {
            alert('请先保存应用，然后才能查看历史记录');
        }
    });
}

// 创建历史记录模态框
function createHistoryModal() {
    const modalHtml = `
    <div id="history-modal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2 class="modal-title">应用历史记录</h2>
                <button class="close" onclick="closeHistoryModal()">&times;</button>
            </div>
            <div class="modal-body">
                <ul id="history-list" class="history-list"></ul>
                <div id="no-history" style="display: none; text-align: center; color: #666; padding: 20px;">暂无历史记录</div>
            </div>
        </div>
    </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// 创建详情查看模态框
function createDetailModal() {
    const modalHtml = `
    <div id="detail-modal" class="modal detail-modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2 class="modal-title" id="detail-title">详情</h2>
                <button class="close" onclick="closeDetailModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div id="detail-content" class="detail-content"></div>
            </div>
        </div>
    </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// 显示历史记录模态框
function showHistoryModal(appId) {
    const modal = document.getElementById('history-modal');
    const historyList = document.getElementById('history-list');
    const noHistory = document.getElementById('no-history');
    
    // 清空列表
    historyList.innerHTML = '';
    noHistory.style.display = 'none';
    
    // 加载历史记录
    fetch(`/api/apps/${appId}/history`)
        .then(response => response.json())
        .then(history => {
            if (history.length === 0) {
                noHistory.style.display = 'block';
            } else {
                // 渲染历史记录列表
                history.forEach(record => {
                    const listItem = createHistoryItem(record);
                    historyList.appendChild(listItem);
                });
            }
            
            // 显示模态框
            modal.classList.add('show');
        })
        .catch(error => {
            console.error('加载历史记录失败:', error);
            alert('加载历史记录失败，请重试');
        });
}

// 创建历史记录列表项
function createHistoryItem(record) {
    const li = document.createElement('li');
    li.className = 'history-item';
    
    // 使用数据属性存储记录信息
    li.dataset.record = JSON.stringify(record);
    
    li.innerHTML = `
        <div class="history-item-header">
            <span class="history-item-app-name">${record.app_name}</span>
            <span class="history-item-time">${record.created_at}</span>
        </div>
        <div class="history-item-body">
            <div class="history-item-note">
                <strong>备注:</strong> ${record.note}
            </div>
            <div class="history-item-fields">
                <div class="history-item-field">
                    <span>参数:</span>
                    <button class="view-btn" data-type="params">查看</button>
                </div>
                <div class="history-item-field">
                    <span>代码:</span>
                    <button class="view-btn" data-type="code">查看</button>
                </div>
            </div>
        </div>
        <div class="history-item-actions">
            <button class="apply-btn">应用</button>
        </div>
    `;
    
    // 绑定查看按钮事件
    const viewBtns = li.querySelectorAll('.view-btn');
    viewBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const type = this.dataset.type;
            const record = JSON.parse(li.dataset.record);
            const title = type === 'params' ? '参数' : '代码';
            const content = type === 'params' ? (record.params || '{}') : record.code;
            viewDetail(title, content);
        });
    });
    
    // 绑定应用按钮事件
    const applyBtn = li.querySelector('.apply-btn');
    applyBtn.addEventListener('click', function() {
        const record = JSON.parse(li.dataset.record);
        applyHistory(record);
    });
    
    return li;
}

// 查看详情
function viewDetail(title, content) {
    const modal = document.getElementById('detail-modal');
    const detailTitle = document.getElementById('detail-title');
    const detailContent = document.getElementById('detail-content');
    
    detailTitle.textContent = title;
    detailContent.textContent = content;
    modal.classList.add('show');
}

// 应用历史记录
function applyHistory(record) {
    // 关闭历史记录模态框
    closeHistoryModal();
    
    // 回填表单数据
    document.getElementById('app-name').value = record.app_name;
    document.getElementById('app-tags').value = record.tags || '';
    
    // 重新初始化标签输入功能，确保标签正确显示
    initTagsInput();
    
    document.getElementById('app-description').value = record.description || '';
    document.getElementById('app-params').value = record.params || '';
    
    // 设置Monaco Editor内容
    if (editor) {
        editor.setValue(record.code);
    }
    
    // 自动生成备注，包含历史记录ID
    document.getElementById('app-note').value = `从历史记录恢复（ID: ${record.id}，时间: ${record.created_at}）`;
}

// 关闭历史记录模态框
function closeHistoryModal() {
    const modal = document.getElementById('history-modal');
    modal.classList.remove('show');
}

// 关闭详情模态框
function closeDetailModal() {
    const modal = document.getElementById('detail-modal');
    modal.classList.remove('show');
}

// HTML转义函数
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 点击模态框外部关闭模态框
window.addEventListener('click', function(event) {
    const historyModal = document.getElementById('history-modal');
    const detailModal = document.getElementById('detail-modal');
    
    if (event.target === historyModal) {
        closeHistoryModal();
    }
    
    if (event.target === detailModal) {
        closeDetailModal();
    }
});
