import React, { Component } from 'react';
import styles from './App.scss';

import AppManager from 'src/app-manager/AppManager';
import ModalManager from 'src/modal-manager/ModalManager';
import ProjectManager from 'src/project-manager/ProjectManager';
import Header from 'src/app/views/header';
import LeftPanel from 'src/app/views/left-panel';
import RightPanel from 'src/app/views/right-panel';
import BottomBar from 'src/app/views/bottom-bar';
import Frame from 'src/app/views/frame';

export default class App extends Component {
  render() {
    return (
      <AppManager>
        <ProjectManager>
          <ModalManager>
            <div className={styles.app}>
              <Header />
              <section className={styles.content}>
                <LeftPanel />
                <RightPanel />
                <BottomBar />
                <Frame />
              </section>
            </div>
          </ModalManager>
        </ProjectManager>
      </AppManager>
    );
  }
}
