
# zhiaiwan-eventhub

一个轻量、高效、功能丰富的 TypeScript 事件调度工具，适用于前端组件通信、插件架构、状态管理等各种场景。

## 🧩 介绍

`zhiaiwan-eventhub` 提供灵活的事件管理机制，支持事件注册、取消、优先级、通配符监听、异步触发等特性，适合用于构建可扩展、低耦合的系统架构。

## 🚀 特性

- ✅ 支持事件监听 / 取消 / 一次性监听
- ✅ 支持通配符事件（`*`）
- ✅ 支持事件优先级（priority）
- ✅ 支持异步执行监听器
- ✅ 支持重置、事件存在性检查等辅助功能
- ✅ 支持单例模式及命名空间
- ✅ 支持调试模式输出事件信息

---

## 📦 安装方式

将 `eventhub.ts` 和 `types.ts` 文件复制到你的项目中并引入：

```javascript
import { eventHub } from "zhiaiwan-eventhub";
```

#### CJS

```javascript
const { eventHub } = require("zhiaiwan-eventhub");
```

#### 浏览器中

```html
<script src="./node_modules/zhiaiwan-eventhub/dist/umd/index.js"></script>
<script>
  console.log(eventHub);
</script>
```
---

## 🛠 使用示例


### 创建实例

```ts
const hub = new EventHub();


```

## 直接使用全局的单例

```javascript
import { eventHub } from "zhiaiwan-eventhub";
const hub = eventHub;
```

### 事件调度

```ts
hub.on('login', (user) => {
  console.log('User logged in:', user);
});

hub.emit('login', { id: 1, name: 'Alice' });
```

### 一次性监听

```ts
hub.once('logout', () => {
  console.log('User logged out (only once)');
});
```

### 监听所有事件（通配符）

```ts
hub.on('*', (eventName, ...args) => {
  console.log(`Event "${eventName}" triggered with args:`, args);
});
```

### 设置监听器优先级

```ts
hub.on('message', (msg) => console.log('Low priority:', msg), null, 1);
hub.on('message', (msg) => console.log('High priority:', msg), null, 10);

hub.emit('message', 'Hello World');
```

---

## 📚 API 详解

### 构造函数

```ts
new EventHub(options?: EventHubOptions)
```

**EventHubOptions 可选项：**

| 参数名         | 类型      | 默认值  | 描述                           |
|----------------|-----------|---------|--------------------------------|
| `maxListeners` | number    | 10      | 每个事件允许的最大监听器数量   |
| `wildcard`     | boolean   | true    | 是否允许 `*` 通配符监听         |
| `enableAsync`  | boolean   | true    | 是否异步触发监听器              |
| `debug`        | boolean   | false   | 是否开启调试日志输出            |
| `namespace`    | string?   | -       | 可选命名空间用于标识事件系统    |

---

### 实例方法

| 方法 | 描述 |
|------|------|
| `on(event, handler, context?, priority?)` | 监听事件 |
| `once(event, handler, context?, priority?)` | 一次性监听事件 |
| `off(event?, handler?)` | 取消事件监听，参数为空时移除全部 |
| `emit(event, ...args)` | 触发事件 |
| `hasEvent(event)` | 判断是否监听某个事件 |
| `listenerCount(event)` | 获取某个事件监听器数量 |
| `eventNames()` | 获取所有已注册的事件名 |
| `reset()` | 重置事件中心（清除全部事件） |
| `static Instance(Fn)` | 单例封装器，用于获取单例实例 |

---

## 🌈 使用场景

### 1. 前端组件通信

可用于组件之间松耦合通信，替代 props 层层传递或全局状态污染：

```ts
hub.on('theme-change', (newTheme) => {
  applyTheme(newTheme);
});
```

### 2. 插件系统

作为插件注册机制的核心，可支持插件挂载、卸载、扩展通信等：

```ts
hub.on('plugin:load', (plugin) => {
  plugin.init();
});
```

### 3. 跨模块消息总线

适用于前端模块化架构中作为全局消息中枢使用：

```ts
hub.emit('app:ready');
```

### 4. 状态管理补充机制

配合状态管理库（如 Redux、Pinia）用于广播式状态同步或操作通知。

### 5. 异步任务调度

利用异步事件触发机制执行异步逻辑并集中管理监听器。

---

## 🧠 设计理念

- **模块解耦**：通过事件机制减少模块之间直接依赖。
- **可维护性**：事件注册与注销明确，支持自动清理与一次性触发。
- **性能优先**：使用 Map 与优先队列优化事件处理性能。
- **灵活扩展**：通过通配符、优先级、上下文绑定等能力扩展性强。

---

## 🧪 测试建议

建议覆盖以下功能点：

- 注册与触发事件
- 一次性监听逻辑验证
- 优先级顺序正确性
- 通配符事件处理
- 异步触发的执行时序

---

## 📄 License

MIT License

---

## 🔄 异步事件调用机制详解

`EventHub` 默认启用了异步事件触发（`enableAsync: true`），这意味着监听器函数会在 `Promise.resolve().then(...)` 的微任务队列中异步执行。

### 示例说明

```ts
const hub = new EventHub({ enableAsync: true });

hub.on('data', (value) => {
  console.log('Handler 1', value);
});

console.log('Before emit');
hub.emit('data', 123);
console.log('After emit');
```

### 控制台输出顺序：

```
Before emit
After emit
Handler 1 123
```

> 如果希望事件立即同步触发，可将 `enableAsync: false`。

```ts
const syncHub = new EventHub({ enableAsync: false });
```

### 多监听器的异步顺序控制

监听器按优先级倒序排列，异步执行时也会保持该顺序：

```ts
hub.on('task', () => console.log('priority 1'), null, 1);
hub.on('task', () => console.log('priority 10'), null, 10);

hub.emit('task');
```

输出顺序为：

```
priority 10
priority 1
```

---

## 🧩 命名空间与调试模式说明

在多实例、调试场景中可以启用命名空间与调试标志：

```ts
const hub = new EventHub({ namespace: 'MyApp', debug: true });
```

开启后将自动在控制台输出调试信息：

```
[EventHub:MyApp] emit login args: [...]
```

这对于调试复杂事件流非常有用。

---

## 📦 types.ts 类型定义参考

确保你也引入以下类型定义文件，提供类型友好支持：

```ts
export interface EventHubOptions {
  maxListeners?: number;
  wildcard?: boolean;
  enableAsync?: boolean;
  debug?: boolean;
  namespace?: string;
}

export interface EventHandler {
  fn: Function;
  ctx?: any;
  once: boolean;
  priority: number;
}
```

你可以将其放在 `types.ts` 文件中引入：

```ts
import { EventHubOptions } from './types';
```

---
