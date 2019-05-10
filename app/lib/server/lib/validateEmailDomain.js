import { Meteor } from 'meteor/meteor';
import { settings } from '../../../settings';
import { emailDomainDefaultBlackList } from './defaultBlockedDomainsList';
import _ from 'underscore';
import dns from 'dns';

let emailDomainBlackList = [];
let emailDomainWhiteList = [];
let useDefaultBlackList = false;
let useDNSDomainCheck = false;

settings.get('Accounts_BlockedDomainsList', function(key, value) {
	emailDomainBlackList = _.map(value.split(','), (domain) => domain.trim());
});
settings.get('Accounts_AllowedDomainsList', function(key, value) {
	emailDomainWhiteList = _.map(value.split(','), (domain) => domain.trim());
});
settings.get('Accounts_UseDefaultBlockedDomainsList', function(key, value) {
	useDefaultBlackList = value;
});
settings.get('Accounts_UseDNSDomainCheck', function(key, value) {
	useDNSDomainCheck = value;
});

export const validateEmailDomain = function(email) {
	const emailValidation = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
	if (!emailValidation.test(email)) {
		throw new Meteor.Error('error-invalid-email', `Invalid email ${ email }`, { function: 'RocketChat.validateEmailDomain', email });
	}

	const emailDomain = email.substr(email.lastIndexOf('@') + 1);

	// if not in whitelist
	if (emailDomainWhiteList.indexOf(emailDomain) === -1) {
		if (emailDomainBlackList.indexOf(emailDomain) !== -1 || (useDefaultBlackList && emailDomainDefaultBlackList.indexOf(emailDomain) !== -1)) {
			throw new Meteor.Error('error-email-domain-blacklisted', 'The email domain is blacklisted', { function: 'RocketChat.validateEmailDomain' });
		}
	}

	if (useDNSDomainCheck) {
		try {
			Meteor.wrapAsync(dns.resolveMx)(emailDomain);
		} catch (e) {
			throw new Meteor.Error('error-invalid-domain', 'Invalid domain', { function: 'RocketChat.validateEmailDomain' });
		}
	}
};
