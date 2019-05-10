import { Meteor } from 'meteor/meteor';
import { Users } from '../../../models';
import { TOTP } from '../lib/totp';

Meteor.methods({
	'2fa:disable'(code) {
		if (!Meteor.userId()) {
			throw new Meteor.Error('not-authorized');
		}

		const user = Meteor.user();

		const verified = TOTP.verify({
			secret: user.services.totp.secret,
			token: code,
			userId: Meteor.userId(),
			backupTokens: user.services.totp.hashedBackup,
		});

		if (!verified) {
			return false;
		}

		return Users.disable2FAByUserId(Meteor.userId());
	},
});
