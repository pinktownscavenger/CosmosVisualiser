const express = require('express');
const cors = require('cors');
const {
  makeEdgeQuery,
  makeVertexQuery,
  verticesToJson
} = require('./graphHelpers');

const MAX_QUERY_LENGTH = 10000;

function isValidQuery(query) {
  return typeof query === 'string' && query.trim().length > 0 && query.length <= MAX_QUERY_LENGTH;
}

function createApp({ client, allowedOrigin = 'http://localhost:5173' }) {
  const app = express();

  app.use(cors({
    origin: allowedOrigin,
    credentials: true
  }));

  app.use(express.json({ limit: '100kb' }));

  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.post('/query', async (req, res) => {
    const nodeLimit = req.body.nodeLimit;
    const query = req.body.query;

    if (!isValidQuery(query)) {
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

  return app;
}

module.exports = {
  MAX_QUERY_LENGTH,
  createApp,
  isValidQuery
};
