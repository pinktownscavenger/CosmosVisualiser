import { describe, expect, it } from 'vitest';
import { ACTIONS } from '../constants';
import { reducer } from './optionReducer';

describe('option reducer', () => {
  it('tracks and clears query history', () => {
    const withFirstQuery = reducer(undefined, {
      type: ACTIONS.ADD_QUERY_HISTORY,
      payload: 'g.V()'
    });
    const withSecondQuery = reducer(withFirstQuery, {
      type: ACTIONS.ADD_QUERY_HISTORY,
      payload: "g.V('person-1').out()"
    });

    expect(withSecondQuery.queryHistory).toEqual(['g.V()', "g.V('person-1').out()"]);
    expect(reducer(withSecondQuery, { type: ACTIONS.CLEAR_QUERY_HISTORY }).queryHistory).toEqual([]);
  });

  it('edits node labels by index', () => {
    const state = reducer(undefined, {
      type: ACTIONS.SET_NODE_LABELS,
      payload: [{ type: 'person', field: 'name' }]
    });

    expect(reducer(state, {
      type: ACTIONS.EDIT_NODE_LABEL,
      payload: { id: 0, nodeLabel: { type: 'person', field: 'aliases' } }
    }).nodeLabels).toEqual([{ type: 'person', field: 'aliases' }]);
  });

  it('stores node limit values', () => {
    expect(reducer(undefined, {
      type: ACTIONS.SET_NODE_LIMIT,
      payload: '25'
    }).nodeLimit).toBe('25');
  });

  it('keeps existing defaults for optional payload actions', () => {
    expect(reducer(undefined, {
      type: ACTIONS.SET_IS_PHYSICS_ENABLED
    }).isPhysicsEnabled).toBe(true);
    expect(reducer(undefined, {
      type: ACTIONS.SET_IS_PHYSICS_ENABLED,
      payload: null
    }).isPhysicsEnabled).toBe(null);
    expect(reducer(undefined, {
      type: ACTIONS.SET_NODE_LABELS
    }).nodeLabels).toEqual([]);
  });
});
