import { Meteor } from 'meteor/meteor';
import { hasAllPermission, hasPermission } from '../../../../authorization';
import { Integrations, Rooms, Users, Roles, Subscriptions } from '../../../../models';
import { Babel } from 'meteor/babel-compiler';
import _ from 'underscore';
import s from 'underscore.string';
const validChannelChars = ['@', '#'];

Meteor.methods({
	updateIncomingIntegration(integrationId, integration) {
		if (!_.isString(integration.channel) || integration.channel.trim() === '') {
			throw new Meteor.Error('error-invalid-channel', 'Invalid channel', { method: 'updateIncomingIntegration' });
		}

		const channels = _.map(integration.channel.split(','), (channel) => s.trim(channel));

		for (const channel of channels) {
			if (!validChannelChars.includes(channel[0])) {
				throw new Meteor.Error('error-invalid-channel-start-with-chars', 'Invalid channel. Start with @ or #', { method: 'updateIncomingIntegration' });
			}
		}

		let currentIntegration;

		if (hasPermission(this.userId, 'manage-integrations')) {
			currentIntegration = Integrations.findOne(integrationId);
		} else if (hasPermission(this.userId, 'manage-own-integrations')) {
			currentIntegration = Integrations.findOne({ _id: integrationId, '_createdBy._id': this.userId });
		} else {
			throw new Meteor.Error('not_authorized', 'Unauthorized', { method: 'updateIncomingIntegration' });
		}

		if (!currentIntegration) {
			throw new Meteor.Error('error-invalid-integration', 'Invalid integration', { method: 'updateIncomingIntegration' });
		}

		if (integration.scriptEnabled === true && integration.script && integration.script.trim() !== '') {
			try {
				let babelOptions = Babel.getDefaultOptions({ runtime: false });
				babelOptions = _.extend(babelOptions, { compact: true, minified: true, comments: false });

				integration.scriptCompiled = Babel.compile(integration.script, babelOptions).code;
				integration.scriptError = undefined;
			} catch (e) {
				integration.scriptCompiled = undefined;
				integration.scriptError = _.pick(e, 'name', 'message', 'stack');
			}
		}

		for (let channel of channels) {
			const channelType = channel[0];
			channel = channel.substr(1);
			let record;

			switch (channelType) {
				case '#':
					record = Rooms.findOne({
						$or: [
							{ _id: channel },
							{ name: channel },
						],
					});
					break;
				case '@':
					record = Users.findOne({
						$or: [
							{ _id: channel },
							{ username: channel },
						],
					});
					break;
			}

			if (!record) {
				throw new Meteor.Error('error-invalid-room', 'Invalid room', { method: 'updateIncomingIntegration' });
			}

			if (!hasAllPermission(this.userId, ['manage-integrations', 'manage-own-integrations']) && !Subscriptions.findOneByRoomIdAndUserId(record._id, this.userId, { fields: { _id: 1 } })) {
				throw new Meteor.Error('error-invalid-channel', 'Invalid Channel', { method: 'updateIncomingIntegration' });
			}
		}

		const user = Users.findOne({ username: currentIntegration.username });

		if (!user || !user._id) {
			throw new Meteor.Error('error-invalid-post-as-user', 'Invalid Post As User', { method: 'updateIncomingIntegration' });
		}

		Roles.addUserRoles(user._id, 'bot');

		Integrations.update(integrationId, {
			$set: {
				enabled: integration.enabled,
				name: integration.name,
				avatar: integration.avatar,
				emoji: integration.emoji,
				alias: integration.alias,
				channel: channels,
				script: integration.script,
				scriptEnabled: integration.scriptEnabled,
				scriptCompiled: integration.scriptCompiled,
				scriptError: integration.scriptError,
				_updatedAt: new Date(),
				_updatedBy: Users.findOne(this.userId, { fields: { username: 1 } }),
			},
		});

		return Integrations.findOne(integrationId);
	},
});
