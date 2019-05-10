import { t } from '../../../app/utils';
import { modal, MessageAction } from '../../../app/ui-utils';
import { messageArgs } from '../../../app/ui-utils/client/lib/messageArgs';
import { settings } from '../../../app/settings';

MessageAction.addButton({
	id: 'receipt-detail',
	icon: 'info-circled',
	label: 'Info',
	context: ['starred', 'message', 'message-mobile'],
	action() {
		const { msg: message } = messageArgs(this);
		modal.open({
			title: t('Info'),
			content: 'readReceipts',
			data: {
				messageId: message._id,
			},
			showConfirmButton: true,
			showCancelButton: false,
			confirmButtonText: t('Close'),
		});
	},
	condition() {
		return settings.get('Message_Read_Receipt_Store_Users');
	},
	order: 10,
	group: 'menu',
});
