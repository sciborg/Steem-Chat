import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random';
import { Messages, Users, Subscriptions } from '../../../models';
import { Notifications } from '../../../notifications';
import { updateMessage } from '../../../lib/server/functions/updateMessage';

export class AppMessageBridge {
	constructor(orch) {
		this.orch = orch;
	}

	async create(message, appId) {
		this.orch.debugLog(`The App ${ appId } is creating a new message.`);

		let msg = this.orch.getConverters().get('messages').convertAppMessage(message);

		Meteor.runAsUser(msg.u._id, () => {
			msg = Meteor.call('sendMessage', msg);
		});

		return msg._id;
	}

	async getById(messageId, appId) {
		this.orch.debugLog(`The App ${ appId } is getting the message: "${ messageId }"`);

		return this.orch.getConverters().get('messages').convertById(messageId);
	}

	async update(message, appId) {
		this.orch.debugLog(`The App ${ appId } is updating a message.`);

		if (!message.editor) {
			throw new Error('Invalid editor assigned to the message for the update.');
		}

		if (!message.id || !Messages.findOneById(message.id)) {
			throw new Error('A message must exist to update.');
		}

		const msg = this.orch.getConverters().get('messages').convertAppMessage(message);
		const editor = Users.findOneById(message.editor.id);

		updateMessage(msg, editor);
	}

	async notifyUser(user, message, appId) {
		this.orch.debugLog(`The App ${ appId } is notifying a user.`);

		const msg = this.orch.getConverters().get('messages').convertAppMessage(message);

		Notifications.notifyUser(user.id, 'message', Object.assign(msg, {
			_id: Random.id(),
			ts: new Date(),
			u: undefined,
			editor: undefined,
		}));
	}

	async notifyRoom(room, message, appId) {
		this.orch.debugLog(`The App ${ appId } is notifying a room's users.`);

		if (room) {
			const msg = this.orch.getConverters().get('messages').convertAppMessage(message);
			const rmsg = Object.assign(msg, {
				_id: Random.id(),
				rid: room.id,
				ts: new Date(),
				u: undefined,
				editor: undefined,
			});

			const users = Subscriptions.findByRoomIdWhenUserIdExists(room._id, { fields: { 'u._id': 1 } })
				.fetch()
				.map((s) => s.u._id);
			Users.findByIds(users, { fields: { _id: 1 } })
				.fetch()
				.forEach(({ _id }) =>
					Notifications.notifyUser(_id, 'message', rmsg)
				);
		}
	}
}
