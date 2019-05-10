import { api, request, credentials, integration } from '../../data/api-data.js';

describe('Outgoing Integrations', function() {
	this.retries(0);

	it('/integrations.create', (done) => {
		request.post(api('integrations.create'))
			.set(credentials)
			.send({
				type: 'webhook-outgoing',
				name: 'Guggy',
				enabled: true,
				username: 'rocket.cat',
				urls: ['http://text2gif.guggy.com/guggify'],
				scriptEnabled: false,
				channel: '#general',
				triggerWords: ['!guggy'],
				alias: 'guggy',
				avatar: 'http://res.guggy.com/logo_128.png',
				emoji: ':ghost:',
				event: 'sendMessage',
			})
			.expect('Content-Type', 'application/json')
			.expect(200)
			.expect((res) => {
				expect(res.body).to.have.property('success', true);
				integration._id = res.body.integration._id;
				expect(res.body).to.have.nested.property('integration.name', 'Guggy');
				expect(res.body).to.have.nested.property('integration.type', 'webhook-outgoing');
				expect(res.body).to.have.nested.property('integration.enabled', true);
				expect(res.body).to.have.nested.property('integration.username', 'rocket.cat');
				expect(res.body).to.have.nested.property('integration.event', 'sendMessage');
			})
			.end(done);
	});

	it('/integrations.list', (done) => {
		request.get(api('integrations.list'))
			.set(credentials)
			.expect('Content-Type', 'application/json')
			.expect(200)
			.expect((res) => {
				expect(res.body).to.have.property('success', true);
				expect(res.body).to.have.property('offset');
				expect(res.body).to.have.property('items');
				expect(res.body).to.have.property('total');
			})
			.end(done);
	});

	it('/integrations.remove', (done) => {
		request.post(api('integrations.remove'))
			.set(credentials)
			.send({
				type: 'webhook-outgoing',
				integrationId: integration._id,
			})
			.expect('Content-Type', 'application/json')
			.expect(200)
			.expect((res) => {
				expect(res.body).to.have.property('success', true);
				expect(res.body).to.have.nested.property('integration.name', 'Guggy');
				expect(res.body).to.have.nested.property('integration.type', 'webhook-outgoing');
				expect(res.body).to.have.nested.property('integration.enabled', true);
				expect(res.body).to.have.nested.property('integration.username', 'rocket.cat');
			})
			.end(done);
	});
});
