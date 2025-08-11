
# LangChain 中的 ChatPromptTemplate 使用详解

## 概述

`ChatPromptTemplate` 是 LangChain 中用于创建聊天模型提示模板的核心类。它允许您定义包含变量的提示模板，并在运行时动态填充这些变量，从而创建结构化的对话提示。

## 基本概念

### 什么是 ChatPromptTemplate

`ChatPromptTemplate` 是一个模板类，用于创建包含占位符的提示字符串。这些占位符可以在运行时被实际值替换，使得提示更加灵活和可重用。

### 主要特点

- **变量插值**：支持在模板中使用变量占位符
- **类型安全**：提供类型提示和验证
- **灵活格式**：支持多种模板格式（f-string、Jinja2等）
- **消息类型**：支持不同类型的消息模板（Human、AI、System等）

## 基本用法

### 1. 创建简单的提示模板

```python
from langchain.prompts import ChatPromptTemplate

# 创建基本模板
template = ChatPromptTemplate.from_template("你好，{name}！今天感觉怎么样？")

# 格式化模板
formatted_prompt = template.format(name="张三")
print(formatted_prompt)
```

### 2. 使用多个变量

```python
from langchain.prompts import ChatPromptTemplate

# 包含多个变量的模板
template = ChatPromptTemplate.from_template(
    "请帮我写一个关于 {topic} 的 {language} 函数，要求：{requirements}"
)

# 格式化模板
formatted_prompt = template.format(
    topic="排序算法",
    language="Python",
    requirements="时间复杂度为 O(n log n)"
)
print(formatted_prompt)
```

## 消息类型模板

### 1. HumanMessagePromptTemplate

用于创建用户消息模板：

```python
from langchain.prompts.chat import HumanMessagePromptTemplate

# 创建用户消息模板
user_template = HumanMessagePromptTemplate.from_template(
    "请解释一下 {concept} 的概念"
)

# 格式化
user_message = user_template.format(concept="机器学习")
print(user_message)
```

### 2. AIMessagePromptTemplate

用于创建AI助手消息模板：

```python
from langchain.prompts.chat import AIMessagePromptTemplate

# 创建AI消息模板
ai_template = AIMessagePromptTemplate.from_template(
    "根据 {context}，我的回答是：{answer}"
)

# 格式化
ai_message = ai_template.format(
    context="用户询问了机器学习概念",
    answer="机器学习是人工智能的一个分支..."
)
print(ai_message)
```

### 3. SystemMessagePromptTemplate

用于创建系统消息模板：

```python
from langchain.prompts.chat import SystemMessagePromptTemplate

# 创建系统消息模板
system_template = SystemMessagePromptTemplate.from_template(
    "你是一个专业的 {role}，请用 {tone} 的语气回答问题。"
)

# 格式化
system_message = system_template.format(
    role="Python开发工程师",
    tone="友好专业"
)
print(system_message)
```

## 组合多个消息模板

### 使用 ChatPromptTemplate.from_messages()

```python
from langchain.prompts import ChatPromptTemplate
from langchain.prompts.chat import SystemMessagePromptTemplate, HumanMessagePromptTemplate

# 创建系统消息模板
system_template = SystemMessagePromptTemplate.from_template(
    "你是一个专业的 {role}，请用 {tone} 的语气回答问题。"
)

# 创建用户消息模板
human_template = HumanMessagePromptTemplate.from_template(
    "请帮我解决这个 {problem_type} 问题：{problem_description}"
)

# 组合多个消息模板
chat_prompt = ChatPromptTemplate.from_messages([
    ("system", system_template),
    ("human", human_template)
])

# 格式化
formatted_messages = chat_prompt.format(
    role="Python开发工程师",
    tone="友好专业",
    problem_type="算法",
    problem_description="如何实现快速排序？"
)

for message in formatted_messages:
    print(f"{message.type}: {message.content}")
```

## 高级用法

### 1. 使用 template_format 参数

`template_format` 参数用于指定模板的格式。LangChain 支持多种模板格式，每种格式都有其特定的语法和用途。

#### 支持的模板格式

LangChain 主要支持以下几种模板格式：

1. **f-string**（默认）：Python 的 f-string 格式，使用 `{variable}` 语法
2. **jinja2**：Jinja2 模板引擎格式，使用 `{{ variable }}` 语法
3. **json**：JSON 格式的模板
4. **python**：Python 代码格式的模板

#### 1. f-string 格式（默认）

**语法特点**：
- 使用 `{variable_name}` 语法
- 支持简单的变量插值
- 不支持复杂的逻辑控制
- 性能最好，语法最简单

**示例**：
```python
from langchain.prompts.chat import HumanMessagePromptTemplate

# 基本变量插值
template = HumanMessagePromptTemplate.from_template(
    "你好，{name}！你的年龄是 {age} 岁。",
    template_format="f-string"
)
prompt = template.format(name="张三", age=25)
print(prompt.content)
# 输出：你好，张三！你的年龄是 25 岁。

# 支持格式化
template = HumanMessagePromptTemplate.from_template(
    "计算结果：{result:.2f}",
    template_format="f-string"
)
prompt = template.format(result=3.14159)
print(prompt.content)
# 输出：计算结果：3.14
```

**适用场景**：
- 简单的变量替换
- 性能要求高的场景
- 不需要复杂逻辑的模板

#### 2. Jinja2 格式

**语法特点**：
- 使用 `{{ variable }}` 语法
- 支持复杂的逻辑控制（条件、循环等）
- 支持过滤器
- 功能最强大，但性能相对较低

**基本变量插值**：
```python
from langchain.prompts.chat import HumanMessagePromptTemplate

template = HumanMessagePromptTemplate.from_template(
    "你好，{{ name }}！你的年龄是 {{ age }} 岁。",
    template_format="jinja2"
)
prompt = template.format(name="张三", age=25)
print(prompt.content)
# 输出：你好，张三！你的年龄是 25 岁。
```

**条件语句**：
```python
template = HumanMessagePromptTemplate.from_template(
    """
    {% if age >= 18 %}
    你好，{{ name }}！你已经成年了。
    {% else %}
    你好，{{ name }}！你还未成年，年龄是 {{ age }} 岁。
    {% endif %}
    """,
    template_format="jinja2"
)

# 测试不同年龄
for age in [16, 20]:
    prompt = template.format(name="张三", age=age)
    print(f"年龄 {age}: {prompt.content.strip()}")
```

**循环语句**：
```python
template = HumanMessagePromptTemplate.from_template(
    """
    你的技能列表：
    {% for skill in skills %}
    {{ loop.index }}. {{ skill.name }} - {{ skill.level }}
    {% endfor %}
    
    总计：{{ skills|length }} 项技能
    """,
    template_format="jinja2"
)

skills = [
    {"name": "Python", "level": "高级"},
    {"name": "JavaScript", "level": "中级"},
    {"name": "SQL", "level": "高级"}
]

prompt = template.format(skills=skills)
print(prompt.content)
```

**过滤器使用**：
```python
template = HumanMessagePromptTemplate.from_template(
    """
    原始文本：{{ text }}
    大写：{{ text|upper }}
    小写：{{ text|lower }}
    长度：{{ text|length }}
    截取前10个字符：{{ text[:10] }}
    """,
    template_format="jinja2"
)

prompt = template.format(text="Hello World")
print(prompt.content)
```

**复杂逻辑示例**：
```python
template = HumanMessagePromptTemplate.from_template(
    """
    {% if user_type == 'admin' %}
    欢迎管理员 {{ username }}！
    您有以下权限：
    {% for permission in permissions %}
    - {{ permission }}
    {% endfor %}
    {% elif user_type == 'user' %}
    欢迎用户 {{ username }}！
    {% if is_vip %}
    您是VIP用户，享受特殊服务。
    {% endif %}
    {% else %}
    欢迎访客！
    {% endif %}
    
    当前时间：{{ current_time }}
    """,
    template_format="jinja2"
)

# 管理员用户
admin_prompt = template.format(
    user_type="admin",
    username="admin",
    permissions=["读取", "写入", "删除", "管理"],
    current_time="2024-01-01 12:00:00"
)
print("管理员提示：")
print(admin_prompt.content)

# 普通用户
user_prompt = template.format(
    user_type="user",
    username="user123",
    is_vip=True,
    current_time="2024-01-01 12:00:00"
)
print("\n用户提示：")
print(user_prompt.content)
```

#### 3. JSON 格式

**语法特点**：
- 使用 JSON 结构定义模板
- 支持嵌套结构
- 适合结构化数据

**示例**：
```python
from langchain.prompts.chat import HumanMessagePromptTemplate

template = HumanMessagePromptTemplate.from_template(
    """
    {
        "role": "user",
        "content": "请帮我分析以下数据：",
        "data": {
            "name": "{name}",
            "age": {age},
            "skills": {skills}
        }
    }
    """,
    template_format="json"
)

prompt = template.format(
    name="张三",
    age=25,
    skills=["Python", "JavaScript", "SQL"]
)
print(prompt.content)
```

#### 4. Python 格式

**语法特点**：
- 使用 Python 代码格式
- 支持 Python 语法
- 适合需要执行 Python 代码的场景

**示例**：
```python
from langchain.prompts.chat import HumanMessagePromptTemplate

template = HumanMessagePromptTemplate.from_template(
    """
    def generate_response(name, age, skills):
        return f"用户 {name}，年龄 {age}，技能：{', '.join(skills)}"
    
    result = generate_response("{name}", {age}, {skills})
    print(result)
    """,
    template_format="python"
)

prompt = template.format(
    name="张三",
    age=25,
    skills=["Python", "JavaScript", "SQL"]
)
print(prompt.content)
```

#### 格式对比总结

| 格式 | 语法 | 性能 | 功能 | 适用场景 |
|------|------|------|------|----------|
| f-string | `{var}` | 最好 | 简单变量插值 | 简单模板，高性能要求 |
| Jinja2 | `{{ var }}` | 中等 | 复杂逻辑控制 | 复杂模板，需要条件循环 |
| JSON | JSON结构 | 好 | 结构化数据 | 数据交换，API接口 |
| Python | Python代码 | 中等 | Python语法 | 代码生成，脚本模板 |

#### 选择建议

1. **简单变量替换**：使用 f-string 格式
2. **复杂逻辑控制**：使用 Jinja2 格式
3. **结构化数据**：使用 JSON 格式
4. **代码生成**：使用 Python 格式

#### 注意事项

- 如果使用非默认格式（如 Jinja2），需要确保模板字符串符合对应格式的语法规则
- `template_format` 的值必须是 LangChain 支持的格式，否则会抛出错误
- 不同格式的性能差异较大，在性能敏感的场景下要谨慎选择
- Jinja2 格式功能最强大，但也最容易出错，需要仔细测试

#### 性能优化技巧

**1. 缓存模板实例**
```python
from langchain.prompts.chat import HumanMessagePromptTemplate
from functools import lru_cache

@lru_cache(maxsize=100)
def get_template(template_str: str, template_format: str = "f-string"):
    """缓存模板实例以提高性能"""
    return HumanMessagePromptTemplate.from_template(template_str, template_format=template_format)

# 使用缓存的模板
template = get_template("你好，{name}！")
prompt = template.format(name="张三")
```

**2. 批量处理**
```python
from langchain.prompts.chat import HumanMessagePromptTemplate

# 创建模板
template = HumanMessagePromptTemplate.from_template(
    "用户：{{ name }}，年龄：{{ age }}，技能：{{ skills|join(', ') }}",
    template_format="jinja2"
)

# 批量数据
users_data = [
    {"name": "张三", "age": 25, "skills": ["Python", "JavaScript"]},
    {"name": "李四", "age": 30, "skills": ["Java", "Spring"]},
    {"name": "王五", "age": 28, "skills": ["Go", "Docker"]}
]

# 批量处理
prompts = [template.format(**user_data) for user_data in users_data]
for prompt in prompts:
    print(prompt.content)
```

**3. 模板预编译**
```python
from jinja2 import Template as JinjaTemplate
from langchain.prompts.chat import HumanMessagePromptTemplate

# 预编译 Jinja2 模板
jinja_template = JinjaTemplate("""
{% if user_type == 'admin' %}
欢迎管理员 {{ username }}！
{% else %}
欢迎用户 {{ username }}！
{% endif %}
""")

# 使用预编译的模板
def create_prompt_with_precompiled_template(user_type: str, username: str):
    content = jinja_template.render(user_type=user_type, username=username)
    return HumanMessagePromptTemplate.from_template(content)
```

#### 调试技巧

**1. 模板验证函数**
```python
import re
from typing import Dict, Any, List

def validate_template_variables(template_str: str, template_format: str = "f-string") -> Dict[str, Any]:
    """验证模板变量并返回分析结果"""
    result = {
        "valid": True,
        "variables": [],
        "errors": [],
        "suggestions": []
    }
    
    if template_format == "f-string":
        # 检查 f-string 变量
        pattern = r'\{([^}]*)\}'
        matches = re.findall(pattern, template_str)
        
        for match in matches:
            if match.strip():
                result["variables"].append(match.strip())
        
        # 检查未闭合的括号
        if template_str.count('{') != template_str.count('}'):
            result["valid"] = False
            result["errors"].append("未闭合的括号")
    
    elif template_format == "jinja2":
        # 检查 Jinja2 变量
        var_pattern = r'\{\{\s*([^}]*)\s*\}\}'
        control_pattern = r'\{%\s*([^%]*)\s*%\}'
        
        var_matches = re.findall(var_pattern, template_str)
        control_matches = re.findall(control_pattern, template_str)
        
        for match in var_matches:
            if match.strip():
                result["variables"].append(match.strip())
        
        # 检查 Jinja2 语法
        if template_str.count('{{') != template_str.count('}}'):
            result["valid"] = False
            result["errors"].append("Jinja2 变量标签不匹配")
        
        if template_str.count('{%') != template_str.count('%}'):
            result["valid"] = False
            result["errors"].append("Jinja2 控制标签不匹配")
    
    return result

# 测试模板验证
test_templates = [
    ("你好，{name}！", "f-string"),
    ("你好，{name}！{", "f-string"),  # 错误
    ("你好，{{ name }}！", "jinja2"),
    ("你好，{{ name }}！{% if age > 18 %}成年{% endif %}", "jinja2"),
    ("你好，{{ name }}！{% if age > 18 %}成年", "jinja2"),  # 错误
]

for template_str, format_type in test_templates:
    result = validate_template_variables(template_str, format_type)
    print(f"\n模板: {template_str}")
    print(f"格式: {format_type}")
    print(f"有效: {result['valid']}")
    print(f"变量: {result['variables']}")
    if result['errors']:
        print(f"错误: {result['errors']}")
```

**2. 模板测试函数**
```python
def test_template(template_str: str, test_data: Dict[str, Any], template_format: str = "f-string"):
    """测试模板是否能正确格式化"""
    try:
        template = HumanMessagePromptTemplate.from_template(template_str, template_format=template_format)
        result = template.format(**test_data)
        return {
            "success": True,
            "result": result.content,
            "error": None
        }
    except Exception as e:
        return {
            "success": False,
            "result": None,
            "error": str(e)
        }

# 测试示例
test_cases = [
    {
        "template": "你好，{name}！年龄：{age}",
        "data": {"name": "张三", "age": 25},
        "format": "f-string"
    },
    {
        "template": "你好，{{ name }}！年龄：{{ age }}",
        "data": {"name": "李四", "age": 30},
        "format": "jinja2"
    },
    {
        "template": "你好，{name}！年龄：{age}",
        "data": {"name": "王五"},  # 缺少 age
        "format": "f-string"
    }
]

for case in test_cases:
    result = test_template(case["template"], case["data"], case["format"])
    print(f"\n测试: {case['template']}")
    print(f"数据: {case['data']}")
    print(f"成功: {result['success']}")
    if result['success']:
        print(f"结果: {result['result']}")
    else:
        print(f"错误: {result['error']}")
```

#### 实际应用示例

**示例1：多语言支持模板**
```python
from langchain.prompts.chat import HumanMessagePromptTemplate

template = HumanMessagePromptTemplate.from_template(
    """
    {% if language == 'zh' %}
    你好，{{ name }}！欢迎使用我们的服务。
    {% elif language == 'en' %}
    Hello, {{ name }}! Welcome to our service.
    {% elif language == 'ja' %}
    こんにちは、{{ name }}さん！サービスをご利用いただき、ありがとうございます。
    {% else %}
    Hello, {{ name }}! Welcome to our service.
    {% endif %}
    
    当前时间：{{ current_time }}
    """,
    template_format="jinja2"
)

# 测试不同语言
languages = ['zh', 'en', 'ja']
for lang in languages:
    prompt = template.format(
        name="张三",
        language=lang,
        current_time="2024-01-01 12:00:00"
    )
    print(f"\n{lang.upper()} 版本:")
    print(prompt.content)
```

**示例2：动态内容生成**
```python
template = HumanMessagePromptTemplate.from_template(
    """
    {% if user_level == 'beginner' %}
    欢迎初学者！我们为您准备了基础教程：
    {% for tutorial in tutorials %}
    - {{ tutorial.title }}（{{ tutorial.duration }}分钟）
    {% endfor %}
    {% elif user_level == 'intermediate' %}
    欢迎进阶用户！推荐学习路径：
    {% for course in advanced_courses %}
    {{ loop.index }}. {{ course.name }} - {{ course.description }}
    {% endfor %}
    {% else %}
    欢迎专家用户！高级专题：
    {% for topic in expert_topics %}
    - {{ topic.name }}：{{ topic.complexity }}
    {% endfor %}
    {% endif %}
    """,
    template_format="jinja2"
)

# 不同用户级别的提示
user_levels = {
    'beginner': {
        'tutorials': [
            {'title': 'Python基础', 'duration': 30},
            {'title': '变量和数据类型', 'duration': 45},
            {'title': '控制流程', 'duration': 60}
        ]
    },
    'intermediate': {
        'advanced_courses': [
            {'name': '面向对象编程', 'description': '深入理解OOP概念'},
            {'name': '函数式编程', 'description': '函数式编程范式'},
            {'name': '设计模式', 'description': '常用设计模式实践'}
        ]
    },
    'expert': {
        'expert_topics': [
            {'name': '元编程', 'complexity': '高级'},
            {'name': '性能优化', 'complexity': '专家级'},
            {'name': '架构设计', 'complexity': '大师级'}
        ]
    }
}

for level, data in user_levels.items():
    prompt = template.format(user_level=level, **data)
    print(f"\n{level.upper()} 用户提示:")
    print(prompt.content)
```

**示例3：数据验证和格式化**
```python
template = HumanMessagePromptTemplate.from_template(
    """
    {% if data %}
    数据验证结果：
    {% for item in data %}
    {% if item.value is number %}
    ✅ {{ item.name }}: {{ item.value|round(2) }}
    {% elif item.value is string %}
    ✅ {{ item.name }}: "{{ item.value|upper }}"
    {% elif item.value is sequence %}
    ✅ {{ item.name }}: [{{ item.value|join(', ') }}]
    {% else %}
    ⚠️ {{ item.name }}: 未知类型
    {% endif %}
    {% endfor %}
    
    总计：{{ data|length }} 项数据
    {% else %}
    没有数据需要验证
    {% endif %}
    """,
    template_format="jinja2"
)

test_data = [
    {'name': '年龄', 'value': 25.6789},
    {'name': '姓名', 'value': '张三'},
    {'name': '技能', 'value': ['Python', 'JavaScript', 'SQL']},
    {'name': '分数', 'value': 95.5}
]

prompt = template.format(data=test_data)
print(prompt.content)
```

### 2. 条件模板

使用 Jinja2 格式可以创建条件模板：

```python
from langchain.prompts.chat import HumanMessagePromptTemplate

template = HumanMessagePromptTemplate.from_template(
    """
    {% if difficulty == 'easy' %}
    请简单解释一下 {{ topic }} 的概念。
    {% elif difficulty == 'medium' %}
    请详细解释 {{ topic }} 的原理和实现方法。
    {% else %}
    请深入分析 {{ topic }} 的复杂应用场景和优化策略。
    {% endif %}
    """,
    template_format="jinja2"
)

# 测试不同难度级别
for difficulty in ['easy', 'medium', 'hard']:
    prompt = template.format(topic="机器学习", difficulty=difficulty)
    print(f"\n难度: {difficulty}")
    print(prompt.content)
```

### 3. 循环模板

```python
from langchain.prompts.chat import HumanMessagePromptTemplate

template = HumanMessagePromptTemplate.from_template(
    """
    请为以下技术栈提供学习建议：
    {% for tech in technologies %}
    {{ loop.index }}. {{ tech.name }} - {{ tech.description }}
    {% endfor %}
    
    请按照难度从低到高的顺序排列学习路径。
    """,
    template_format="jinja2"
)

technologies = [
    {"name": "Python", "description": "基础编程语言"},
    {"name": "Django", "description": "Web框架"},
    {"name": "Docker", "description": "容器化技术"},
    {"name": "Kubernetes", "description": "容器编排"}
]

prompt = template.format(technologies=technologies)
print(prompt.content)
```

## 实际应用场景

### 1. 代码生成模板

```python
from langchain.prompts import ChatPromptTemplate
from langchain.prompts.chat import SystemMessagePromptTemplate, HumanMessagePromptTemplate

# 系统角色定义
system_template = SystemMessagePromptTemplate.from_template(
    "你是一个经验丰富的 {language} 开发工程师，擅长编写高质量、可维护的代码。"
)

# 代码生成请求
human_template = HumanMessagePromptTemplate.from_template(
    """
    请帮我编写一个 {function_name} 函数，要求：
    - 功能：{function_description}
    - 输入参数：{input_params}
    - 返回值：{return_value}
    - 性能要求：{performance_requirements}
    
    请提供完整的代码实现和注释说明。
    """
)

# 组合模板
code_generation_prompt = ChatPromptTemplate.from_messages([
    ("system", system_template),
    ("human", human_template)
])

# 使用示例
formatted_prompt = code_generation_prompt.format(
    language="Python",
    function_name="quick_sort",
    function_description="实现快速排序算法",
    input_params="arr: List[int] - 待排序的整数列表",
    return_value="List[int] - 排序后的列表",
    performance_requirements="时间复杂度 O(n log n)，空间复杂度 O(log n)"
)

for message in formatted_prompt:
    print(f"{message.type}: {message.content}")
```

### 2. 文档生成模板

```python
from langchain.prompts import ChatPromptTemplate
from langchain.prompts.chat import SystemMessagePromptTemplate, HumanMessagePromptTemplate

# 系统角色
system_template = SystemMessagePromptTemplate.from_template(
    "你是一个专业的技术文档撰写专家，擅长编写清晰、结构化的技术文档。"
)

# 文档生成请求
human_template = HumanMessagePromptTemplate.from_template(
    """
    请为 {project_name} 项目编写技术文档，包含以下内容：
    
    1. 项目概述
    2. 技术架构
    3. 安装和配置说明
    4. API 文档
    5. 使用示例
    6. 常见问题解答
    
    项目信息：
    - 技术栈：{tech_stack}
    - 主要功能：{main_features}
    - 目标用户：{target_users}
    """
)

# 组合模板
doc_generation_prompt = ChatPromptTemplate.from_messages([
    ("system", system_template),
    ("human", human_template)
])

# 使用示例
formatted_prompt = doc_generation_prompt.format(
    project_name="智能聊天机器人",
    tech_stack="Python, LangChain, OpenAI API, FastAPI",
    main_features="自然语言处理、多轮对话、知识库集成",
    target_users="开发者和企业用户"
)

for message in formatted_prompt:
    print(f"{message.type}: {message.content}")
```

### 3. 多轮对话模板

```python
from langchain.prompts import ChatPromptTemplate
from langchain.prompts.chat import SystemMessagePromptTemplate, HumanMessagePromptTemplate, AIMessagePromptTemplate

# 系统角色
system_template = SystemMessagePromptTemplate.from_template(
    "你是一个专业的 {expertise} 专家，正在进行一个关于 {topic} 的深度对话。"
)

# 对话历史
ai_template = AIMessagePromptTemplate.from_template(
    "基于我们之前的讨论，{previous_response}"
)

# 用户新问题
human_template = HumanMessagePromptTemplate.from_template(
    "继续我们关于 {topic} 的讨论，我想了解：{new_question}"
)

# 组合多轮对话模板
conversation_prompt = ChatPromptTemplate.from_messages([
    ("system", system_template),
    ("ai", ai_template),
    ("human", human_template)
])

# 使用示例
formatted_prompt = conversation_prompt.format(
    expertise="机器学习",
    topic="深度学习",
    previous_response="我们已经讨论了神经网络的基本原理",
    new_question="卷积神经网络与传统神经网络有什么区别？"
)

for message in formatted_prompt:
    print(f"{message.type}: {message.content}")
```

## 最佳实践

### 1. 模板设计原则

- **清晰明确**：模板应该清晰表达意图，避免歧义
- **变量命名**：使用有意义的变量名，便于理解和维护
- **结构合理**：合理组织模板结构，便于阅读和修改
- **可重用性**：设计可重用的模板组件

### 2. 错误处理

```python
from langchain.prompts import ChatPromptTemplate
from typing import Dict, Any

def safe_format_template(template: ChatPromptTemplate, variables: Dict[str, Any]):
    """安全地格式化模板，处理缺失变量"""
    try:
        return template.format(**variables)
    except KeyError as e:
        print(f"缺少必需的变量: {e}")
        return None
    except Exception as e:
        print(f"格式化模板时出错: {e}")
        return None

# 使用示例
template = ChatPromptTemplate.from_template("你好，{name}！你的年龄是 {age} 岁。")

# 正确使用
result = safe_format_template(template, {"name": "张三", "age": 25})
print(result)

# 缺少变量
result = safe_format_template(template, {"name": "张三"})
print(result)
```

### 3. 模板验证

```python
from langchain.prompts import ChatPromptTemplate
import re

def validate_template(template_str: str) -> bool:
    """验证模板字符串的格式是否正确"""
    # 检查 f-string 格式的变量
    f_string_pattern = r'\{[^}]*\}'
    f_string_vars = re.findall(f_string_pattern, template_str)
    
    # 检查 Jinja2 格式的变量
    jinja2_pattern = r'\{\{[^}]*\}\}'
    jinja2_vars = re.findall(jinja2_pattern, template_str)
    
    # 检查是否有未闭合的括号
    if template_str.count('{') != template_str.count('}'):
        return False
    
    return True

# 测试模板验证
templates = [
    "你好，{name}！",  # 正确
    "你好，{name}！{age}",  # 正确
    "你好，{name}！{",  # 错误
    "你好，{{ name }}！",  # 正确（Jinja2格式）
]

for template_str in templates:
    is_valid = validate_template(template_str)
    print(f"模板 '{template_str}' 是否有效: {is_valid}")
```

## 总结

`ChatPromptTemplate` 是 LangChain 中非常强大的工具，它提供了：

1. **灵活性**：支持多种模板格式和变量插值
2. **类型安全**：提供类型提示和验证
3. **可重用性**：可以创建可重用的模板组件
4. **结构化**：支持不同类型的消息模板组合
5. **扩展性**：可以轻松扩展和定制

通过合理使用 `ChatPromptTemplate`，您可以创建更加灵活、可维护和可重用的提示模板，提高 AI 应用开发效率。

## 相关资源

- [LangChain 官方文档](https://python.langchain.com/docs/modules/model_io/prompts/)
- [ChatPromptTemplate API 参考](https://python.langchain.com/docs/modules/model_io/prompts/prompt_templates/)
- [LangChain 最佳实践指南](https://python.langchain.com/docs/guides/)

