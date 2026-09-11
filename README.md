# Cosmos Gremlin Visualizer

A local React visualizer for Gremlin graph queries, with a small Node/Express proxy for Azure Cosmos DB Gremlin API.

The app lets you run a Gremlin vertex query, render the returned graph with `vis-network`, inspect node and edge properties, customize node labels, view query history, cap returned vertices, and traverse inbound or outbound connections from a selected node.

## Requirements

- Node.js and npm
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
CORS_ORIGIN=http://localhost:3000
PORT=3001
```

Optional React variable:

```sh
VITE_API_BASE_URL=
```

Leave `VITE_API_BASE_URL` blank during local development so the Vite dev server proxies API requests to the local Node server. Set it only when the frontend is served from a different origin than the API proxy.

## Run Locally

```sh
npm install --legacy-peer-deps
npm start
```

Open:

```sh
http://localhost:3000
```

The Vite dev server runs on its default port; the API proxy defaults to port `3001`.

## Useful Scripts

```sh
npm run client
npm run server
npm run build
npm test
```

## Docker

Build the image from this repository:

```sh
docker build --tag=cosmos-gremlin-visualizer:latest .
```

Run it with your environment file:

```sh
docker run --rm \
  -p 3000:3000 \
  -p 3001:3001 \
  --env-file .env \
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
