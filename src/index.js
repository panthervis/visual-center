import React from "react";
import ReactDOM from "react-dom";
import { Route, BrowserRouter as Router, Switch } from "react-router-dom";
import { Provider } from 'react-redux'
import { createStore } from 'redux'
import App from "./App.js";
import IndividualPoster from "./pages/IndividualPoster";
import TeamPoster from "./pages/TeamPoster";
import PhotoDay from "./pages/PhotoDay";
import Socks from "./pages/Socks";
import Notfound from "./pages/error/Notfound";

import "bootstrap/dist/css/bootstrap.min.css";
import 'jquery/dist/jquery';
import 'bootstrap/dist/js/bootstrap';
import './fontawesome-free-5.14.0-web/css/all.css'
import "./index.scss";
import './editor.scss'
import './canvas.scss'
import './layout.scss'

import * as serviceWorker from "./serviceWorker";
import { composeWithDevTools } from 'redux-devtools-extension'
import Editor from './pages/Editor';
import rootReducer from './Reducers/index.tsx';
const store = createStore(rootReducer, composeWithDevTools())

const routing = (
  <Provider store={store}>
    <Router basename="/product-builder-new">
      <Switch>
        <Route exact path="/" component={App} />
        <Route path="/team-poster" component={TeamPoster} />
        <Route path="/individual-poster" component={IndividualPoster} />
        <Route path="/photo-day" component={PhotoDay} />
        <Route path="/socks" component={Socks} />
        {/* <Route path="/editor" component={Editor} />  */}
        <Route component={Notfound} />
      </Switch>
    </Router>
  </Provider>
);

ReactDOM.render(routing, document.getElementById("root"));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
