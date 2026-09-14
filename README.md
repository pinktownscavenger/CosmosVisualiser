# Cosmos Gremlin Visualizer

A local React visualizer for Gremlin graph queries, with a small Node/Express proxy for Azure Cosmos DB Gremlin API.

The app lets you run a Gremlin vertex query, render the returned graph with `vis-network`, inspect node and edge properties, customize node labels, view query history, cap returned vertices, and traverse inbound or outbound connections from a selected node.

## Requirements

- Node.js 20 or newer and npm
- Azure Cosmos DB account using the Gremlin API

This project uses Vite for the frontend build while the UI is still on React 16.

## Configuration

Copy the example environment file and fill in your Cosmos DB details:

```sh
cp .env.example .env
```

Required server variables:

```sh
COSMOS_ENDPOINT=wss://your-account.gremlin.cosmos.azure.com:443/
COSMOS_PRIMARY_KEY=your-cosmos-primary-key
COSMOS_DATABASE=your-database
COSMOS_CONTAINER=your-graph-container
CORS_ORIGIN=http://localhost:5173
PORT=3001
```

Optional React variable:

```sh
VITE_API_BASE_URL=
```

Leave `VITE_API_BASE_URL` blank during local development so the Vite dev server proxies API requests to the local Node server. Set it only when the frontend is served from a different origin than the API proxy.

## Demo Mode

Run the app without Cosmos credentials by using the built-in fixture graph:

```sh
npm install --legacy-peer-deps
npm run start:fixture
```

Open:

```sh
http://localhost:5173
```

Fixture mode sets `USE_FIXTURE_DATA=true` for the proxy process. It returns static vertices and edges for local smoke testing, demos, and UI checks. Do not use fixture mode when validating a real Cosmos DB connection.

## Run Locally

```sh
npm install --legacy-peer-deps
npm start
```

Open:

```sh
http://localhost:5173
```

The Vite dev server runs on port `5173`; the API proxy defaults to port `3001`.

## Useful Scripts

```sh
npm run client
npm run server
npm run server:fixture
npm run start:fixture
npm run build
npm test
npm audit --omit=dev
```

## Docker

Build the image from this repository:

```sh
docker build --tag=cosmos-gremlin-visualizer:latest .
```

Run it with your environment file:

```sh
docker run --rm \
  -p 5173:5173 \
  -p 3001:3001 \
  --env-file .env \
  --name=cosmos-gremlin-visualizer \
  cosmos-gremlin-visualizer:latest
```

To run the container with fixture data instead of Cosmos credentials:

```sh
docker run --rm \
  -p 5173:5173 \
  -p 3001:3001 \
  -e USE_FIXTURE_DATA=true \
  --name=cosmos-gremlin-visualizer \
  cosmos-gremlin-visualizer:latest
```

## Query Behavior

Submit Gremlin queries that return vertices, for example:

```groovy
g.V().limit(25)
```

The server applies the configured node limit to the vertex query, then fetches edges adjacent to the returned vertices and sends a normalized graph payload to the frontend.

## Security Notes

Do not commit `.env` files or Cosmos DB keys. If a key was ever committed or shared, rotate it in Azure before publishing the repository.

## Release Checks

Before merging to `main`, run:

```sh
npm test
npm run build
node --check proxy-server.js
node --check src/server/app.js
node --check src/server/graphHelpers.js
npm audit --omit=dev
```

Then run `npm run start:fixture` and smoke test query execution, graph rendering, item selection, query history, clear graph, and traversal buttons in the browser.

## Future Modernization

- Upgrade React and React DOM.
- Migrate Material UI v4 components to the current MUI package family.
- Upgrade or replace `vis-network`.
- Split the Vite bundle if the graph libraries keep the production chunk large.
