import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import _ from 'underscore';
import s from 'underscore.string';
import * as Mailer from '../../../mailer';
import { Gravatar } from 'meteor/jparker:gravatar';
import { getRoles, hasPermission } from '../../../authorization';
import { settings } from '../../../settings';
import PasswordPolicy from '../lib/PasswordPolicyClass';
import { checkEmailAvailability, checkUsernameAvailability, setUserAvatar, setEmail, setRealName, setUsername } from '.';
import { validateEmailDomain } from '../lib';

const passwordPolicy = new PasswordPolicy();

let html = '';
Meteor.startup(() => {
	Mailer.getTemplate('Accounts_UserAddedEmail_Email', (template) => {
		html = template;
	});
});

function validateUserData(userId, userData) {
	const existingRoles = _.pluck(getRoles(), '_id');

	if (userData._id && userId !== userData._id && !hasPermission(userId, 'edit-other-user-info')) {
		throw new Meteor.Error('error-action-not-allowed', 'Editing user is not allowed', {
			method: 'insertOrUpdateUser',
			action: 'Editing_user',
		});
	}

	if (!userData._id && !hasPermission(userId, 'create-user')) {
		throw new Meteor.Error('error-action-not-allowed', 'Adding user is not allowed', {
			method: 'insertOrUpdateUser',
			action: 'Adding_user',
		});
	}

	if (userData.roles && _.difference(userData.roles, existingRoles).length > 0) {
		throw new Meteor.Error('error-action-not-allowed', 'The field Roles consist invalid role name', {
			method: 'insertOrUpdateUser',
			action: 'Assign_role',
		});
	}

	if (userData.roles && _.indexOf(userData.roles, 'admin') >= 0 && !hasPermission(userId, 'assign-admin-role')) {
		throw new Meteor.Error('error-action-not-allowed', 'Assigning admin is not allowed', {
			method: 'insertOrUpdateUser',
			action: 'Assign_admin',
		});
	}

	if (settings.get('Accounts_RequireNameForSignUp') && !userData._id && !s.trim(userData.name)) {
		throw new Meteor.Error('error-the-field-is-required', 'The field Name is required', {
			method: 'insertOrUpdateUser',
			field: 'Name',
		});
	}

	if (!userData._id && !s.trim(userData.username)) {
		throw new Meteor.Error('error-the-field-is-required', 'The field Username is required', {
			method: 'insertOrUpdateUser',
			field: 'Username',
		});
	}

	let nameValidation;

	try {
		nameValidation = new RegExp(`^${ settings.get('UTF8_Names_Validation') }$`);
	} catch (e) {
		nameValidation = new RegExp('^[0-9a-zA-Z-_.]+$');
	}

	if (userData.username && !nameValidation.test(userData.username)) {
		throw new Meteor.Error('error-input-is-not-a-valid-field', `${ _.escape(userData.username) } is not a valid username`, {
			method: 'insertOrUpdateUser',
			input: userData.username,
			field: 'Username',
		});
	}

	if (!userData._id && !userData.password) {
		throw new Meteor.Error('error-the-field-is-required', 'The field Password is required', {
			method: 'insertOrUpdateUser',
			field: 'Password',
		});
	}

	if (!userData._id) {
		if (!checkUsernameAvailability(userData.username)) {
			throw new Meteor.Error('error-field-unavailable', `${ _.escape(userData.username) } is already in use :(`, {
				method: 'insertOrUpdateUser',
				field: userData.username,
			});
		}

		if (userData.email && !checkEmailAvailability(userData.email)) {
			throw new Meteor.Error('error-field-unavailable', `${ _.escape(userData.email) } is already in use :(`, {
				method: 'insertOrUpdateUser',
				field: userData.email,
			});
		}
	}
}

function validateUserEditing(userId, userData) {
	const editingMyself = userData._id && userId === userData._id;

	const canEditOtherUserInfo = hasPermission(userId, 'edit-other-user-info');
	const canEditOtherUserPassword = hasPermission(userId, 'edit-other-user-password');

	if (userData.roles && !hasPermission(userId, 'assign-roles')) {
		throw new Meteor.Error('error-action-not-allowed', 'Assign roles is not allowed', {
			method: 'insertOrUpdateUser',
			action: 'Assign_role',
		});
	}

	if (!settings.get('Accounts_AllowUserProfileChange') && !canEditOtherUserInfo && !canEditOtherUserPassword) {
		throw new Meteor.Error('error-action-not-allowed', 'Edit user profile is not allowed', {
			method: 'insertOrUpdateUser',
			action: 'Update_user',
		});
	}

	if (userData.username && !settings.get('Accounts_AllowUsernameChange') && (!canEditOtherUserInfo || editingMyself)) {
		throw new Meteor.Error('error-action-not-allowed', 'Edit username is not allowed', {
			method: 'insertOrUpdateUser',
			action: 'Update_user',
		});
	}

	if (userData.name && !settings.get('Accounts_AllowRealNameChange') && (!canEditOtherUserInfo || editingMyself)) {
		throw new Meteor.Error('error-action-not-allowed', 'Edit user real name is not allowed', {
			method: 'insertOrUpdateUser',
			action: 'Update_user',
		});
	}

	if (userData.email && !settings.get('Accounts_AllowEmailChange') && (!canEditOtherUserInfo || editingMyself)) {
		throw new Meteor.Error('error-action-not-allowed', 'Edit user email is not allowed', {
			method: 'insertOrUpdateUser',
			action: 'Update_user',
		});
	}

	if (userData.password && !settings.get('Accounts_AllowPasswordChange') && (!canEditOtherUserPassword || editingMyself)) {
		throw new Meteor.Error('error-action-not-allowed', 'Edit user password is not allowed', {
			method: 'insertOrUpdateUser',
			action: 'Update_user',
		});
	}
}

export const saveUser = function(userId, userData) {
	validateUserData(userId, userData);

	if (!userData._id) {
		validateEmailDomain(userData.email);

		// insert user
		const createUser = {
			username: userData.username,
			password: userData.password,
			joinDefaultChannels: userData.joinDefaultChannels,
		};
		if (userData.email) {
			createUser.email = userData.email;
		}

		const _id = Accounts.createUser(createUser);

		const updateUser = {
			$set: {
				roles: userData.roles || ['user'],
				settings: userData.settings || {},
			},
		};

		if (typeof userData.name !== 'undefined') {
			updateUser.$set.name = userData.name;
		}

		if (typeof userData.requirePasswordChange !== 'undefined') {
			updateUser.$set.requirePasswordChange = userData.requirePasswordChange;
		}

		if (typeof userData.verified === 'boolean') {
			updateUser.$set['emails.0.verified'] = userData.verified;
		}

		Meteor.users.update({ _id }, updateUser);

		if (userData.sendWelcomeEmail) {
			const subject = settings.get('Accounts_UserAddedEmail_Subject');

			const email = {
				to: userData.email,
				from: settings.get('From_Email'),
				subject,
				html,
				data: {
					email: s.escapeHTML(userData.email),
					password: s.escapeHTML(userData.password),
				},
			};

			if (typeof userData.name !== 'undefined') {
				email.data.name = s.escapeHTML(userData.name);
			}

			try {
				Mailer.send(email);
			} catch (error) {
				throw new Meteor.Error('error-email-send-failed', `Error trying to send email: ${ error.message }`, {
					function: 'RocketChat.saveUser',
					message: error.message,
				});
			}
		}

		userData._id = _id;

		if (settings.get('Accounts_SetDefaultAvatar') === true && userData.email) {
			const gravatarUrl = Gravatar.imageUrl(userData.email, { default: '404', size: 200, secure: true });

			try {
				setUserAvatar(userData, gravatarUrl, '', 'url');
			} catch (e) {
				// Ignore this error for now, as it not being successful isn't bad
			}
		}

		return _id;
	}

	validateUserEditing(userId, userData);

	// update user
	if (userData.username) {
		setUsername(userData._id, userData.username);
	}

	setRealName(userData._id, userData.name);

	if (userData.email) {
		const shouldSendVerificationEmailToUser = userData.verified !== true;
		setEmail(userData._id, userData.email, shouldSendVerificationEmailToUser);
	}

	if (userData.password && userData.password.trim() && hasPermission(userId, 'edit-other-user-password') && passwordPolicy.validate(userData.password)) {
		Accounts.setPassword(userData._id, userData.password.trim());
	}

	const updateUser = {
		$set: {},
	};

	if (userData.roles) {
		updateUser.$set.roles = userData.roles;
	}
	if (userData.settings) {
		updateUser.$set.settings = { preferences: userData.settings.preferences };
	}

	if (userData.language) {
		updateUser.$set.language = userData.language;
	}

	if (typeof userData.requirePasswordChange !== 'undefined') {
		updateUser.$set.requirePasswordChange = userData.requirePasswordChange;
	}

	if (typeof userData.verified === 'boolean') {
		updateUser.$set['emails.0.verified'] = userData.verified;
	}

	Meteor.users.update({ _id: userData._id }, updateUser);

	return true;
};
