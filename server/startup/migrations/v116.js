import { Migrations } from '../../../app/migrations';
import { Subscriptions, Users } from '../../../app/models';

Migrations.add({
	version: 116,
	up() {
		Subscriptions.tryDropIndex({
			unread: 1,
		});

		// set pref origin to all existing preferences
		Subscriptions.update({
			desktopNotifications: { $exists: true },
		}, {
			$set: {
				desktopPrefOrigin: 'subscription',
			},
		}, {
			multi: true,
		});
		Subscriptions.update({
			mobilePushNotifications: { $exists: true },
		}, {
			$set: {
				mobilePrefOrigin: 'subscription',
			},
		}, {
			multi: true,
		});
		Subscriptions.update({
			emailNotifications: { $exists: true },
		}, {
			$set: {
				emailPrefOrigin: 'subscription',
			},
		}, {
			multi: true,
		});

		// set user preferences on subscriptions
		Users.find({
			$or: [
				{ 'settings.preferences.desktopNotifications': { $exists: true } },
				{ 'settings.preferences.mobileNotifications': { $exists: true } },
				{ 'settings.preferences.emailNotificationMode': { $exists: true } },
			],
		}).forEach((user) => {
			if (user.settings.preferences.desktopNotifications && user.settings.preferences.desktopNotifications !== 'default') {
				Subscriptions.update({
					'u._id': user._id,
					desktopPrefOrigin: { $exists: false },
				}, {
					$set: {
						desktopNotifications: user.settings.preferences.desktopNotifications,
						desktopPrefOrigin: 'user',
					},
				}, {
					multi: true,
				});
			}

			if (user.settings.preferences.mobileNotifications && user.settings.preferences.mobileNotifications !== 'default') {
				Subscriptions.update({
					'u._id': user._id,
					mobilePrefOrigin: { $exists: false },
				}, {
					$set: {
						mobileNotifications: user.settings.preferences.mobileNotifications,
						mobilePrefOrigin: 'user',
					},
				}, {
					multi: true,
				});
			}

			if (user.settings.preferences.emailNotificationMode && user.settings.preferences.emailNotificationMode !== 'default') {
				Subscriptions.update({
					'u._id': user._id,
					emailPrefOrigin: { $exists: false },
				}, {
					$set: {
						emailNotifications: user.settings.preferences.emailNotificationMode === 'disabled' || user.settings.preferences.emailNotificationMode === 'nothing' ? 'nothing' : 'mentions',
						emailPrefOrigin: 'user',
					},
				}, {
					multi: true,
				});
			}
		});
	},
});
