export const getDataType = (obj: unknown): string => {
	return Object.prototype.toString.call(obj).slice(8, -1);
};

export const isArray = (value: unknown): value is any[] => {
	return getDataType(value) === 'Array';
};

export const isDate = (value: unknown): value is Date => {
	return getDataType(value) === 'Date';
};

/**
 * 检查一个值是否为空对象
 * @param obj 要检查的值
 * @returns 如果是空对象返回 true，否则返回 false
 *
 * 类型谓词 `obj is Record<string, never>` 帮助 TypeScript 在条件判断后
 * 正确推断出变量的类型
 */
export const isEmptyObject = (obj: unknown): obj is Record<string, never> => {
	// 检查 null 和 undefined
	if (obj == null) {
		return false;
	}

	// 检查是否是对象类型（包括数组、日期等）
	if (typeof obj !== 'object') {
		return false;
	}

	// 排除数组、日期、正则表达式等特殊对象
	if (
		Array.isArray(obj) ||
		obj instanceof Date ||
		obj instanceof RegExp ||
		obj instanceof Map ||
		obj instanceof Set
	) {
		return false;
	}

	// 检查是否是空对象
	return Object.getOwnPropertyNames(obj).length === 0;
};

export default {};
