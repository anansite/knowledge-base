# LangGraph 详解：构建复杂AI应用的工作流引擎

## 概述

LangGraph 是 LangChain 生态系统中的一个强大工具，用于构建复杂的、有状态的 AI 应用程序。它基于图论概念，允许开发者创建包含多个步骤、条件分支和状态管理的 AI 工作流。

### 核心概念

- **图（Graph）**：由节点和边组成的工作流结构
- **节点（Node）**：工作流中的单个处理步骤
- **边（Edge）**：连接节点的路径，定义工作流的方向
- **状态（State）**：在工作流执行过程中传递的数据
- **检查点（Checkpoint）**：状态的持久化快照
- **中断（Interrupt）**：暂停执行等待人工干预的机制
- **命令（Command）**：控制图执行流程的原语
- **发送（Send）**：用于并行执行和节点间通信的原语

## 基本架构

### 1. 图结构定义

```python
from langgraph.graph import StateGraph, START, END
from typing import TypedDict, Annotated
from langchain_core.messages import BaseMessage

# 定义状态类型
class AgentState(TypedDict):
    messages: Annotated[list[BaseMessage], "对话消息列表"]
    current_step: Annotated[str, "当前执行步骤"]
    user_input: Annotated[str, "用户输入"]
    context: Annotated[dict, "上下文信息"]

# 创建图
workflow = StateGraph(AgentState)

# 添加节点
workflow.add_node("process_input", process_input_node)
workflow.add_node("generate_response", generate_response_node)
workflow.add_node("validate_output", validate_output_node)

# 定义边
workflow.add_edge(START, "process_input")
workflow.add_edge("process_input", "generate_response")
workflow.add_edge("generate_response", "validate_output")
workflow.add_edge("validate_output", END)

# 编译图
app = workflow.compile()
```

### 2. 节点函数定义

```python
def process_input_node(state: AgentState) -> AgentState:
    """处理用户输入节点"""
    user_input = state["user_input"]
    
    # 处理逻辑
    processed_input = preprocess_input(user_input)
    
    # 更新状态
    state["context"]["processed_input"] = processed_input
    state["current_step"] = "input_processed"
    
    return state

def generate_response_node(state: AgentState) -> AgentState:
    """生成响应节点"""
    context = state["context"]
    
    # 调用LLM生成响应
    response = llm.invoke(context["processed_input"])
    
    # 更新状态
    state["messages"].append(response)
    state["current_step"] = "response_generated"
    
    return state
```

## 控制原语（Control Primitives）

### 1. Command 原语

Command 是 LangGraph 中最强大的控制原语，用于组合状态更新和控制流。

#### 1.1 基本 Command 用法

```python
from langgraph.types import Command
from typing import Literal

def my_node(state: State) -> Command[Literal["my_other_node"]]:
    """使用 Command 更新状态并跳转到下一个节点"""
    return Command(
        # 状态更新
        update={"foo": "bar"},
        # 控制流 - 跳转到下一个节点
        goto="my_other_node"
    )

# 动态控制流
def dynamic_node(state: State) -> Command[Literal["node_b", "node_c"]]:
    """基于状态动态决定下一个节点"""
    if state["foo"] == "bar":
        return Command(update={"foo": "baz"}, goto="node_b")
    else:
        return Command(update={"foo": "qux"}, goto="node_c")
```

#### 1.2 Command 在工具中的应用

```python
from langchain_core.tools import tool
from langgraph.types import Command
from typing import Annotated
from langchain_core.messages import ToolMessage
from langchain_core.tools import InjectedToolCallId

@tool
def update_user_name(
    new_name: str,
    tool_call_id: Annotated[str, InjectedToolCallId]
) -> Command:
    """更新用户名"""
    return Command(update={
        "user_name": new_name,
        "messages": [
            ToolMessage(f"Updated user name to {new_name}", tool_call_id=tool_call_id)
        ]
    })

@tool
def transfer_to_bob() -> Command:
    """转移到 bob 代理"""
    return Command(
        # 跳转到的代理名称
        goto="bob",
        # 发送给代理的数据
        update={"my_state_key": "my_state_value"},
        # 指示跳转到父图中的代理节点
        graph=Command.PARENT,
    )
```

#### 1.3 Command 在人工干预中的应用

```python
def human_approval_node(state: State) -> Command[Literal["approved_path", "rejected_path"]]:
    """人工审批节点"""
    is_approved = interrupt({
        "question": "是否批准以下输出？",
        "llm_output": state["llm_output"]
    })
    
    if is_approved:
        return Command(goto="approved_path")
    else:
        return Command(goto="rejected_path")
```

### 2. Send 原语

Send 原语用于并行执行和节点间通信。

#### 2.1 基本 Send 用法

```python
from langgraph.types import Send

def parallel_processing_node(state: State):
    """并行处理节点"""
    tasks = state["tasks"]
    
    # 使用 Send 并行发送任务到多个节点
    sends = [
        Send("worker_node", {"task": task, "task_id": i})
        for i, task in enumerate(tasks)
    ]
    
    return sends

def worker_node(state: State):
    """工作节点"""
    task = state["task"]
    task_id = state["task_id"]
    
    # 处理任务
    result = process_task(task)
    
    return {"result": result, "task_id": task_id}
```

#### 2.2 Send 在任务委派中的应用

```python
def create_task_description_handoff_tool(agent_name: str, description: str = None):
    """创建任务描述委派工具"""
    name = f"transfer_to_{agent_name}"
    description = description or f"向 {agent_name} 寻求帮助"
    
    @tool(name, description=description)
    def handoff_tool(
        task_description: Annotated[
            str,
            "下一个代理应该做什么的描述，包括所有相关上下文。"
        ],
        state: Annotated[MessagesState, InjectedState],
    ) -> Command:
        task_description_message = {"role": "user", "content": task_description}
        agent_input = {**state, "messages": [task_description_message]}
        
        return Command(
            # 使用 Send 发送到指定代理
            goto=[Send(agent_name, agent_input)],
            graph=Command.PARENT,
        )
    
    return handoff_tool
```

### 3. Interrupt 原语

Interrupt 用于暂停图执行，等待人工干预。

#### 3.1 基本 Interrupt 用法

```python
from langgraph.types import interrupt, Command

def human_review_node(state: State) -> State:
    """人工审核节点"""
    # 使用 interrupt 暂停执行，等待人工输入
    value = interrupt({
        "text_to_revise": state["some_text"],
        "confidence": state["confidence"]
    })
    
    return {
        "some_text": value,
        "confidence": state["confidence"],
        "review_result": value,
        "status": "reviewed"
    }
```

#### 3.2 Interrupt 在工具中的应用

```python
@tool
def human_assistance(query: str) -> str:
    """请求人工协助"""
    human_response = interrupt({"query": query})
    return human_response["data"]

@tool
def book_hotel(hotel_name: str) -> str:
    """预订酒店 - 需要人工确认"""
    response = interrupt(
        f"尝试调用 `book_hotel` 参数: {{'hotel_name': '{hotel_name}'}}. "
        "请确认或建议修改。"
    )
    
    if response.type == "accept":
        pass
    elif response.type == "edit":
        hotel_name = response.args.hotel_name
    else:
        raise ValueError(f"未知响应类型: {response.type}")
    
    return f"成功预订 {hotel_name} 酒店。"
```

## 控制原语（Control Primitives）

### 1. Command 原语

Command 是 LangGraph 中最强大的控制原语，用于组合状态更新和控制流。

#### 1.1 基本 Command 用法

```python
from langgraph.types import Command
from typing import Literal

def my_node(state: State) -> Command[Literal["my_other_node"]]:
    """使用 Command 更新状态并跳转到下一个节点"""
    return Command(
        # 状态更新
        update={"foo": "bar"},
        # 控制流 - 跳转到下一个节点
        goto="my_other_node"
    )

# 动态控制流
def dynamic_node(state: State) -> Command[Literal["node_b", "node_c"]]:
    """基于状态动态决定下一个节点"""
    if state["foo"] == "bar":
        return Command(update={"foo": "baz"}, goto="node_b")
    else:
        return Command(update={"foo": "qux"}, goto="node_c")
```

#### 1.2 Command 在工具中的应用

```python
from langchain_core.tools import tool
from langgraph.types import Command
from typing import Annotated
from langchain_core.messages import ToolMessage
from langchain_core.tools import InjectedToolCallId

@tool
def update_user_name(
    new_name: str,
    tool_call_id: Annotated[str, InjectedToolCallId]
) -> Command:
    """更新用户名"""
    return Command(update={
        "user_name": new_name,
        "messages": [
            ToolMessage(f"Updated user name to {new_name}", tool_call_id=tool_call_id)
        ]
    })

@tool
def transfer_to_bob() -> Command:
    """转移到 bob 代理"""
    return Command(
        # 跳转到的代理名称
        goto="bob",
        # 发送给代理的数据
        update={"my_state_key": "my_state_value"},
        # 指示跳转到父图中的代理节点
        graph=Command.PARENT,
    )
```

#### 1.3 Command 在人工干预中的应用

```python
def human_approval_node(state: State) -> Command[Literal["approved_path", "rejected_path"]]:
    """人工审批节点"""
    is_approved = interrupt({
        "question": "是否批准以下输出？",
        "llm_output": state["llm_output"]
    })
    
    if is_approved:
        return Command(goto="approved_path")
    else:
        return Command(goto="rejected_path")
```

### 2. Send 原语

Send 原语用于并行执行和节点间通信。

#### 2.1 基本 Send 用法

```python
from langgraph.types import Send

def parallel_processing_node(state: State):
    """并行处理节点"""
    tasks = state["tasks"]
    
    # 使用 Send 并行发送任务到多个节点
    sends = [
        Send("worker_node", {"task": task, "task_id": i})
        for i, task in enumerate(tasks)
    ]
    
    return sends

def worker_node(state: State):
    """工作节点"""
    task = state["task"]
    task_id = state["task_id"]
    
    # 处理任务
    result = process_task(task)
    
    return {"result": result, "task_id": task_id}
```

#### 2.2 Send 在任务委派中的应用

```python
def create_task_description_handoff_tool(agent_name: str, description: str = None):
    """创建任务描述委派工具"""
    name = f"transfer_to_{agent_name}"
    description = description or f"向 {agent_name} 寻求帮助"
    
    @tool(name, description=description)
    def handoff_tool(
        task_description: Annotated[
            str,
            "下一个代理应该做什么的描述，包括所有相关上下文。"
        ],
        state: Annotated[MessagesState, InjectedState],
    ) -> Command:
        task_description_message = {"role": "user", "content": task_description}
        agent_input = {**state, "messages": [task_description_message]}
        
        return Command(
            # 使用 Send 发送到指定代理
            goto=[Send(agent_name, agent_input)],
            graph=Command.PARENT,
        )
    
    return handoff_tool
```

### 3. Interrupt 原语

Interrupt 用于暂停图执行，等待人工干预。

#### 3.1 基本 Interrupt 用法

```python
from langgraph.types import interrupt, Command

def human_review_node(state: State) -> State:
    """人工审核节点"""
    # 使用 interrupt 暂停执行，等待人工输入
    value = interrupt({
        "text_to_revise": state["some_text"],
        "confidence": state["confidence"]
    })
    
    return {
        "some_text": value,
        "confidence": state["confidence"],
        "review_result": value,
        "status": "reviewed"
    }
```

#### 3.2 Interrupt 在工具中的应用

```python
@tool
def human_assistance(query: str) -> str:
    """请求人工协助"""
    human_response = interrupt({"query": query})
    return human_response["data"]

@tool
def book_hotel(hotel_name: str) -> str:
    """预订酒店 - 需要人工确认"""
    response = interrupt(
        f"尝试调用 `book_hotel` 参数: {{'hotel_name': '{hotel_name}'}}. "
        "请确认或建议修改。"
    )
    
    if response.type == "accept":
        pass
    elif response.type == "edit":
        hotel_name = response.args.hotel_name
    else:
        raise ValueError(f"未知响应类型: {response.type}")
    
    return f"成功预订 {hotel_name} 酒店。"
```

## 持久化（Persistence）

LangGraph 的持久化功能基于检查点（Checkpoint）系统，允许工作流在任何时候保存状态，并在需要时恢复执行。

### 1. 检查点系统基础

#### 1.1 内存检查点

```python
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.graph import StateGraph, START, END
from typing import TypedDict, Annotated

class WorkflowState(TypedDict):
    messages: Annotated[list, "消息列表"]
    current_step: Annotated[str, "当前步骤"]
    data: Annotated[dict, "工作流数据"]
    timestamp: Annotated[str, "时间戳"]

# 创建内存检查点保存器
checkpointer = InMemorySaver()

# 构建工作流
workflow = StateGraph(WorkflowState)

# 添加节点
workflow.add_node("step1", step1_node)
workflow.add_node("step2", step2_node)
workflow.add_node("step3", step3_node)

# 定义工作流
workflow.add_edge(START, "step1")
workflow.add_edge("step1", "step2")
workflow.add_edge("step2", "step3")
workflow.add_edge("step3", END)

# 编译应用并配置检查点
app = workflow.compile(checkpointer=checkpointer)
```

#### 1.2 基本检查点操作

```python
# 创建执行配置
config = {
    "configurable": {
        "thread_id": "user_123",
        "user_id": "user_456"
    }
}

# 初始状态
initial_state = {
    "messages": [],
    "current_step": "start",
    "data": {"input": "Hello World"},
    "timestamp": "2024-01-01T12:00:00Z"
}

# 执行工作流
result = app.invoke(initial_state, config=config)

# 获取当前检查点
current_checkpoint = app.get_state(config)
print(f"当前检查点: {current_checkpoint}")

# 从检查点恢复执行
new_data = {"input": "Continue processing"}
result = app.invoke(
    {"data": new_data},
    config=config
)
```

### 2. 数据库持久化

#### 2.1 SQLite 持久化

```python
from langgraph.checkpoint.sqlite import SqliteSaver
import os

# 创建SQLite检查点保存器
db_path = "workflow_checkpoints.db"
checkpointer = SqliteSaver.from_conn_string(f"sqlite:///{db_path}")

# 配置工作流
workflow = StateGraph(WorkflowState)
app = workflow.compile(checkpointer=checkpointer)

# 使用示例
config = {"configurable": {"thread_id": "session_001"}}

# 执行工作流
result = app.invoke(
    {"data": {"task": "process_document"}},
    config=config
)
```

#### 2.2 PostgreSQL 持久化

```python
from langgraph.checkpoint.postgres import PostgresSaver

# 创建PostgreSQL检查点保存器
checkpointer = PostgresSaver.from_conn_string(
    "postgresql://username:password@localhost:5432/workflow_db"
)

# 高级配置
checkpointer = PostgresSaver.from_conn_string(
    "postgresql://username:password@localhost:5432/workflow_db",
    table_name="workflow_checkpoints",  # 自定义表名
    schema_name="public"  # 自定义schema
)

# 配置工作流
workflow = StateGraph(WorkflowState)
app = workflow.compile(checkpointer=checkpointer)
```

### 3. 检查点管理

```python
# 获取所有检查点
all_checkpoints = app.list_checkpoints()

# 获取特定检查点
config = {"configurable": {"thread_id": "user_123"}}
checkpoint = app.get_state(config)

# 删除检查点
app.delete_checkpoint(config)

# 检查检查点是否存在
exists = app.has_checkpoint(config)

# 获取检查点元数据
metadata = app.get_checkpoint_metadata(config)
```

### 4. 从检查点恢复

```python
# 从特定检查点恢复执行
config = {
    "configurable": {
        "thread_id": "1", 
        "checkpoint_id": "0c62ca34-ac19-445d-bbb0-5b4984975b2a"
    }
}

# 恢复执行
result = app.invoke(None, config=config)
```

## Human-in-the-Loop（人机交互）

LangGraph 的人机交互功能基于 `interrupt` 机制实现，允许工作流在特定节点暂停执行，等待人工干预后再继续。

### 1. 中断机制基础

#### 1.1 基本中断节点

```python
from langgraph.graph import StateGraph, START, END
from langgraph.types import interrupt, Command
from langgraph.checkpoint.memory import InMemorySaver
from typing import TypedDict
import uuid

class ReviewState(TypedDict):
    content: str
    confidence: float
    review_result: str
    status: str

def human_review_node(state: ReviewState) -> ReviewState:
    """人工审核节点 - 使用interrupt暂停执行"""
    # 使用interrupt暂停执行，等待人工输入
    value = interrupt({
        "text_to_revise": state["content"],
        "confidence": state["confidence"]
    })
    
    return {
        "content": value,
        "confidence": state["confidence"],
        "review_result": value,
        "status": "reviewed"
    }

# 构建工作流
workflow = StateGraph(ReviewState)

# 添加节点
workflow.add_node("ai_analysis", ai_analysis_node)
workflow.add_node("human_review", human_review_node)
workflow.add_node("final_decision", final_decision_node)

# 定义工作流
workflow.add_edge(START, "ai_analysis")
workflow.add_edge("ai_analysis", "human_review")
workflow.add_edge("human_review", "final_decision")
workflow.add_edge("final_decision", END)

# 配置检查点（必需）
checkpointer = InMemorySaver()
app = workflow.compile(checkpointer=checkpointer)
```

#### 1.2 中断执行和恢复

```python
# 执行工作流直到遇到中断
config = {"configurable": {"thread_id": str(uuid.uuid4())}}

# 第一次调用 - 执行到human_review节点时中断
result = app.invoke(
    {"content": "这是一段需要审核的内容", "confidence": 0.6},
    config=config
)

# 检查是否中断
if result.get("__interrupt__"):
    print("工作流已中断，等待人工审核")
    print(f"中断数据: {result['__interrupt__']}")
    
    # 获取当前状态
    current_state = app.get_state(config)
    print(f"当前状态: {current_state}")

# 人工审核完成后，继续执行
human_result = "approve"  # 人工审核结果

# 继续执行工作流
result = app.invoke(
    Command(resume=human_result),
    config=config
)
```

### 2. 工具中的中断

#### 2.1 在工具中使用中断

```python
from langchain_core.tools import tool
from langgraph.types import interrupt

@tool
def human_assistance(query: str) -> str:
    """请求人工协助"""
    human_response = interrupt({"query": query})
    return human_response["data"]

@tool
def book_hotel(hotel_name: str) -> str:
    """预订酒店 - 需要人工确认"""
    # 使用interrupt暂停执行，等待人工确认
    response = interrupt(
        f"尝试调用 `book_hotel` 参数: {{'hotel_name': '{hotel_name}'}}. "
        "请确认或建议修改。"
    )
    
    if response.type == "accept":
        # 继续使用原始参数
        pass
    elif response.type == "edit":
        hotel_name = response.args.hotel_name
    else:
        raise ValueError(f"未知响应类型: {response.type}")
    
    return f"成功预订 {hotel_name} 酒店。"
```

#### 2.2 在ReAct Agent中使用

```python
from langgraph.prebuilt import create_react_agent
from langgraph.checkpoint.memory import InMemorySaver

# 创建检查点保存器
checkpointer = InMemorySaver()

# 创建ReAct Agent
agent = create_react_agent(
    model="anthropic:claude-3-5-sonnet-latest",
    tools=[human_assistance, book_hotel],
    checkpointer=checkpointer,
)

# 使用配置
config = {"configurable": {"thread_id": "1"}}
```

### 3. 条件中断和智能路由

#### 3.1 基于置信度的条件中断

```python
def ai_analysis_node(state: ReviewState) -> ReviewState:
    """AI分析节点"""
    content = state["content"]
    
    # 模拟AI分析
    analysis_result = analyze_content(content)
    confidence = analysis_result["confidence"]
    
    state["confidence"] = confidence
    state["status"] = "analyzed"
    
    return state

def should_interrupt_for_review(state: ReviewState) -> str:
    """判断是否需要人工审核"""
    confidence = state["confidence"]
    
    if confidence < 0.7:
        return "human_review"  # 需要人工审核
    elif confidence < 0.9:
        return "supervisor_review"  # 需要主管审核
    else:
        return "auto_approve"  # 自动通过

# 添加条件边
workflow.add_conditional_edges(
    "ai_analysis",
    should_interrupt_for_review,
    {
        "human_review": "human_review",
        "supervisor_review": "supervisor_review",
        "auto_approve": "final_decision"
    }
)
```

### 4. 静态中断点

#### 4.1 编译时设置中断点

```python
# 在编译时设置静态中断点
graph = workflow.compile(
    checkpointer=checkpointer,
    interrupt_before=["sensitive_node"],  # 在节点执行前中断
    interrupt_after=["review_node"]       # 在节点执行后中断
)

# 执行到中断点
config = {"configurable": {"thread_id": "some_thread"}}
result = graph.invoke(inputs, config=config)

# 继续执行
result = graph.invoke(None, config=config)
```

### 5. 多中断处理

#### 5.1 并行中断

```python
def human_node_1(state: ReviewState):
    value = interrupt({"text_to_revise": state["content"]})
    return {"content": value}

def human_node_2(state: ReviewState):
    value = interrupt({"confidence_check": state["confidence"]})
    return {"confidence": value}

# 并行执行两个人工节点
workflow.add_edge(START, "human_node_1")
workflow.add_edge(START, "human_node_2")

# 恢复多个中断
resume_map = {
    i.interrupt_id: f"human input for prompt {i.value}"
    for i in app.get_state(config).interrupts
}

result = app.invoke(Command(resume=resume_map), config=config)
```

## 多代理系统（Multi-Agent Systems）

### 1. 代理间通信

#### 1.1 基本代理切换

```python
def agent(state) -> Command[Literal["agent", "another_agent"]]:
    """代理节点 - 决定下一个代理"""
    # 路由条件可以是任何逻辑，如LLM工具调用、结构化输出等
    goto = get_next_agent(...)  # 'agent' / 'another_agent'
    
    return Command(
        # 指定下一个要调用的代理
        goto=goto,
        # 更新图状态
        update={"my_state_key": "my_state_value"}
    )
```

#### 1.2 子图到父图的切换

```python
def some_node_inside_alice(state):
    """alice子图中的节点"""
    return Command(
        goto="bob",
        update={"my_state_key": "my_state_value"},
        # 指定要导航到的图（默认为当前图）
        graph=Command.PARENT,
    )
```

### 2. 代理委派工具

#### 2.1 创建委派工具

```python
def create_task_description_handoff_tool(
    *, agent_name: str, description: str | None = None
):
    """创建任务描述委派工具"""
    name = f"transfer_to_{agent_name}"
    description = description or f"向 {agent_name} 寻求帮助"

    @tool(name, description=description)
    def handoff_tool(
        task_description: Annotated[
            str,
            "下一个代理应该做什么的描述，包括所有相关上下文。"
        ],
        state: Annotated[MessagesState, InjectedState],
    ) -> Command:
        task_description_message = {"role": "user", "content": task_description}
        agent_input = {**state, "messages": [task_description_message]}
        
        return Command(
            goto=[Send(agent_name, agent_input)],
            graph=Command.PARENT,
        )

    return handoff_tool
```

### 3. 工具执行逻辑

```python
def call_tools(state):
    """执行工具调用"""
    # 获取工具调用
    tool_calls = state["tool_calls"]
    
    # 执行每个工具调用并收集Command对象
    commands = [
        tools_by_name[tool_call["name"]].invoke(tool_call) 
        for tool_call in tool_calls
    ]
    
    return commands
```

## 多代理系统（Multi-Agent Systems）

### 1. 代理间通信

#### 1.1 基本代理切换

```python
def agent(state) -> Command[Literal["agent", "another_agent"]]:
    """代理节点 - 决定下一个代理"""
    # 路由条件可以是任何逻辑，如LLM工具调用、结构化输出等
    goto = get_next_agent(...)  # 'agent' / 'another_agent'
    
    return Command(
        # 指定下一个要调用的代理
        goto=goto,
        # 更新图状态
        update={"my_state_key": "my_state_value"}
    )
```

#### 1.2 子图到父图的切换

```python
def some_node_inside_alice(state):
    """alice子图中的节点"""
    return Command(
        goto="bob",
        update={"my_state_key": "my_state_value"},
        # 指定要导航到的图（默认为当前图）
        graph=Command.PARENT,
    )
```

### 2. 代理委派工具

#### 2.1 创建委派工具

```python
def create_task_description_handoff_tool(
    *, agent_name: str, description: str | None = None
):
    """创建任务描述委派工具"""
    name = f"transfer_to_{agent_name}"
    description = description or f"向 {agent_name} 寻求帮助"

    @tool(name, description=description)
    def handoff_tool(
        task_description: Annotated[
            str,
            "下一个代理应该做什么的描述，包括所有相关上下文。"
        ],
        state: Annotated[MessagesState, InjectedState],
    ) -> Command:
        task_description_message = {"role": "user", "content": task_description}
        agent_input = {**state, "messages": [task_description_message]}
        
        return Command(
            goto=[Send(agent_name, agent_input)],
            graph=Command.PARENT,
        )

    return handoff_tool
```

### 3. 工具执行逻辑

```python
def call_tools(state):
    """执行工具调用"""
    # 获取工具调用
    tool_calls = state["tool_calls"]
    
    # 执行每个工具调用并收集Command对象
    commands = [
        tools_by_name[tool_call["name"]].invoke(tool_call) 
        for tool_call in tool_calls
    ]
    
    return commands
```

## 高级特性

### 1. 条件边和动态路由

```python
# 添加条件边
workflow.add_conditional_edges(
    "agent",
    # 评估代理决策
    tools_condition,
    {
        # 将条件输出转换为图中的节点
        "tools": "retrieve",
        END: END,
    },
)

# 条件边函数
def tools_condition(state: State) -> str:
    """判断是否需要调用工具"""
    if state.get("tool_calls"):
        return "tools"
    else:
        return END

def grade_documents(state: State) -> str:
    """评估文档质量"""
    quality = state.get("document_quality", 0)
    
    if quality > 0.8:
        return "generate"
    else:
        return "rewrite"
```

### 2. 并行执行

```python
from langgraph.types import Send

def parallel_processing_node(state: State):
    """并行处理节点"""
    items = state["items"]
    
    # 使用 Send 并行发送到多个工作节点
    sends = [
        Send("worker_node", {"item": item, "item_id": i})
        for i, item in enumerate(items)
    ]
    
    return sends

def aggregate_results_node(state: State):
    """聚合结果节点"""
    results = state["results"]
    
    # 聚合所有并行执行的结果
    aggregated = aggregate_results(results)
    
    return {"final_result": aggregated}
```

### 3. 工作流监控和日志

```python
import logging
from langgraph.graph import StateGraph

# 设置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def monitored_node(state: AgentState) -> AgentState:
    """带监控的节点"""
    logger.info(f"执行节点: {state['current_step']}")
    
    try:
        # 执行节点逻辑
        result = process_node_logic(state)
        logger.info(f"节点执行成功: {state['current_step']}")
        return result
    except Exception as e:
        logger.error(f"节点执行失败: {state['current_step']}, 错误: {e}")
        raise

# 添加监控节点
workflow.add_node("monitored_process", monitored_node)
```

### 4. 错误处理和重试机制

```python
from langgraph.graph import StateGraph
import time

def retry_node(state: AgentState, max_retries: int = 3) -> AgentState:
    """带重试机制的节点"""
    retry_count = state["context"].get("retry_count", 0)
    
    try:
        # 执行节点逻辑
        result = process_node_logic(state)
        return result
    except Exception as e:
        if retry_count < max_retries:
            # 重试
            state["context"]["retry_count"] = retry_count + 1
            time.sleep(2 ** retry_count)  # 指数退避
            return retry_node(state, max_retries)
        else:
            # 达到最大重试次数，失败
            raise e

def error_handler_node(state: AgentState) -> AgentState:
    """错误处理节点"""
    error = state["context"].get("error")
    
    if error:
        # 记录错误
        log_error(error)
        
        # 发送错误通知
        send_error_notification(error)
        
        # 清理错误状态
        state["context"].pop("error", None)
    
    return state
```

## 实际应用示例

### 1. 内容审核系统

```python
class ContentModerationState(TypedDict):
    content: str
    content_type: str  # text, image, video
    ai_analysis: dict
    moderation_level: str  # low, medium, high
    human_review_needed: bool
    review_result: str
    final_decision: str

def content_moderation_workflow():
    """完整的内容审核工作流"""
    workflow = StateGraph(ContentModerationState)
    
    # 添加节点
    workflow.add_node("preprocess", preprocess_content)
    workflow.add_node("ai_moderation", ai_moderation_node)
    workflow.add_node("human_review", human_review_node)
    workflow.add_node("supervisor_review", supervisor_review_node)
    workflow.add_node("final_decision", make_final_decision)
    
    # 定义工作流
    workflow.add_edge(START, "preprocess")
    workflow.add_edge("preprocess", "ai_moderation")
    workflow.add_conditional_edges(
        "ai_moderation",
        determine_moderation_path,
        {
            "auto_approve": "final_decision",
            "human_review": "human_review",
            "supervisor_review": "supervisor_review"
        }
    )
    workflow.add_edge("human_review", "final_decision")
    workflow.add_edge("supervisor_review", "final_decision")
    workflow.add_edge("final_decision", END)
    
    # 配置检查点
    checkpointer = InMemorySaver()
    return workflow.compile(checkpointer=checkpointer)

def human_review_node(state: ContentModerationState) -> ContentModerationState:
    """人工内容审核节点"""
    result = interrupt({
        "task": "请审核以下内容",
        "content": state["content"],
        "ai_analysis": state["ai_analysis"]
    })
    
    return {
        **state,
        "review_result": result["decision"],
        "human_review_needed": False
    }
```

### 2. 客服机器人升级系统

```python
class CustomerServiceState(TypedDict):
    user_message: str
    conversation_history: list
    ai_response: str
    escalation_needed: bool
    escalation_reason: str
    agent_response: str
    resolution_status: str

def customer_service_workflow():
    """客服机器人工作流"""
    workflow = StateGraph(CustomerServiceState)
    
    # 添加节点
    workflow.add_node("analyze_message", analyze_customer_message)
    workflow.add_node("generate_response", generate_ai_response)
    workflow.add_node("human_agent", human_agent_node)
    workflow.add_node("resolve_issue", resolve_customer_issue)
    
    # 定义工作流
    workflow.add_edge(START, "analyze_message")
    workflow.add_edge("analyze_message", "generate_response")
    workflow.add_conditional_edges(
        "generate_response",
        check_escalation_needed,
        {
            "continue": "resolve_issue",
            "escalate": "human_agent"
        }
    )
    workflow.add_edge("human_agent", "resolve_issue")
    workflow.add_edge("resolve_issue", END)
    
    # 配置检查点
    checkpointer = InMemorySaver()
    return workflow.compile(checkpointer=checkpointer)

def human_agent_node(state: CustomerServiceState) -> CustomerServiceState:
    """人工客服节点"""
    agent_response = interrupt({
        "user_message": state["user_message"],
        "conversation_history": state["conversation_history"],
        "ai_suggestion": state["ai_response"],
        "escalation_reason": state["escalation_reason"]
    })
    
    return {
        **state,
        "agent_response": agent_response["response"],
        "escalation_needed": False
    }
```

### 3. 多代理研究系统

```python
class ResearchState(TypedDict):
    query: str
    research_results: dict
    agent_assignments: list
    final_report: str

def research_workflow():
    """多代理研究工作流"""
    workflow = StateGraph(ResearchState)
    
    # 添加节点
    workflow.add_node("supervisor", supervisor_node)
    workflow.add_node("researcher", researcher_node)
    workflow.add_node("analyst", analyst_node)
    workflow.add_node("writer", writer_node)
    
    # 定义工作流
    workflow.add_edge(START, "supervisor")
    workflow.add_conditional_edges(
        "supervisor",
        assign_tasks,
        {
            "research": "researcher",
            "analysis": "analyst",
            "writing": "writer"
        }
    )
    workflow.add_edge("researcher", "supervisor")
    workflow.add_edge("analyst", "supervisor")
    workflow.add_edge("writer", END)
    
    # 配置检查点
    checkpointer = InMemorySaver()
    return workflow.compile(checkpointer=checkpointer)
```

## 最佳实践

### 1. 状态设计

```python
# 好的状态设计
class WellDesignedState(TypedDict):
    # 核心数据
    messages: list[BaseMessage]
    user_input: str
    
    # 元数据
    session_id: str
    timestamp: str
    version: str
    
    # 上下文
    context: dict
    
    # 控制流
    current_step: str
    next_step: str
    error: Optional[str]

# 避免的状态设计
class BadState(TypedDict):
    # 避免在状态中存储大量临时数据
    temp_data_1: str
    temp_data_2: str
    temp_data_3: str
    # ...
```

### 2. 错误处理

```python
def robust_node(state: AgentState) -> AgentState:
    """健壮的节点实现"""
    try:
        # 输入验证
        if not validate_input(state):
            raise ValueError("Invalid input")
        
        # 执行逻辑
        result = process_logic(state)
        
        # 输出验证
        if not validate_output(result):
            raise ValueError("Invalid output")
        
        # 更新状态
        state.update(result)
        return state
        
    except Exception as e:
        # 错误处理
        state["error"] = str(e)
        state["current_step"] = "error"
        return state
```

### 3. 性能优化

```python
# 使用缓存
from functools import lru_cache

@lru_cache(maxsize=1000)
def expensive_operation(input_data: str) -> str:
    """昂贵的操作，使用缓存优化"""
    # 复杂的计算逻辑
    return processed_result

# 批量处理
def batch_process_node(state: AgentState) -> AgentState:
    """批量处理节点"""
    items = state["context"]["items"]
    
    # 批量处理而不是逐个处理
    batch_size = 10
    for i in range(0, len(items), batch_size):
        batch = items[i:i + batch_size]
        process_batch(batch)
    
    return state
```

## 总结

LangGraph 是一个强大的工具，特别适合构建：

1. **复杂的工作流**：多步骤、条件分支的 AI 应用
2. **有状态的对话**：需要维护上下文的对话系统
3. **人机协作**：需要人工干预的 AI 工作流
4. **可恢复的系统**：支持中断和恢复的长时间运行任务
5. **多代理系统**：复杂的代理间协作和通信

### 关键要点

1. **检查点必需**：使用 `interrupt` 时必须配置检查点保存器
2. **线程ID必需**：执行工作流时必须提供 `thread_id`
3. **Command恢复**：使用 `Command(resume=...)` 恢复中断的工作流
4. **Send并行**：使用 `Send` 实现并行执行和节点间通信
5. **状态管理**：合理设计状态结构，避免存储过多临时数据
6. **错误处理**：实现健壮的错误处理和恢复机制
7. **控制原语**：灵活使用 Command、Send、Interrupt 等控制原语

通过合理使用这些功能，可以构建出既智能又可靠的 AI 应用程序。
