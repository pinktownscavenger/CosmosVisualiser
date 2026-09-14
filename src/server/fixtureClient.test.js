import { describe, expect, it } from 'vitest';
import { normalizedGraph } from '../__fixtures__/graphFixtures';

const { createFixtureClient } = require('./fixtureClient');
const { verticesToJson } = require('./graphHelpers');

describe('fixture Gremlin client', () => {
  it('returns fixture vertices and edges through the Gremlin submit shape', async () => {
    const client = createFixtureClient();

    const vertexResult = await client.submit('g.V().limit(25)', {});
    const edgeResult = await client.submit("g.V('person-1').bothE()", {});

    expect(verticesToJson(vertexResult._items, edgeResult._items)).toEqual(normalizedGraph);
  });
});
