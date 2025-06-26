import type {
	EventHandler,
	EventHubOptions,
	Listener,
	WildcardEventHandler,
} from './types';

export class EventHub {
	private events: Map<string, Listener[]> = new Map();
	private wildcardListeners: Listener[] = [];
	private maxListeners: number;
	private wildcardEnabled: boolean;
	private asyncEnabled: boolean;
	private debugMode: boolean;
	private namespace?: string;

	constructor(options: EventHubOptions = {}) {
		this.maxListeners = options.maxListeners ?? 10;
		this.wildcardEnabled = options.wildcard ?? true;
		this.asyncEnabled = options.enableAsync ?? true;
		this.debugMode = options.debug ?? false;
		this.namespace = options.namespace;
	}

	// ================== 单例模式 ==================

	static Instance(Fn: any) {
		if (!Fn._instance) {
			Object.defineProperty(Fn, '_instance', {
				value: new Fn(),
			});
		}
		return Fn._instance;
	}

	// ================== 新增功能 ==================

	/**
	 * 重置调度中心（清理所有注册）
	 * @returns 当前EventHub实例
	 */
	reset(): this {
		this.events.clear();
		this.wildcardListeners = [];
		return this;
	}

	/**
	 * 判断事件是否被订阅
	 * @param event 事件名称
	 * @returns 是否有监听器
	 */
	hasEvent(event: string): boolean {
		if (event === '*' && this.wildcardEnabled) {
			return this.wildcardListeners.length > 0;
		}
		return this.events.has(event);
	}

	/**
	 * 获取事件监听器数量
	 * @param event 事件名称
	 * @returns 监听器数量
	 */
	listenerCount(event: string): number {
		if (event === '*' && this.wildcardEnabled) {
			return this.wildcardListeners.length;
		}

		const listeners = this.events.get(event);
		return listeners ? listeners.length : 0;
	}

	/**
	 * 获取所有事件名称
	 * @returns 事件名称数组
	 */
	eventNames(): string[] {
		return Array.from(this.events.keys());
	}

	// ================== 核心功能 ==================

	/**
	 * 订阅事件
	 * @param event 事件名称
	 * @param handler 事件处理函数
	 * @param context 上下文对象
	 * @param priority 优先级（数字越大优先级越高）
	 * @returns 当前EventHub实例
	 */
	on(event: string, handler: EventHandler, context?: any, priority = 0): this {
		return this.addListener(event, handler, false, context, priority);
	}

	/**
	 * 订阅一次性事件
	 * @param event 事件名称
	 * @param handler 事件处理函数
	 * @param context 上下文对象
	 * @param priority 优先级（数字越大优先级越高）
	 * @returns 当前EventHub实例
	 */
	once(
		event: string,
		handler: EventHandler,
		context?: any,
		priority = 0,
	): this {
		return this.addListener(event, handler, true, context, priority);
	}

	/**
	 * 取消订阅事件
	 * @param event 事件名称
	 * @param handler 要移除的事件处理函数（可选）
	 * @returns 当前EventHub实例
	 */
	off(event?: string, handler?: EventHandler): this {
		if (event === undefined) {
			return this.reset();
		}

		if (event === '*' && this.wildcardEnabled) {
			if (handler) {
				this.wildcardListeners = this.wildcardListeners.filter(
					(listener) => listener.handler !== handler,
				);
			} else {
				this.wildcardListeners = [];
			}
			return this;
		}

		if (handler) {
			const listeners = this.events.get(event);
			if (listeners) {
				this.events.set(
					event,
					listeners.filter((listener) => listener.handler !== handler),
				);
			}
		} else {
			this.events.delete(event);
		}

		return this;
	}

	/**
	 * 触发事件
	 * @param event 事件名称
	 * @param args 传递给事件处理函数的参数
	 * @returns Promise，在所有处理函数完成后resolve
	 */
	async emit(event: string, ...args: any[]): Promise<boolean> {
		// 处理通配符监听器
		const wildcardPromise = this.wildcardEnabled
			? this.processWildcardListeners(event, ...args)
			: Promise.resolve();

		// 处理特定事件监听器
		const specificPromise = this.processSpecificListeners(event, ...args);

		// 等待所有异步处理完成
		if (this.asyncEnabled) {
			await Promise.all([wildcardPromise, specificPromise]);
		} else {
			await wildcardPromise;
			await specificPromise;
		}
		return true;
	}

	// ================== 辅助功能 ==================

	/**
	 * 设置最大监听器数量
	 * @param n 最大监听器数量
	 * @returns 当前EventHub实例
	 */
	setMaxListeners(n: number): this {
		this.maxListeners = n;
		return this;
	}

	/**
	 * 创建命名空间
	 * @param namespace 命名空间名称
	 * @returns 新的EventHub实例
	 */
	createNamespace(namespace: string): EventHub {
		return new EventHub({
			maxListeners: this.maxListeners,
			wildcard: this.wildcardEnabled,
			enableAsync: this.asyncEnabled,
			debug: this.debugMode,
			namespace,
		});
	}

	// ================== 私有方法 ==================

	private addListener(
		event: string,
		handler: EventHandler | WildcardEventHandler,
		once: boolean,
		context?: any,
		priority = 0,
	): this {
		// 检查通配符支持
		if (event === '*' && !this.wildcardEnabled) {
			return this;
		}

		// 检查监听器数量限制
		const currentCount = this.getTotalListenerCount();
		if (currentCount >= this.maxListeners) {
			this.log(
				`MaxListenersExceededWarning: Possible EventHub memory leak detected. 
        Current limit is ${this.maxListeners} listeners. 
        Use setMaxListeners() to increase limit`,
				'warn',
			);
		}

		const listener: Listener = {
			handler,
			once,
			priority,
			context,
		};
		if (event === '*') {
			// 通配符监听器
			this.insertListenerByPriority(this.wildcardListeners, listener);
		} else {
			// 特定事件监听器
			if (!this.events.has(event)) {
				this.events.set(event, []);
			}
			const listeners = this.events.get(event) || [];
			this.insertListenerByPriority(listeners, listener);
		}

		return this;
	}

	private insertListenerByPriority(
		listeners: Listener[],
		newListener: Listener,
	): void {
		// 按优先级插入（优先级高的在前）
		const index = listeners.findIndex((l) => l.priority < newListener.priority);
		if (index === -1) {
			listeners.push(newListener);
		} else {
			listeners.splice(index, 0, newListener);
		}
	}

	private async processWildcardListeners(
		event: string,
		...args: any[]
	): Promise<void> {
		if (this.wildcardListeners.length === 0) return;

		// 复制数组以防在迭代过程中被修改
		const listeners = [...this.wildcardListeners];

		for (const listener of listeners) {
			try {
				// 调用处理函数，绑定上下文
				const result = listener.handler.call(
					listener.context || this,
					event,
					...args,
				);

				// 处理异步处理函数
				if (this.asyncEnabled && result instanceof Promise) {
					await result;
				}

				// 如果是一次性监听器，则移除
				if (listener.once) {
					this.wildcardListeners = this.wildcardListeners.filter(
						(l) => l !== listener,
					);
				}
			} catch (error) {
				// 触发错误事件
				this.handleError(error, event, listener.handler);
			}
		}
	}

	private async processSpecificListeners(
		event: string,
		...args: any[]
	): Promise<void> {
		const listeners = this.events.get(event);
		if (!listeners) return;

		// 复制数组以防在迭代过程中被修改
		const listenersCopy = [...listeners];

		for (const listener of listenersCopy) {
			try {
				// 调用处理函数，绑定上下文
				const result = (listener.handler as EventHandler).call(
					listener.context || this,
					...args,
				);

				// 处理异步处理函数
				if (this.asyncEnabled && result instanceof Promise) {
					await result;
				}

				// 如果是一次性监听器，则移除
				if (listener.once) {
					const currentListeners = this.events.get(event) || [];
					this.events.set(
						event,
						currentListeners.filter((l) => l !== listener),
					);
				}
			} catch (error) {
				// 触发错误事件
				this.handleError(error, event, listener.handler);
			}
		}
	}

	private handleError(error: any, event: string, handler: Function): void {
		// 如果有错误监听器，则触发
		if (this.events.has('error')) {
			this.emit('error', error, event, handler).catch(() => {});
		} else {
			// 否则输出到控制台
			this.log(
				`Unhandled error in listener for event "${event}": ${error}`,
				'error',
			);
		}
	}

	private log(
		message: string,
		level: 'log' | 'warn' | 'error' = 'log',
		...args: any[]
	): void {
		if (!this.debugMode) return;

		const prefix = `[EventHub${this.namespace ? `:${this.namespace}` : ''}]`;
		const fullMessage = `${prefix} ${message}`;

		switch (level) {
			case 'log':
				console.log(fullMessage, ...args);
				break;
			case 'warn':
				console.warn(fullMessage, ...args);
				break;
			case 'error':
				console.error(fullMessage, ...args);
				break;
		}
	}

	/**
	 * 获取当前所有监听器总数
	 * @returns 监听器总数
	 */
	private getTotalListenerCount(): number {
		let count = this.wildcardListeners.length;
		for (const listeners of this.events.values()) {
			count += listeners.length;
		}
		return count;
	}
}

// 导出单例实例
export const eventHub: EventHub = EventHub.Instance(EventHub);

// 导出类装饰器
export const decoratorEventHub: ClassDecorator = <TFunction extends Function>(
	target: TFunction,
) => {
	if (!target.prototype.eventHub) {
		target.prototype.eventHub = new EventHub();
	}
	return target;
};

// 默认导出
export default EventHub;
