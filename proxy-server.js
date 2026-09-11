const gremlin = require('gremlin');
const { createApp } = require('./src/server/app');
const port = Number(process.env.PORT || 3001);

const endpoint = process.env.COSMOS_ENDPOINT;
const primaryKey = process.env.COSMOS_PRIMARY_KEY;
const database = process.env.COSMOS_DATABASE;
const container = process.env.COSMOS_CONTAINER;
const allowedOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';

const requiredConfig = {
  COSMOS_ENDPOINT: endpoint,
  COSMOS_PRIMARY_KEY: primaryKey,
  COSMOS_DATABASE: database,
  COSMOS_CONTAINER: container
};

const missingConfig = Object.entries(requiredConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingConfig.length > 0) {
  throw new Error(`Missing required environment variables: ${missingConfig.join(', ')}`);
}

const authenticator = new gremlin.driver.auth.PlainTextSaslAuthenticator(
  `/dbs/${database}/colls/${container}`,
  primaryKey
);

const client = new gremlin.driver.Client(endpoint, {
  authenticator,
  traversalSource: 'g',
  mimeType: 'application/vnd.gremlin-v2.0+json',
  rejectUnauthorized: true
});

const app = createApp({ client, allowedOrigin });

app.listen(port, () => console.log(`Simple gremlin-proxy server listening on port ${port}!`));
