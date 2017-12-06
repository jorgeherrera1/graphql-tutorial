const express = require('express');

// parse JSON requests
const bodyParser = require('body-parser');
// handle GraphQL requests and responses
const {graphqlExpress, graphiqlExpress} = require('apollo-server-express');
const {execute, subscribe} = require('graphql');
const {createServer} = require('http');
const {SubscriptionServer} = require('subscriptions-transport-ws');

const schema = require('./schema');
const connectMongo = require('./mongo-connector');
const {authenticate} = require('./authentication');
const buildDataLoaders = require('./dataloaders');
const formatError = require('./format-error');

const start = async () => {
  const mongo = await connectMongo();
  const app = express();

  const buildOptions = async (req, res) => {
    const user = await authenticate(req, mongo.Users);
    return {
      context: {
        dataloaders: buildDataLoaders(mongo),
        mongo,
        user
      },
      formatError,
      schema
    };
  };

  app.use('/graphql', bodyParser.json(), graphqlExpress(buildOptions));
  app.use('/graphiql', graphiqlExpress({
    endpointURL: '/graphql',
    passHeader: `'Authorization': 'bearer token-jorge@email.com'`,
    subscriptionsEndpoint: `ws://localhost:4000/subscriptions`
  }));
  
  const server = createServer(app);
  server.listen(4000, () => {
    SubscriptionServer.create(
      {execute, subscribe, schema},
      {server, path: '/subscriptions'}
    )
    console.log('GraphQL server started!');
  });
};

start();
