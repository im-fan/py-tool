import json

# 模拟参数解析过程
params = '{"test_key":"test_value","number":123}'
print(f"原始params: {params}")

params_dict = {}
if params and params.strip():
    try:
        params_dict = json.loads(params)
        # 生成参数代码，插入到Python文件开头
        # 1. 定义SysParam类
        # 2. 将params_dict转换为SysParam对象
        params_code = f"# 预设自定义参数\nclass SysParam:\n    def __init__(self, **kwargs):\n        for key, value in kwargs.items():\n            setattr(self, key, value)\n\n# 转换为SysParam对象\nparams = SysParam(**{params_dict})\n\n"
        print(f"生成的params_code: {params_code}")
    except json.JSONDecodeError as e:
        print(f"[WARNING] 参数解析错误: {str(e)}")
