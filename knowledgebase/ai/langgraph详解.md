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

### 核心概念使用场景详解

#### 1. 图（Graph）的使用场景

**场景1：客服机器人工作流**
```python
# 客服机器人图结构 - 创建一个状态图实例
# StateGraph(CustomerServiceState): 创建一个新的状态图，指定状态类型为CustomerServiceState
customer_service_graph = StateGraph(CustomerServiceState)

# 添加各个处理节点到图中
# add_node(node_name, node_function): 添加节点，第一个参数是节点名称，第二个参数是节点函数
customer_service_graph.add_node("greeting", greeting_node)           # 问候节点：处理用户初始问候
customer_service_graph.add_node("intent_classification", classify_intent)  # 意图分类节点：识别用户意图
customer_service_graph.add_node("knowledge_base", query_kb)         # 知识库查询节点：从知识库获取答案
customer_service_graph.add_node("human_escalation", escalate_to_human)  # 人工升级节点：转接人工客服
customer_service_graph.add_node("resolution", resolve_issue)        # 问题解决节点：最终解决问题
```

**场景2：内容审核工作流**
```python
# 内容审核图结构 - 创建一个状态图实例
# StateGraph(ModerationState): 创建一个新的状态图，指定状态类型为ModerationState
moderation_graph = StateGraph(ModerationState)

# 添加内容审核的各个处理节点
moderation_graph.add_node("preprocess", preprocess_content)  # 预处理节点：清洗和标准化内容
moderation_graph.add_node("ai_analysis", ai_moderation)      # AI分析节点：使用AI进行内容审核
moderation_graph.add_node("human_review", human_review)      # 人工审核节点：需要人工干预的审核
moderation_graph.add_node("decision", make_decision)         # 决策节点：做出最终审核决定
```

#### 2. 节点（Node）的使用场景

**场景1：数据处理节点**
```python
def data_processing_node(state: State) -> State:
    """
    数据处理节点 - 清洗和转换数据
    参数:
        state: State - 当前工作流状态，包含所有需要处理的数据
    返回:
        State - 更新后的状态，包含处理后的数据
    """
    # 从状态中获取原始数据
    # state["raw_data"]: 从状态字典中获取键为"raw_data"的原始数据
    raw_data = state["raw_data"]
    
    # 调用数据处理函数进行清洗和转换
    # clean_and_transform(raw_data): 自定义函数，对原始数据进行清洗和格式转换
    processed_data = clean_and_transform(raw_data)
    
    # 将处理后的数据存储回状态中
    # state["processed_data"]: 在状态字典中创建新键"processed_data"，存储处理后的数据
    state["processed_data"] = processed_data
    
    # 返回更新后的状态，供下一个节点使用
    return state
```

**场景2：LLM调用节点**
```python
def llm_generation_node(state: State) -> State:
    """
    LLM生成节点 - 调用大语言模型生成响应
    参数:
        state: State - 当前工作流状态，包含提示词和其他上下文信息
    返回:
        State - 更新后的状态，包含LLM生成的响应
    """
    # 从状态中获取提示词
    # state["prompt"]: 从状态字典中获取键为"prompt"的提示词文本
    prompt = state["prompt"]
    
    # 调用大语言模型生成响应
    # llm.invoke(prompt): 调用已配置的LLM实例，传入提示词生成响应
    # llm: 预配置的大语言模型实例（如OpenAI、Anthropic等）
    response = llm.invoke(prompt)
    
    # 将LLM生成的响应存储到状态中
    # state["llm_response"]: 在状态字典中创建新键"llm_response"，存储LLM的响应
    state["llm_response"] = response
    
    # 返回更新后的状态，供下一个节点使用
    return state
```

**场景3：工具调用节点**
```python
def tool_execution_node(state: State) -> State:
    """
    工具执行节点 - 调用外部API或工具
    参数:
        state: State - 当前工作流状态，包含工具名称和参数
    返回:
        State - 更新后的状态，包含工具执行结果
    """
    # 从状态中获取要调用的工具名称
    # state["tool_name"]: 从状态字典中获取键为"tool_name"的工具名称字符串
    tool_name = state["tool_name"]
    
    # 从状态中获取工具调用参数
    # state["tool_args"]: 从状态字典中获取键为"tool_args"的工具参数字典
    tool_args = state["tool_args"]
    
    # 动态调用指定的工具
    # tools[tool_name]: 从工具字典中获取指定名称的工具函数
    # **tool_args: 将参数字典解包为关键字参数传递给工具函数
    result = tools[tool_name](**tool_args)
    
    # 将工具执行结果存储到状态中
    # state["tool_result"]: 在状态字典中创建新键"tool_result"，存储工具执行结果
    state["tool_result"] = result
    
    # 返回更新后的状态，供下一个节点使用
    return state
```

#### 3. 边（Edge）的使用场景

**场景1：线性工作流**
```python
# 简单的线性流程 - 按顺序执行各个步骤
# add_edge(from_node, to_node): 添加边，定义从from_node到to_node的执行路径
# START: LangGraph内置的起始节点常量，表示工作流的开始
# END: LangGraph内置的结束节点常量，表示工作流的结束

workflow.add_edge(START, "step1")    # 从起始节点连接到第一步
workflow.add_edge("step1", "step2")  # 从第一步连接到第二步
workflow.add_edge("step2", "step3")  # 从第二步连接到第三步
workflow.add_edge("step3", END)      # 从第三步连接到结束节点
```

**场景2：条件分支**
```python
# 基于条件的分支 - 根据状态动态决定执行路径
def route_condition(state: State) -> str:
    """
    路由条件函数 - 根据置信度决定下一步执行路径
    参数:
        state: State - 当前工作流状态，包含置信度等信息
    返回:
        str - 返回下一个节点的名称，用于路由决策
    """
    # 从状态中获取置信度分数
    confidence = state["confidence"]
    
    if confidence > 0.8:
        return "auto_approve"    # 置信度很高，自动通过
    elif confidence > 0.5:
        return "human_review"    # 置信度中等，需要人工审核
    else:
        return "reject"          # 置信度很低，直接拒绝

# 添加条件边 - 根据条件函数的结果动态路由
# add_conditional_edges(source_node, condition_func, edge_map):
#   source_node: 源节点名称，从这里开始条件判断
#   condition_func: 条件函数，返回下一个节点的名称
#   edge_map: 边映射字典，将条件函数的返回值映射到实际的目标节点
workflow.add_conditional_edges(
    "analysis",              # 源节点：分析节点
    route_condition,         # 条件函数：根据置信度决定路由
    {
        "auto_approve": "approve",    # 如果返回"auto_approve"，则跳转到"approve"节点
        "human_review": "review",     # 如果返回"human_review"，则跳转到"review"节点
        "reject": "reject"            # 如果返回"reject"，则跳转到"reject"节点
    }
)
```

**场景3：循环处理**
```python
# 循环处理直到满足条件 - 实现重复执行直到达到终止条件
def should_continue(state: State) -> str:
    """
    循环条件函数 - 判断是否应该继续循环处理
    参数:
        state: State - 当前工作流状态，包含迭代次数和满足状态
    返回:
        str - 返回"process"继续循环，或END结束循环
    """
    # 从状态中获取当前迭代次数
    iteration_count = state["iteration_count"]
    # 从状态中获取是否已满足条件
    satisfied = state["satisfied"]
    
    # 判断是否应该继续循环：迭代次数小于3且未满足条件
    if iteration_count < 3 and not satisfied:
        return "process"    # 继续循环，跳转到process节点
    else:
        return END          # 结束循环，跳转到结束节点

# 添加循环边 - 实现节点的自循环
# add_conditional_edges(source_node, condition_func, edge_map):
#   source_node: 源节点名称，这里是"process"节点
#   condition_func: 条件函数，判断是否继续循环
#   edge_map: 边映射字典，{"process": "process"}表示如果返回"process"则继续执行process节点
workflow.add_conditional_edges(
    "process",              # 源节点：处理节点
    should_continue,        # 条件函数：判断是否继续循环
    {"process": "process"}  # 边映射：如果返回"process"，则继续执行"process"节点（自循环）
)
```

#### 4. 状态（State）的使用场景

**场景1：对话状态管理**
```python
class ConversationState(TypedDict):
    messages: list[BaseMessage]  # 对话历史
    user_context: dict           # 用户上下文
    session_id: str              # 会话ID
    current_topic: str           # 当前话题
    conversation_flow: str       # 对话流程状态
```

**场景2：任务处理状态**
```python
class TaskProcessingState(TypedDict):
    task_id: str                 # 任务ID
    task_type: str               # 任务类型
    input_data: dict             # 输入数据
    intermediate_results: list   # 中间结果
    final_result: dict           # 最终结果
    error: Optional[str]         # 错误信息
    status: str                  # 处理状态
```

**场景3：多代理协作状态**
```python
class MultiAgentState(TypedDict):
    agents: dict                 # 代理信息
    shared_context: dict         # 共享上下文
    agent_assignments: list      # 代理分配
    collaboration_results: dict  # 协作结果
    coordination_status: str     # 协调状态
```

#### 5. 检查点（Checkpoint）的使用场景

**场景1：长时间运行任务**
```python
# 配置检查点用于长时间任务 - 支持任务中断和恢复
# SqliteSaver.from_conn_string(): 创建SQLite数据库检查点保存器
# "sqlite:///long_running_tasks.db": SQLite数据库连接字符串，指定数据库文件路径
checkpointer = SqliteSaver.from_conn_string("sqlite:///long_running_tasks.db")

# 编译工作流并配置检查点保存器
# workflow.compile(checkpointer=checkpointer): 编译工作流，指定使用checkpointer保存状态
app = workflow.compile(checkpointer=checkpointer)

# 执行任务，支持中断和恢复
# config: 执行配置字典，包含线程ID等配置信息
# "configurable": 配置键，包含可配置的参数
# "thread_id": 线程ID，用于标识特定的执行会话，支持并发执行
config = {"configurable": {"thread_id": "task_123"}}

# app.invoke(): 执行工作流
# initial_state: 初始状态，包含任务开始时的数据
# config=config: 传入执行配置，用于标识和跟踪执行会话
result = app.invoke(initial_state, config=config)
```

**场景2：用户会话管理**
```python
# 用户会话的检查点管理 - 保存和恢复用户会话状态
def save_user_session(user_id: str, session_data: dict):
    """
    保存用户会话状态到检查点
    参数:
        user_id: str - 用户唯一标识符
        session_data: dict - 要保存的会话数据
    """
    # 创建配置字典，使用用户ID作为线程ID
    # "configurable": 配置键，包含可配置的参数
    # "thread_id": 线程ID，这里使用用户ID来标识特定的用户会话
    config = {"configurable": {"thread_id": user_id}}
    
    # 保存检查点
    # app.save_checkpoint(config, session_data): 将session_data保存为检查点
    # config: 用于标识检查点的配置信息
    # session_data: 要保存的会话状态数据
    app.save_checkpoint(config, session_data)

def restore_user_session(user_id: str):
    """
    从检查点恢复用户会话状态
    参数:
        user_id: str - 用户唯一标识符
    返回:
        State - 恢复的会话状态
    """
    # 创建配置字典，使用用户ID作为线程ID
    config = {"configurable": {"thread_id": user_id}}
    
    # 获取保存的状态
    # app.get_state(config): 根据配置获取保存的状态
    # config: 用于标识要恢复的检查点的配置信息
    return app.get_state(config)
```

**场景3：错误恢复**
```python
# 从错误中恢复执行 - 捕获异常并保存错误状态，支持后续恢复
try:
    # 尝试执行工作流
    # app.invoke(state, config=config): 执行工作流，传入状态和配置
    # state: 当前工作流状态
    # config=config: 执行配置，用于标识执行会话
    result = app.invoke(state, config=config)
    
except Exception as e:
    # 捕获执行过程中的异常
    # Exception as e: 捕获所有异常，e是异常对象
    
    # 保存错误状态到检查点
    # {**state, "error": str(e)}: 创建新的状态字典
    # **state: 展开原有状态的所有键值对
    # "error": str(e): 添加错误信息到状态中
    error_state = {**state, "error": str(e)}
    
    # 将错误状态保存为检查点
    # app.save_checkpoint(config, error_state): 保存当前状态，包括错误信息
    # config: 配置信息，用于标识检查点
    # error_state: 包含错误信息的状态
    app.save_checkpoint(config, error_state)
    
    # 稍后从检查点恢复执行
    # app.get_state(config): 获取保存的状态（包含错误信息）
    # recovered_state: 恢复的状态，包含错误信息和之前的所有数据
    recovered_state = app.get_state(config)
    
    # 修复错误后继续执行
    # 这里可以添加错误修复逻辑，然后重新执行工作流
```

#### 6. 中断（Interrupt）的使用场景

### Interrupt与前端结合实现

#### 6.1 后端实现 - Interrupt处理

**场景1：人工审核**
```python
def content_review_node(state: State) -> State:
    """
    内容审核节点 - 需要人工确认
    参数:
        state: State - 当前工作流状态，包含需要审核的内容
    返回:
        State - 更新后的状态，包含审核结果
    """
    # 从状态中获取需要审核的内容
    # state["content"]: 从状态字典中获取键为"content"的内容文本
    content = state["content"]
    
    # 暂停执行，等待人工审核
    # interrupt(data): 暂停工作流执行，等待人工干预
    # data: 传递给人工审核界面的数据，包含审核所需的所有信息
    approval = interrupt({
        "content": content,                    # 要审核的内容
        "review_type": "content_moderation",  # 审核类型：内容审核
        "deadline": "2024-01-01T12:00:00Z"    # 审核截止时间
    })
    
    # 将人工审核结果存储到状态中
    # approval["decision"]: 从人工审核结果中获取决策（如"approve"、"reject"等）
    # state["approved"]: 在状态字典中创建新键"approved"，存储审核结果
    state["approved"] = approval["decision"]
    
    # 返回更新后的状态，供下一个节点使用
    return state
```

#### 6.2 Interrupt与前端结合的核心机制

**1. 后端处理流程**

```python
# 1. 构建包含中断节点的工作流
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.types import interrupt, Command
import uuid
from datetime import datetime

# 定义状态类型
class ContentReviewState(TypedDict):
    content: str
    review_result: str
    status: str

# 创建检查点保存器（必需）
checkpointer = InMemorySaver()

# 构建工作流
workflow = StateGraph(ContentReviewState)

# 添加节点
workflow.add_node("content_review", content_review_node)
workflow.add_node("final_decision", final_decision_node)

# 定义工作流路径
workflow.add_edge(START, "content_review")
workflow.add_edge("content_review", "final_decision")
workflow.add_edge("final_decision", END)

# 编译工作流
app = workflow.compile(checkpointer=checkpointer)

# 2. 中断节点实现
def content_review_node(state: ContentReviewState) -> ContentReviewState:
    """内容审核节点 - 遇到interrupt时暂停执行"""
    content = state["content"]
    thread_id = state.get("thread_id")
    
    # 方法1: 使用装饰器包装的interrupt
    @kafka_interrupt_handler
    def interrupt_with_kafka(data):
        return interrupt(data)
    
    # 当执行到这里时，interrupt会暂停工作流
    # interrupt_with_kafka会自动将数据发送到Kafka
    approval = interrupt_with_kafka({
        "content": content,
        "review_type": "content_moderation",
        "thread_id": thread_id
    })
    
    # 方法2: 使用自定义中断处理器
    # approval = interrupt_handler.interrupt_with_kafka({
    #     "content": content,
    #     "review_type": "content_moderation",
    #     "thread_id": thread_id
    # })
    
    # 更新状态
    state["review_result"] = approval["decision"]
    state["status"] = "reviewed"
    
    return state

# 3. 中断事件处理 - 在interrupt发生时自动触发
from kafka import KafkaProducer
import json

# Kafka生产者配置
kafka_producer = KafkaProducer(
    bootstrap_servers=['localhost:9092'],
    value_serializer=lambda v: json.dumps(v).encode('utf-8')
)

# 方法1: 使用装饰器包装interrupt函数
def kafka_interrupt_handler(func):
    """装饰器：为interrupt函数添加Kafka发送功能"""
    def wrapper(interrupt_data: dict):
        # 生成中断ID
        interrupt_id = str(uuid.uuid4())
        interrupt_data["interrupt_id"] = interrupt_id
        
        # 构建中断消息
        interrupt_message = {
            "interrupt_id": interrupt_id,
            "thread_id": interrupt_data.get("thread_id"),
            "timestamp": datetime.now().isoformat(),
            "status": "pending",
            "data": interrupt_data
        }
        
        # 发送到Kafka
        kafka_producer.send('interrupts', interrupt_message)
        
        # 同时写入数据库
        save_interrupt_to_db(interrupt_message)
        
        # 调用原始的interrupt函数
        return func(interrupt_data)
    
    return wrapper

# 方法2: 自定义中断处理器类
class CustomInterruptHandler:
    def __init__(self):
        self.kafka_producer = kafka_producer
    
    def interrupt_with_kafka(self, interrupt_data: dict):
        """带Kafka发送功能的interrupt"""
        interrupt_id = str(uuid.uuid4())
        interrupt_data["interrupt_id"] = interrupt_id
        
        # 构建中断消息
        interrupt_message = {
            "interrupt_id": interrupt_id,
            "thread_id": interrupt_data.get("thread_id"),
            "timestamp": datetime.now().isoformat(),
            "status": "pending",
            "data": interrupt_data
        }
        
        # 发送到Kafka主题
        self.kafka_producer.send('interrupts', interrupt_message)
        
        # 同时写入数据库
        save_interrupt_to_db(interrupt_message)
        
        # 调用LangGraph的interrupt函数
        return interrupt(interrupt_data)

# 创建中断处理器实例
interrupt_handler = CustomInterruptHandler()

# 4. 执行工作流并处理中断
def execute_content_review_workflow(content: str, thread_id: str):
    """执行内容审核工作流"""
    # 初始状态
    initial_state = {
        "content": content,
        "thread_id": thread_id,
        "status": "pending"
    }
    
    # 执行配置
    config = {"configurable": {"thread_id": thread_id}}
    
    try:
        # 执行工作流
        result = app.invoke(initial_state, config=config)
        return result
        
    except Exception as e:
        # 如果遇到中断，会抛出包含中断信息的异常
        if "interrupt" in str(e).lower():
            # 中断数据已经在CustomInterruptHandler中写入Kafka
            print(f"工作流已中断，等待人工干预: {e}")
            return {"status": "interrupted", "message": str(e)}
        else:
            raise e

# 5. 恢复中断的工作流
def resume_interrupted_workflow(thread_id: str, interrupt_id: str, user_response: dict):
    """恢复被中断的工作流"""
    config = {"configurable": {"thread_id": thread_id}}
    
    # 使用Command恢复工作流
    result = app.invoke(
        Command(resume={interrupt_id: user_response}),
        config=config
    )
    
    # 更新中断状态为已完成
    update_interrupt_status(interrupt_id, "completed", user_response)
    
    return result

# 6. 完整的API端点示例
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI()

class WorkflowRequest(BaseModel):
    content: str
    thread_id: str

class InterruptResponse(BaseModel):
    interrupt_id: str
    decision: str
    comment: str = None

@app.post("/api/workflow/content-review")
async def start_content_review(request: WorkflowRequest):
    """启动内容审核工作流"""
    try:
        result = execute_content_review_workflow(
            content=request.content,
            thread_id=request.thread_id
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/workflow/resume")
async def resume_workflow(thread_id: str, response: InterruptResponse):
    """恢复被中断的工作流"""
    try:
        user_response = {
            "decision": response.decision,
            "comment": response.comment,
            "timestamp": datetime.now().isoformat()
        }
        
        result = resume_interrupted_workflow(
            thread_id=thread_id,
            interrupt_id=response.interrupt_id,
            user_response=user_response
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 7. 使用示例
if __name__ == "__main__":
    # 启动工作流
    content = "这是一段需要审核的内容"
    thread_id = "user_123_session_456"
    
    # 执行工作流（会在content_review_node处中断）
    result = execute_content_review_workflow(content, thread_id)
    
    # 此时：
    # 1. 工作流在content_review_node处暂停
    # 2. interrupt()被调用，触发CustomInterruptHandler
    # 3. 中断数据被写入Kafka和数据库
    # 4. 前端可以通过轮询获取到中断数据
    # 5. 用户在前端操作后，调用resume API恢复工作流
```

# 3. 前端轮询或监听获取中断数据
@app.get("/api/interrupts/pending")
async def get_pending_interrupts():
    """获取待处理的中断列表"""
    # 从数据库查询待处理的中断
    pending_interrupts = query_pending_interrupts_from_db()
    return pending_interrupts

# 4. 接收前端响应并恢复工作流
@app.post("/api/resume")
async def resume_workflow(thread_id: str, interrupt_id: str, response: dict):
    # 更新中断状态
    update_interrupt_status(interrupt_id, "completed", response)
    
    # 恢复工作流执行
    config = {"configurable": {"thread_id": thread_id}}
    result = app.invoke(Command(resume=response), config=config)
    return result
```

**2. 前端处理流程**
```javascript
// 1. 轮询或监听Kafka获取中断数据
class InterruptHandler {
    constructor() {
        this.pollingInterval = null;
        this.startPolling();
    }
    
    startPolling() {
        // 定期轮询待处理的中断
        this.pollingInterval = setInterval(() => {
            this.checkPendingInterrupts();
        }, 5000); // 每5秒检查一次
    }
    
    async checkPendingInterrupts() {
        try {
            const response = await fetch('/api/interrupts/pending');
            const interrupts = await response.json();
            
            interrupts.forEach(interrupt => {
                if (interrupt.status === 'pending') {
                    this.handleInterrupt(interrupt);
                }
            });
        } catch (error) {
            console.error('Failed to check interrupts:', error);
        }
    }
    
    handleInterrupt(interruptData) {
        // 显示对应的模态框
        this.showModal(interruptData);
    }
    
    // 2. 用户操作后提交响应
    async submitResponse(interruptId, decision) {
        try {
            const response = await fetch('/api/resume', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    thread_id: this.threadId,
                    interrupt_id: interruptId,
                    response: decision
                })
            });
            
            if (response.ok) {
                console.log('Response submitted successfully');
            }
        } catch (error) {
            console.error('Failed to submit response:', error);
        }
    }
}

// 3. 使用Kafka消费者（可选）
class KafkaInterruptConsumer {
    constructor() {
        this.consumer = new KafkaConsumer({
            'bootstrap.servers': 'localhost:9092',
            'group.id': 'interrupt-handlers',
            'auto.offset.reset': 'latest'
        });
        
        this.consumer.subscribe(['interrupts']);
        this.startConsuming();
    }
    
    startConsuming() {
        this.consumer.run({
            eachMessage: async ({ topic, partition, message }) => {
                const interruptData = JSON.parse(message.value.toString());
                if (interruptData.status === 'pending') {
                    interruptHandler.handleInterrupt(interruptData);
                }
            }
        });
    }
}
```

**3. 数据库存储实现**
```python
# 数据库模型定义
from sqlalchemy import Column, String, DateTime, JSON, Text
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class InterruptRecord(Base):
    __tablename__ = 'interrupts'
    
    interrupt_id = Column(String(36), primary_key=True)
    thread_id = Column(String(100), nullable=False)
    timestamp = Column(DateTime, nullable=False)
    status = Column(String(20), default='pending')  # pending, completed, failed
    data = Column(JSON, nullable=False)
    response = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

# 数据库操作函数
def save_interrupt_to_db(interrupt_message: dict):
    """保存中断记录到数据库"""
    interrupt_record = InterruptRecord(**interrupt_message)
    session.add(interrupt_record)
    session.commit()

def query_pending_interrupts_from_db():
    """查询待处理的中断记录"""
    return session.query(InterruptRecord).filter(
        InterruptRecord.status == 'pending'
    ).all()

def update_interrupt_status(interrupt_id: str, status: str, response: dict = None):
    """更新中断状态"""
    interrupt_record = session.query(InterruptRecord).filter(
        InterruptRecord.interrupt_id == interrupt_id
    ).first()
    
    if interrupt_record:
        interrupt_record.status = status
        interrupt_record.response = response
        interrupt_record.updated_at = datetime.now()
        session.commit()
```

**场景2：敏感操作确认**
```python
def sensitive_operation_node(state: State) -> State:
    """敏感操作节点 - 需要人工确认"""
    operation = state["operation"]
    
    # 暂停执行，等待人工确认
    confirmation = interrupt({
        "operation": operation,
        "risk_level": "high",
        "confirmation_required": True
    })
    
    if confirmation["approved"]:
        state["operation_result"] = execute_sensitive_operation(operation)
    
    return state
```

**场景3：数据验证**
```python
def data_validation_node(state: State) -> State:
    """数据验证节点 - 需要人工验证"""
    data = state["data"]
    validation_result = validate_data(data)
    
    if validation_result["confidence"] < 0.7:
        # 置信度低，需要人工验证
        human_validation = interrupt({
            "data": data,
            "validation_result": validation_result,
            "request_type": "data_validation"
        })
        
        state["validation_result"] = human_validation["result"]
    
    return state
```

#### 7. 命令（Command）的使用场景

**场景1：动态路由**
```python
def routing_node(state: State) -> Command[Literal["agent_a", "agent_b", "agent_c"]]:
    """
    路由节点 - 根据用户意图动态选择下一个代理
    参数:
        state: State - 当前工作流状态，包含用户意图等信息
    返回:
        Command - 包含路由决策和状态更新的命令对象
    """
    # 从状态中获取用户意图
    # state["user_intent"]: 从状态字典中获取键为"user_intent"的用户意图
    user_intent = state["user_intent"]
    
    # 根据用户意图动态选择下一个代理
    if user_intent == "technical_support":
        # 技术支持的意图，路由到技术代理
        # Command(goto="agent_a", update={"agent_type": "technical"}):
        #   goto="agent_a": 指定下一个要执行的节点名称
        #   update={"agent_type": "technical"}: 更新状态，设置代理类型为技术类型
        return Command(goto="agent_a", update={"agent_type": "technical"})
        
    elif user_intent == "billing_inquiry":
        # 账单查询的意图，路由到账单代理
        # Command(goto="agent_b", update={"agent_type": "billing"}):
        #   goto="agent_b": 指定下一个要执行的节点名称
        #   update={"agent_type": "billing"}: 更新状态，设置代理类型为账单类型
        return Command(goto="agent_b", update={"agent_type": "billing"})
        
    else:
        # 其他意图，路由到通用代理
        # Command(goto="agent_c", update={"agent_type": "general"}):
        #   goto="agent_c": 指定下一个要执行的节点名称
        #   update={"agent_type": "general"}: 更新状态，设置代理类型为通用类型
        return Command(goto="agent_c", update={"agent_type": "general"})
```

**场景2：状态更新和控制流**
```python
def processing_node(state: State) -> Command[Literal["continue", "retry", "fail"]]:
    """
    处理节点 - 更新状态并决定下一步执行路径
    参数:
        state: State - 当前工作流状态，包含要处理的数据
    返回:
        Command - 包含状态更新和路由决策的命令对象
    """
    try:
        # 尝试处理数据
        # process_data(state["data"]): 调用数据处理函数
        # state["data"]: 从状态中获取要处理的数据
        result = process_data(state["data"])
        
        # 处理成功，继续执行
        # Command(update=..., goto="continue"):
        #   update={"result": result, "status": "success"}: 更新状态，存储处理结果和成功状态
        #   goto="continue": 指定下一个节点为"continue"
        return Command(
            update={"result": result, "status": "success"},
            goto="continue"
        )
        
    except RetryableError:
        # 捕获可重试错误
        # RetryableError: 可重试的异常类型，如网络超时等
        
        # 增加重试计数并重试
        # state.get("retry_count", 0): 获取当前重试次数，如果不存在则默认为0
        # + 1: 重试次数加1
        return Command(
            update={"retry_count": state.get("retry_count", 0) + 1},
            goto="retry"  # 跳转到重试节点
        )
        
    except FatalError:
        # 捕获致命错误
        # FatalError: 致命的异常类型，无法重试的错误
        
        # 记录错误信息并跳转到失败处理节点
        return Command(
            update={"error": "Fatal error occurred"},  # 更新状态，记录错误信息
            goto="fail"  # 跳转到失败处理节点
        )
```

**场景3：代理切换**
```python
def agent_handoff_node(state: State) -> Command:
    """
    代理切换节点 - 切换到其他专业代理
    参数:
        state: State - 当前工作流状态，包含切换原因和上下文信息
    返回:
        Command - 包含代理切换指令的命令对象
    """
    # 创建代理切换命令
    # Command(goto=..., update=..., graph=...):
    #   goto="specialist_agent": 指定要切换到的代理节点名称
    #   update={...}: 更新状态，传递切换原因和上下文信息
    #   graph=Command.PARENT: 指定要切换到的图层级
    return Command(
        goto="specialist_agent",  # 切换到专业代理节点
        update={
            # 传递切换原因
            # state["handoff_reason"]: 从状态中获取切换原因（如"complex_issue"、"specialized_knowledge"等）
            "handoff_reason": state["handoff_reason"],
            
            # 传递对话上下文
            # state["conversation_context"]: 从状态中获取对话历史和相关上下文信息
            "context": state["conversation_context"]
        },
        graph=Command.PARENT  # 切换到父图中的代理（用于多层级图结构）
    )
```

#### 8. 发送（Send）的使用场景

**场景1：并行任务处理**
```python
def task_distribution_node(state: State):
    """
    任务分发节点 - 并行处理多个任务
    参数:
        state: State - 当前工作流状态，包含要处理的任务列表
    返回:
        list[Send] - 发送到多个工作节点的任务列表
    """
    # 从状态中获取任务列表
    # state["tasks"]: 从状态字典中获取键为"tasks"的任务列表
    tasks = state["tasks"]
    
    # 并行发送任务到多个工作节点
    # 使用列表推导式创建多个Send对象
    # enumerate(tasks): 为每个任务分配一个索引
    # Send(target_node, data): 创建发送对象
    #   target_node: 目标节点名称，这里是"worker_node"
    #   data: 要发送的数据字典，包含任务内容和任务ID
    sends = [
        Send("worker_node", {"task": task, "task_id": i})
        for i, task in enumerate(tasks)
    ]
    
    # 返回所有发送对象，LangGraph会并行执行这些任务
    return sends
```

**场景2：多代理协作**
```python
def collaboration_node(state: State):
    """
    协作节点 - 多个代理同时工作
    参数:
        state: State - 当前工作流状态，包含子任务信息
    返回:
        list[Send] - 发送到不同专业代理的任务列表
    """
    # 从状态中获取子任务信息
    # state["subtasks"]: 从状态字典中获取键为"subtasks"的子任务列表
    subtasks = state["subtasks"]
    
    # 发送子任务到不同的专业代理
    # 创建多个Send对象，每个对象发送到不同的专业代理
    sends = [
        # 发送研究任务到研究代理
        # Send("research_agent", {...}): 发送到研究代理
        # "task": "research": 指定任务类型为研究
        # "topic": subtask["topic"]: 传递研究主题
        Send("research_agent", {"task": "research", "topic": subtask["topic"]}),
        
        # 发送分析任务到分析代理
        # Send("analysis_agent", {...}): 发送到分析代理
        # "task": "analysis": 指定任务类型为分析
        # "data": subtask["data"]: 传递要分析的数据
        Send("analysis_agent", {"task": "analysis", "data": subtask["data"]}),
        
        # 发送写作任务到写作代理
        # Send("writing_agent", {...}): 发送到写作代理
        # "task": "writing": 指定任务类型为写作
        # "content": subtask["content"]: 传递要写作的内容
        Send("writing_agent", {"task": "writing", "content": subtask["content"]})
    ]
    
    # 返回所有发送对象，LangGraph会并行执行这些代理任务
    return sends
```

**场景3：数据流处理**
```python
def data_flow_node(state: State):
    """数据流节点 - 数据在不同节点间流动"""
    data_chunks = state["data_chunks"]
    
    # 将数据块发送到不同的处理节点
    sends = [
        Send("processor_a", {"chunk": chunk, "processor": "a"})
        for chunk in data_chunks[:len(data_chunks)//2]
    ] + [
        Send("processor_b", {"chunk": chunk, "processor": "b"})
        for chunk in data_chunks[len(data_chunks)//2:]
    ]
    
    return sends
```

## 基本架构

### 1. 图结构定义

```python
# 导入必要的模块和类
from langgraph.graph import StateGraph, START, END  # 导入状态图、起始节点、结束节点
from typing import TypedDict, Annotated              # 导入类型提示工具
from langchain_core.messages import BaseMessage      # 导入基础消息类型

# 定义状态类型 - 使用TypedDict定义工作流状态的结构
# TypedDict: 用于定义字典的类型结构，提供类型安全
class AgentState(TypedDict):
    # Annotated[type, description]: 为字段添加类型和描述信息
    messages: Annotated[list[BaseMessage], "对话消息列表"]      # 存储对话历史消息
    current_step: Annotated[str, "当前执行步骤"]                # 记录当前执行的步骤名称
    user_input: Annotated[str, "用户输入"]                      # 存储用户输入的原始文本
    context: Annotated[dict, "上下文信息"]                      # 存储处理过程中的上下文数据

# 创建状态图实例
# StateGraph(AgentState): 创建一个新的状态图，指定状态类型为AgentState
workflow = StateGraph(AgentState)

# 添加处理节点到图中
# add_node(node_name, node_function): 添加节点，第一个参数是节点名称，第二个参数是节点函数
workflow.add_node("process_input", process_input_node)        # 输入处理节点
workflow.add_node("generate_response", generate_response_node) # 响应生成节点
workflow.add_node("validate_output", validate_output_node)     # 输出验证节点

# 定义节点间的连接关系（边）
# add_edge(from_node, to_node): 添加边，定义从from_node到to_node的执行路径
workflow.add_edge(START, "process_input")                     # 从起始节点连接到输入处理节点
workflow.add_edge("process_input", "generate_response")       # 从输入处理连接到响应生成
workflow.add_edge("generate_response", "validate_output")     # 从响应生成连接到输出验证
workflow.add_edge("validate_output", END)                     # 从输出验证连接到结束节点

# 编译工作流图
# workflow.compile(): 将定义好的图结构编译为可执行的应用
# 编译后的app可以接收输入并执行整个工作流
app = workflow.compile()
```

### 2. 节点函数定义

```python
def process_input_node(state: AgentState) -> AgentState:
    """
    处理用户输入节点 - 预处理和清洗用户输入
    参数:
        state: AgentState - 当前工作流状态，包含用户输入等信息
    返回:
        AgentState - 更新后的状态，包含处理后的输入
    """
    # 从状态中获取用户原始输入
    # state["user_input"]: 从状态字典中获取键为"user_input"的用户输入文本
    user_input = state["user_input"]
    
    # 执行输入预处理逻辑
    # preprocess_input(user_input): 调用预处理函数，清洗和标准化用户输入
    # 可能包括：去除多余空格、转换为小写、去除特殊字符等
    processed_input = preprocess_input(user_input)
    
    # 更新工作流状态
    # state["context"]["processed_input"]: 在上下文字典中存储处理后的输入
    # state["current_step"]: 更新当前执行步骤为"input_processed"
    state["context"]["processed_input"] = processed_input
    state["current_step"] = "input_processed"
    
    # 返回更新后的状态，供下一个节点使用
    return state

def generate_response_node(state: AgentState) -> AgentState:
    """
    生成响应节点 - 调用LLM生成响应
    参数:
        state: AgentState - 当前工作流状态，包含处理后的输入和上下文
    返回:
        AgentState - 更新后的状态，包含生成的响应
    """
    # 从状态中获取上下文信息
    # state["context"]: 从状态字典中获取上下文字典
    context = state["context"]
    
    # 调用大语言模型生成响应
    # llm.invoke(context["processed_input"]): 调用LLM，传入处理后的输入
    # llm: 预配置的大语言模型实例（如OpenAI、Anthropic等）
    # context["processed_input"]: 从上下文中获取处理后的输入文本
    response = llm.invoke(context["processed_input"])
    
    # 更新工作流状态
    # state["messages"].append(response): 将生成的响应添加到消息历史中
    # state["current_step"]: 更新当前执行步骤为"response_generated"
    state["messages"].append(response)
    state["current_step"] = "response_generated"
    
    # 返回更新后的状态，供下一个节点使用
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
