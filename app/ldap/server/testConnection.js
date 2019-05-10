import { Meteor } from 'meteor/meteor';
import { hasRole } from '../../authorization';
import { settings } from '../../settings';
import LDAP from './ldap';

Meteor.methods({
	ldap_test_connection() {
		const user = Meteor.user();
		if (!user) {
			throw new Meteor.Error('error-invalid-user', 'Invalid user', { method: 'ldap_test_connection' });
		}

		if (!hasRole(user._id, 'admin')) {
			throw new Meteor.Error('error-not-authorized', 'Not authorized', { method: 'ldap_test_connection' });
		}

		if (settings.get('LDAP_Enable') !== true) {
			throw new Meteor.Error('LDAP_disabled');
		}

		let ldap;
		try {
			ldap = new LDAP();
			ldap.connectSync();
		} catch (error) {
			console.log(error);
			throw new Meteor.Error(error.message);
		}

		try {
			ldap.bindIfNecessary();
		} catch (error) {
			throw new Meteor.Error(error.name || error.message);
		}

		return {
			message: 'Connection_success',
			params: [],
		};
	},
});
