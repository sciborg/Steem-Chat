import { Meteor } from 'meteor/meteor';
import limax from 'limax';
import { settings } from '../../settings';
import { Rooms } from '../../models';

export const getValidRoomName = (displayName, rid = '', options = {}) => {
	let slugifiedName = displayName;

	if (settings.get('UI_Allow_room_names_with_special_chars')) {
		const room = Rooms.findOneByDisplayName(displayName);
		if (room && room._id !== rid) {
			if (room.archived) {
				throw new Meteor.Error('error-archived-duplicate-name', `There's an archived channel with name ${ displayName }`, { function: 'RocketChat.getValidRoomName', channel_name: displayName });
			} else {
				throw new Meteor.Error('error-duplicate-channel-name', `A channel with name '${ displayName }' exists`, { function: 'RocketChat.getValidRoomName', channel_name: displayName });
			}
		}
		slugifiedName = limax(displayName);
	}

	let nameValidation;

	if (options.nameValidationRegex) {
		nameValidation = new RegExp(options.nameValidationRegex);
	} else {
		try {
			nameValidation = new RegExp(`^${ settings.get('UTF8_Names_Validation') }$`);
		} catch (error) {
			nameValidation = new RegExp('^[0-9a-zA-Z-_.]+$');
		}
	}

	if (!nameValidation.test(slugifiedName)) {
		throw new Meteor.Error('error-invalid-room-name', `${ slugifiedName } is not a valid room name.`, {
			function: 'RocketChat.getValidRoomName',
			channel_name: slugifiedName,
		});
	}

	const room = Rooms.findOneByName(slugifiedName);
	if (room && room._id !== rid) {
		if (settings.get('UI_Allow_room_names_with_special_chars')) {
			let tmpName = slugifiedName;
			let next = 0;
			while (Rooms.findOneByNameAndNotId(tmpName, rid)) {
				tmpName = `${ slugifiedName }-${ ++next }`;
			}
			slugifiedName = tmpName;
		} else if (room.archived) {
			throw new Meteor.Error('error-archived-duplicate-name', `There's an archived channel with name ${ slugifiedName }`, { function: 'RocketChat.getValidRoomName', channel_name: slugifiedName });
		} else {
			throw new Meteor.Error('error-duplicate-channel-name', `A channel with name '${ slugifiedName }' exists`, { function: 'RocketChat.getValidRoomName', channel_name: slugifiedName });
		}
	}

	return slugifiedName;
};
