import { Meteor } from 'meteor/meteor';
import { Settings } from '../../../models';
import { hasPermission } from '../../../authorization';
import { Notifications } from '../../../notifications';

Meteor.methods({
	'public-settings/get'(updatedAt) {
		const records = Settings.findNotHiddenPublic().fetch();

		if (updatedAt instanceof Date) {
			return {
				update: records.filter(function(record) {
					return record._updatedAt > updatedAt;
				}),
				remove: Settings.trashFindDeletedAfter(updatedAt, {
					hidden: {
						$ne: true,
					},
					public: true,
				}, {
					fields: {
						_id: 1,
						_deletedAt: 1,
					},
				}).fetch(),
			};
		}
		return records;
	},
	'private-settings/get'(updatedAfter) {
		if (!Meteor.userId()) {
			return [];
		}
		if (!hasPermission(Meteor.userId(), 'view-privileged-setting')) {
			return [];
		}

		if (!(updatedAfter instanceof Date)) {
			return Settings.findNotHidden().fetch();
		}

		const records = Settings.findNotHidden({ updatedAfter }).fetch();
		return {
			update: records,
			remove: Settings.trashFindDeletedAfter(updatedAfter, {
				hidden: {
					$ne: true,
				},
			}, {
				fields: {
					_id: 1,
					_deletedAt: 1,
				},
			}).fetch(),
		};
	},
});

Settings.on('change', ({ clientAction, id, data, diff }) => {
	if (diff && Object.keys(diff).length === 1 && diff._updatedAt) { // avoid useless changes
		return;
	}
	switch (clientAction) {
		case 'updated':
		case 'inserted': {
			const setting = data || Settings.findOneById(id);
			const value = {
				_id: setting._id,
				value: setting.value,
				editor: setting.editor,
				properties: setting.properties,
			};

			if (setting.public === true) {
				Notifications.notifyAllInThisInstance('public-settings-changed', clientAction, value);
			}
			Notifications.notifyLoggedInThisInstance('private-settings-changed', clientAction, setting);
			break;
		}

		case 'removed': {
			const setting = data || Settings.findOneById(id, { fields: { public: 1 } });

			if (setting && setting.public === true) {
				Notifications.notifyAllInThisInstance('public-settings-changed', clientAction, { _id: id });
			}
			Notifications.notifyLoggedInThisInstance('private-settings-changed', clientAction, { _id: id });
			break;
		}
	}
});

Notifications.streamAll.allowRead('private-settings-changed', function() {
	if (this.userId == null) {
		return false;
	}
	return hasPermission(this.userId, 'view-privileged-setting');
});
