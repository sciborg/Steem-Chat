import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { TAPi18n } from 'meteor/tap:i18n';
import { hasRole } from '../../../authorization';
import { Info } from '../../../utils';
import { Users } from '../../../models';
import { settings } from '../../../settings';
import { API } from '../api';

import s from 'underscore.string';

// DEPRECATED
// Will be removed after v1.12.0
API.v1.addRoute('info', { authRequired: false }, {
	get() {
		const warningMessage = 'The endpoint "/v1/info" is deprecated and will be removed after version v1.12.0';
		console.warn(warningMessage);
		const user = this.getLoggedInUser();

		if (user && hasRole(user._id, 'admin')) {
			return API.v1.success(this.deprecationWarning({
				endpoint: 'info',
				versionWillBeRemoved: '1.12.0',
				response: {
					info: Info,
				},
			}));
		}

		return API.v1.success(this.deprecationWarning({
			endpoint: 'info',
			versionWillBeRemoved: '1.12.0',
			response: {
				info: {
					version: Info.version,
				},
			},
		}));
	},
});

API.v1.addRoute('me', { authRequired: true }, {
	get() {
		return API.v1.success(this.getUserInfo(Users.findOneById(this.userId)));
	},
});

let onlineCache = 0;
let onlineCacheDate = 0;
const cacheInvalid = 60000; // 1 minute
API.v1.addRoute('shield.svg', { authRequired: false }, {
	get() {
		const { type, icon } = this.queryParams;
		let { channel, name } = this.queryParams;
		if (!settings.get('API_Enable_Shields')) {
			throw new Meteor.Error('error-endpoint-disabled', 'This endpoint is disabled', { route: '/api/v1/shield.svg' });
		}

		const types = settings.get('API_Shield_Types');
		if (type && (types !== '*' && !types.split(',').map((t) => t.trim()).includes(type))) {
			throw new Meteor.Error('error-shield-disabled', 'This shield type is disabled', { route: '/api/v1/shield.svg' });
		}

		const hideIcon = icon === 'false';
		if (hideIcon && (!name || !name.trim())) {
			return API.v1.failure('Name cannot be empty when icon is hidden');
		}

		let text;
		let backgroundColor = '#4c1';
		switch (type) {
			case 'online':
				if (Date.now() - onlineCacheDate > cacheInvalid) {
					onlineCache = Users.findUsersNotOffline().count();
					onlineCacheDate = Date.now();
				}

				text = `${ onlineCache } ${ TAPi18n.__('Online') }`;
				break;
			case 'channel':
				if (!channel) {
					return API.v1.failure('Shield channel is required for type "channel"');
				}

				text = `#${ channel }`;
				break;
			case 'user':
				const user = this.getUserFromParams();

				// Respect the server's choice for using their real names or not
				if (user.name && settings.get('UI_Use_Real_Name')) {
					text = `${ user.name }`;
				} else {
					text = `@${ user.username }`;
				}

				switch (user.status) {
					case 'online':
						backgroundColor = '#1fb31f';
						break;
					case 'away':
						backgroundColor = '#dc9b01';
						break;
					case 'busy':
						backgroundColor = '#bc2031';
						break;
					case 'offline':
						backgroundColor = '#a5a1a1';
				}
				break;
			default:
				text = TAPi18n.__('Join_Chat').toUpperCase();
		}

		const iconSize = hideIcon ? 7 : 24;
		const leftSize = name ? name.length * 6 + 7 + iconSize : iconSize;
		const rightSize = text.length * 6 + 20;
		const width = leftSize + rightSize;
		const height = 20;

		channel = s.escapeHTML(channel);
		text = s.escapeHTML(text);
		name = s.escapeHTML(name);

		return {
			headers: { 'Content-Type': 'image/svg+xml;charset=utf-8' },
			body: `
				<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${ width }" height="${ height }">
					<linearGradient id="b" x2="0" y2="100%">
						<stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
						<stop offset="1" stop-opacity=".1"/>
					</linearGradient>
					<mask id="a">
						<rect width="${ width }" height="${ height }" rx="3" fill="#fff"/>
					</mask>
					<g mask="url(#a)">
						<path fill="#555" d="M0 0h${ leftSize }v${ height }H0z"/>
						<path fill="${ backgroundColor }" d="M${ leftSize } 0h${ rightSize }v${ height }H${ leftSize }z"/>
						<path fill="url(#b)" d="M0 0h${ width }v${ height }H0z"/>
					</g>
						${ hideIcon ? '' : '<image x="5" y="3" width="14" height="14" xlink:href="/assets/favicon.svg"/>' }
					<g fill="#fff" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
						${ name ? `<text x="${ iconSize }" y="15" fill="#010101" fill-opacity=".3">${ name }</text>
						<text x="${ iconSize }" y="14">${ name }</text>` : '' }
						<text x="${ leftSize + 7 }" y="15" fill="#010101" fill-opacity=".3">${ text }</text>
						<text x="${ leftSize + 7 }" y="14">${ text }</text>
					</g>
				</svg>
			`.trim().replace(/\>[\s]+\</gm, '><'),
		};
	},
});

API.v1.addRoute('spotlight', { authRequired: true }, {
	get() {
		check(this.queryParams, {
			query: String,
		});

		const { query } = this.queryParams;

		const result = Meteor.runAsUser(this.userId, () =>
			Meteor.call('spotlight', query)
		);

		return API.v1.success(result);
	},
});

API.v1.addRoute('directory', { authRequired: true }, {
	get() {
		const { offset, count } = this.getPaginationItems();
		const { sort, query } = this.parseJsonQuery();

		const { text, type, workspace = 'local' } = query;
		if (sort && Object.keys(sort).length > 1) {
			return API.v1.failure('This method support only one "sort" parameter');
		}
		const sortBy = sort ? Object.keys(sort)[0] : undefined;
		const sortDirection = sort && Object.values(sort)[0] === 1 ? 'asc' : 'desc';

		const result = Meteor.runAsUser(this.userId, () => Meteor.call('browseChannels', {
			text,
			type,
			workspace,
			sortBy,
			sortDirection,
			offset: Math.max(0, offset),
			limit: Math.max(0, count),
		}));

		if (!result) {
			return API.v1.failure('Please verify the parameters');
		}
		return API.v1.success({
			result: result.results,
			count: result.results.length,
			offset,
			total: result.total,
		});
	},
});
