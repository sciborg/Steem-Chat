import { createRoom } from '../../../lib';
import { Rooms, Subscriptions, Users } from '../../../models';

import { FederatedResource } from './FederatedResource';
import { FederatedUser } from './FederatedUser';

export class FederatedRoom extends FederatedResource {
	constructor(localPeerIdentifier, room, extras = {}) {
		super('room');

		if (!room) {
			throw new Error('room param cannot be empty');
		}

		this.localPeerIdentifier = localPeerIdentifier;

		// Make sure room dates are correct
		room.ts = new Date(room.ts);
		room._updatedAt = new Date(room._updatedAt);

		// Set the name
		if (room.t !== 'd' && room.name.indexOf('@') === -1) {
			room.name = `${ room.name }@${ localPeerIdentifier }`;
		}

		// Set the federated owner, if there is one
		const { owner } = extras;

		if (owner) {
			this.federatedOwner = FederatedUser.loadOrCreate(localPeerIdentifier, owner);
		} else if (!owner && room.federation && room.federation.ownerId) {
			this.federatedOwner = FederatedUser.loadByFederationId(localPeerIdentifier, room.federation.ownerId);
		}

		// Set base federation
		room.federation = room.federation || {
			_id: room._id,
			peer: localPeerIdentifier,
			ownerId: this.federatedOwner ? this.federatedOwner.getFederationId() : null,
		};

		// Keep room's owner id
		this.federationOwnerId = room.federation && room.federation.ownerId;

		// Set room property
		this.room = room;
	}

	getFederationId() {
		return this.room.federation._id;
	}

	getPeers() {
		return this.room.federation.peers;
	}

	getRoom() {
		return this.room;
	}

	getOwner() {
		return this.federatedOwner ? this.federatedOwner.getUser() : null;
	}

	getUsers() {
		return this.federatedUsers.map((u) => u.getUser());
	}

	loadUsers() {
		const { room } = this;

		// Get all room users
		const users = FederatedRoom.loadRoomUsers(room);

		this.setUsers(users);
	}

	setUsers(users) {
		const { localPeerIdentifier } = this;

		// Initialize federatedUsers
		this.federatedUsers = [];

		for (const user of users) {
			const federatedUser = FederatedUser.loadOrCreate(localPeerIdentifier, user);

			// Set owner if it does not exist
			if (!this.federatedOwner && user._id === this.federationOwnerId) {
				this.federatedOwner = federatedUser;
				this.room.federation.ownerId = this.federatedOwner.getFederationId();
			}

			// Keep the federated user
			this.federatedUsers.push(federatedUser);
		}
	}

	refreshFederation() {
		const { room } = this;

		// Prepare the federated users
		let federation = {
			peers: [],
			users: [],
		};

		// Check all the peers
		for (const federatedUser of this.federatedUsers) {
			// Add federation data to the room
			const { user: { federation: { _id, peer } } } = federatedUser;

			federation.peers.push(peer);
			federation.users.push({ _id, peer });
		}

		federation.peers = [...new Set(federation.peers)];

		federation = Object.assign(room.federation || {}, federation);

		// Prepare the room
		room.federation = federation;

		// Update the room
		Rooms.update(room._id, { $set: { federation } });
	}

	getLocalRoom() {
		this.log('getLocalRoom');

		const { localPeerIdentifier, room, room: { federation } } = this;

		const localRoom = Object.assign({}, room);

		if (federation.peer === localPeerIdentifier) {
			if (localRoom.t !== 'd') {
				localRoom.name = room.name.split('@')[0];
			}
		}

		return localRoom;
	}

	createUsers() {
		this.log('createUsers');

		const { federatedUsers } = this;

		// Create, if needed, all room's users
		for (const federatedUser of federatedUsers) {
			federatedUser.create();
		}
	}

	create(alertAndOpen = false) {
		this.log('create');

		// Get the local room object (with or without suffixes)
		const localRoomObject = this.getLocalRoom();

		// Grab the federation id
		const { federation: { _id: federationId } } = localRoomObject;

		// Check if the user exists
		let localRoom = FederatedRoom.loadByFederationId(this.localPeerIdentifier, federationId);

		// Create if needed
		if (!localRoom) {
			delete localRoomObject._id;

			localRoom = localRoomObject;

			const { t: type, name, broadcast, customFields, federation, sysMes } = localRoom;
			const { federatedOwner, federatedUsers } = this;

			// Get usernames for the owner and members
			const ownerUsername = federatedOwner.user.username;
			const members = [];

			if (type !== 'd') {
				for (const federatedUser of federatedUsers) {
					const localUser = federatedUser.getLocalUser();
					members.push(localUser.username);
				}
			} else {
				for (const federatedUser of federatedUsers) {
					const localUser = federatedUser.getLocalUser();
					members.push(localUser);
				}
			}

			// Is this a broadcast channel? Then mute everyone but the owner
			let muted = [];

			if (broadcast) {
				muted = members.filter((u) => u !== ownerUsername);
			}

			// Set the extra data and create room options
			let extraData = {
				federation,
			};

			let createRoomOptions = {
				subscriptionExtra: {
					alert: alertAndOpen,
					open: alertAndOpen,
				},
			};

			if (type !== 'd') {
				extraData = Object.assign(extraData, {
					broadcast,
					customFields,
					encrypted: false, // Always false for now
					muted,
					sysMes,
				});

				createRoomOptions = Object.assign(extraData, {
					nameValidationRegex: '^[0-9a-zA-Z-_.@]+$',
					subscriptionExtra: {
						alert: true,
					},
				});
			}

			// Create the room
			// !!!! Forcing direct or private only, no public rooms for now
			const { rid } = createRoom(type === 'd' ? type : 'p', name, ownerUsername, members, false, extraData, createRoomOptions);

			localRoom._id = rid;
		}

		return localRoom;
	}
}

FederatedRoom.loadByFederationId = function _loadByFederationId(localPeerIdentifier, federationId) {
	const localRoom = Rooms.findOne({ 'federation._id': federationId });

	if (!localRoom) { return; }

	return new FederatedRoom(localPeerIdentifier, localRoom);
};

FederatedRoom.loadRoomUsers = function _loadRoomUsers(room) {
	const subscriptions = Subscriptions.findByRoomIdWhenUsernameExists(room._id, { fields: { 'u._id': 1 } }).fetch();
	const userIds = subscriptions.map((s) => s.u._id);
	return Users.findUsersWithUsernameByIds(userIds).fetch();
};

FederatedRoom.isFederated = function _isFederated(localPeerIdentifier, room, options = {}) {
	this.log('federated-room', `${ room._id } - isFederated?`);

	let isFederated = false;

	if (options.checkUsingUsers) {
		// Get all room users
		const users = FederatedRoom.loadRoomUsers(room);

		// Check all the users
		for (const user of users) {
			if (user.federation && user.federation.peer !== localPeerIdentifier) {
				isFederated = true;
				break;
			}
		}
	} else {
		isFederated = room.federation && room.federation.peers.length > 1;
	}

	this.log('federated-room', `${ room._id } - isFederated? ${ isFederated ? 'yes' : 'no' }`);

	return isFederated;
};
