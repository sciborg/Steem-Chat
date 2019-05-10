import { Meteor } from 'meteor/meteor';
import { slashCommands, APIClient } from '../../../utils';
import { CachedCollectionManager } from '../../../ui-cached-collection';

export const AppEvents = Object.freeze({
	APP_ADDED: 'app/added',
	APP_REMOVED: 'app/removed',
	APP_UPDATED: 'app/updated',
	APP_STATUS_CHANGE: 'app/statusUpdate',
	APP_SETTING_UPDATED: 'app/settingUpdated',
	COMMAND_ADDED: 'command/added',
	COMMAND_DISABLED: 'command/disabled',
	COMMAND_UPDATED: 'command/updated',
	COMMAND_REMOVED: 'command/removed',
});

export class AppWebsocketReceiver {
	constructor(orch) {
		this.orch = orch;
		this.streamer = new Meteor.Streamer('apps');

		CachedCollectionManager.onLogin(() => {
			this.listenStreamerEvents();
		});

		this.listeners = {};

		Object.keys(AppEvents).forEach((v) => {
			this.listeners[AppEvents[v]] = [];
		});
	}

	listenStreamerEvents() {
		this.streamer.on(AppEvents.APP_ADDED, this.onAppAdded.bind(this));
		this.streamer.on(AppEvents.APP_REMOVED, this.onAppRemoved.bind(this));
		this.streamer.on(AppEvents.APP_UPDATED, this.onAppUpdated.bind(this));
		this.streamer.on(AppEvents.APP_STATUS_CHANGE, this.onAppStatusUpdated.bind(this));
		this.streamer.on(AppEvents.APP_SETTING_UPDATED, this.onAppSettingUpdated.bind(this));
		this.streamer.on(AppEvents.COMMAND_ADDED, this.onCommandAdded.bind(this));
		this.streamer.on(AppEvents.COMMAND_DISABLED, this.onCommandDisabled.bind(this));
		this.streamer.on(AppEvents.COMMAND_UPDATED, this.onCommandUpdated.bind(this));
		this.streamer.on(AppEvents.COMMAND_REMOVED, this.onCommandDisabled.bind(this));
	}

	registerListener(event, listener) {
		this.listeners[event].push(listener);
	}

	unregisterListener(event, listener) {
		this.listeners[event].splice(this.listeners[event].indexOf(listener), 1);
	}

	onAppAdded(appId) {
		APIClient.get(`apps/${ appId }/languages`).then((result) => {
			this.orch.parseAndLoadLanguages(result.languages, appId);
		});

		this.listeners[AppEvents.APP_ADDED].forEach((listener) => listener(appId));
	}

	onAppRemoved(appId) {
		this.listeners[AppEvents.APP_REMOVED].forEach((listener) => listener(appId));
	}

	onAppUpdated(appId) {
		this.listeners[AppEvents.APP_UPDATED].forEach((listener) => listener(appId));
	}

	onAppStatusUpdated({ appId, status }) {
		this.listeners[AppEvents.APP_STATUS_CHANGE].forEach((listener) => listener({ appId, status }));
	}

	onAppSettingUpdated({ appId }) {
		this.listeners[AppEvents.APP_SETTING_UPDATED].forEach((listener) => listener({ appId }));
	}

	onCommandAdded(command) {
		APIClient.v1.get('commands.get', { command }).then((result) => {
			slashCommands.commands[command] = result.command;
		});
	}

	onCommandDisabled(command) {
		delete slashCommands.commands[command];
	}

	onCommandUpdated(command) {
		APIClient.v1.get('commands.get', { command }).then((result) => {
			slashCommands.commands[command] = result.command;
		});
	}
}
