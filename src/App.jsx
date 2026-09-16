import React from 'react';
import { Grid }  from '@material-ui/core';
import { NetworkGraphComponent } from './components/NetworkGraph/NetworkGraphComponent';
import { HeaderComponent } from './components/Header/HeaderComponent';
import { DetailsComponent } from './components/Details/DetailsComponent';


export class App extends React.Component{
  render(){
    return (
      <main className="app-shell">
        <Grid container spacing={2} className="app-layout">
          <Grid item xs={12} sm={12} md={12}>
            <HeaderComponent />
          </Grid>
          <Grid item xs={12} sm={8} md={9} className="graph-frame">
            <NetworkGraphComponent />
          </Grid>
          <Grid item xs={12} sm={4} md={3} className="workspace-panel">
            <DetailsComponent />
          </Grid>
        </Grid>
      </main>
      );
  }
}
