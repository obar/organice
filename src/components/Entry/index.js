/* global process */

import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';

import { Route, Switch, Redirect, withRouter } from 'react-router-dom';

import './Entry.css';

import { Dropbox } from 'dropbox';

import _ from 'lodash';
import classNames from 'classnames';

import parseQueryString from '../../util/parse_query_string';
import goBackOrToRoot from '../../util/go_back_or_to_root';
import { parseOrg } from '../../lib/parse_org';
import { whatsNewFileContents } from '../../lib/static_file_contents';

import HeaderBar from '../HeaderBar';
import Landing from '../Landing';
import FileBrowser from '../FileBrowser';
import LoadingIndicator from '../LoadingIndicator';
import OrgFile from '../OrgFile';
import Settings from '../Settings';

import * as dropboxActions from '../../actions/dropbox';
import * as orgActions from '../../actions/org';
import * as baseActions from '../../actions/base';

class Entry extends PureComponent {
  constructor(props) {
    super(props);

    _.bindAll(this, [
      'handleSignIn',
      'handleLiveFileBack',
      'handleStaticFileBack',
      'renderWhatsNewFile',
      'renderSampleFile',
      'renderLanding',
      'renderFileBrowser',
      'renderFile',
    ]);
  }

  componentDidMount() {
    const { lastSeenWhatsNewHeader, isAuthenticated } = this.props;

    const accessToken = parseQueryString(window.location.hash).access_token;
    if (accessToken) {
      this.props.dropbox.authenticate(accessToken);
      window.location.hash = '';
    }

    const whatsNewFile = parseOrg(whatsNewFileContents);
    const firstHeaderTitle = whatsNewFile.getIn(['headers', 0, 'titleLine', 'rawTitle']);
    if (isAuthenticated && !!lastSeenWhatsNewHeader && firstHeaderTitle !== lastSeenWhatsNewHeader) {
      this.props.base.setHasUnseenWhatsNew(true);
    }
    this.props.base.setLastSeenWhatsNewHeader(firstHeaderTitle);
  }

  handleSignIn() {
    const dropbox = new Dropbox({ clientId: process.env.REACT_APP_DROPBOX_CLIENT_ID });
    const authURL = dropbox.getAuthenticationUrl(window.location.href);
    window.location = authURL;
  }

  handleLiveFileBack() {
    goBackOrToRoot(this.props.history);
    this.props.org.stopDisplayingFile();
  }

  handleStaticFileBack() {
    goBackOrToRoot(this.props.history);
  }

  renderWhatsNewFile() {
    return (
      <OrgFile backButtonText="Done"
               onBackClick={this.handleStaticFileBack}
               staticFile="whats_new"
               shouldDisableDirtyIndicator={true}
               shouldDisableActionDrawer={true}
               shouldDisableSyncButtons={false}
               parsingErrorMessage={"The contents of whats_new.org couldn't be loaded. You probably forgot to set the environment variable - see the Development section of README.org for details!"} />
    );
  }

  renderSampleFile() {
    return (
      <OrgFile backButtonText="Exit sample"
               onBackClick={this.handleStaticFileBack}
               staticFile="sample"
               shouldDisableDirtyIndicator={true}
               shouldDisableActionDrawer={false}
               shouldDisableSyncButtons={true}
               parsingErrorMessage={"The contents of sample.org couldn't be loaded. You probably forgot to set the environment variable - see the Development section of README.org for details!"} />
    );
  }

  renderLanding() {
    return (
      <Landing onSignInClick={this.handleSignIn} />
    );
  }

  renderFileBrowser({ match: { params: { path = '' } } }) {
    if (!!path) {
      path = '/' + path;
    }

    return <FileBrowser path={path} />;
  }

  renderFile({ match: { params: { path } } }) {
    if (!!path) {
      path = '/' + path;
    }

    return (
      <OrgFile path={path}
               backButtonText="Back to file browser"
               onBackClick={this.handleLiveFileBack}
               shouldDisableDirtyIndicator={false}
               shouldDisableActionDrawer={false}
               shouldDisableSyncButtons={false} />
    );
  }

  render() {
    const {
      isAuthenticated,
      loadingMessage,
      fontSize,
    } = this.props;

    const className = classNames('entry-container', {
      'entry-container--large-font': fontSize === 'Large',
    });

    return (
      <div className={className}>
        <HeaderBar onSignInClick={this.handleSignIn} />

        {!!loadingMessage && <LoadingIndicator message={loadingMessage} />}

        <Switch>
          <Route path="/whats_new" exact={true} render={this.renderWhatsNewFile} />
          <Route render={() => (
              isAuthenticated ? (
                <Switch>
                  <Route path="/settings" component={Settings} />
                  <Route path="/file/:path+" render={this.renderFile} />
                  <Route path="/files/:path*" render={this.renderFileBrowser} />
                  <Redirect to="/files" />
                </Switch>
              ) : (
                <Switch>
                  <Route path="/sample" exact={true} render={this.renderSampleFile} />
                  <Route path="/" exact={true} render={this.renderLanding} />
                  <Redirect to="/" />
                </Switch>
              )
          )} />
        </Switch>
      </div>
    );
  }
}

const mapStateToProps = (state, props) => {
  return {
    loadingMessage: state.base.get('loadingMessage'),
    isAuthenticated: !!state.dropbox.get('accessToken'),
    fontSize: state.base.get('fontSize'),
    lastSeenWhatsNewHeader: state.base.get('lastSeenWhatsNewHeader'),
  };
};

const mapDispatchToProps = dispatch => {
  return {
    dropbox: bindActionCreators(dropboxActions, dispatch),
    org: bindActionCreators(orgActions, dispatch),
    base: bindActionCreators(baseActions, dispatch),
  };
};

export default withRouter(connect(mapStateToProps, mapDispatchToProps)(Entry));
