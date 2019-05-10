import { Meteor } from 'meteor/meteor';
import { settings } from '../../settings';

Meteor.startup(function() {
	settings.addGroup('LiveStream & Broadcasting', function() {

		this.add('Livestream_enabled', false, {
			type: 'boolean',
			public: true,
			alert: 'This feature is currently in beta! Please report bugs to github.com/RocketChat/Rocket.Chat/issues',
		});

		this.add('Broadcasting_enabled', false, {
			type: 'boolean',
			public: true,
			alert: 'This feature is currently in beta! Please report bugs to github.com/RocketChat/Rocket.Chat/issues',
			enableQuery: { _id: 'Livestream_enabled', value: true },
		});

		this.add('Broadcasting_client_id', '', { type: 'string', public: false, enableQuery: { _id: 'Broadcasting_enabled', value: true } });
		this.add('Broadcasting_client_secret', '', { type: 'string', public: false, enableQuery: { _id: 'Broadcasting_enabled', value: true } });
		this.add('Broadcasting_api_key', '', { type: 'string', public: false, enableQuery: { _id: 'Broadcasting_enabled', value: true } });
		this.add('Broadcasting_media_server_url', '', { type: 'string', public: true, enableQuery: { _id: 'Broadcasting_enabled', value: true } });
	});
});
