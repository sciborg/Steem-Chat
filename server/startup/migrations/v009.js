import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { Migrations } from '../../../app/migrations';
import { Rooms, Subscriptions, Messages, Settings, OEmbedCache } from '../../../app/models';

Migrations.add({
	version: 9,
	up() {
		// Migrate existing source collection data to target collection
		// target collection is defined in collections.coffee using the new collection name
		// source collection is dropped after data migration
		const toMigrate = [
			{
				source: new Mongo.Collection('data.ChatRoom'),
				target: Rooms.model,
			}, {
				source: new Mongo.Collection('data.ChatSubscription'),
				target: Subscriptions.model,
			}, {
				source: new Mongo.Collection('data.ChatMessage'),
				target: Messages.model,
			}, {
				source: new Mongo.Collection('settings'),
				target: Settings.model,
			}, {
				// this collection may not exit
				source: new Mongo.Collection('oembed_cache'),
				target: OEmbedCache.model,
			},
		];

		return toMigrate.forEach((collection) => {
			const { target, source } = collection;

			// rawCollection available as of Meteor 1.0.4
			console.log(`Migrating data from: ${ source.rawCollection().collectionName } to: ${ target.rawCollection().collectionName }`);

			source.find().forEach((doc) =>
				// use upsert to account for GENERAL room created by initialData
				target.upsert({
					_id: doc._id,
				}, doc)
			);

			const rawSource = source.rawCollection();

			return Meteor.wrapAsync(rawSource.drop, rawSource)(function(err/* , res*/) {
				if (err) {
					return console.log(`Error dropping ${ rawSource.collectionName } collection due to: ${ err.errmsg }`);
				}
			});

			// Note: the following would have been much easier, but didn't work.  The serverside
			// data was not published to the client for some reason.
			// newName = target.rawCollection().collectionName
			// Meteor.wrapAsync(rawSource.rename, rawSource )(newName, {dropTarget:true})
		});
	},
});
