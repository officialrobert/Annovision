import React, { Component } from 'react';
import cx from 'classnames';
import styles from './ProjectExpand.scss';
import Button from 'src/components/button';
import i18n from 'src/locales';
import { withProjectSettings } from 'src/project-manager/Context';
import { debounce } from 'src/helpers/util';
import Logger from 'src/lib/Logger';
import AppLoader from 'src/components/app-loader';

class ProjectExpand extends Component {
  PROJ_EXP_AREA_CLASSNAME = 'PROJ_EXP_AREA_CLASSNAME';

  constructor() {
    super();

    this.setStateAsync = (obj) =>
      new Promise((resolve) => {
        this.setState({ ...obj }, resolve);
      });
    window.addEventListener('click', this.handleOutsideClick);
  }

  handleOutsideClick = (evt) => {
    if (!evt) return;
    const elem = evt.target;

    if (elem.classList.contains(this.PROJ_EXP_AREA_CLASSNAME))
      this.forceClose();
  };

  forceClose = debounce(() => {
    if (!this.props.changingProject) this.props.close();
  }, 250);

  componentWillUnmount() {
    this.setState({ state: false });
    window.removeEventListener('click', this.handleOutsideClick);
  }

  onChangeProject = async (evt) => {
    if (!evt || this.props.changingProject) return;

    const elem = evt.target;
    if (elem.hasAttribute('data')) {
      try {
        const { selectedProject = {} } = this.props;
        const dataJSON = JSON.parse(elem.getAttribute('data'));

        if (selectedProject.key !== dataJSON.key) {
        } else Logger.log('Project is already selected');

        await this.props.selectProject(dataJSON);
      } catch (err) {
        Logger.error(err.message);
      }
    }
  };

  render() {
    const { userProjects = [], selectedProject, changingProject } = this.props;

    return (
      <section
        className={cx(
          styles.center_all_row,
          styles.projectexpand,
          this.PROJ_EXP_AREA_CLASSNAME
        )}
      >
        <div>
          <Button className={styles.close} onClick={this.forceClose}>
            <p>{i18n('close_title')}</p>
          </Button>
          <ul onClick={this.onChangeProject}>
            {userProjects.map((project) => {
              return (
                <li key={project.key} className={styles.center_vertical_row}>
                  <span className={cx(styles.center_all_row, styles.tag)}>
                    <p className={styles.center_all_row}>
                      {String(project.name).substring(0, 2)}
                    </p>
                  </span>
                  <p
                    className={cx(
                      styles.text_overflow_ellipsis,
                      styles.center_vertical_row
                    )}
                  >
                    {project.name}
                  </p>
                  {selectedProject.key === project.key && (
                    <span
                      className={cx(styles.center_all_row, styles.selected)}
                    >
                      <p>{i18n('selected_title')}</p>
                    </span>
                  )}
                  <span
                    data={JSON.stringify(project)}
                    className={styles.cover}
                  ></span>
                </li>
              );
            })}
          </ul>

          {changingProject && (
            <div className={cx(styles.center_all_column, styles.loading)}>
              <div className={styles.message}>
                <p>{i18n('project_importing_load')}</p>
              </div>
              <div className={styles.spin}>
                <AppLoader />
              </div>
            </div>
          )}
        </div>
      </section>
    );
  }
}

export default withProjectSettings(ProjectExpand);
