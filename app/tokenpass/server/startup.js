import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import { settings } from '../../settings';
import { addRoomAccessValidator } from '../../authorization';
import { Users } from '../../models';
import { callbacks } from '../../callbacks';
import { updateUserTokenpassBalances } from './functions/updateUserTokenpassBalances';
import { Tokenpass } from './Tokenpass';

settings.addGroup('OAuth', function() {
	this.section('Tokenpass', function() {
		const enableQuery = {
			_id: 'Accounts_OAuth_Tokenpass',
			value: true,
		};

		this.add('Accounts_OAuth_Tokenpass', false, { type: 'boolean' });
		this.add('API_Tokenpass_URL', '', { type: 'string', public: true, enableQuery, i18nDescription: 'API_Tokenpass_URL_Description' });
		this.add('Accounts_OAuth_Tokenpass_id', '', { type: 'string', enableQuery });
		this.add('Accounts_OAuth_Tokenpass_secret', '', { type: 'string', enableQuery });
		this.add('Accounts_OAuth_Tokenpass_callback_url', '_oauth/tokenpass', { type: 'relativeUrl', readonly: true, force: true, enableQuery });
	});
});

function validateTokenAccess(userData, roomData) {
	if (!userData || !userData.services || !userData.services.tokenpass || !userData.services.tokenpass.tcaBalances) {
		return false;
	}

	return Tokenpass.validateAccess(roomData.tokenpass, userData.services.tokenpass.tcaBalances);
}

Meteor.startup(function() {
	addRoomAccessValidator(function(room, user) {
		if (!room || !room.tokenpass || !user) {
			return false;
		}

		const userData = Users.getTokenBalancesByUserId(user._id);

		return validateTokenAccess(userData, room);
	});

	callbacks.add('beforeJoinRoom', function(user, room) {
		if (room.tokenpass && !validateTokenAccess(user, room)) {
			throw new Meteor.Error('error-not-allowed', 'Token required', { method: 'joinRoom' });
		}

		return room;
	});
});

Accounts.onLogin(function({ user }) {
	if (user && user.services && user.services.tokenpass) {
		updateUserTokenpassBalances(user);
	}
});
