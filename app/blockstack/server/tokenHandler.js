import { decodeToken } from 'blockstack';
import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import { Match, check } from 'meteor/check';
import { logger } from './logger';

// Handler extracts data from JSON and tokenised reponse.
// Reflects OAuth token service, with some slight modifications for Blockstack.
//
// Uses 'iss' (issuer) as unique key (decentralised ID) for user.
// The 'did' final portion of the blockstack decentralised ID, is displayed as
// your profile ID in the service. This isn't used yet, but could be useful
// to link accounts if identity providers other than btc address are added.
export const handleAccessToken = (loginRequest) => {
	logger.debug('Login request received', loginRequest);

	check(loginRequest, Match.ObjectIncluding({
		authResponse: String,
		userData: Object,
	}));

	// Decode auth response for user attributes
	const { username, profile } = loginRequest.userData;
	const decodedToken = decodeToken(loginRequest.authResponse).payload;

	profile.username = username;

	logger.debug('User data', loginRequest.userData);
	logger.debug('Login decoded', decodedToken);

	const { iss, iat, exp } = decodedToken;

	if (!iss) {
		return {
			type: 'blockstack',
			error: new Meteor.Error(Accounts.LoginCancelledError.numericError, 'Insufficient data in auth response token'),
		};
	}

	// Collect basic auth provider details
	const serviceData = {
		id: iss,
		did: iss.split(':').pop(),
		issuedAt: new Date(iat * 1000),
		expiresAt: new Date(exp * 1000),
	};

	// Add Avatar image source to use for auth service suggestions
	if (Array.isArray(profile.image) && profile.image.length) {
		serviceData.image = profile.image[0].contentUrl;
	}

	logger.debug('Login data', serviceData, profile);

	return {
		serviceData,
		options: { profile },
	};
};
