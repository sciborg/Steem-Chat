import { Meteor } from 'meteor/meteor';
import { hasPermission } from '../../../authorization';
import { CustomSounds } from '../../../models';
import { Notifications } from '../../../notifications';
import { RocketChatFileCustomSoundsInstance } from '../startup/custom-sounds';
import s from 'underscore.string';

Meteor.methods({
	insertOrUpdateSound(soundData) {
		if (!hasPermission(this.userId, 'manage-sounds')) {
			throw new Meteor.Error('not_authorized');
		}

		if (!s.trim(soundData.name)) {
			throw new Meteor.Error('error-the-field-is-required', 'The field Name is required', { method: 'insertOrUpdateSound', field: 'Name' });
		}

		// let nameValidation = new RegExp('^[0-9a-zA-Z-_+;.]+$');

		// allow all characters except colon, whitespace, comma, >, <, &, ", ', /, \, (, )
		// more practical than allowing specific sets of characters; also allows foreign languages
		const nameValidation = /[\s,:><&"'\/\\\(\)]/;

		// silently strip colon; this allows for uploading :soundname: as soundname
		soundData.name = soundData.name.replace(/:/g, '');

		if (nameValidation.test(soundData.name)) {
			throw new Meteor.Error('error-input-is-not-a-valid-field', `${ soundData.name } is not a valid name`, { method: 'insertOrUpdateSound', input: soundData.name, field: 'Name' });
		}

		let matchingResults = [];

		if (soundData._id) {
			matchingResults = CustomSounds.findByNameExceptID(soundData.name, soundData._id).fetch();
		} else {
			matchingResults = CustomSounds.findByName(soundData.name).fetch();
		}

		if (matchingResults.length > 0) {
			throw new Meteor.Error('Custom_Sound_Error_Name_Already_In_Use', 'The custom sound name is already in use', { method: 'insertOrUpdateSound' });
		}

		if (!soundData._id) {
			// insert sound
			const createSound = {
				name: soundData.name,
				extension: soundData.extension,
			};

			const _id = CustomSounds.create(createSound);
			createSound._id = _id;

			return _id;
		} else {
			// update sound
			if (soundData.newFile) {
				RocketChatFileCustomSoundsInstance.deleteFile(`${ soundData._id }.${ soundData.previousExtension }`);
			}

			if (soundData.name !== soundData.previousName) {
				CustomSounds.setName(soundData._id, soundData.name);
				Notifications.notifyAll('updateCustomSound', { soundData });
			}

			return soundData._id;
		}
	},
});
