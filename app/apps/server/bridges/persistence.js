export class AppPersistenceBridge {
	constructor(orch) {
		this.orch = orch;
	}

	async purge(appId) {
		this.orch.debugLog(`The App's persistent storage is being purged: ${ appId }`);

		this.orch.getPersistenceModel().remove({ appId });
	}

	async create(data, appId) {
		this.orch.debugLog(`The App ${ appId } is storing a new object in their persistence.`, data);

		if (typeof data !== 'object') {
			throw new Error('Attempted to store an invalid data type, it must be an object.');
		}

		return this.orch.getPersistenceModel().insert({ appId, data });
	}

	async createWithAssociations(data, associations, appId) {
		this.orch.debugLog(`The App ${ appId } is storing a new object in their persistence that is associated with some models.`, data, associations);

		if (typeof data !== 'object') {
			throw new Error('Attempted to store an invalid data type, it must be an object.');
		}

		return this.orch.getPersistenceModel().insert({ appId, associations, data });
	}

	async readById(id, appId) {
		this.orch.debugLog(`The App ${ appId } is reading their data in their persistence with the id: "${ id }"`);

		const record = this.orch.getPersistenceModel().findOneById(id);

		return record.data;
	}

	async readByAssociations(associations, appId) {
		this.orch.debugLog(`The App ${ appId } is searching for records that are associated with the following:`, associations);

		const records = this.orch.getPersistenceModel().find({
			appId,
			associations: { $all: associations },
		}).fetch();

		return Array.isArray(records) ? records.map((r) => r.data) : [];
	}

	async remove(id, appId) {
		this.orch.debugLog(`The App ${ appId } is removing one of their records by the id: "${ id }"`);

		const record = this.orch.getPersistenceModel().findOne({ _id: id, appId });

		if (!record) {
			return undefined;
		}

		this.orch.getPersistenceModel().remove({ _id: id, appId });

		return record.data;
	}

	async removeByAssociations(associations, appId) {
		this.orch.debugLog(`The App ${ appId } is removing records with the following associations:`, associations);

		const query = {
			appId,
			associations: {
				$all: associations,
			},
		};

		const records = this.orch.getPersistenceModel().find(query).fetch();

		if (!records) {
			return undefined;
		}

		this.orch.getPersistenceModel().remove(query);

		return Array.isArray(records) ? records.map((r) => r.data) : [];
	}

	async update(id, data, upsert, appId) {
		this.orch.debugLog(`The App ${ appId } is updating the record "${ id }" to:`, data);

		if (typeof data !== 'object') {
			throw new Error('Attempted to store an invalid data type, it must be an object.');
		}

		throw new Error('Not implemented.');
	}

	async updateByAssociations(associations, data, upsert, appId) {
		this.orch.debugLog(`The App ${ appId } is updating the record with association to data as follows:`, associations, data);

		if (typeof data !== 'object') {
			throw new Error('Attempted to store an invalid data type, it must be an object.');
		}

		const query = {
			appId,
			associations,
		};

		return this.orch.getPersistenceModel().upsert(query, { $set: { data } }, { upsert });
	}
}
