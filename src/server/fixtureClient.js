const rawVertices = [
  {
    id: 'person-1',
    label: 'person',
    type: 'vertex',
    properties: {
      name: [{ value: 'Ada Lovelace' }],
      aliases: [{ value: 'Ada' }, { value: 'Enchantress of Numbers' }],
      active: [{ value: true }]
    }
  },
  {
    id: 'company-1',
    label: 'company',
    type: 'vertex',
    properties: {
      name: [{ value: 'Analytical Engines Ltd' }],
      founded: [{ value: 1843 }]
    }
  },
  {
    id: 'project-1',
    label: 'project',
    type: 'vertex',
    properties: {
      title: [{ value: 'Graph Modernization' }],
      priority: [{ value: 1 }]
    }
  },
  {
    id: "tag-'quoted\\id",
    label: 'tag',
    type: 'vertex',
    properties: {}
  }
];

const rawEdges = [
  {
    id: 'edge-1',
    label: 'works_at',
    from: 'person-1',
    to: 'company-1',
    properties: {
      since: [{ value: 1843 }]
    }
  },
  {
    id: 'edge-2',
    label: 'created',
    from: 'person-1',
    to: 'project-1',
    properties: {
      confidence: [{ value: 0.98 }]
    }
  },
  {
    id: 'edge-3',
    label: 'reviewed',
    from: 'person-1',
    to: 'project-1',
    properties: {
      status: [{ value: 'complete' }]
    }
  },
  {
    id: 'edge-4',
    label: 'related_to',
    from: 'project-1',
    to: "tag-'quoted\\id",
    properties: {}
  },
  {
    id: 'edge-5',
    label: 'self',
    from: 'project-1',
    to: 'project-1',
    properties: {
      note: [{ value: 'self-loop' }]
    }
  }
];

function createFixtureClient() {
  return {
    submit(query) {
      if (query.includes('.bothE()')) {
        return Promise.resolve({ _items: rawEdges });
      }

      return Promise.resolve({ _items: rawVertices });
    }
  };
}

module.exports = {
  createFixtureClient,
  rawEdges,
  rawVertices
};
