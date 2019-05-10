import { Logger } from '../../logger';

const logger = new Logger('MessageMarkAsUnread', {
	sections: {
		connection: 'Connection',
		events: 'Events',
	},
});
export default logger;
