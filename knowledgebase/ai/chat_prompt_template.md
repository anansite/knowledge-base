
# LangChain 中的 ChatPromptTemplate 使用详解

`ChatPromptTemplate` 是 LangChain 中用于构建聊天提示的模板工具。它允许开发者以结构化的方式定义聊天模型的输入提示，从而更高效地与语言模型交互。

## 功能概述

`ChatPromptTemplate` 的主要功能是：
1. **动态生成提示**：通过变量插值动态生成聊天提示。
2. **支持多条消息**：可以构建包含多条消息的复杂对话上下文。
3. **与聊天模型集成**：生成的提示可以直接用于聊天模型（如 OpenAI 的 ChatGPT）。

## 核心组件

`ChatPromptTemplate` 的核心组件包括：
- **系统消息**：定义聊天的背景或规则。
- **用户消息**：表示用户输入的内容。
- **助手消息**：表示助手的回复内容。
- **变量插值**：支持动态替换消息中的变量。

## 使用步骤

以下是使用 `ChatPromptTemplate` 的详细步骤：

### 1. 导入必要模块

```python
from langchain.prompts.chat import ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate
```

### 2. 定义系统消息

系统消息用于设置聊天的上下文或规则。例如：
```python
system_message = SystemMessagePromptTemplate.from_template("你是一个帮助用户写代码的助手。")
```

### 3. 定义用户消息

用户消息表示用户的输入内容，可以包含动态变量。例如：
```python
user_message = HumanMessagePromptTemplate.from_template("请帮我写一个关于 {topic} 的 Python 函数。")
```

### 4. 创建 ChatPromptTemplate

将系统消息和用户消息组合成一个 `ChatPromptTemplate`：
```python
chat_prompt = ChatPromptTemplate.from_messages([system_message, user_message])
```

### 5. 渲染提示

使用 `format` 方法动态生成聊天提示：
```python
prompt = chat_prompt.format(topic="排序算法")
print(prompt)
```

输出结果：
```
系统消息: 你是一个帮助用户写代码的助手。
用户消息: 请帮我写一个关于排序算法的 Python 函数。
```

### 6. 与聊天模型集成

生成的提示可以直接传递给聊天模型：
```python
from langchain.chat_models import ChatOpenAI

chat_model = ChatOpenAI(temperature=0)
response = chat_model(chat_prompt.format_prompt(topic="排序算法").to_messages())
print(response.content)
```

## 高级用法

### 添加助手消息

可以在模板中添加助手的回复内容：
```python
assistant_message = SystemMessagePromptTemplate.from_template("这是一个示例代码：def sort_array(arr): return sorted(arr)")
chat_prompt = ChatPromptTemplate.from_messages([system_message, user_message, assistant_message])
```

### 使用多个变量

支持在消息中插入多个变量：
```python
user_message = HumanMessagePromptTemplate.from_template("请帮我写一个关于 {topic} 的 {language} 函数。")
prompt = chat_prompt.format(topic="排序算法", language="Python")
```

### 自定义模板

可以通过自定义模板实现更复杂的逻辑：
```python
custom_template = "你是一个{role}。用户希望你提供关于{topic}的帮助。"
system_message = SystemMessagePromptTemplate.from_template(custom_template)
chat_prompt = ChatPromptTemplate.from_messages([system_message, user_message])
```

## 总结

`ChatPromptTemplate` 是 LangChain 中一个强大的工具，能够帮助开发者以结构化的方式构建聊天提示。通过灵活的模板定义和变量插值，开发者可以轻松实现复杂的对话场景。

**推荐阅读**：
- [LangChain 官方文档](https://langchain.readthedocs.io/)
- [OpenAI ChatGPT API 文档](https://platform.openai.com/docs/)

