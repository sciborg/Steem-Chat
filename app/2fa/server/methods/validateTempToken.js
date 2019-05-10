import { Meteor } from 'meteor/meteor';
import { Users } from '../../../models';
import { TOTP } from '../lib/totp';

Meteor.methods({
	'2fa:validateTempToken'(userToken) {
		if (!Meteor.userId()) {
			throw new Meteor.Error('not-authorized');
		}

		const user = Meteor.user();

		if (!user.services || !user.services.totp || !user.services.totp.tempSecret) {
			throw new Meteor.Error('invalid-totp');
		}

		const verified = TOTP.verify({
			secret: user.services.totp.tempSecret,
			token: userToken,
		});

		if (verified) {
			const { codes, hashedCodes } = TOTP.generateCodes();

			Users.enable2FAAndSetSecretAndCodesByUserId(Meteor.userId(), user.services.totp.tempSecret, hashedCodes);
			return { codes };
		}
	},
});
