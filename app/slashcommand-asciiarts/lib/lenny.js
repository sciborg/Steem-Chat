import { Meteor } from 'meteor/meteor';
import { slashCommands } from '../../utils';
/*
* Lenny is a named function that will replace /lenny commands
* @param {Object} message - The message object
*/


function LennyFace(command, params, item) {
	if (command === 'lennyface') {
		const msg = item;
		msg.msg = `${ params } ( ͡° ͜ʖ ͡°)`;
		Meteor.call('sendMessage', msg);
	}
}

slashCommands.add('lennyface', LennyFace, {
	description: 'Slash_LennyFace_Description',
	params: 'your_message_optional',
});
