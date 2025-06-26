export * from './utils';
export * from './eventhub';

import eventhub from './eventhub';
import utils from './utils';
export default {
	...utils,
	...eventhub,
};
