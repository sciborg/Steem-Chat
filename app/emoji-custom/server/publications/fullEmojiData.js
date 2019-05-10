import { Meteor } from 'meteor/meteor';
import { EmojiCustom } from '../../../models';
import s from 'underscore.string';

Meteor.publish('fullEmojiData', function(filter, limit) {
	if (!this.userId) {
		return this.ready();
	}

	const fields = {
		name: 1,
		aliases: 1,
		extension: 1,
	};

	filter = s.trim(filter);

	const options = {
		fields,
		limit,
		sort: { name: 1 },
	};

	if (filter) {
		const filterReg = new RegExp(s.escapeRegExp(filter), 'i');
		return EmojiCustom.findByNameOrAlias(filterReg, options);
	}

	return EmojiCustom.find({}, options);
});
