import { Meteor } from 'meteor/meteor';
import { Tracker } from 'meteor/tracker';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { Session } from 'meteor/session';
import { Favico } from '../../app/favico';
import { ChatSubscription } from '../../app/models';
import { RoomManager, menu, fireGlobalEvent, readMessage } from '../../app/ui-utils';
import { getUserPreference } from '../../app/utils';
import { settings } from '../../app/settings';

Meteor.startup(function() {
	Tracker.autorun(function() {
		let unreadCount = 0;
		let unreadAlert = false;

		const subscriptions = ChatSubscription.find({ open: true, hideUnreadStatus: { $ne: true } }, { fields: { unread: 1, alert: 1, rid: 1, t: 1, name: 1, ls: 1, unreadAlert: 1 } });

		let openedRoomId = undefined;
		Tracker.nonreactive(function() {
			if (['channel', 'group', 'direct'].includes(FlowRouter.getRouteName())) {
				openedRoomId = Session.get('openedRoom');
			}
		});

		for (const subscription of subscriptions.fetch()) {
			fireGlobalEvent('unread-changed-by-subscription', subscription);

			if (subscription.alert || subscription.unread > 0) {
				// This logic is duplicated in /client/notifications/notification.coffee.
				const hasFocus = readMessage.isEnable();
				const subscriptionIsTheOpenedRoom = openedRoomId === subscription.rid;
				if (hasFocus && subscriptionIsTheOpenedRoom) {
					// The user has probably read all messages in this room.
					// TODO: readNow() should return whether it has actually marked the room as read.
					Meteor.setTimeout(function() {
						readMessage.readNow();
					}, 500);
				}

				// Increment the total unread count.
				unreadCount += subscription.unread;
				if (subscription.alert === true && subscription.unreadAlert !== 'nothing') {
					const userUnreadAlert = getUserPreference(Meteor.userId(), 'unreadAlert');
					if (subscription.unreadAlert === 'all' || userUnreadAlert !== false) {
						unreadAlert = '•';
					}
				}
			}

			if (RoomManager.openedRooms[subscription.t + subscription.name]) {
				readMessage.refreshUnreadMark(subscription.rid);
			}
		}

		menu.updateUnreadBars();

		if (unreadCount > 0) {
			if (unreadCount > 999) {
				Session.set('unread', '999+');
			} else {
				Session.set('unread', unreadCount);
			}
		} else if (unreadAlert !== false) {
			Session.set('unread', unreadAlert);
		} else {
			Session.set('unread', '');
		}
	});
});

Meteor.startup(function() {
	window.favico = new Favico({
		position: 'up',
		animation: 'none',
	});

	Tracker.autorun(function() {
		const siteName = settings.get('Site_Name') || '';

		const unread = Session.get('unread');
		fireGlobalEvent('unread-changed', unread);

		if (window.favico) {
			window.favico.badge(unread, {
				bgColor: typeof unread !== 'number' ? '#3d8a3a' : '#ac1b1b',
			});
		}

		document.title = unread === '' ? siteName : `(${ unread }) ${ siteName }`;
	});
});
