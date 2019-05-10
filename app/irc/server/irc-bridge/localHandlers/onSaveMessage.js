import { Subscriptions, Users } from '../../../../models';

export default function handleOnSaveMessage(message, to) {
	let toIdentification = '';
	// Direct message
	if (to.t === 'd') {
		const subscriptions = Subscriptions.findByRoomId(to._id);
		subscriptions.forEach((subscription) => {
			if (subscription.u.username !== to.username) {
				const userData = Users.findOne({ username: subscription.u.username });
				if (userData) {
					if (userData.profile && userData.profile.irc && userData.profile.irc.nick) {
						toIdentification = userData.profile.irc.nick;
					} else {
						toIdentification = userData.username;
					}
				} else {
					toIdentification = subscription.u.username;
				}
			}
		});

		if (!toIdentification) {
			console.error('[irc][server] Target user not found');
			return;
		}
	} else {
		toIdentification = `#${ to.name }`;
	}

	const user = Users.findOne({ _id: message.u._id });

	this.sendCommand('sentMessage', { to: toIdentification, user, message: message.msg });
}
