const express = require('express');
const bodyParser = require('body-parser');
const gremlin = require('gremlin');
const { DriverRemoteConnection, Graph } = gremlin.structure;
const cors = require('cors');
const app = express();
const port = 3001;

const endpoint = "wss://trialvm.gremlin.cosmos.azure.com:443/";
const primaryKey = "VDVZgD1PpmmsTm0F3RL9jur8zm08vREuq2nuGHpSaPYy05kX5yLOXx6pypBnkz1PEyzc4V23TSM9ACDbxXIoXQ==";
const database = 'trialdb';
const container = 'ontologyGraph';

const authenticator = new gremlin.driver.auth.PlainTextSaslAuthenticator(`/dbs/${database}/colls/${container}`, primaryKey);

const client = new gremlin.driver.Client(endpoint, {
  authenticator,
  traversalSource: 'g',
  mimeType: 'application/vnd.gremlin-v2.0+json',
  rejectUnauthorized: true,
});

// Allow requests from the specific origin
const allowedOrigin = 'http://192.168.56.1:3000'; // Replace with your frontend's URL

app.use(cors({
  origin: allowedOrigin,
  credentials: true // Enable credentials
}));

// parse application/json
app.use(bodyParser.json());

function mapPropertiesToObj(properties) {
  const obj = {};
  for (const key in properties) {
    obj[key] = properties[key].map(item => item.value);
  }
  return obj;
}

function edgesToJson(edges) {
  return edges.map(edge => ({
    id: typeof edge.id !== "string" ? JSON.stringify(edge.id) : edge.id,
    from: edge.from,
    to: edge.to,
    label: edge.label,
    properties: edge.properties ? mapPropertiesToObj(edge.properties) : {}
  }));
}

function nodesToJson(nodeList, edgeList) {
  // Create a map to quickly find edges connected to each node
  const edgeMap = {};
  edgeList.forEach(edge => {
    if (!edgeMap[edge.from]) {
      edgeMap[edge.from] = [];
    }
    edgeMap[edge.from].push(edge);
  });

  return nodeList.map(node => {
    const nodeEdges = edgeMap[node.id] || [];
    const formattedEdges = edgesToJson(nodeEdges);

    return {
      id: node.id,
      label: node.label,
      type: node.type,
      properties: mapPropertiesToObj(node.properties), // convert properties to a plain object
      edges: formattedEdges // Use edgesToJson to convert connected edges
    };
  });
}

function makeEdgeQuery(nodeLimit) {
  const nodeLimitQuery = !isNaN(nodeLimit) && Number(nodeLimit) > 0 ? `.limit(${nodeLimit})` : '';
  return `
    g.E()${nodeLimitQuery}
      .project('id', 'label', 'from', 'to', 'properties')
      .by(id())
      .by(label())
      .by(outV().id()) // Extracting the 'from' vertex ID
      .by(inV().id())  // Extracting the 'to' vertex ID
      .by(valueMap())  // Extracting properties of the edge
  `;
}

function makeVertexQuery(query, nodeLimit) {
  const nodeLimitQuery = !isNaN(nodeLimit) && Number(nodeLimit) > 0 ? `.limit(${nodeLimit})` : '';
  // THIS QUERY DOES NOT RETURN EDGES
  return `${query}${nodeLimitQuery}`;
}

app.get('/test', (req, res) => {
  res.send('API is working!');
});

app.get('/api', async (req, res) => {
  const id = req.query.id;

  try {
    const query = `g.V('${id}').outE().inV()`;    
    const result = await client.submit(query, {});

    const connections = result._items.map(node => ({
      id: node.id,
      value: node.properties?.name?.[0]?.value || null
    }));

    res.json(connections);
    // res.json(result._items);
  } catch (error) {
    console.error('Error fetching connected nodes:', error);
    res.status(500).send({ error: 'Failed to fetch connected nodes' });
  }
});

app.post('/query', async (req, res, next) => {
  const nodeLimit = req.body.nodeLimit;
  const query = req.body.query;

  client.submit(makeVertexQuery(query, nodeLimit), {})
    .then((vertexResult) => {
      // console.log('Received result:', vertexResult);
      client.submit(makeEdgeQuery(nodeLimit))
        .then(edgeResult => {
          // console.log('Received result:', edgeResult);
          const vertices = nodesToJson(vertexResult._items, edgeResult._items);
          // console.log('Combined Data:', JSON.stringify(vertices, null, 2));
          res.send(vertices);
        })
        .catch(edgeErr => {
          console.error('Error fetching edges:', edgeErr);
          res.status(500).send({ error: 'Failed to fetch edges' });
        });
    })
    .catch((vertexErr) => {
      console.error('Error fetching vertices:', vertexErr);
      res.status(500).send({ error: 'Failed to fetch vertices' });
    });
});

//g.V('t3').outE().inV()

app.listen(port, () => console.log(`Simple gremlin-proxy server listening on port ${port}!`));