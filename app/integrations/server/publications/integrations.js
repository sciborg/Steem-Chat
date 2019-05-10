import { Meteor } from 'meteor/meteor';
import { hasPermission } from '../../../authorization';
import { Integrations } from '../../../models';

Meteor.publish('integrations', function _integrationPublication() {
	if (!this.userId) {
		return this.ready();
	}

	if (hasPermission(this.userId, 'manage-integrations')) {
		return Integrations.find();
	} else if (hasPermission(this.userId, 'manage-own-integrations')) {
		return Integrations.find({ '_createdBy._id': this.userId });
	} else {
		throw new Meteor.Error('not-authorized');
	}
});
