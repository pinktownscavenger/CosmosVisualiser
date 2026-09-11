const express = require('express');
const gremlin = require('gremlin');
const cors = require('cors');
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

function mapPropertiesToObj(properties) {
  const obj = {};
  Object.entries(properties || {}).forEach(([key, value]) => {
    obj[key] = Array.isArray(value) ? value.map(item => item.value ?? item) : value;
  });
  return obj;
}

function stringifyGremlinId(id) {
  return typeof id === 'string' ? id : JSON.stringify(id);
}

function normalizeEdge(edge) {
  return {
    id: stringifyGremlinId(edge.id),
    from: edge.from,
    to: edge.to,
    label: edge.label,
    properties: mapPropertiesToObj(edge.properties)
  };
}

function buildEdgeMap(edges) {
  const edgeMap = {};

  edges.forEach((edge) => {
    const formattedEdge = normalizeEdge(edge);
    [formattedEdge.from, formattedEdge.to].forEach((vertexId) => {
      if (!edgeMap[vertexId]) {
        edgeMap[vertexId] = [];
      }
      edgeMap[vertexId].push(formattedEdge);
    });
  });

  return edgeMap;
}

function uniqueEdges(edges) {
  const seen = new Set();

  return edges.filter((edge) => {
    const edgeKey = edge.id || `${edge.from}:${edge.label}:${edge.to}`;
    if (seen.has(edgeKey)) {
      return false;
    }

    seen.add(edgeKey);
    return true;
  });
}

function verticesToJson(vertices, edges) {
  const edgeMap = buildEdgeMap(edges);

  return vertices.map(vertex => {
    const connectedEdges = uniqueEdges(edgeMap[vertex.id] || []);

    return {
      id: vertex.id,
      label: vertex.label,
      type: vertex.type,
      properties: mapPropertiesToObj(vertex.properties),
      edges: connectedEdges
    };
  });
}

function makeLimitClause(nodeLimit) {
  const parsedLimit = Number(nodeLimit);
  return Number.isInteger(parsedLimit) && parsedLimit > 0 ? `.limit(${parsedLimit})` : '';
}

function escapeGremlinString(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function makeEdgeQuery(vertexIds) {
  if (vertexIds.length === 0) {
    return null;
  }

  const ids = vertexIds
    .map(id => typeof id === 'string' ? id : JSON.stringify(id))
    .map(id => `'${escapeGremlinString(id)}'`)
    .join(',');
  return `
    g.V(${ids})
      .bothE()
      .dedup()
      .project('id', 'label', 'from', 'to', 'properties')
      .by(id())
      .by(label())
      .by(outV().id())
      .by(inV().id())
      .by(valueMap())
  `;
}

function makeVertexQuery(query, nodeLimit) {
  return `${query}${makeLimitClause(nodeLimit)}`;
}

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
