# MySQL索引优化详解

## 目录
1. [什么是索引](#什么是索引)
2. [索引的类型和分类](#索引的类型和分类)
3. [索引的创建与管理](#索引的创建与管理)
4. [索引优化策略](#索引优化策略)
5. [执行计划分析](#执行计划分析)
6. [常见索引问题](#常见索引问题)
7. [实际应用场景](#实际应用场景)
8. [索引监控与维护](#索引监控与维护)
9. [最佳实践总结](#最佳实践总结)

---

## 什么是索引

### 基本概念
**索引（Index）** 是数据库中一种数据结构，用于快速定位和访问数据表中的特定行。就像书籍的目录一样，索引提供了数据的快速查找路径。

### 生活化理解
想象一下图书馆的场景：
- **没有索引**：要找一本书，需要逐个书架查找（全表扫描）
- **有索引**：通过图书目录快速定位书籍位置（索引查找）

```sql
-- 没有索引的查询（全表扫描）
SELECT * FROM users WHERE name = '张三';  -- 需要扫描整个表

-- 有索引的查询（索引查找）
CREATE INDEX idx_name ON users(name);
SELECT * FROM users WHERE name = '张三';  -- 直接通过索引定位
```

### 索引的工作原理

#### B+Tree索引结构
MySQL的InnoDB存储引擎主要使用B+Tree索引：

```
                    [Root Node]
                   /     |     \
              [Internal] [Internal] [Internal]
             /    |    \    |    /     |     \
        [Leaf] [Leaf] [Leaf] [Leaf] [Leaf] [Leaf]
         |      |      |      |      |      |
        Data   Data   Data   Data   Data   Data
```

**特点**：
- 🌳 **平衡树结构**：所有叶子节点在同一层
- 🔗 **叶子节点链表**：支持范围查询
- 📊 **高度可控**：通常2-4层就能支持百万级数据

---

## 索引的类型和分类

### 按存储结构分类

#### 1. B+Tree索引 ⭐
**特点**：MySQL默认索引类型，适用于大多数场景

```sql
-- 创建B+Tree索引（默认类型）
CREATE INDEX idx_age ON users(age);
CREATE INDEX idx_name_age ON users(name, age);  -- 复合索引
```

**适用场景**：
- 🔍 精确查找：`WHERE id = 123`
- 📈 范围查询：`WHERE age BETWEEN 18 AND 30`
- 📊 排序操作：`ORDER BY created_at`
- 🔤 前缀匹配：`WHERE name LIKE '张%'`

#### 2. Hash索引
**特点**：基于哈希表，查找速度极快但功能受限

```sql
-- 在Memory存储引擎中创建Hash索引
CREATE TABLE temp_table (
    id INT,
    name VARCHAR(50),
    INDEX USING HASH (id)
) ENGINE=MEMORY;
```

**适用场景**：
- ✅ 等值查询：`WHERE id = 123`
- ❌ 范围查询：`WHERE id > 100`（不支持）
- ❌ 排序操作：`ORDER BY id`（不支持）

#### 3. 全文索引（FULLTEXT）
**特点**：专门用于文本搜索

```sql
-- 创建全文索引
CREATE FULLTEXT INDEX idx_content ON articles(title, content);

-- 使用全文搜索
SELECT * FROM articles 
WHERE MATCH(title, content) AGAINST('MySQL 优化' IN NATURAL LANGUAGE MODE);
```

### 按逻辑结构分类

#### 1. 主键索引（PRIMARY KEY）
**特点**：唯一且不能为空，InnoDB的聚簇索引

```sql
-- 创建主键索引
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,  -- 自动创建主键索引
    name VARCHAR(50)
);
```

#### 2. 唯一索引（UNIQUE）
**特点**：保证字段值的唯一性

```sql
-- 创建唯一索引
CREATE UNIQUE INDEX idx_email ON users(email);

-- 或者在创建表时定义
CREATE TABLE users (
    id INT PRIMARY KEY,
    email VARCHAR(100) UNIQUE  -- 自动创建唯一索引
);
```

#### 3. 普通索引（INDEX）
**特点**：最基本的索引，没有唯一性限制

```sql
-- 创建普通索引
CREATE INDEX idx_name ON users(name);
CREATE INDEX idx_age ON users(age);
```

#### 4. 复合索引（Multi-Column Index）
**特点**：包含多个字段的索引

```sql
-- 创建复合索引
CREATE INDEX idx_name_age_city ON users(name, age, city);

-- 遵循最左前缀原则
SELECT * FROM users WHERE name = '张三';                    -- ✅ 使用索引
SELECT * FROM users WHERE name = '张三' AND age = 25;      -- ✅ 使用索引
SELECT * FROM users WHERE age = 25;                        -- ❌ 不使用索引
```

### 按存储方式分类

#### 1. 聚簇索引（Clustered Index）
**特点**：数据行和索引键值存储在一起

```sql
-- InnoDB中的主键就是聚簇索引
CREATE TABLE orders (
    id INT PRIMARY KEY,      -- 聚簇索引
    user_id INT,
    amount DECIMAL(10,2),
    created_at TIMESTAMP
);
```

**优点**：
- ⚡ 主键查询极快
- 📈 范围查询效率高
- 💾 减少磁盘I/O

**缺点**：
- 📝 插入顺序影响性能
- 🔄 更新主键成本高

#### 2. 非聚簇索引（Non-Clustered Index）
**特点**：索引和数据分别存储

```sql
-- 除主键外的其他索引都是非聚簇索引
CREATE INDEX idx_user_id ON orders(user_id);  -- 非聚簇索引
```

---

## 索引的创建与管理

### 创建索引的方式

#### 1. 建表时创建
```sql
CREATE TABLE products (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    category_id INT,
    price DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- 创建索引
    INDEX idx_name (name),
    INDEX idx_category (category_id),
    INDEX idx_price (price),
    INDEX idx_name_category (name, category_id),  -- 复合索引
    UNIQUE INDEX idx_name_unique (name)           -- 唯一索引
);
```

#### 2. 建表后创建
```sql
-- 创建普通索引
CREATE INDEX idx_email ON users(email);

-- 创建唯一索引
CREATE UNIQUE INDEX idx_phone ON users(phone);

-- 创建复合索引
CREATE INDEX idx_status_created ON orders(status, created_at);

-- 创建前缀索引
CREATE INDEX idx_title_prefix ON articles(title(10));
```

#### 3. 使用ALTER TABLE创建
```sql
-- 添加索引
ALTER TABLE users ADD INDEX idx_age (age);
ALTER TABLE users ADD UNIQUE INDEX idx_id_card (id_card);
ALTER TABLE users ADD INDEX idx_name_age (name, age);
```

### 删除索引

```sql
-- 删除索引的几种方式
DROP INDEX idx_name ON users;
ALTER TABLE users DROP INDEX idx_age;
ALTER TABLE users DROP KEY idx_phone;
```

### 查看索引信息

```sql
-- 查看表的索引
SHOW INDEX FROM users;
SHOW KEYS FROM users;

-- 查看索引统计信息
SELECT * FROM information_schema.STATISTICS 
WHERE table_schema = 'your_database' AND table_name = 'users';

-- 查看索引使用情况
SELECT * FROM sys.schema_index_statistics 
WHERE table_schema = 'your_database' AND table_name = 'users';
```

---

## 索引优化策略

### 1. 选择合适的字段创建索引

#### ✅ 适合创建索引的字段
```sql
-- 1. WHERE子句中经常使用的字段
CREATE INDEX idx_status ON orders(status);
SELECT * FROM orders WHERE status = 'pending';

-- 2. JOIN连接条件的字段
CREATE INDEX idx_user_id ON orders(user_id);
SELECT * FROM users u JOIN orders o ON u.id = o.user_id;

-- 3. ORDER BY排序的字段
CREATE INDEX idx_created_at ON orders(created_at);
SELECT * FROM orders ORDER BY created_at DESC;

-- 4. GROUP BY分组的字段
CREATE INDEX idx_category_id ON products(category_id);
SELECT category_id, COUNT(*) FROM products GROUP BY category_id;
```

#### ❌ 不适合创建索引的字段
```sql
-- 1. 频繁更新的字段
-- ❌ 不建议：status字段频繁更新
CREATE INDEX idx_status ON user_sessions(status);  

-- 2. 重复值太多的字段（低选择性）
-- ❌ 不建议：性别字段只有男/女两个值
CREATE INDEX idx_gender ON users(gender);

-- 3. 很少在查询中使用的字段
-- ❌ 不建议：备注字段很少查询
CREATE INDEX idx_notes ON orders(notes);
```

### 2. 复合索引优化

#### 最左前缀原则
```sql
-- 创建复合索引
CREATE INDEX idx_name_age_city ON users(name, age, city);

-- ✅ 能使用索引的查询
SELECT * FROM users WHERE name = '张三';                          -- 使用name
SELECT * FROM users WHERE name = '张三' AND age = 25;            -- 使用name,age
SELECT * FROM users WHERE name = '张三' AND age = 25 AND city = '北京';  -- 使用name,age,city

-- ❌ 不能使用索引的查询
SELECT * FROM users WHERE age = 25;                              -- 跳过了name
SELECT * FROM users WHERE city = '北京';                         -- 跳过了name,age
SELECT * FROM users WHERE age = 25 AND city = '北京';            -- 跳过了name
```

#### 字段顺序优化
```sql
-- 原则：选择性高的字段放在前面
-- 假设：name有1000个不同值，age有50个不同值，city有10个不同值

-- ✅ 推荐：选择性从高到低
CREATE INDEX idx_name_age_city ON users(name, age, city);

-- ❌ 不推荐：选择性从低到高
CREATE INDEX idx_city_age_name ON users(city, age, name);
```

### 3. 前缀索引优化

#### 适用场景
```sql
-- 对于长字符串字段，使用前缀索引
CREATE INDEX idx_url_prefix ON pages(url(20));  -- 只索引前20个字符

-- 分析前缀长度的选择性
SELECT 
    COUNT(DISTINCT LEFT(url, 5)) / COUNT(*) AS prefix_5,
    COUNT(DISTINCT LEFT(url, 10)) / COUNT(*) AS prefix_10,
    COUNT(DISTINCT LEFT(url, 15)) / COUNT(*) AS prefix_15,
    COUNT(DISTINCT LEFT(url, 20)) / COUNT(*) AS prefix_20
FROM pages;
```

#### 前缀长度选择
```sql
-- 选择合适的前缀长度（选择性接近完整字段）
-- 目标：前缀选择性 >= 0.8 * 完整字段选择性

SELECT 
    COUNT(DISTINCT url) / COUNT(*) AS full_selectivity,
    COUNT(DISTINCT LEFT(url, 10)) / COUNT(*) AS prefix_selectivity
FROM pages;
```

### 4. 索引覆盖优化

#### 什么是覆盖索引
```sql
-- 创建覆盖索引：索引包含查询所需的所有字段
CREATE INDEX idx_user_info ON users(id, name, email, age);

-- ✅ 覆盖索引查询（不需要回表）
SELECT id, name, email FROM users WHERE age = 25;

-- ❌ 非覆盖索引查询（需要回表）
SELECT id, name, email, address FROM users WHERE age = 25;
```

#### 覆盖索引的优势
```sql
-- 示例：订单查询优化
-- 原始查询
SELECT order_id, user_id, amount FROM orders WHERE status = 'completed';

-- 创建覆盖索引
CREATE INDEX idx_status_cover ON orders(status, order_id, user_id, amount);

-- 查询将直接从索引获取数据，无需回表
```

---

## 执行计划分析

### EXPLAIN基础语法

```sql
-- 基本用法
EXPLAIN SELECT * FROM users WHERE name = '张三' AND age = 25;

-- 详细分析（推荐）
EXPLAIN FORMAT=JSON SELECT * FROM users WHERE name = '张三';

-- 分析实际执行（MySQL 8.0+）
EXPLAIN ANALYZE SELECT * FROM users WHERE name = '张三';
```

### EXPLAIN输出字段详解

#### 完整字段说明
```sql
-- 示例输出
+----+-------------+-------+------------+------+---------------+------+---------+------+------+----------+-------+
| id | select_type | table | partitions | type | possible_keys | key  | key_len | ref  | rows | filtered | Extra |
+----+-------------+-------+------------+------+---------------+------+---------+------+------+----------+-------+
```

| 字段 | 含义 | 说明 |
|------|------|------|
| **id** | 查询序号 | SELECT标识符，数字越大越先执行 |
| **select_type** | 查询类型 | SIMPLE, PRIMARY, SUBQUERY, DERIVED等 |
| **table** | 表名 | 正在访问的表名 |
| **partitions** | 分区信息 | 匹配的分区（如果表已分区） |
| **type** | 连接类型 | 访问类型，性能关键指标 ⭐ |
| **possible_keys** | 可能的索引 | 可能使用的索引列表 |
| **key** | 实际使用的索引 | 实际选择的索引 |
| **key_len** | 索引长度 | 使用的索引字节长度 |
| **ref** | 索引比较 | 与索引比较的列或常数 |
| **rows** | 预估行数 | 预计扫描的行数 ⭐ |
| **filtered** | 过滤百分比 | 按WHERE条件过滤的行百分比 |
| **Extra** | 额外信息 | 重要的执行细节 ⭐ |

---

### TYPE字段详解（性能关键）

#### 性能从优到劣排序
```
system > const > eq_ref > ref > fulltext > ref_or_null > 
index_merge > unique_subquery > index_subquery > range > 
index > ALL
```

#### 1. system（最优）
**含义**：表只有一行记录（系统表），是const的特例
```sql
-- 示例：系统参数表
SELECT * FROM mysql.proxies_priv LIMIT 1;
-- type: system
```
**优化**：无需优化，已是最优

#### 2. const（极优）⭐
**含义**：通过主键或唯一索引访问，最多返回一行
```sql
-- 主键查询
EXPLAIN SELECT * FROM users WHERE id = 123;
-- type: const, rows: 1

-- 唯一索引查询
EXPLAIN SELECT * FROM users WHERE email = 'user@example.com';
-- type: const, rows: 1
```
**特点**：
- ✅ 性能极佳，查询速度最快
- ✅ 只读取一行数据
- ✅ 查询结果确定

**优化建议**：保持这种查询方式

#### 3. eq_ref（很优）⭐ 
**含义**：使用主键或唯一索引进行JOIN，每次只匹配一行
```sql
-- JOIN查询中的主键连接
EXPLAIN SELECT * FROM users u 
JOIN orders o ON u.id = o.user_id 
WHERE u.id = 123;
-- orders表: type: eq_ref
```
**特点**：
- ✅ JOIN性能优秀
- ✅ 每个索引只读取一行
- ✅ 通常出现在JOIN的右表

**优化建议**：这是JOIN的理想状态

#### 4. ref（良好）⭐
**含义**：使用非唯一索引或唯一索引的前缀匹配
```sql
-- 普通索引查询
EXPLAIN SELECT * FROM users WHERE name = '张三';
-- type: ref, rows: 10

-- 复合索引前缀匹配
EXPLAIN SELECT * FROM orders WHERE user_id = 123;
-- type: ref, rows: 15
```
**特点**：
- ✅ 性能良好，大多数查询的目标
- ⚠️ 可能返回多行
- ✅ 能有效利用索引

**优化建议**：
```sql
-- 如果rows过多，考虑添加更多条件
SELECT * FROM users WHERE name = '张三' AND city = '北京';
-- 或创建复合索引
CREATE INDEX idx_name_city ON users(name, city);
```

#### 5. fulltext（文本搜索）
**含义**：使用全文索引进行搜索
```sql
-- 全文搜索
EXPLAIN SELECT * FROM articles 
WHERE MATCH(title, content) AGAINST('MySQL优化' IN NATURAL LANGUAGE MODE);
-- type: fulltext
```

#### 6. ref_or_null（一般）
**含义**：类似ref，但包括NULL值的搜索
```sql
-- 包含NULL的查询
EXPLAIN SELECT * FROM users WHERE name = '张三' OR name IS NULL;
-- type: ref_or_null
```

#### 7. index_merge（需注意）
**含义**：使用多个索引进行查询，然后合并结果
```sql
-- 多个索引合并
EXPLAIN SELECT * FROM users WHERE name = '张三' OR age = 25;
-- type: index_merge
```
**优化建议**：
```sql
-- 考虑创建复合索引替代
CREATE INDEX idx_name_age ON users(name, age);
-- 或分别查询后在应用层合并
```

#### 8. range（可接受）
**含义**：索引范围扫描
```sql
-- 范围查询
EXPLAIN SELECT * FROM users WHERE age BETWEEN 18 AND 30;
-- type: range, rows: 1000

EXPLAIN SELECT * FROM orders WHERE created_at > '2024-01-01';
-- type: range, rows: 5000
```
**特点**：
- ⚠️ 扫描索引的一部分
- ⚠️ rows数值可能较大
- ✅ 比全表扫描好很多

**优化建议**：
```sql
-- 缩小范围
SELECT * FROM users WHERE age BETWEEN 20 AND 25;  -- 缩小年龄范围

-- 添加更多过滤条件
SELECT * FROM users WHERE age BETWEEN 18 AND 30 AND city = '北京';

-- 分页处理大结果集
SELECT * FROM orders WHERE created_at > '2024-01-01' LIMIT 100;
```

#### 9. index（较慢）⚠️
**含义**：全索引扫描，扫描整个索引树
```sql
-- 索引覆盖但需要全扫描
EXPLAIN SELECT id FROM users ORDER BY id;
-- type: index（虽然只扫描索引，但是全扫描）
```
**特点**：
- ❌ 扫描整个索引
- ⚠️ 比ALL稍好（因为索引比数据文件小）
- ❌ 性能仍然不理想

**优化建议**：
```sql
-- 添加WHERE条件
SELECT id FROM users WHERE status = 1 ORDER BY id;

-- 使用LIMIT限制结果
SELECT id FROM users ORDER BY id LIMIT 100;
```

#### 10. ALL（最慢）❌
**含义**：全表扫描，最坏的情况
```sql
-- 全表扫描的场景
EXPLAIN SELECT * FROM users WHERE YEAR(created_at) = 2024;
-- type: ALL, rows: 100000

EXPLAIN SELECT * FROM users WHERE description LIKE '%关键字%';
-- type: ALL, rows: 100000
```
**特点**：
- ❌ 扫描整个表
- ❌ 性能最差
- ❌ 随数据量增长线性下降

**紧急优化方案**：
```sql
-- 1. 避免函数操作
-- ❌ WHERE YEAR(created_at) = 2024
-- ✅ WHERE created_at >= '2024-01-01' AND created_at < '2025-01-01'

-- 2. 创建合适的索引
CREATE INDEX idx_created_at ON users(created_at);

-- 3. 重写查询逻辑
-- ❌ WHERE description LIKE '%关键字%'
-- ✅ 使用全文索引或搜索引擎

-- 4. 分页处理
SELECT * FROM users WHERE ... LIMIT 1000;  -- 限制返回数量
```

---

### EXTRA字段详解（执行细节）

#### 性能相关的Extra信息

#### ✅ 优秀的Extra信息

##### 1. Using index（覆盖索引）⭐
**含义**：查询只使用索引，无需访问数据行
```sql
-- 示例
CREATE INDEX idx_user_info ON users(id, name, age);
EXPLAIN SELECT id, name FROM users WHERE age = 25;
-- Extra: Using index
```
**优势**：
- 🚀 性能极佳，避免回表操作
- 💾 减少磁盘I/O
- ⚡ 速度比普通索引查询快2-3倍

**优化建议**：尽量设计覆盖索引

##### 2. Using index condition（索引条件下推）
**含义**：MySQL 5.6+特性，在索引层面过滤数据
```sql
EXPLAIN SELECT * FROM users WHERE name LIKE '张%' AND age > 18;
-- Extra: Using index condition
```
**优势**：减少回表次数，提高效率

#### ⚠️ 需要注意的Extra信息

##### 3. Using where
**含义**：使用WHERE条件过滤数据
```sql
EXPLAIN SELECT * FROM users WHERE age > 18 AND city = '北京';
-- Extra: Using where
```
**说明**：正常现象，但要关注是否能进一步优化索引

##### 4. Using join buffer（需优化）
**含义**：JOIN时使用了连接缓冲区
```sql
-- 没有合适索引的JOIN
EXPLAIN SELECT * FROM users u JOIN orders o ON u.name = o.user_name;
-- Extra: Using join buffer (Block Nested Loop)
```
**优化方案**：
```sql
-- 为JOIN字段创建索引
CREATE INDEX idx_user_name ON orders(user_name);
```

#### ❌ 性能问题的Extra信息

##### 5. Using filesort（文件排序）⚠️
**含义**：无法使用索引排序，需要额外的排序操作
```sql
-- 无索引排序
EXPLAIN SELECT * FROM users ORDER BY age DESC;
-- Extra: Using filesort, rows: 10000
```
**性能影响**：
- 🐌 需要额外的CPU和内存
- 📈 时间复杂度O(n log n)
- 💾 可能使用磁盘临时文件

**优化方案**：
```sql
-- 方案1：创建排序字段的索引
CREATE INDEX idx_age ON users(age);

-- 方案2：复合索引包含排序字段
CREATE INDEX idx_status_age ON users(status, age);
SELECT * FROM users WHERE status = 1 ORDER BY age;  -- 可以使用索引排序

-- 方案3：限制结果数量
SELECT * FROM users ORDER BY age DESC LIMIT 100;
```

##### 6. Using temporary（临时表）❌
**含义**：需要创建临时表来处理查询
```sql
-- GROUP BY字段与ORDER BY字段不同
EXPLAIN SELECT age, COUNT(*) FROM users GROUP BY age ORDER BY COUNT(*);
-- Extra: Using temporary; Using filesort

-- DISTINCT + ORDER BY不同字段
EXPLAIN SELECT DISTINCT name FROM users ORDER BY age;
-- Extra: Using temporary; Using filesort
```
**性能影响**：
- 🐌 创建临时表开销大
- 💾 消耗额外内存/磁盘空间
- ⏳ 增加执行时间

**优化方案**：
```sql
-- 方案1：统一GROUP BY和ORDER BY字段
SELECT age, COUNT(*) FROM users GROUP BY age ORDER BY age;

-- 方案2：创建覆盖索引
CREATE INDEX idx_name_age ON users(name, age);
SELECT DISTINCT name FROM users ORDER BY name;  -- 改为按name排序

-- 方案3：分步处理
-- 先GROUP BY得到结果，再在应用层排序
```

##### 7. Using where; Using temporary; Using filesort（最差）❌
**含义**：多个性能问题同时出现
```sql
-- 复杂查询示例
EXPLAIN SELECT department, AVG(salary) as avg_sal 
FROM employees 
WHERE hire_date > '2020-01-01' 
GROUP BY department 
ORDER BY avg_sal DESC;
-- Extra: Using where; Using temporary; Using filesort
```
**紧急优化**：
```sql
-- 创建复合索引
CREATE INDEX idx_hire_dept_salary ON employees(hire_date, department, salary);

-- 优化查询
SELECT department, AVG(salary) as avg_sal 
FROM employees 
WHERE hire_date > '2020-01-01' 
GROUP BY department 
ORDER BY department;  -- 改为按索引字段排序
```

#### 其他重要Extra信息

##### 8. Select tables optimized away
**含义**：优化器已经优化掉了某些表的访问
```sql
EXPLAIN SELECT MIN(id) FROM users;
-- Extra: Select tables optimized away
```
**说明**：这是好事，说明优化器很聪明

##### 9. No matching min/max row
**含义**：没有找到满足条件的行
```sql
EXPLAIN SELECT MIN(age) FROM users WHERE age > 200;
-- Extra: No matching min/max row
```

##### 10. Impossible WHERE
**含义**：WHERE条件不可能为真
```sql
EXPLAIN SELECT * FROM users WHERE 1 = 0;
-- Extra: Impossible WHERE
```

---

### 实战案例分析

#### 案例1：订单查询优化

```sql
-- 原始慢查询
EXPLAIN SELECT * FROM orders 
WHERE status IN ('pending', 'processing') 
AND created_at >= '2024-01-01' 
ORDER BY amount DESC 
LIMIT 20;

-- 可能的执行计划（优化前）
-- type: ALL, Extra: Using where; Using filesort, rows: 500000

-- 优化方案
CREATE INDEX idx_status_created_amount ON orders(status, created_at, amount);

-- 优化后的执行计划
-- type: range, Extra: Using index condition, rows: 1000
```

#### 案例2：JOIN查询优化

```sql
-- 慢JOIN查询
EXPLAIN SELECT u.name, COUNT(o.id) as order_count
FROM users u 
LEFT JOIN orders o ON u.id = o.user_id 
WHERE u.city = '北京'
GROUP BY u.id, u.name;

-- 优化前可能的问题：
-- users表: type: ALL, Extra: Using where
-- orders表: type: ALL, Extra: Using join buffer

-- 优化方案
CREATE INDEX idx_city ON users(city);
CREATE INDEX idx_user_id ON orders(user_id);

-- 进一步优化（覆盖索引）
CREATE INDEX idx_city_id_name ON users(city, id, name);
CREATE INDEX idx_user_id_count ON orders(user_id, id);
```

#### 案例3：分页查询优化

```sql
-- 深分页慢查询
EXPLAIN SELECT * FROM products 
WHERE category_id = 1 
ORDER BY created_at DESC 
LIMIT 50000, 20;

-- 问题：即使有索引，深分页仍然很慢
-- type: ref, Extra: Using filesort, rows: 50020

-- 优化方案1：使用游标分页
SELECT * FROM products 
WHERE category_id = 1 AND created_at < '2024-01-01 10:00:00'
ORDER BY created_at DESC 
LIMIT 20;

-- 优化方案2：创建覆盖索引
CREATE INDEX idx_category_created_cover ON products(category_id, created_at, id, name, price);

-- 优化方案3：延迟关联
SELECT p.* FROM products p
JOIN (
    SELECT id FROM products 
    WHERE category_id = 1 
    ORDER BY created_at DESC 
    LIMIT 50000, 20
) t ON p.id = t.id;
```

### 性能监控和告警

```sql
-- 1. 监控慢查询
SHOW VARIABLES LIKE 'slow_query_log%';
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 0.5;  -- 超过0.5秒记录

-- 2. 分析最慢的查询
SELECT 
    query_time, 
    lock_time, 
    rows_sent, 
    rows_examined,
    sql_text
FROM mysql.slow_log 
ORDER BY query_time DESC 
LIMIT 10;

-- 3. 监控全表扫描
SELECT 
    object_schema,
    object_name,
    count_read,
    sum_timer_read/1000000000 as read_time_sec
FROM performance_schema.table_io_waits_summary_by_table 
WHERE object_schema = 'your_database'
ORDER BY count_read DESC;

-- 4. 查找未使用的索引（定期清理）
SELECT 
    t.table_schema,
    t.table_name,
    t.index_name,
    t.non_unique,
    GROUP_CONCAT(t.column_name ORDER BY t.seq_in_index) as columns
FROM information_schema.statistics t
LEFT JOIN performance_schema.table_io_waits_summary_by_index_usage p 
    ON t.table_schema = p.object_schema 
    AND t.table_name = p.object_name 
    AND t.index_name = p.index_name
WHERE t.table_schema = 'your_database' 
    AND p.index_name IS NULL 
    AND t.index_name != 'PRIMARY'
GROUP BY t.table_schema, t.table_name, t.index_name, t.non_unique;
```

### EXPLAIN优化总结

#### 🎯 优化目标优先级
1. **type优化**：ALL → range → ref → const
2. **Extra优化**：消除Using temporary, Using filesort
3. **rows优化**：减少扫描行数
4. **key优化**：确保使用合适的索引

#### 🚨 紧急优化指标
- type = ALL 且 rows > 10000：立即优化
- Extra包含Using temporary：优先处理
- Extra包含Using filesort且rows > 1000：需要优化
- 查询时间 > 1秒：必须优化

#### ✅ 理想的执行计划
```sql
-- 理想的EXPLAIN输出
-- type: const/eq_ref/ref
-- key: 使用了合适的索引
-- rows: 数值较小
-- Extra: Using index（最理想）
```

---

## 常见索引问题

### 1. 索引失效问题

#### 函数操作导致索引失效
```sql
-- ❌ 索引失效的查询
SELECT * FROM users WHERE YEAR(created_at) = 2024;
SELECT * FROM users WHERE UPPER(name) = 'ZHANG';
SELECT * FROM orders WHERE amount + tax > 1000;

-- ✅ 索引有效的查询
SELECT * FROM users WHERE created_at >= '2024-01-01' AND created_at < '2025-01-01';
SELECT * FROM users WHERE name = 'zhang';  -- 假设存储时已标准化
SELECT * FROM orders WHERE amount > 1000 - tax;
```

#### 类型转换导致索引失效
```sql
-- ❌ 隐式类型转换
SELECT * FROM users WHERE phone = 13800138000;  -- phone是VARCHAR类型

-- ✅ 正确的查询
SELECT * FROM users WHERE phone = '13800138000';
```

#### LIKE查询优化
```sql
-- ❌ 前导通配符无法使用索引
SELECT * FROM users WHERE name LIKE '%张%';
SELECT * FROM users WHERE name LIKE '%三';

-- ✅ 前缀匹配可以使用索引
SELECT * FROM users WHERE name LIKE '张%';

-- ✅ 全文搜索替代方案
CREATE FULLTEXT INDEX idx_name_fulltext ON users(name);
SELECT * FROM users WHERE MATCH(name) AGAINST('张三' IN NATURAL LANGUAGE MODE);
```

### 2. 索引选择问题

#### MySQL选择错误索引
```sql
-- 查看可能的索引选择
EXPLAIN SELECT * FROM orders WHERE user_id = 1 AND status = 'pending';

-- 强制使用指定索引
SELECT * FROM orders FORCE INDEX(idx_user_id) 
WHERE user_id = 1 AND status = 'pending';

-- 忽略指定索引
SELECT * FROM orders IGNORE INDEX(idx_status) 
WHERE user_id = 1 AND status = 'pending';
```

#### 索引选择性分析
```sql
-- 分析字段的选择性
SELECT 
    COUNT(DISTINCT status) / COUNT(*) AS status_selectivity,
    COUNT(DISTINCT user_id) / COUNT(*) AS user_id_selectivity
FROM orders;

-- 选择性高的字段更适合创建索引
-- 一般来说，选择性 > 0.1 的字段适合创建索引
```

### 3. 索引维护问题

#### 重复索引检测
```sql
-- 检测重复索引
SELECT 
    table_schema,
    table_name,
    index_name,
    GROUP_CONCAT(column_name ORDER BY seq_in_index) AS columns
FROM information_schema.statistics 
WHERE table_schema = 'your_database'
GROUP BY table_schema, table_name, index_name
HAVING COUNT(*) > 1;
```

#### 无用索引检测
```sql
-- 查找从未使用的索引
SELECT 
    t.table_schema,
    t.table_name,
    t.index_name
FROM information_schema.statistics t
LEFT JOIN performance_schema.table_io_waits_summary_by_index_usage p 
    ON t.table_schema = p.object_schema 
    AND t.table_name = p.object_name 
    AND t.index_name = p.index_name
WHERE t.table_schema = 'your_database' 
    AND p.index_name IS NULL
    AND t.index_name != 'PRIMARY';
```

---

## 实际应用场景

### 电商系统索引设计

#### 用户表优化
```sql
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    status TINYINT DEFAULT 1,
    
    -- 索引设计
    UNIQUE INDEX idx_username (username),           -- 登录查询
    UNIQUE INDEX idx_email (email),                 -- 邮箱登录
    INDEX idx_phone (phone),                        -- 手机号查询
    INDEX idx_status_created (status, created_at),  -- 用户统计
    INDEX idx_last_login (last_login)               -- 活跃用户分析
);
```

#### 商品表优化
```sql
CREATE TABLE products (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(200) NOT NULL,
    category_id INT NOT NULL,
    brand_id INT,
    price DECIMAL(10,2) NOT NULL,
    stock INT DEFAULT 0,
    status TINYINT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- 索引设计
    INDEX idx_category_status (category_id, status),    -- 分类浏览
    INDEX idx_brand_status (brand_id, status),          -- 品牌筛选
    INDEX idx_price_status (price, status),             -- 价格排序
    INDEX idx_name_status (name, status),               -- 商品搜索
    INDEX idx_stock (stock),                            -- 库存管理
    FULLTEXT INDEX idx_name_fulltext (name)             -- 全文搜索
);

-- 查询优化示例
-- 分类商品列表（使用idx_category_status）
SELECT id, name, price FROM products 
WHERE category_id = 1 AND status = 1 
ORDER BY price DESC;

-- 价格区间查询（使用idx_price_status）
SELECT id, name, price FROM products 
WHERE price BETWEEN 100 AND 500 AND status = 1;
```

#### 订单表优化
```sql
CREATE TABLE orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    order_no VARCHAR(50) NOT NULL,
    status TINYINT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- 索引设计
    UNIQUE INDEX idx_order_no (order_no),                    -- 订单号查询
    INDEX idx_user_created (user_id, created_at),            -- 用户订单历史
    INDEX idx_status_created (status, created_at),           -- 订单管理
    INDEX idx_created_status (created_at, status),           -- 时间统计
    INDEX idx_amount (amount)                                -- 金额统计
);
```

### 日志系统索引设计

#### 访问日志表
```sql
CREATE TABLE access_logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    ip VARCHAR(45),
    url VARCHAR(500),
    method VARCHAR(10),
    status_code INT,
    response_time INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- 索引设计（考虑数据量大和查询模式）
    INDEX idx_user_created (user_id, created_at),           -- 用户行为分析
    INDEX idx_ip_created (ip, created_at),                  -- IP分析
    INDEX idx_created_status (created_at, status_code),     -- 错误日志分析
    INDEX idx_url_prefix (url(50))                          -- URL分析（前缀索引）
);

-- 分区表优化（按时间分区）
CREATE TABLE access_logs_partitioned (
    -- 字段定义...
) PARTITION BY RANGE (YEAR(created_at)) (
    PARTITION p2023 VALUES LESS THAN (2024),
    PARTITION p2024 VALUES LESS THAN (2025),
    PARTITION p2025 VALUES LESS THAN (2026)
);
```

### 金融系统索引设计

#### 交易记录表
```sql
CREATE TABLE transactions (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    account_id INT NOT NULL,
    transaction_type TINYINT NOT NULL,  -- 1:收入 2:支出
    amount DECIMAL(15,2) NOT NULL,
    balance DECIMAL(15,2) NOT NULL,
    description VARCHAR(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- 索引设计（金融数据要求高性能和准确性）
    INDEX idx_account_created (account_id, created_at),      -- 账户流水
    INDEX idx_account_type_created (account_id, transaction_type, created_at),  -- 收支分析
    INDEX idx_amount_created (amount, created_at),           -- 大额交易监控
    INDEX idx_created_type (created_at, transaction_type)    -- 系统交易统计
);
```

---

## 索引监控与维护

### 索引使用情况监控

```sql
-- 1. 查看索引使用统计
SELECT 
    OBJECT_SCHEMA AS '数据库',
    OBJECT_NAME AS '表名',
    INDEX_NAME AS '索引名',
    COUNT_FETCH AS '读取次数',
    COUNT_INSERT AS '插入次数',
    COUNT_UPDATE AS '更新次数',
    COUNT_DELETE AS '删除次数'
FROM performance_schema.table_io_waits_summary_by_index_usage 
WHERE OBJECT_SCHEMA = 'your_database'
ORDER BY COUNT_FETCH DESC;

-- 2. 查看未使用的索引
SELECT 
    s.TABLE_SCHEMA AS '数据库',
    s.TABLE_NAME AS '表名',
    s.INDEX_NAME AS '索引名',
    GROUP_CONCAT(s.COLUMN_NAME ORDER BY s.SEQ_IN_INDEX) AS '索引字段'
FROM information_schema.STATISTICS s
LEFT JOIN performance_schema.table_io_waits_summary_by_index_usage t 
    ON s.TABLE_SCHEMA = t.OBJECT_SCHEMA 
    AND s.TABLE_NAME = t.OBJECT_NAME 
    AND s.INDEX_NAME = t.INDEX_NAME
WHERE s.TABLE_SCHEMA = 'your_database' 
    AND t.INDEX_NAME IS NULL 
    AND s.INDEX_NAME != 'PRIMARY'
GROUP BY s.TABLE_SCHEMA, s.TABLE_NAME, s.INDEX_NAME;
```

### 索引空间占用分析

```sql
-- 查看索引占用空间
SELECT 
    TABLE_SCHEMA AS '数据库',
    TABLE_NAME AS '表名',
    INDEX_NAME AS '索引名',
    ROUND(STAT_VALUE * @@innodb_page_size / 1024 / 1024, 2) AS '大小(MB)'
FROM information_schema.INNODB_SYS_INDEXES i
JOIN information_schema.INNODB_SYS_TABLESTATS t ON i.TABLE_ID = t.TABLE_ID
WHERE i.TABLE_ID IN (
    SELECT TABLE_ID FROM information_schema.INNODB_SYS_TABLES 
    WHERE NAME LIKE 'your_database/%'
)
ORDER BY STAT_VALUE DESC;
```

### 索引维护操作

#### 重建索引
```sql
-- 重建表（包括所有索引）
OPTIMIZE TABLE users;

-- 分析表统计信息
ANALYZE TABLE users;

-- 重建特定索引
ALTER TABLE users DROP INDEX idx_name, ADD INDEX idx_name(name);
```

#### 索引碎片处理
```sql
-- 查看表碎片信息
SELECT 
    TABLE_SCHEMA,
    TABLE_NAME,
    ROUND(DATA_LENGTH/1024/1024, 2) AS 'Data(MB)',
    ROUND(INDEX_LENGTH/1024/1024, 2) AS 'Index(MB)',
    ROUND(DATA_FREE/1024/1024, 2) AS 'Free(MB)',
    ROUND(DATA_FREE/(DATA_LENGTH+INDEX_LENGTH)*100, 2) AS 'Fragment%'
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'your_database' 
    AND DATA_FREE > 0
ORDER BY Fragment% DESC;

-- 清理碎片
OPTIMIZE TABLE users;  -- 会锁表，建议在低峰期执行
```

---

## 最佳实践总结

### ✅ 索引设计原则

#### 1. 选择合适的字段
```sql
-- ✅ 推荐创建索引的场景
CREATE INDEX idx_where_field ON table(where_condition_field);     -- WHERE条件字段
CREATE INDEX idx_join_field ON table(join_condition_field);       -- JOIN连接字段
CREATE INDEX idx_order_field ON table(order_by_field);            -- ORDER BY字段
CREATE INDEX idx_group_field ON table(group_by_field);            -- GROUP BY字段
```

#### 2. 复合索引设计
```sql
-- ✅ 字段顺序：选择性高 -> 选择性低
-- ✅ 字段顺序：等值查询 -> 范围查询
CREATE INDEX idx_status_created ON orders(status, created_at);    -- status等值，created_at范围

-- ✅ 考虑查询覆盖
CREATE INDEX idx_user_cover ON orders(user_id, status, amount, created_at);
```

#### 3. 索引数量控制
```sql
-- 一般建议：
-- 📊 单表索引数量 < 10个
-- 📊 复合索引字段数 < 5个
-- 📊 索引总大小 < 表数据大小的30%
```

### ❌ 避免的常见错误

#### 1. 过度索引
```sql
-- ❌ 避免：为每个字段都创建索引
-- ❌ 避免：创建大量重复或冗余索引
-- ❌ 避免：在频繁更新的字段上创建过多索引
```

#### 2. 索引失效
```sql
-- ❌ 避免在索引字段上使用函数
SELECT * FROM users WHERE UPPER(name) = 'ZHANG';

-- ❌ 避免隐式类型转换
SELECT * FROM users WHERE age = '25';  -- age是INT类型

-- ❌ 避免前导通配符
SELECT * FROM users WHERE name LIKE '%张%';
```

### 🎯 性能优化技巧

#### 1. 查询优化
```sql
-- ✅ 使用LIMIT限制返回行数
SELECT * FROM users WHERE status = 1 LIMIT 100;

-- ✅ 避免SELECT *，只查询需要的字段
SELECT id, name, email FROM users WHERE status = 1;

-- ✅ 使用覆盖索引避免回表
CREATE INDEX idx_cover ON users(status, id, name, email);
```

#### 2. 批量操作优化
```sql
-- ✅ 批量插入优化
INSERT INTO users (name, email) VALUES 
('user1', 'email1'), ('user2', 'email2'), ('user3', 'email3');

-- ✅ 批量更新时禁用索引（大量数据）
ALTER TABLE users DISABLE KEYS;
-- 执行大量更新操作
ALTER TABLE users ENABLE KEYS;
```

### 📊 监控和维护

#### 定期检查清单
```sql
-- 1. 每周检查慢查询日志
SHOW VARIABLES LIKE 'slow_query_log%';

-- 2. 每月分析索引使用情况
-- （使用前面提到的监控SQL）

-- 3. 每季度优化表和索引
OPTIMIZE TABLE table_name;
ANALYZE TABLE table_name;

-- 4. 根据业务变化调整索引
-- 删除无用索引，添加新需求索引
```

### 🔧 实用工具和命令

```sql
-- 索引分析工具
EXPLAIN SELECT ...;                    -- 执行计划分析
EXPLAIN FORMAT=JSON SELECT ...;       -- 详细JSON格式分析
SHOW PROFILE FOR QUERY 1;             -- 查询性能分析

-- 索引管理命令
SHOW INDEX FROM table_name;           -- 查看表索引
ANALYZE TABLE table_name;             -- 更新索引统计信息
OPTIMIZE TABLE table_name;            -- 优化表和索引

-- 性能监控
SHOW PROCESSLIST;                     -- 查看当前执行的查询
SHOW ENGINE INNODB STATUS;           -- 查看InnoDB状态
```

---

## 总结

### 🎯 核心要点记忆

1. **索引本质**：用空间换时间的数据结构，提高查询效率
2. **B+Tree**：MySQL默认索引类型，适用于大多数场景
3. **复合索引**：遵循最左前缀原则，字段顺序很重要
4. **覆盖索引**：避免回表操作，提升查询性能
5. **适度原则**：不是越多越好，要平衡查询和更新性能

### 📈 学习建议

- **理论结合实践**：在实际项目中应用所学知识
- **监控和分析**：定期检查索引使用情况和性能
- **持续优化**：根据业务发展调整索引策略
- **深入学习**：了解存储引擎原理和底层实现

---

*掌握MySQL索引优化是数据库性能调优的核心技能。通过合理的索引设计和持续的性能监控，可以让数据库在高并发场景下依然保持优秀的性能表现！* 