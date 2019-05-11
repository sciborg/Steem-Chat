import { MongoInternals } from 'meteor/mongo';

function fallbackMongoInfo() {
	let mongoVersion;
	let mongoStorageEngine;

	const { mongo } = MongoInternals.defaultRemoteCollectionDriver();

	const oplogEnabled = Boolean(mongo._oplogHandle && mongo._oplogHandle.onOplogEntry);

	try {
		const { version } = Promise.await(mongo.db.command({ buildinfo: 1 }));
		mongoVersion = version;
		mongoStorageEngine = 'unknown';
	} catch (e) {
		console.error('=== Error getting MongoDB info ===');
		console.error(e && e.toString());
		console.error('----------------------------------');
		console.error('Without mongodb version we can\'t ensure you are running a compatible version.');
		console.error('If you are running your mongodb with auth enabled and an user different from admin');
		console.error('you may need to grant permissions for this user to check cluster data.');
		console.error('You can do it via mongo shell running the following command replacing');
		console.error('the string YOUR_USER by the correct user\'s name:');
		console.error('');
		console.error('   db.runCommand({ grantRolesToUser: "YOUR_USER" , roles: [{role: "clusterMonitor", db: "admin"}]})');
		console.error('');
		console.error('==================================');
	}

	return { oplogEnabled, mongoVersion, mongoStorageEngine };
}

export function getMongoInfo() {
	let mongoVersion;
	let mongoStorageEngine;

	const { mongo } = MongoInternals.defaultRemoteCollectionDriver();

	const oplogEnabled = Boolean(mongo._oplogHandle && mongo._oplogHandle.onOplogEntry);

	try {
		const { version, storageEngine } = Promise.await(mongo.db.command({ serverStatus: 1 }));

		mongoVersion = version;
		mongoStorageEngine = storageEngine.name;

	} catch (e) {
		return fallbackMongoInfo();
	}

	return { oplogEnabled, mongoVersion, mongoStorageEngine };
}


