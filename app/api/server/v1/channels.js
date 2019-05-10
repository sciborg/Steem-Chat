import { Meteor } from 'meteor/meteor';
import { Rooms, Subscriptions, Messages, Uploads, Integrations, Users } from '../../../models';
import { hasPermission } from '../../../authorization';
import { composeMessageObjectWithUser } from '../../../utils';
import { API } from '../api';
import _ from 'underscore';

// Returns the channel IF found otherwise it will return the failure of why it didn't. Check the `statusCode` property
function findChannelByIdOrName({ params, checkedArchived = true, userId }) {
	if ((!params.roomId || !params.roomId.trim()) && (!params.roomName || !params.roomName.trim())) {
		throw new Meteor.Error('error-roomid-param-not-provided', 'The parameter "roomId" or "roomName" is required');
	}

	const fields = { ...API.v1.defaultFieldsToExclude };

	let room;
	if (params.roomId) {
		room = Rooms.findOneById(params.roomId, { fields });
	} else if (params.roomName) {
		room = Rooms.findOneByName(params.roomName, { fields });
	}

	if (!room || room.t !== 'c') {
		throw new Meteor.Error('error-room-not-found', 'The required "roomId" or "roomName" param provided does not match any channel');
	}

	if (checkedArchived && room.archived) {
		throw new Meteor.Error('error-room-archived', `The channel, ${ room.name }, is archived`);
	}
	if (userId && room.lastMessage) {
		room.lastMessage = composeMessageObjectWithUser(room.lastMessage, userId);
	}

	return room;
}

API.v1.addRoute('channels.addAll', { authRequired: true }, {
	post() {
		const findResult = findChannelByIdOrName({ params: this.requestParams() });

		Meteor.runAsUser(this.userId, () => {
			Meteor.call('addAllUserToRoom', findResult._id, this.bodyParams.activeUsersOnly);
		});

		return API.v1.success({
			channel: findChannelByIdOrName({ params: this.requestParams(), userId: this.userId }),
		});
	},
});

API.v1.addRoute('channels.addModerator', { authRequired: true }, {
	post() {
		const findResult = findChannelByIdOrName({ params: this.requestParams() });

		const user = this.getUserFromParams();

		Meteor.runAsUser(this.userId, () => {
			Meteor.call('addRoomModerator', findResult._id, user._id);
		});

		return API.v1.success();
	},
});

API.v1.addRoute('channels.addOwner', { authRequired: true }, {
	post() {
		const findResult = findChannelByIdOrName({ params: this.requestParams() });

		const user = this.getUserFromParams();

		Meteor.runAsUser(this.userId, () => {
			Meteor.call('addRoomOwner', findResult._id, user._id);
		});

		return API.v1.success();
	},
});

API.v1.addRoute('channels.archive', { authRequired: true }, {
	post() {
		const findResult = findChannelByIdOrName({ params: this.requestParams() });

		Meteor.runAsUser(this.userId, () => {
			Meteor.call('archiveRoom', findResult._id);
		});

		return API.v1.success();
	},
});

API.v1.addRoute('channels.close', { authRequired: true }, {
	post() {
		const findResult = findChannelByIdOrName({ params: this.requestParams(), checkedArchived: false });

		const sub = Subscriptions.findOneByRoomIdAndUserId(findResult._id, this.userId);

		if (!sub) {
			return API.v1.failure(`The user/callee is not in the channel "${ findResult.name }.`);
		}

		if (!sub.open) {
			return API.v1.failure(`The channel, ${ findResult.name }, is already closed to the sender`);
		}

		Meteor.runAsUser(this.userId, () => {
			Meteor.call('hideRoom', findResult._id);
		});

		return API.v1.success();
	},
});

API.v1.addRoute('channels.counters', { authRequired: true }, {
	get() {
		const access = hasPermission(this.userId, 'view-room-administration');
		const { userId } = this.requestParams();
		let user = this.userId;
		let unreads = null;
		let userMentions = null;
		let unreadsFrom = null;
		let joined = false;
		let msgs = null;
		let latest = null;
		let members = null;

		if (userId) {
			if (!access) {
				return API.v1.unauthorized();
			}
			user = userId;
		}
		const room = findChannelByIdOrName({
			params: this.requestParams(),
			returnUsernames: true,
		});
		const subscription = Subscriptions.findOneByRoomIdAndUserId(room._id, user);
		const lm = room.lm ? room.lm : room._updatedAt;

		if (typeof subscription !== 'undefined' && subscription.open) {
			unreads = Messages.countVisibleByRoomIdBetweenTimestampsInclusive(subscription.rid, subscription.ls, lm);
			unreadsFrom = subscription.ls || subscription.ts;
			userMentions = subscription.userMentions;
			joined = true;
		}

		if (access || joined) {
			msgs = room.msgs;
			latest = lm;
			members = room.usersCount;
		}

		return API.v1.success({
			joined,
			members,
			unreads,
			unreadsFrom,
			msgs,
			latest,
			userMentions,
		});
	},
});

// Channel -> create

function createChannelValidator(params) {
	if (!hasPermission(params.user.value, 'create-c')) {
		throw new Error('unauthorized');
	}

	if (!params.name || !params.name.value) {
		throw new Error(`Param "${ params.name.key }" is required`);
	}

	if (params.members && params.members.value && !_.isArray(params.members.value)) {
		throw new Error(`Param "${ params.members.key }" must be an array if provided`);
	}

	if (params.customFields && params.customFields.value && !(typeof params.customFields.value === 'object')) {
		throw new Error(`Param "${ params.customFields.key }" must be an object if provided`);
	}
}

function createChannel(userId, params) {
	const readOnly = typeof params.readOnly !== 'undefined' ? params.readOnly : false;
	const id = Meteor.runAsUser(userId, () => Meteor.call('createChannel', params.name, params.members ? params.members : [], readOnly, params.customFields));

	return {
		channel: findChannelByIdOrName({ params: { roomId: id.rid }, userId: this.userId }),
	};
}

API.channels = {};
API.channels.create = {
	validate: createChannelValidator,
	execute: createChannel,
};

API.v1.addRoute('channels.create', { authRequired: true }, {
	post() {
		const { userId, bodyParams } = this;

		let error;

		try {
			API.channels.create.validate({
				user: {
					value: userId,
				},
				name: {
					value: bodyParams.name,
					key: 'name',
				},
				members: {
					value: bodyParams.members,
					key: 'members',
				},
			});
		} catch (e) {
			if (e.message === 'unauthorized') {
				error = API.v1.unauthorized();
			} else {
				error = API.v1.failure(e.message);
			}
		}

		if (error) {
			return error;
		}

		return API.v1.success(API.channels.create.execute(userId, bodyParams));
	},
});

API.v1.addRoute('channels.delete', { authRequired: true }, {
	post() {
		const findResult = findChannelByIdOrName({ params: this.requestParams(), checkedArchived: false });

		Meteor.runAsUser(this.userId, () => {
			Meteor.call('eraseRoom', findResult._id);
		});

		return API.v1.success();
	},
});

API.v1.addRoute('channels.files', { authRequired: true }, {
	get() {
		const findResult = findChannelByIdOrName({ params: this.requestParams(), checkedArchived: false });
		const addUserObjectToEveryObject = (file) => {
			if (file.userId) {
				file = this.insertUserObject({ object: file, userId: file.userId });
			}
			return file;
		};

		Meteor.runAsUser(this.userId, () => {
			Meteor.call('canAccessRoom', findResult._id, this.userId);
		});

		const { offset, count } = this.getPaginationItems();
		const { sort, fields, query } = this.parseJsonQuery();

		const ourQuery = Object.assign({}, query, { rid: findResult._id });

		const files = Uploads.find(ourQuery, {
			sort: sort ? sort : { name: 1 },
			skip: offset,
			limit: count,
			fields,
		}).fetch();

		return API.v1.success({
			files: files.map(addUserObjectToEveryObject),
			count:
			files.length,
			offset,
			total: Uploads.find(ourQuery).count(),
		});
	},
});

API.v1.addRoute('channels.getIntegrations', { authRequired: true }, {
	get() {
		if (!hasPermission(this.userId, 'manage-integrations')) {
			return API.v1.unauthorized();
		}

		const findResult = findChannelByIdOrName({ params: this.requestParams(), checkedArchived: false });

		let includeAllPublicChannels = true;
		if (typeof this.queryParams.includeAllPublicChannels !== 'undefined') {
			includeAllPublicChannels = this.queryParams.includeAllPublicChannels === 'true';
		}

		let ourQuery = {
			channel: `#${ findResult.name }`,
		};

		if (includeAllPublicChannels) {
			ourQuery.channel = {
				$in: [ourQuery.channel, 'all_public_channels'],
			};
		}

		const { offset, count } = this.getPaginationItems();
		const { sort, fields, query } = this.parseJsonQuery();

		ourQuery = Object.assign({}, query, ourQuery);

		const integrations = Integrations.find(ourQuery, {
			sort: sort ? sort : { _createdAt: 1 },
			skip: offset,
			limit: count,
			fields,
		}).fetch();

		return API.v1.success({
			integrations,
			count: integrations.length,
			offset,
			total: Integrations.find(ourQuery).count(),
		});
	},
});

API.v1.addRoute('channels.history', { authRequired: true }, {
	get() {
		const findResult = findChannelByIdOrName({ params: this.requestParams(), checkedArchived: false });

		let latestDate = new Date();
		if (this.queryParams.latest) {
			latestDate = new Date(this.queryParams.latest);
		}

		let oldestDate = undefined;
		if (this.queryParams.oldest) {
			oldestDate = new Date(this.queryParams.oldest);
		}

		const inclusive = this.queryParams.inclusive || false;

		let count = 20;
		if (this.queryParams.count) {
			count = parseInt(this.queryParams.count);
		}

		let offset = 0;
		if (this.queryParams.offset) {
			offset = parseInt(this.queryParams.offset);
		}

		const unreads = this.queryParams.unreads || false;

		let result;
		Meteor.runAsUser(this.userId, () => {
			result = Meteor.call('getChannelHistory', {
				rid: findResult._id,
				latest: latestDate,
				oldest: oldestDate,
				inclusive,
				offset,
				count,
				unreads,
			});
		});

		if (!result) {
			return API.v1.unauthorized();
		}

		return API.v1.success(result);
	},
});

API.v1.addRoute('channels.info', { authRequired: true }, {
	get() {
		return API.v1.success({
			channel: findChannelByIdOrName({
				params: this.requestParams(),
				checkedArchived: false,
				userId: this.userId,
			}),
		});
	},
});

API.v1.addRoute('channels.invite', { authRequired: true }, {
	post() {
		const findResult = findChannelByIdOrName({ params: this.requestParams() });

		const user = this.getUserFromParams();

		Meteor.runAsUser(this.userId, () => {
			Meteor.call('addUserToRoom', { rid: findResult._id, username: user.username });
		});

		return API.v1.success({
			channel: findChannelByIdOrName({ params: this.requestParams(), userId: this.userId }),
		});
	},
});

API.v1.addRoute('channels.join', { authRequired: true }, {
	post() {
		const findResult = findChannelByIdOrName({ params: this.requestParams() });

		Meteor.runAsUser(this.userId, () => {
			Meteor.call('joinRoom', findResult._id, this.bodyParams.joinCode);
		});

		return API.v1.success({
			channel: findChannelByIdOrName({ params: this.requestParams(), userId: this.userId }),
		});
	},
});

API.v1.addRoute('channels.kick', { authRequired: true }, {
	post() {
		const findResult = findChannelByIdOrName({ params: this.requestParams() });

		const user = this.getUserFromParams();

		Meteor.runAsUser(this.userId, () => {
			Meteor.call('removeUserFromRoom', { rid: findResult._id, username: user.username });
		});

		return API.v1.success({
			channel: findChannelByIdOrName({ params: this.requestParams(), userId: this.userId }),
		});
	},
});

API.v1.addRoute('channels.leave', { authRequired: true }, {
	post() {
		const findResult = findChannelByIdOrName({ params: this.requestParams() });

		Meteor.runAsUser(this.userId, () => {
			Meteor.call('leaveRoom', findResult._id);
		});

		return API.v1.success({
			channel: findChannelByIdOrName({ params: this.requestParams(), userId: this.userId }),
		});
	},
});

API.v1.addRoute('channels.list', { authRequired: true }, {
	get: {
		// This is defined as such only to provide an example of how the routes can be defined :X
		action() {
			const { offset, count } = this.getPaginationItems();
			const { sort, fields, query } = this.parseJsonQuery();
			const hasPermissionToSeeAllPublicChannels = hasPermission(this.userId, 'view-c-room');

			const ourQuery = { ...query, t: 'c' };

			if (!hasPermissionToSeeAllPublicChannels) {
				if (!hasPermission(this.userId, 'view-joined-room')) {
					return API.v1.unauthorized();
				}
				const roomIds = Subscriptions.findByUserIdAndType(this.userId, 'c', { fields: { rid: 1 } }).fetch().map((s) => s.rid);
				ourQuery._id = { $in: roomIds };
			}

			const cursor = Rooms.find(ourQuery, {
				sort: sort ? sort : { name: 1 },
				skip: offset,
				limit: count,
				fields,
			});

			const total = cursor.count();

			const rooms = cursor.fetch();

			return API.v1.success({
				channels: rooms.map((room) => this.composeRoomWithLastMessage(room, this.userId)),
				count: rooms.length,
				offset,
				total,
			});
		},
	},
});

API.v1.addRoute('channels.list.joined', { authRequired: true }, {
	get() {
		const { offset, count } = this.getPaginationItems();
		const { sort, fields } = this.parseJsonQuery();

		// TODO: CACHE: Add Breacking notice since we removed the query param
		const cursor = Rooms.findBySubscriptionTypeAndUserId('c', this.userId, {
			sort: sort ? sort : { name: 1 },
			skip: offset,
			limit: count,
			fields,
		});

		const totalCount = cursor.count();
		const rooms = cursor.fetch();

		return API.v1.success({
			channels: rooms.map((room) => this.composeRoomWithLastMessage(room, this.userId)),
			offset,
			count: rooms.length,
			total: totalCount,
		});
	},
});

API.v1.addRoute('channels.members', { authRequired: true }, {
	get() {
		const findResult = findChannelByIdOrName({
			params: this.requestParams(),
			checkedArchived: false,
		});

		if (findResult.broadcast && !hasPermission(this.userId, 'view-broadcast-member-list')) {
			return API.v1.unauthorized();
		}

		const { offset, count } = this.getPaginationItems();
		const { sort = {} } = this.parseJsonQuery();

		const subscriptions = Subscriptions.findByRoomId(findResult._id, {
			fields: { 'u._id': 1 },
			sort: { 'u.username': sort.username != null ? sort.username : 1 },
			skip: offset,
			limit: count,
		});

		const total = subscriptions.count();

		const members = subscriptions.fetch().map((s) => s.u && s.u._id);

		const users = Users.find({ _id: { $in: members } }, {
			fields: { _id: 1, username: 1, name: 1, status: 1, utcOffset: 1 },
			sort: { username: sort.username != null ? sort.username : 1 },
		}).fetch();

		return API.v1.success({
			members: users,
			count: users.length,
			offset,
			total,
		});
	},
});

API.v1.addRoute('channels.messages', { authRequired: true }, {
	get() {
		const findResult = findChannelByIdOrName({
			params: this.requestParams(),
			checkedArchived: false,
		});
		const { offset, count } = this.getPaginationItems();
		const { sort, fields, query } = this.parseJsonQuery();

		const ourQuery = Object.assign({}, query, { rid: findResult._id });

		// Special check for the permissions
		if (hasPermission(this.userId, 'view-joined-room') && !Subscriptions.findOneByRoomIdAndUserId(findResult._id, this.userId, { fields: { _id: 1 } })) {
			return API.v1.unauthorized();
		}
		if (!hasPermission(this.userId, 'view-c-room')) {
			return API.v1.unauthorized();
		}

		const cursor = Messages.find(ourQuery, {
			sort: sort ? sort : { ts: -1 },
			skip: offset,
			limit: count,
			fields,
		});

		const total = cursor.count();
		const messages = cursor.fetch();

		return API.v1.success({
			messages: messages.map((record) => composeMessageObjectWithUser(record, this.userId)),
			count: messages.length,
			offset,
			total,
		});
	},
});
// TODO: CACHE: I dont like this method( functionality and how we implemented ) its very expensive
// TODO check if this code is better or not
// RocketChat.API.v1.addRoute('channels.online', { authRequired: true }, {
// 	get() {
// 		const { query } = this.parseJsonQuery();
// 		const ourQuery = Object.assign({}, query, { t: 'c' });

// 		const room = RocketChat.models.Rooms.findOne(ourQuery);

// 		if (room == null) {
// 			return RocketChat.API.v1.failure('Channel does not exists');
// 		}

// 		const ids = RocketChat.models.Subscriptions.find({ rid: room._id }, { fields: { 'u._id': 1 } }).fetch().map(sub => sub.u._id);

// 		const online = RocketChat.models.Users.find({
// 			username: { $exists: 1 },
// 			_id: { $in: ids },
// 			status: { $in: ['online', 'away', 'busy'] }
// 		}, {
// 			fields: { username: 1 }
// 		}).fetch();

// 		return RocketChat.API.v1.success({
// 			online
// 		});
// 	}
// });

API.v1.addRoute('channels.online', { authRequired: true }, {
	get() {
		const { query } = this.parseJsonQuery();
		const ourQuery = Object.assign({}, query, { t: 'c' });

		const room = Rooms.findOne(ourQuery);

		if (room == null) {
			return API.v1.failure('Channel does not exists');
		}

		const online = Users.findUsersNotOffline({
			fields: { username: 1 },
		}).fetch();

		const onlineInRoom = [];
		online.forEach((user) => {
			const subscription = Subscriptions.findOneByRoomIdAndUserId(room._id, user._id, { fields: { _id: 1 } });
			if (subscription) {
				onlineInRoom.push({
					_id: user._id,
					username: user.username,
				});
			}
		});

		return API.v1.success({
			online: onlineInRoom,
		});
	},
});

API.v1.addRoute('channels.open', { authRequired: true }, {
	post() {
		const findResult = findChannelByIdOrName({ params: this.requestParams(), checkedArchived: false });

		const sub = Subscriptions.findOneByRoomIdAndUserId(findResult._id, this.userId);

		if (!sub) {
			return API.v1.failure(`The user/callee is not in the channel "${ findResult.name }".`);
		}

		if (sub.open) {
			return API.v1.failure(`The channel, ${ findResult.name }, is already open to the sender`);
		}

		Meteor.runAsUser(this.userId, () => {
			Meteor.call('openRoom', findResult._id);
		});

		return API.v1.success();
	},
});

API.v1.addRoute('channels.removeModerator', { authRequired: true }, {
	post() {
		const findResult = findChannelByIdOrName({ params: this.requestParams() });

		const user = this.getUserFromParams();

		Meteor.runAsUser(this.userId, () => {
			Meteor.call('removeRoomModerator', findResult._id, user._id);
		});

		return API.v1.success();
	},
});

API.v1.addRoute('channels.removeOwner', { authRequired: true }, {
	post() {
		const findResult = findChannelByIdOrName({ params: this.requestParams() });

		const user = this.getUserFromParams();

		Meteor.runAsUser(this.userId, () => {
			Meteor.call('removeRoomOwner', findResult._id, user._id);
		});

		return API.v1.success();
	},
});

API.v1.addRoute('channels.rename', { authRequired: true }, {
	post() {
		if (!this.bodyParams.name || !this.bodyParams.name.trim()) {
			return API.v1.failure('The bodyParam "name" is required');
		}

		const findResult = findChannelByIdOrName({ params: { roomId: this.bodyParams.roomId } });

		if (findResult.name === this.bodyParams.name) {
			return API.v1.failure('The channel name is the same as what it would be renamed to.');
		}

		Meteor.runAsUser(this.userId, () => {
			Meteor.call('saveRoomSettings', findResult._id, 'roomName', this.bodyParams.name);
		});

		return API.v1.success({
			channel: findChannelByIdOrName({ params: { roomId: this.bodyParams.roomId }, userId: this.userId }),
		});
	},
});

API.v1.addRoute('channels.setCustomFields', { authRequired: true }, {
	post() {
		if (!this.bodyParams.customFields || !(typeof this.bodyParams.customFields === 'object')) {
			return API.v1.failure('The bodyParam "customFields" is required with a type like object.');
		}

		const findResult = findChannelByIdOrName({ params: this.requestParams() });

		Meteor.runAsUser(this.userId, () => {
			Meteor.call('saveRoomSettings', findResult._id, 'roomCustomFields', this.bodyParams.customFields);
		});

		return API.v1.success({
			channel: findChannelByIdOrName({ params: this.requestParams(), userId: this.userId }),
		});
	},
});

API.v1.addRoute('channels.setDefault', { authRequired: true }, {
	post() {
		if (typeof this.bodyParams.default === 'undefined') {
			return API.v1.failure('The bodyParam "default" is required', 'error-channels-setdefault-is-same');
		}

		const findResult = findChannelByIdOrName({ params: this.requestParams() });

		if (findResult.default === this.bodyParams.default) {
			return API.v1.failure('The channel default setting is the same as what it would be changed to.', 'error-channels-setdefault-missing-default-param');
		}

		Meteor.runAsUser(this.userId, () => {
			Meteor.call('saveRoomSettings', findResult._id, 'default', this.bodyParams.default.toString());
		});

		return API.v1.success({
			channel: findChannelByIdOrName({ params: this.requestParams(), userId: this.userId }),
		});
	},
});

API.v1.addRoute('channels.setDescription', { authRequired: true }, {
	post() {
		if (!this.bodyParams.description || !this.bodyParams.description.trim()) {
			return API.v1.failure('The bodyParam "description" is required');
		}

		const findResult = findChannelByIdOrName({ params: this.requestParams() });

		if (findResult.description === this.bodyParams.description) {
			return API.v1.failure('The channel description is the same as what it would be changed to.');
		}

		Meteor.runAsUser(this.userId, () => {
			Meteor.call('saveRoomSettings', findResult._id, 'roomDescription', this.bodyParams.description);
		});

		return API.v1.success({
			description: this.bodyParams.description,
		});
	},
});

API.v1.addRoute('channels.setJoinCode', { authRequired: true }, {
	post() {
		if (!this.bodyParams.joinCode || !this.bodyParams.joinCode.trim()) {
			return API.v1.failure('The bodyParam "joinCode" is required');
		}

		const findResult = findChannelByIdOrName({ params: this.requestParams() });

		Meteor.runAsUser(this.userId, () => {
			Meteor.call('saveRoomSettings', findResult._id, 'joinCode', this.bodyParams.joinCode);
		});

		return API.v1.success({
			channel: findChannelByIdOrName({ params: this.requestParams(), userId: this.userId }),
		});
	},
});

API.v1.addRoute('channels.setPurpose', { authRequired: true }, {
	post() {
		if (!this.bodyParams.purpose || !this.bodyParams.purpose.trim()) {
			return API.v1.failure('The bodyParam "purpose" is required');
		}

		const findResult = findChannelByIdOrName({ params: this.requestParams() });

		if (findResult.description === this.bodyParams.purpose) {
			return API.v1.failure('The channel purpose (description) is the same as what it would be changed to.');
		}

		Meteor.runAsUser(this.userId, () => {
			Meteor.call('saveRoomSettings', findResult._id, 'roomDescription', this.bodyParams.purpose);
		});

		return API.v1.success({
			purpose: this.bodyParams.purpose,
		});
	},
});

API.v1.addRoute('channels.setReadOnly', { authRequired: true }, {
	post() {
		if (typeof this.bodyParams.readOnly === 'undefined') {
			return API.v1.failure('The bodyParam "readOnly" is required');
		}

		const findResult = findChannelByIdOrName({ params: this.requestParams() });

		if (findResult.ro === this.bodyParams.readOnly) {
			return API.v1.failure('The channel read only setting is the same as what it would be changed to.');
		}

		Meteor.runAsUser(this.userId, () => {
			Meteor.call('saveRoomSettings', findResult._id, 'readOnly', this.bodyParams.readOnly);
		});

		return API.v1.success({
			channel: findChannelByIdOrName({ params: this.requestParams(), userId: this.userId }),
		});
	},
});

API.v1.addRoute('channels.setTopic', { authRequired: true }, {
	post() {
		if (!this.bodyParams.topic || !this.bodyParams.topic.trim()) {
			return API.v1.failure('The bodyParam "topic" is required');
		}

		const findResult = findChannelByIdOrName({ params: this.requestParams() });

		if (findResult.topic === this.bodyParams.topic) {
			return API.v1.failure('The channel topic is the same as what it would be changed to.');
		}

		Meteor.runAsUser(this.userId, () => {
			Meteor.call('saveRoomSettings', findResult._id, 'roomTopic', this.bodyParams.topic);
		});

		return API.v1.success({
			topic: this.bodyParams.topic,
		});
	},
});

API.v1.addRoute('channels.setAnnouncement', { authRequired: true }, {
	post() {
		if (!this.bodyParams.announcement || !this.bodyParams.announcement.trim()) {
			return API.v1.failure('The bodyParam "announcement" is required');
		}

		const findResult = findChannelByIdOrName({ params: this.requestParams() });

		Meteor.runAsUser(this.userId, () => {
			Meteor.call('saveRoomSettings', findResult._id, 'roomAnnouncement', this.bodyParams.announcement);
		});

		return API.v1.success({
			announcement: this.bodyParams.announcement,
		});
	},
});

API.v1.addRoute('channels.setType', { authRequired: true }, {
	post() {
		if (!this.bodyParams.type || !this.bodyParams.type.trim()) {
			return API.v1.failure('The bodyParam "type" is required');
		}

		const findResult = findChannelByIdOrName({ params: this.requestParams() });

		if (findResult.t === this.bodyParams.type) {
			return API.v1.failure('The channel type is the same as what it would be changed to.');
		}

		Meteor.runAsUser(this.userId, () => {
			Meteor.call('saveRoomSettings', findResult._id, 'roomType', this.bodyParams.type);
		});

		return API.v1.success({
			channel: this.composeRoomWithLastMessage(Rooms.findOneById(findResult._id, { fields: API.v1.defaultFieldsToExclude }), this.userId),
		});
	},
});

API.v1.addRoute('channels.unarchive', { authRequired: true }, {
	post() {
		const findResult = findChannelByIdOrName({ params: this.requestParams(), checkedArchived: false });

		if (!findResult.archived) {
			return API.v1.failure(`The channel, ${ findResult.name }, is not archived`);
		}

		Meteor.runAsUser(this.userId, () => {
			Meteor.call('unarchiveRoom', findResult._id);
		});

		return API.v1.success();
	},
});

API.v1.addRoute('channels.getAllUserMentionsByChannel', { authRequired: true }, {
	get() {
		const { roomId } = this.requestParams();
		const { offset, count } = this.getPaginationItems();
		const { sort } = this.parseJsonQuery();

		if (!roomId) {
			return API.v1.failure('The request param "roomId" is required');
		}

		const mentions = Meteor.runAsUser(this.userId, () => Meteor.call('getUserMentionsByChannel', {
			roomId,
			options: {
				sort: sort ? sort : { ts: 1 },
				skip: offset,
				limit: count,
			},
		}));

		const allMentions = Meteor.runAsUser(this.userId, () => Meteor.call('getUserMentionsByChannel', {
			roomId,
			options: {},
		}));

		return API.v1.success({
			mentions,
			count: mentions.length,
			offset,
			total: allMentions.length,
		});
	},
});

API.v1.addRoute('channels.roles', { authRequired: true }, {
	get() {
		const findResult = findChannelByIdOrName({ params: this.requestParams() });

		const roles = Meteor.runAsUser(this.userId, () => Meteor.call('getRoomRoles', findResult._id));

		return API.v1.success({
			roles,
		});
	},
});

API.v1.addRoute('channels.moderators', { authRequired: true }, {
	get() {
		const findResult = findChannelByIdOrName({ params: this.requestParams() });

		const moderators = Subscriptions.findByRoomIdAndRoles(findResult._id, ['moderator'], { fields: { u: 1 } }).fetch().map((sub) => sub.u);

		return API.v1.success({
			moderators,
		});
	},
});

API.v1.addRoute('channels.addLeader', { authRequired: true }, {
	post() {
		const findResult = findChannelByIdOrName({ params: this.requestParams() });

		const user = this.getUserFromParams();

		Meteor.runAsUser(this.userId, () => {
			Meteor.call('addRoomLeader', findResult._id, user._id);
		});

		return API.v1.success();
	},
});

API.v1.addRoute('channels.removeLeader', { authRequired: true }, {
	post() {
		const findResult = findChannelByIdOrName({ params: this.requestParams() });

		const user = this.getUserFromParams();

		Meteor.runAsUser(this.userId, () => {
			Meteor.call('removeRoomLeader', findResult._id, user._id);
		});

		return API.v1.success();
	},
});

