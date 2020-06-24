import React, { Component } from 'react';
import cx from 'classnames';
import Button from 'src/components/button';
import styles from './CreateProject.scss';
import TextInput from 'src/components/text-input';
import { debounce, isAlphaNumeric } from 'src/helpers/util';
import i18n from 'src/locales';
import { withProjectSettings } from 'src/project-manager/Context';
import { IMAGE_FILE_TYPE } from 'src/constants/App';

class CreateProject extends Component {
  CREATE_PROJECT_CLASS_NAME = 'CREATE_PROJECT_CLASS_NAME';

  state = {
    projectName: '',
    validating: false,
    hadSubmit: false,
    hasErr: false,
    alreadTaken: false,
    isSuccess: false,
    mounted: false,
  };

  constructor() {
    super();

    window.addEventListener('click', this.handleOutsideClick);
  }

  componentDidMount() {
    this.setState({
      mounted: true,
    });
  }

  componentWillUnmount() {
    this.setState({
      hasErr: false,
      validating: false,
      projectName: '',
      alreadTaken: false,
      isSuccess: false,
      mounted: false,
    });

    this.CREATE_PROJECT_CLASS_NAME = undefined;
    window.removeEventListener('click', this.handleOutsideClick);
  }

  handleOutsideClick = (evt) => {
    if (!evt) return;

    const elem = evt.target;
    if (elem.classList.contains(this.CREATE_PROJECT_CLASS_NAME)) this.doClose();
  };

  doClose = debounce(() => {
    this.props.close();
  }, 200);

  onProjectInput = (evt) => {
    if (!evt) return;

    const { value } = evt.target;

    this.setState(
      {
        projectName: value,
        validating: true,
        isSuccess: false,
      },
      this.validateProject
    );
  };

  validateProject = debounce(() => {
    const { projectName } = this.state;
    const { userProjects = [] } = this.props;
    let hasErr = false;
    let alreadTaken = false;

    for (let index = 0; index < userProjects.length; index++) {
      const cName = String(userProjects[index].name).toLowerCase();
      if (cName === String(projectName).toLowerCase()) {
        alreadTaken = true;
        break;
      }
    }

    if (!isAlphaNumeric(projectName) || String(projectName).length < 3) {
      hasErr = true;
    } else hasErr = false;

    if (this.state.mounted)
      this.setState({ hasErr, validating: false, alreadTaken });
  }, 150);

  submitProject = debounce(() => {
    const { validating, hasErr, hadSubmit, alreadTaken } = this.state;
    const { projectName } = this.state;
    const name = `${String(projectName[0]).toUpperCase()}${String(projectName)
      .substring(1)
      .toLowerCase()}`;

    if (hadSubmit) return;

    this.setState(
      {
        hadSubmit: true,
      },
      async () => {
        let err = false;

        if (!validating && !hasErr && !alreadTaken && projectName.length >= 3) {
          // success
          err = false;
          const projectData = {
            name,
            key: `${name}-${new Date().getTime().toString()}`,
            file: IMAGE_FILE_TYPE.key, // image file support for now
            permanent: false,
            numFiles: 0,
          };
          await this.props.addProject(projectData);
        } else {
          err = true;
        }

        let timeoutHadSubmit = setTimeout(() => {
          if (this.state.mounted)
            this.setState({
              hadSubmit: false,
              hasErr: err,
              validating: false,
              ...(!err && {
                projectName: '',
                isSuccess: true,
                alreadTaken: false,
              }),
            });
          clearTimeout(timeoutHadSubmit);
          timeoutHadSubmit = null;
        }, 300);
      }
    );
  }, 150);

  render() {
    const {
      projectName = '',
      hasErr,
      hadSubmit = false,
      isSuccess = false,
      alreadTaken = false,
    } = this.state;

    return (
      <section
        className={cx(
          styles.center_all_row,
          styles.createproject,
          this.CREATE_PROJECT_CLASS_NAME
        )}
      >
        <div className={styles.center_horizontal_column}>
          <div className={styles.tip}>
            <p>{i18n('create_project_tip')}</p>
          </div>
          <TextInput
            className={styles.input}
            placeholder={'Your project name'}
            value={projectName}
            onChange={this.onProjectInput}
            hasErr={hasErr || alreadTaken}
          />
          <div className={cx(styles.center_vertical_column, styles.status)}>
            <p
              className={cx({
                [styles.fail_color]: hasErr || alreadTaken,
                [styles.success_color]: isSuccess && !hasErr && !alreadTaken,
              })}
            >
              {(alreadTaken && i18n('create_project_taken')) ||
                (hasErr && i18n('create_project_err')) ||
                (isSuccess && i18n('success_title')) ||
                ''}
            </p>
          </div>
          <div className={cx(styles.flex_content, styles.actions)}>
            <Button
              forCancel={true}
              className={styles.cancel}
              onClick={this.props.close}
            >
              <p>{i18n('cancel_title')}</p>
            </Button>
            <Button
              loading={hadSubmit}
              className={styles.confirm}
              onClick={this.submitProject}
            >
              <p>{i18n('confirm_title')}</p>
            </Button>
          </div>
        </div>
      </section>
    );
  }
}

export default withProjectSettings(CreateProject);
