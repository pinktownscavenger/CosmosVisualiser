# Technical Overview

## Project Purpose

Cosmos Gremlin Visualizer is a local graph exploration tool for Azure Cosmos DB accounts that use the Gremlin API. The frontend accepts a Gremlin vertex query, asks a local Node/Express proxy to execute it, and renders the resulting vertices and adjacent edges as an interactive network graph.

The application is designed for development, demos, and local inspection workflows. It keeps Cosmos DB credentials on the server side, gives the browser a small normalized graph payload, and also supports a fixture-data mode for running the UI without Azure credentials.

## Runtime Architecture

The project has two runtime processes:

- Vite development server on port `5173`, serving the React application.
- Express API proxy on port `3001`, connecting either to Azure Cosmos DB Gremlin API or to the local fixture client.

During local development, Vite proxies `/query` and `/health` to the Express server. If the frontend is served from a different origin, `VITE_API_BASE_URL` can point browser requests directly at the API proxy.

```text
Browser UI
  |
  | POST /query { query, nodeLimit }
  v
Vite dev server
  |
  | proxy in development
  v
Express proxy
  |
  | Gremlin client submit()
  v
Cosmos DB Gremlin API
```

In fixture mode, the Express proxy uses `src/server/fixtureClient.js` instead of the real Gremlin client. This returns a static graph that exercises vertices, multi-value properties, multiple edges, a self-loop, and IDs that require escaping.

## Main Technologies

- React 16 for the UI.
- Redux for client-side application state.
- Material UI v4 for form controls, expansion panels, buttons, icons, and layout.
- `vis-network` for the interactive graph canvas.
- Vite for the frontend build and development proxy.
- Express 5 for the local API proxy.
- `gremlin` JavaScript driver for Cosmos DB Gremlin access.
- Vitest, jsdom, and Supertest for tests.

## Frontend Structure

The browser entry point is `src/index.jsx`. It creates a Redux store with three slices:

- `gremlin`: current query text and query error state.
- `graph`: graph instance, `vis-network` data holders, selected node or edge, and accumulated normalized graph data.
- `options`: query history, node-label settings, physics toggle, node limit, and `vis-network` options.

`src/App.jsx` lays out three major UI areas:

- `HeaderComponent`: query input, execute button, clear graph button, and error display.
- `NetworkGraphComponent`: owns the `vis.Network` instance and selection events.
- `DetailsComponent`: query history, settings, label configuration, selected item details, and traversal buttons.

### Query Execution Flow

1. The user enters a Gremlin vertex query in the header.
2. `HeaderComponent` calls `executeQuery()` from `src/api/gremlinApi.js`.
3. `executeQuery()` posts `{ query, nodeLimit }` to `QUERY_ENDPOINT`.
4. The server responds with normalized vertex objects that include adjacent edge arrays.
5. `onFetchQuery()` in `src/logics/actionHelper.js` calls `extractEdgesAndNodes()`.
6. The app dispatches actions to add new nodes, add new edges, update node-label defaults, and append the query to history.
7. `graphReducer` adds only new nodes and edges to the `vis.DataSet` holders, avoiding duplicate graph items.

### Graph Rendering

`NetworkGraphComponent` creates a `vis.Network` using the Redux-owned `nodeHolder` and `edgeHolder` datasets. New graph items are added to those datasets in the reducer, so the network updates as the store receives additional query results.

Selection behavior is event-driven:

- `selectNode` dispatches `SET_SELECTED_NODE`.
- `selectEdge` dispatches `SET_SELECTED_EDGE` only when an edge is selected without also selecting a node.

The details panel reads the selected item from Redux and renders the item type, ID, and properties.

### Node Labels

Raw Gremlin vertices have a graph label such as `person`, `company`, or `project`. The frontend keeps a configurable mapping from vertex type to display field.

When new data arrives, `extractEdgesAndNodes()` chooses a default display field for each unseen vertex type by selecting the first property key on that vertex. Users can edit these mappings in the details panel and then click refresh to update labels already shown in the graph.

### Traversal

When a node is selected, the details panel exposes inbound and outbound traversal buttons. These generate simple follow-up Gremlin queries:

```groovy
g.V('<selected-id>').out()
g.V('<selected-id>').in()
```

Those traversal queries go through the same API, normalization, deduplication, and rendering flow as a manually entered query.

## Backend Structure

The API server is split into a small boot file and testable app/helper modules:

- `proxy-server.js`: reads environment configuration, creates the Gremlin or fixture client, and starts the server.
- `src/server/app.js`: creates the Express app, CORS policy, health endpoint, and query endpoint.
- `src/server/graphHelpers.js`: builds Gremlin query fragments and normalizes Gremlin result data.
- `src/server/fixtureClient.js`: returns static fixture vertices and edges for local mode.

### Environment Configuration

Real Cosmos DB mode requires:

- `COSMOS_ENDPOINT`
- `COSMOS_PRIMARY_KEY`
- `COSMOS_DATABASE`
- `COSMOS_CONTAINER`

Optional server values:

- `PORT`, defaulting to `3001`.
- `CORS_ORIGIN`, defaulting to `http://localhost:5173`.
- `USE_FIXTURE_DATA=true`, which bypasses Cosmos DB configuration and uses the fixture client.

Optional frontend value:

- `VITE_API_BASE_URL`, used when the frontend must call an API origin other than its own Vite origin.

### Query Endpoint

`POST /query` accepts:

```json
{
  "query": "g.V().limit(25)",
  "nodeLimit": 100
}
```

The server validates that the query is a non-empty string no longer than `MAX_QUERY_LENGTH` characters. It then runs two Gremlin submissions:

1. A vertex query made by appending the configured node limit, when valid.
2. An adjacent-edge query for the returned vertex IDs.

The edge query uses `bothE().dedup()` and projects each edge into:

- `id`
- `label`
- `from`
- `to`
- `properties`

The server returns a list of normalized vertices. Each vertex includes its own properties and an `edges` array containing the adjacent normalized edges.

### Normalized Response Shape

The frontend expects a response shaped like:

```json
[
  {
    "id": "person-1",
    "label": "person",
    "type": "vertex",
    "properties": {
      "name": ["Ada Lovelace"],
      "active": [true]
    },
    "edges": [
      {
        "id": "edge-1",
        "from": "person-1",
        "to": "company-1",
        "label": "works_at",
        "properties": {
          "since": [1843]
        }
      }
    ]
  }
]
```

`mapPropertiesToObj()` converts Gremlin value arrays into plain JavaScript arrays. Edge IDs are stringified when needed so `vis-network` receives stable IDs.

## State and Data Deduplication

The frontend accumulates graph data over multiple queries. This lets users start from one result set and progressively expand the visual graph through traversal.

Deduplication happens in two places:

- The server removes duplicate edges associated with the same returned vertex.
- The frontend compares incoming nodes and edges against existing Redux state before adding them to `vis.DataSet`.

Edges are keyed by ID when present, with a fallback key based on source, type, and target.

## Testing

The project includes focused tests for:

- API request behavior in `src/api/gremlinApi.test.js`.
- Express app behavior in `src/server/app.test.js`.
- Fixture client behavior in `src/server/fixtureClient.test.js`.
- Graph helper query generation and normalization in `src/server/graphHelpers.test.js`.
- Redux reducers in `src/reducers/*.test.js`.
- Frontend graph transformation utilities in `src/logics/utils.test.js`.

Run the full test suite with:

```sh
npm test
```

Useful static checks include:

```sh
node --check proxy-server.js
node --check src/server/app.js
node --check src/server/graphHelpers.js
```

Build the frontend with:

```sh
npm run build
```

## Local Operation

Install dependencies with:

```sh
npm install --legacy-peer-deps
```

Run against real Cosmos DB credentials:

```sh
npm start
```

Run with static fixture data:

```sh
npm run start:fixture
```

The fixture mode is the fastest smoke-test path because it does not require Azure access.

## Docker Operation

The Docker image uses `node:20-alpine`, installs dependencies with `npm ci --legacy-peer-deps`, copies the repository, exposes ports `5173` and `3001`, and starts both runtime processes with `npm start`.

Real Cosmos DB mode should pass an environment file containing the required Cosmos settings. Fixture mode can pass `USE_FIXTURE_DATA=true`.

## Security Notes

Cosmos DB keys are read only by the Node proxy and should never be exposed to the browser or committed to source control. If credentials are accidentally shared or committed, rotate the Cosmos DB key before publishing or distributing the repository.

The proxy validates query presence and length, but it intentionally forwards user-provided Gremlin query text to the configured database. Run it only in trusted local or controlled environments unless stronger query authorization, auditing, and network controls are added.

## Known Modernization Areas

The current codebase is intentionally functional and compact, but several dependencies and patterns are older:

- React and React DOM are still on React 16.
- Material UI is on the v4 package family.
- Some reducers mutate `vis.DataSet` instances as side effects while returning new Redux state objects.
- `vis-network` is pinned to an older major version.
- The production bundle may need splitting if graph dependencies continue to grow.

These are not blockers for local usage, but they are the main areas to revisit before turning the project into a broader production tool.
