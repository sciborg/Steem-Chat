import { Meteor } from 'meteor/meteor';
import { settings } from '../../settings';

Meteor.startup(function() {
	settings.addGroup('SlackBridge', function() {
		this.add('SlackBridge_Enabled', false, {
			type: 'boolean',
			i18nLabel: 'Enabled',
			public: true,
		});

		this.add('SlackBridge_APIToken', '', {
			type: 'string',
			multiline: true,
			enableQuery: {
				_id: 'SlackBridge_Enabled',
				value: true,
			},
			i18nLabel: 'SlackBridge_APIToken',
			i18nDescription: 'SlackBridge_APIToken_Description',
		});

		this.add('SlackBridge_FileUpload_Enabled', true, {
			type: 'boolean',
			enableQuery: {
				_id: 'SlackBridge_Enabled',
				value: true,
			},
			i18nLabel: 'FileUpload',
		});

		this.add('SlackBridge_Out_Enabled', false, {
			type: 'boolean',
			enableQuery: {
				_id: 'SlackBridge_Enabled',
				value: true,
			},
		});

		this.add('SlackBridge_Out_All', false, {
			type: 'boolean',
			enableQuery: [{
				_id: 'SlackBridge_Enabled',
				value: true,
			}, {
				_id: 'SlackBridge_Out_Enabled',
				value: true,
			}],
		});

		this.add('SlackBridge_Out_Channels', '', {
			type: 'roomPick',
			enableQuery: [{
				_id: 'SlackBridge_Enabled',
				value: true,
			}, {
				_id: 'SlackBridge_Out_Enabled',
				value: true,
			}, {
				_id: 'SlackBridge_Out_All',
				value: false,
			}],
		});

		this.add('SlackBridge_AliasFormat', '', {
			type: 'string',
			enableQuery: {
				_id: 'SlackBridge_Enabled',
				value: true,
			},
			i18nLabel: 'Alias_Format',
			i18nDescription: 'Alias_Format_Description',
		});

		this.add('SlackBridge_ExcludeBotnames', '', {
			type: 'string',
			enableQuery: {
				_id: 'SlackBridge_Enabled',
				value: true,
			},
			i18nLabel: 'Exclude_Botnames',
			i18nDescription: 'Exclude_Botnames_Description',
		});

		this.add('SlackBridge_Reactions_Enabled', true, {
			type: 'boolean',
			enableQuery: {
				_id: 'SlackBridge_Enabled',
				value: true,
			},
			i18nLabel: 'Reactions',
		});
	});
});
