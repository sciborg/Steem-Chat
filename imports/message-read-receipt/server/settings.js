import { settings } from '../../../app/settings';

settings.add('Message_Read_Receipt_Enabled', false, {
	group: 'Message',
	type: 'boolean',
	public: true,
});

settings.add('Message_Read_Receipt_Store_Users', false, {
	group: 'Message',
	type: 'boolean',
	public: true,
	enableQuery: { _id: 'Message_Read_Receipt_Enabled', value: true },
});
