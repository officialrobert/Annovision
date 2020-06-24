import React, { Component } from 'react';
import cx from 'classnames';
import styles from './DeleteProject.scss';
import Button from 'src/components/button';
import i18n from 'src/locales';
import { withProjectSettings } from 'src/project-manager/Context';
import { debounce } from 'src/helpers/util';
import AppLoader from 'src/components/app-loader';

class DeleteProject extends Component {
  state = {
    mounted: false,
  };

  constructor() {
    super();

    this.setStateAsync = (obj) =>
      new Promise((resolve) => {
        this.setState({ ...obj }, resolve);
      });
  }

  componentDidMount() {
    this.setState({
      mounted: true,
    });
  }

  componentWillUnmount() {
    this.setState({
      mounted: false,
    });
  }

  removeProject = debounce(async () => {
    const { selectedProject, removingProject } = this.props;
    const { mounted } = this.state;

    if (removingProject || !mounted) return;
    await this.props.removeProject(selectedProject);
    this.props.close();
  }, 200);

  forceClose = debounce(() => {
    if (!this.props.removingProject) this.props.close();
  }, 200);

  render() {
    const { removingProject } = this.props;

    return (
      <section className={cx(styles.center_all_row, styles.deleteproject)}>
        <div className={styles.center_horizontal_column}>
          <p className={styles.message}>{i18n('confirm_delete_project_msg')}</p>
          <div className={cx(styles.center_vertical_row, styles.actions)}>
            <Button
              className={styles.cancel}
              forCancel={true}
              onClick={this.forceClose}
            >
              <p>{i18n('cancel_title')}</p>
            </Button>
            <Button
              className={styles.confirm}
              loading={removingProject}
              onClick={this.removeProject}
            >
              <p>{i18n('confirm_title')}</p>
            </Button>
          </div>
          {removingProject && (
            <div className={cx(styles.center_all_column, styles.loading)}>
              <div className={styles.message}>
                <p>{i18n('project_removing_load')}</p>
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

export default withProjectSettings(DeleteProject);
