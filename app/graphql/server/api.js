import { graphqlExpress, graphiqlExpress } from 'apollo-server-express';
import { JSAccountsContext as jsAccountsContext } from '@accounts/graphql-api';
import { SubscriptionServer } from 'subscriptions-transport-ws';
import { execute, subscribe } from 'graphql';
import { Meteor } from 'meteor/meteor';
import { WebApp } from 'meteor/webapp';
import { settings } from '../../settings';
import bodyParser from 'body-parser';
import express from 'express';
import cors from 'cors';

import { executableSchema } from './schema';

const subscriptionPort = settings.get('Graphql_Subscription_Port') || 3100;

// the Meteor GraphQL server is an Express server
const graphQLServer = express();

graphQLServer.disable('x-powered-by');

if (settings.get('Graphql_CORS')) {
	graphQLServer.use(cors());
}

graphQLServer.use('/api/graphql', (req, res, next) => {
	if (settings.get('Graphql_Enabled')) {
		next();
	} else {
		res.status(400).send('Graphql is not enabled in this server');
	}
});

graphQLServer.use(
	'/api/graphql',
	bodyParser.json(),
	graphqlExpress((request) => ({
		schema: executableSchema,
		context: jsAccountsContext(request),
		formatError: (e) => ({
			message: e.message,
			locations: e.locations,
			path: e.path,
		}),
		debug: Meteor.isDevelopment,
	}))
);

graphQLServer.use(
	'/graphiql',
	graphiqlExpress({
		endpointURL: '/api/graphql',
		subscriptionsEndpoint: `ws://localhost:${ subscriptionPort }`,
	})
);

const startSubscriptionServer = () => {
	if (settings.get('Graphql_Enabled')) {
		SubscriptionServer.create({
			schema: executableSchema,
			execute,
			subscribe,
			onConnect: (connectionParams) => ({ authToken: connectionParams.Authorization }),
		},
		{
			port: subscriptionPort,
			host: process.env.BIND_IP || '0.0.0.0',
		});

		console.log('GraphQL Subscription server runs on port:', subscriptionPort);
	}
};

WebApp.onListening(() => {
	startSubscriptionServer();
});

// this binds the specified paths to the Express server running Apollo + GraphiQL
WebApp.connectHandlers.use(graphQLServer);
