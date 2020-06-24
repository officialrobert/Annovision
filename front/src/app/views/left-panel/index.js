import React, { Component, createRef } from 'react';
import cx from 'classnames';
import i18n from 'src/locales';
import styles from './LeftPanel.scss';
import Button from 'src/components/button';
import RadioSelect from 'src/components/radio-select';
import Logger from 'src/lib/Logger';
import { withGlobalSettings } from 'src/app-manager/Context';
import { withProjectSettings } from 'src/project-manager/Context';
import { withModalSettings } from 'src/modal-manager/Context';
import { IMAGE_FILE_TYPE, TASK_TYPES } from 'src/constants/App';
import ProjectExpand from 'src/components/modals/project-expand';
import DeleteProject from 'src/components/modals/delete-project';
import CommonMessage from 'src/components/modals/common-message';
import CreateProject from 'src/components/modals/create-project';
import TaskSetup from './TaskSetup';

class LeftPanel extends Component {
  wrap = null;
  state = {
    projectName: 'Default',
    fileType: IMAGE_FILE_TYPE,
    taskType: TASK_TYPES['region'],
    mounted: false,
  };

  constructor() {
    super();

    this.wrap = createRef();
  }

  componentDidMount() {
    this.setState(
      {
        mounted: true,
      },
      this.mainOnMount
    );
  }

  mainOnMount = () => {
    const { userConfig } = this.props;

    if (this.wrap.current) this.props.leftPanelOn(this.wrap.current);

    if (userConfig) {
      this.setState({
        taskType: userConfig.task,
      });
    }
  };

  componentWillUnmount() {
    this.wrap = null;
  }

  selectTask = (evt) => {
    if (!evt) return;

    const elem = evt.target;

    if (elem.hasAttribute('data')) {
      try {
        const { importingFiles, removingFiles, removingProject } = this.props;
        const jsonData = JSON.parse(elem.getAttribute('data'));

        if (importingFiles || removingFiles || removingProject) return;

        this.setState(
          {
            taskType: jsonData,
          },
          () => {
            this.props.setUserConfig('task', jsonData);
          }
        );
      } catch (err) {
        Logger.error(err.message);
      }
    }
  };

  projectsExpand = () => {
    this.props.deactivateModal();
    this.props.setDOM(<ProjectExpand close={this.props.deactivateModal} />);
    this.props.activateModal();
  };

  deleteProjectShow = () => {
    const { userConfig } = this.props;

    this.props.deactivateModal();
    if (
      userConfig.selectedProject.permanent &&
      userConfig.selectedProject.permanent !== 'false'
    ) {
      this.props.setDOM(
        <CommonMessage
          message={i18n('default_project_permanent')}
          close={this.props.deactivateModal}
        />
      );
    } else {
      this.props.setDOM(
        <DeleteProject
          close={this.props.deactivateModal}
          confirm={this.confirmDeleteProject}
        />
      );
    }

    this.props.activateModal();
  };

  createProjectShow = () => {
    this.props.deactivateModal();
    this.props.setDOM(<CreateProject close={this.props.deactivateModal} />);
    this.props.activateModal();
  };

  render() {
    const { fileType, taskType } = this.state;
    const imageSelected = fileType.key === IMAGE_FILE_TYPE.key;
    const { userConfig, showLeftPanel } = this.props;
    let projectName = '';

    if (userConfig.selectedProject)
      projectName = userConfig.selectedProject.name;

    return (
      <div
        ref={this.wrap}
        className={cx(
          {
            [styles.panelshow]: showLeftPanel,
            [styles.panelhide]: !showLeftPanel,
          },
          styles.leftpanel
        )}
      >
        <section>
          <div className={cx(styles.center_vertical_column, styles.project)}>
            <label>{i18n('project_title')}</label>
            <div className={cx(styles.center_vertical_row, styles.projname)}>
              <span className={styles.center_vertical_row}>
                <p className={styles.text_overflow_ellipsis}>{projectName}</p>
              </span>
              <p
                className={cx(styles.center_all_row, styles.expand)}
                onClick={this.projectsExpand}
              >
                {i18n('expand_title')}
              </p>
            </div>
            <div className={cx(styles.actions, styles.flex_content)}>
              <Button
                className={cx(styles.center_vertical_row, styles.new)}
                onClick={this.createProjectShow}
              >
                <p>{i18n('new_project_title')}</p>
              </Button>
              <Button
                className={cx(styles.center_vertical_row, styles.delete)}
                onClick={this.deleteProjectShow}
              >
                <p>{i18n('delete_project_title')}</p>
              </Button>
            </div>
          </div>
          <div className={cx(styles.center_vertical_column, styles.filetype)}>
            <label>{i18n('file_type_title')}</label>
            <div className={cx(styles.center_vertical_row, styles.actions)}>
              <div className={cx(styles.flex_content, styles.img)}>
                <RadioSelect
                  selected={imageSelected}
                  className={cx(
                    styles.center_vertical_row,
                    styles.center_all_row,
                    styles.radio
                  )}
                />
                <p className={cx(styles.center_vertical_row, styles.label)}>
                  {i18n('image_file_title')}
                </p>
              </div>
              <div className={styles.vid}></div>
            </div>
          </div>
          <div className={cx(styles.center_vertical_column, styles.tasktype)}>
            <label>{i18n('task_type_title')}</label>
            <ul onClick={this.selectTask} className={styles.selection}>
              {Object.keys(TASK_TYPES).map((task) => {
                const ctask = TASK_TYPES[task];

                return (
                  <li
                    key={`task-type-${task}`}
                    className={styles.center_vertical_row}
                  >
                    <RadioSelect
                      selected={taskType.key === task}
                      className={cx(
                        styles.center_vertical_row,
                        styles.center_all_row,
                        styles.radio
                      )}
                      data={JSON.stringify(ctask)}
                    />
                    <p className={styles.center_vertical_row}>
                      {i18n(`${ctask.i18n}`)}
                    </p>
                  </li>
                );
              })}
            </ul>
          </div>
          <TaskSetup {...this.props} />
        </section>
      </div>
    );
  }
}

export default withGlobalSettings(
  withModalSettings(withProjectSettings(LeftPanel))
);
