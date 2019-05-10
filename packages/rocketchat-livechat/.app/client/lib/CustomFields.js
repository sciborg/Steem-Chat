import { Meteor } from 'meteor/meteor';
import { Tracker } from 'meteor/tracker';
import visitor from '../../imports/client/visitor';

this.CustomFields = (function() {
	let queue = {};
	let initiated = false;

	const setCustomField = function(token, key, value, overwrite = true) {
		if (!initiated) {
			// queue by key
			queue[key] = { token, value, overwrite };
			return;
		}
		Meteor.call('livechat:setCustomField', token, key, value, overwrite);
	};

	const init = function() {
		Tracker.autorun(function() {
			if (visitor.getId()) {
				initiated = true;
				Object.keys(queue).forEach((key) => {
					setCustomField.call(this, queue[key].token, key, queue[key].value, queue[key].overwrite);
				});
				queue = {};
			} else {
				initiated = false;
			}
		});
	};

	return {
		init,
		setCustomField,
	};
}());
