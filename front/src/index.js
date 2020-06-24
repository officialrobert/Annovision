import React from 'react';
import ReactDOM from 'react-dom';
import { HashRouter as Router, Route, Switch } from 'react-router-dom';

import App from './app/App';
import Mixer from './mixer/Mixer';
import './index.css';

ReactDOM.render(
  <Router>
    <Switch>
      <Route path="/mixer" component={Mixer} />
      <Route path="/mixer.html" component={Mixer} />
      <Route path="mixer" component={Mixer} />
      <Route path="/index" component={App} />
      <Route path="/index.html" component={App} />
      <Route exact path="/" component={App} />
    </Switch>
  </Router>,
  document.getElementById('root')
);
