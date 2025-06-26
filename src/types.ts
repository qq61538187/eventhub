export type EventHandler = (...args: any[]) => void | Promise<void>;

export type WildcardEventHandler = (
	event: string,
	...args: any[]
) => void | Promise<void>;

export interface Listener {
	handler: EventHandler | WildcardEventHandler;
	once: boolean;
	priority: number;
	context?: any;
}

export interface EventHubOptions {
	maxListeners?: number;
	wildcard?: boolean;
	enableAsync?: boolean;
	debug?: boolean;
	namespace?: string;
}
