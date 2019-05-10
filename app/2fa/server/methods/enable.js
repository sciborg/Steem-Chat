import { Meteor } from 'meteor/meteor';
import { Users } from '../../../models';
import { TOTP } from '../lib/totp';

Meteor.methods({
	'2fa:enable'() {
		if (!Meteor.userId()) {
			throw new Meteor.Error('not-authorized');
		}

		const user = Meteor.user();

		const secret = TOTP.generateSecret();

		Users.disable2FAAndSetTempSecretByUserId(Meteor.userId(), secret.base32);

		return {
			secret: secret.base32,
			url: TOTP.generateOtpauthURL(secret, user.username),
		};
	},
});
