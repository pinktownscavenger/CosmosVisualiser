const express = require('express');
const gremlin = require('gremlin');
const cors = require('cors');
const {
  makeEdgeQuery,
  makeVertexQuery,
  verticesToJson
} = require('./src/server/graphHelpers');
const app = express();
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

app.use(cors({
  origin: allowedOrigin,
  credentials: true
}));

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/query', async (req, res) => {
  const nodeLimit = req.body.nodeLimit;
  const query = req.body.query;

  if (!query || typeof query !== 'string') {
    res.status(400).send({ error: 'A Gremlin query is required' });
    return;
  }

  try {
    const vertexResult = await client.submit(makeVertexQuery(query, nodeLimit), {});
    const vertices = vertexResult._items || [];
    const edgeQuery = makeEdgeQuery(vertices.map(vertex => vertex.id));
    const edgeResult = edgeQuery ? await client.submit(edgeQuery, {}) : { _items: [] };

    res.send(verticesToJson(vertices, edgeResult._items || []));
  } catch (error) {
    console.error('Error fetching graph data:', error);
    res.status(500).send({ error: 'Failed to fetch graph data' });
  }
});

app.listen(port, () => console.log(`Simple gremlin-proxy server listening on port ${port}!`));
