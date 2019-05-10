import { Meteor } from 'meteor/meteor';
import { slashCommands } from '../../../utils';

Meteor.methods({
	executeSlashCommandPreview(command, preview) {
		if (!Meteor.userId()) {
			throw new Meteor.Error('error-invalid-user', 'Invalid user', {
				method: 'getSlashCommandPreview',
			});
		}

		if (!command || !command.cmd || !slashCommands.commands[command.cmd]) {
			throw new Meteor.Error('error-invalid-command', 'Invalid Command Provided', {
				method: 'executeSlashCommandPreview',
			});
		}

		const theCmd = slashCommands.commands[command.cmd];
		if (!theCmd.providesPreview) {
			throw new Meteor.Error('error-invalid-command', 'Command Does Not Provide Previews', {
				method: 'executeSlashCommandPreview',
			});
		}

		if (!preview) {
			throw new Meteor.Error('error-invalid-command-preview', 'Invalid Preview Provided', {
				method: 'executeSlashCommandPreview',
			});
		}

		return slashCommands.executePreview(command.cmd, command.params, command.msg, preview);
	},
});
