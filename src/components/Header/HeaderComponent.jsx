import React from 'react';
import { connect } from 'react-redux';
import { Button, TextField }  from '@material-ui/core';
import { ACTIONS, COMMON_GREMLIN_ERROR } from '../../constants';
import { executeQuery } from '../../api/gremlinApi';
import { onFetchQuery } from '../../logics/actionHelper';

class Header extends React.Component {
  clearGraph() {
    this.props.dispatch({ type: ACTIONS.CLEAR_GRAPH });
    this.props.dispatch({ type: ACTIONS.CLEAR_QUERY_HISTORY });
  }

  sendQuery() {
    this.props.dispatch({ type: ACTIONS.SET_ERROR, payload: null });
    executeQuery({ query: this.props.query, nodeLimit: this.props.nodeLimit }).then((response) => {
      onFetchQuery(response, this.props.query, this.props.nodeLabels, this.props.dispatch);
    }).catch((error) => {
      console.error('Error sending query:', error);
      this.props.dispatch({ type: ACTIONS.SET_ERROR, payload: COMMON_GREMLIN_ERROR });
    });
  }

  onQueryChanged(query) {
    this.props.dispatch({ type: ACTIONS.SET_QUERY, payload: query });
  }

  onSubmit(event) {
    event.preventDefault();
    this.sendQuery();
  }

  render(){
    return (
      <div className={'header'}>
        <div className="header__topline">
          <div>
            <p className="header__eyebrow">Graph query workspace</p>
            <h1 className="header__title">Gremlin Visualiser</h1>
          </div>
          <div className="header__meta" aria-label="Graph summary">
            <span className="metric-pill">
              <span className="metric-pill__value">{this.props.nodes.length}</span>
              <span className="metric-pill__label">Nodes</span>
            </span>
            <span className="metric-pill">
              <span className="metric-pill__value">{this.props.edges.length}</span>
              <span className="metric-pill__label">Edges</span>
            </span>
          </div>
        </div>

        <form noValidate autoComplete="off" className="query-form" onSubmit={this.onSubmit.bind(this)}>
          <TextField
            value={this.props.query}
            onChange={(event => this.onQueryChanged(event.target.value))}
            id="gremlin-query"
            label="Gremlin query"
            className="query-field"
            InputLabelProps={{ shrink: true }}
          />
          <Button
            variant="contained"
            color="primary"
            type="submit"
            className="query-button query-button--execute"
          >
            Execute
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            onClick={this.clearGraph.bind(this)}
            className="query-button query-button--clear"
          >
            Clear Graph
          </Button>
        </form>

        {this.props.error && <div className="error-banner" role="alert">{this.props.error}</div>}
      </div>

    );
  }
}

export const HeaderComponent = connect((state)=>{
  return {
    query: state.gremlin.query,
    error: state.gremlin.error,
    nodes: state.graph.nodes,
    edges: state.graph.edges,
    nodeLabels: state.options.nodeLabels,
    nodeLimit: state.options.nodeLimit
  };
})(Header);
