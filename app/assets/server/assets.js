import { Meteor } from 'meteor/meteor';
import { WebApp, WebAppInternals } from 'meteor/webapp';
import { settings } from '../../settings';
import { Settings } from '../../models';
import { getURL } from '../../utils/lib/getURL';
import { mime } from '../../utils/lib/mimeTypes';
import { hasPermission } from '../../authorization';
import { RocketChatFile } from '../../file';
import { WebAppHashing } from 'meteor/webapp-hashing';

import _ from 'underscore';
import sizeOf from 'image-size';
import crypto from 'crypto';
import sharp from 'sharp';

const RocketChatAssetsInstance = new RocketChatFile.GridFS({
	name: 'assets',
});

const assets = {
	logo: {
		label: 'logo (svg, png, jpg)',
		defaultUrl: 'images/logo/logo.svg',
		constraints: {
			type: 'image',
			extensions: ['svg', 'png', 'jpg', 'jpeg'],
			width: undefined,
			height: undefined,
		},
		wizard: {
			step: 3,
			order: 2,
		},
	},
	background: {
		label: 'login background (svg, png, jpg)',
		defaultUrl: undefined,
		constraints: {
			type: 'image',
			extensions: ['svg', 'png', 'jpg', 'jpeg'],
			width: undefined,
			height: undefined,
		},
	},
	favicon_ico: {
		label: 'favicon (ico)',
		defaultUrl: 'favicon.ico',
		constraints: {
			type: 'image',
			extensions: ['ico'],
			width: undefined,
			height: undefined,
		},
	},
	favicon: {
		label: 'favicon (svg)',
		defaultUrl: 'images/logo/icon.svg',
		constraints: {
			type: 'image',
			extensions: ['svg'],
			width: undefined,
			height: undefined,
		},
	},
	favicon_16: {
		label: 'favicon 16x16 (png)',
		defaultUrl: 'images/logo/favicon-16x16.png',
		constraints: {
			type: 'image',
			extensions: ['png'],
			width: 16,
			height: 16,
		},
	},
	favicon_32: {
		label: 'favicon 32x32 (png)',
		defaultUrl: 'images/logo/favicon-32x32.png',
		constraints: {
			type: 'image',
			extensions: ['png'],
			width: 32,
			height: 32,
		},
	},
	favicon_192: {
		label: 'android-chrome 192x192 (png)',
		defaultUrl: 'images/logo/android-chrome-192x192.png',
		constraints: {
			type: 'image',
			extensions: ['png'],
			width: 192,
			height: 192,
		},
	},
	favicon_512: {
		label: 'android-chrome 512x512 (png)',
		defaultUrl: 'images/logo/android-chrome-512x512.png',
		constraints: {
			type: 'image',
			extensions: ['png'],
			width: 512,
			height: 512,
		},
	},
	touchicon_180: {
		label: 'apple-touch-icon 180x180 (png)',
		defaultUrl: 'images/logo/apple-touch-icon.png',
		constraints: {
			type: 'image',
			extensions: ['png'],
			width: 180,
			height: 180,
		},
	},
	touchicon_180_pre: {
		label: 'apple-touch-icon-precomposed 180x180 (png)',
		defaultUrl: 'images/logo/apple-touch-icon-precomposed.png',
		constraints: {
			type: 'image',
			extensions: ['png'],
			width: 180,
			height: 180,
		},
	},
	tile_70: {
		label: 'mstile 70x70 (png)',
		defaultUrl: 'images/logo/mstile-70x70.png',
		constraints: {
			type: 'image',
			extensions: ['png'],
			width: 70,
			height: 70,
		},
	},
	tile_144: {
		label: 'mstile 144x144 (png)',
		defaultUrl: 'images/logo/mstile-144x144.png',
		constraints: {
			type: 'image',
			extensions: ['png'],
			width: 144,
			height: 144,
		},
	},
	tile_150: {
		label: 'mstile 150x150 (png)',
		defaultUrl: 'images/logo/mstile-150x150.png',
		constraints: {
			type: 'image',
			extensions: ['png'],
			width: 150,
			height: 150,
		},
	},
	tile_310_square: {
		label: 'mstile 310x310 (png)',
		defaultUrl: 'images/logo/mstile-310x310.png',
		constraints: {
			type: 'image',
			extensions: ['png'],
			width: 310,
			height: 310,
		},
	},
	tile_310_wide: {
		label: 'mstile 310x150 (png)',
		defaultUrl: 'images/logo/mstile-310x150.png',
		constraints: {
			type: 'image',
			extensions: ['png'],
			width: 310,
			height: 150,
		},
	},
	safari_pinned: {
		label: 'safari pinned tab (svg)',
		defaultUrl: 'images/logo/safari-pinned-tab.svg',
		constraints: {
			type: 'image',
			extensions: ['svg'],
			width: undefined,
			height: undefined,
		},
	},
};

export const RocketChatAssets = new (class {
	get mime() {
		return mime;
	}

	get assets() {
		return assets;
	}

	setAsset(binaryContent, contentType, asset) {
		if (!assets[asset]) {
			throw new Meteor.Error('error-invalid-asset', 'Invalid asset', {
				function: 'RocketChat.Assets.setAsset',
			});
		}

		const extension = mime.extension(contentType);
		if (assets[asset].constraints.extensions.includes(extension) === false) {
			throw new Meteor.Error(contentType, `Invalid file type: ${ contentType }`, {
				function: 'RocketChat.Assets.setAsset',
				errorTitle: 'error-invalid-file-type',
			});
		}

		const file = new Buffer(binaryContent, 'binary');
		if (assets[asset].constraints.width || assets[asset].constraints.height) {
			const dimensions = sizeOf(file);
			if (assets[asset].constraints.width && assets[asset].constraints.width !== dimensions.width) {
				throw new Meteor.Error('error-invalid-file-width', 'Invalid file width', {
					function: 'Invalid file width',
				});
			}
			if (assets[asset].constraints.height && assets[asset].constraints.height !== dimensions.height) {
				throw new Meteor.Error('error-invalid-file-height');
			}
		}

		const rs = RocketChatFile.bufferToStream(file);
		RocketChatAssetsInstance.deleteFile(asset);

		const ws = RocketChatAssetsInstance.createWriteStream(asset, contentType);
		ws.on('end', Meteor.bindEnvironment(function() {
			return Meteor.setTimeout(function() {
				const key = `Assets_${ asset }`;
				const value = {
					url: `assets/${ asset }.${ extension }`,
					defaultUrl: assets[asset].defaultUrl,
				};

				settings.updateById(key, value);
				return RocketChatAssets.processAsset(key, value);
			}, 200);
		}));

		rs.pipe(ws);
	}

	unsetAsset(asset) {
		if (!assets[asset]) {
			throw new Meteor.Error('error-invalid-asset', 'Invalid asset', {
				function: 'RocketChat.Assets.unsetAsset',
			});
		}

		RocketChatAssetsInstance.deleteFile(asset);
		const key = `Assets_${ asset }`;
		const value = {
			defaultUrl: assets[asset].defaultUrl,
		};

		settings.updateById(key, value);
		RocketChatAssets.processAsset(key, value);
	}

	refreshClients() {
		return process.emit('message', {
			refresh: 'client',
		});
	}

	processAsset(settingKey, settingValue) {
		if (settingKey.indexOf('Assets_') !== 0) {
			return;
		}

		const assetKey = settingKey.replace(/^Assets_/, '');
		const assetValue = assets[assetKey];

		if (!assetValue) {
			return;
		}

		if (!settingValue || !settingValue.url) {
			assetValue.cache = undefined;
			return;
		}

		const file = RocketChatAssetsInstance.getFileSync(assetKey);
		if (!file) {
			assetValue.cache = undefined;
			return;
		}

		const hash = crypto.createHash('sha1').update(file.buffer).digest('hex');
		const extension = settingValue.url.split('.').pop();

		return assetValue.cache = {
			path: `assets/${ assetKey }.${ extension }`,
			cacheable: false,
			sourceMapUrl: undefined,
			where: 'client',
			type: 'asset',
			content: file.buffer,
			extension,
			url: `/assets/${ assetKey }.${ extension }?${ hash }`,
			size: file.length,
			uploadDate: file.uploadDate,
			contentType: file.contentType,
			hash,
		};
	}

	getURL(assetName, options = { cdn: false, full: true }) {
		const asset = settings.get(assetName);
		const url = asset.url || asset.defaultUrl;

		return getURL(url, options);
	}
});

settings.addGroup('Assets');

settings.add('Assets_SvgFavicon_Enable', true, {
	type: 'boolean',
	group: 'Assets',
	i18nLabel: 'Enable_Svg_Favicon',
});

function addAssetToSetting(asset, value) {
	const key = `Assets_${ asset }`;

	settings.add(key, {
		defaultUrl: value.defaultUrl,
	}, {
		type: 'asset',
		group: 'Assets',
		fileConstraints: value.constraints,
		i18nLabel: value.label,
		asset,
		public: true,
		wizard: value.wizard,
	});

	const currentValue = settings.get(key);

	if (typeof currentValue === 'object' && currentValue.defaultUrl !== assets[asset].defaultUrl) {
		currentValue.defaultUrl = assets[asset].defaultUrl;
		settings.updateById(key, currentValue);
	}
}

for (const key of Object.keys(assets)) {
	const value = assets[key];
	addAssetToSetting(key, value);
}

Settings.find().observe({
	added(record) {
		return RocketChatAssets.processAsset(record._id, record.value);
	},

	changed(record) {
		return RocketChatAssets.processAsset(record._id, record.value);
	},

	removed(record) {
		return RocketChatAssets.processAsset(record._id, undefined);
	},
});

Meteor.startup(function() {
	return Meteor.setTimeout(function() {
		return process.emit('message', {
			refresh: 'client',
		});
	}, 200);
});

const { calculateClientHash } = WebAppHashing;

WebAppHashing.calculateClientHash = function(manifest, includeFilter, runtimeConfigOverride) {
	for (const key of Object.keys(assets)) {
		const value = assets[key];
		if (!value.cache && !value.defaultUrl) {
			continue;
		}

		let cache = {};
		if (value.cache) {
			cache = {
				path: value.cache.path,
				cacheable: value.cache.cacheable,
				sourceMapUrl: value.cache.sourceMapUrl,
				where: value.cache.where,
				type: value.cache.type,
				url: value.cache.url,
				size: value.cache.size,
				hash: value.cache.hash,
			};
		} else {
			const extension = value.defaultUrl.split('.').pop();
			cache = {
				path: `assets/${ key }.${ extension }`,
				cacheable: false,
				sourceMapUrl: undefined,
				where: 'client',
				type: 'asset',
				url: `/assets/${ key }.${ extension }?v3`,
				hash: 'v3',
			};
		}

		const manifestItem = _.findWhere(manifest, {
			path: key,
		});

		if (manifestItem) {
			const index = manifest.indexOf(manifestItem);
			manifest[index] = cache;
		} else {
			manifest.push(cache);
		}
	}

	return calculateClientHash.call(this, manifest, includeFilter, runtimeConfigOverride);
};

Meteor.methods({
	refreshClients() {
		if (!Meteor.userId()) {
			throw new Meteor.Error('error-invalid-user', 'Invalid user', {
				method: 'refreshClients',
			});
		}

		const _hasPermission = hasPermission(Meteor.userId(), 'manage-assets');
		if (!_hasPermission) {
			throw new Meteor.Error('error-action-not-allowed', 'Managing assets not allowed', {
				method: 'refreshClients',
				action: 'Managing_assets',
			});
		}

		return RocketChatAssets.refreshClients();
	},

	unsetAsset(asset) {
		if (!Meteor.userId()) {
			throw new Meteor.Error('error-invalid-user', 'Invalid user', {
				method: 'unsetAsset',
			});
		}

		const _hasPermission = hasPermission(Meteor.userId(), 'manage-assets');
		if (!_hasPermission) {
			throw new Meteor.Error('error-action-not-allowed', 'Managing assets not allowed', {
				method: 'unsetAsset',
				action: 'Managing_assets',
			});
		}

		return RocketChatAssets.unsetAsset(asset);
	},

	setAsset(binaryContent, contentType, asset) {
		if (!Meteor.userId()) {
			throw new Meteor.Error('error-invalid-user', 'Invalid user', {
				method: 'setAsset',
			});
		}

		const _hasPermission = hasPermission(Meteor.userId(), 'manage-assets');
		if (!_hasPermission) {
			throw new Meteor.Error('error-action-not-allowed', 'Managing assets not allowed', {
				method: 'setAsset',
				action: 'Managing_assets',
			});
		}

		RocketChatAssets.setAsset(binaryContent, contentType, asset);
	},
});

WebApp.connectHandlers.use('/assets/', Meteor.bindEnvironment(function(req, res, next) {
	const params = {
		asset: decodeURIComponent(req.url.replace(/^\//, '').replace(/\?.*$/, '')).replace(/\.[^.]*$/, ''),
	};

	const file = assets[params.asset] && assets[params.asset].cache;

	const format = req.url.replace(/.*\.([a-z]+)$/, '$1');

	if (!file) {
		const defaultUrl = assets[params.asset] && assets[params.asset].defaultUrl;
		if (defaultUrl) {
			const assetUrl = format && ['png', 'svg'].includes(format) ? defaultUrl.replace(/(svg|png)$/, format) : defaultUrl;
			req.url = `/${ assetUrl }`;
			WebAppInternals.staticFilesMiddleware(WebAppInternals.staticFiles, req, res, next);
		} else {
			res.writeHead(404);
			res.end();
		}

		return;
	}

	const reqModifiedHeader = req.headers['if-modified-since'];
	if (reqModifiedHeader) {
		if (reqModifiedHeader === (file.uploadDate && file.uploadDate.toUTCString())) {
			res.setHeader('Last-Modified', reqModifiedHeader);
			res.writeHead(304);
			res.end();
			return;
		}
	}

	res.setHeader('Cache-Control', 'public, max-age=0');
	res.setHeader('Expires', '-1');

	if (format && format !== file.extension && ['png', 'jpg', 'jpeg'].includes(format)) {
		res.setHeader('Content-Type', `image/${ format }`);
		sharp(file.content)
			.toFormat(format)
			.pipe(res);
		return;
	}

	res.setHeader('Last-Modified', (file.uploadDate && file.uploadDate.toUTCString()) || new Date().toUTCString());
	res.setHeader('Content-Type', file.contentType);
	res.setHeader('Content-Length', file.size);
	res.writeHead(200);
	res.end(file.content);
}));
