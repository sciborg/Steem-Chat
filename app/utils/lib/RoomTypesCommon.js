import { Meteor } from 'meteor/meteor';
import { RoomTypeConfig } from './RoomTypeConfig';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { roomExit } from './roomExit';

export class RoomTypesCommon {
	constructor() {
		this.roomTypes = {};
		this.roomTypesOrder = [];
		this.mainOrder = 1;
	}

	/**
	 * Adds a room type to the application.
	 *
	 * @param {RoomTypeConfig} roomConfig
	 * @returns {void}
	 */
	add(roomConfig) {
		if (!(roomConfig instanceof RoomTypeConfig)) {
			throw new Error('Invalid Room Configuration object, it must extend "RoomTypeConfig"');
		}

		if (this.roomTypes[roomConfig.identifier]) {
			return false;
		}

		if (!roomConfig.order) {
			roomConfig.order = this.mainOrder + 10;
			this.mainOrder += 10;
		}

		this.roomTypesOrder.push({
			identifier: roomConfig.identifier,
			order: roomConfig.order,
		});

		this.roomTypes[roomConfig.identifier] = roomConfig;

		if (roomConfig.route && roomConfig.route.path && roomConfig.route.name && roomConfig.route.action) {
			const routeConfig = {
				name: roomConfig.route.name,
				action: roomConfig.route.action,
			};

			if (Meteor.isClient) {
				routeConfig.triggersExit = [roomExit];
			}

			return FlowRouter.route(roomConfig.route.path, routeConfig);
		}
	}

	hasCustomLink(roomType) {
		return this.roomTypes[roomType] && this.roomTypes[roomType].route && this.roomTypes[roomType].route.link != null;
	}

	/**
	 * @param {string} roomType room type (e.g.: c (for channels), d (for direct channels))
	 * @param {object} subData the user's subscription data
	 */
	getRouteLink(roomType, subData) {
		const routeData = this.getRouteData(roomType, subData);
		if (!routeData) {
			return false;
		}

		return FlowRouter.path(this.roomTypes[roomType].route.name, routeData);
	}

	/**
	 * @param {string} roomType room type (e.g.: c (for channels), d (for direct channels))
	 * @param {RoomTypeConfig} roomConfig room's type configuration
	 */
	getConfig(roomType) {
		return this.roomTypes[roomType];
	}

	/**
	 * @param {string} roomType room type (e.g.: c (for channels), d (for direct channels))
	 * @param {object} subData the user's subscription data
	 */
	getURL(roomType, subData) {
		const routeData = this.getRouteData(roomType, subData);
		if (!routeData) {
			return false;
		}

		return FlowRouter.url(this.roomTypes[roomType].route.name, routeData);
	}

	getRouteData(roomType, subData) {
		if (!this.roomTypes[roomType]) {
			return false;
		}

		let routeData = {};
		if (this.roomTypes[roomType] && this.roomTypes[roomType].route && this.roomTypes[roomType].route.link) {
			routeData = this.roomTypes[roomType].route.link(subData);
		} else if (subData && subData.name) {
			routeData = {
				name: subData.name,
			};
		}

		return routeData;
	}
}
