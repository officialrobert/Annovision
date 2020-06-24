import React, { Component } from 'react';
import cx from 'classnames';
import styles from './TaskSetup.scss';
import {
  REGION_BASED_TASK,
  CLASSIFICATION_TASK,
  SEGMENTATION_TASK,
} from 'src/constants/App';
import Button from 'src/components/button';
import TextInput from 'src/components/text-input';
import i18n from 'src/locales';
import { isAlphaNumeric, debounce, cloneObject } from 'src/helpers/util';
import CheckBox from 'src/components/check-box';
import Logger from 'src/lib/Logger';

class TaskSetup extends Component {
  state = {
    newClassname: '',
    newClassnameErr: false,
    newClassnameSubmit: false,
    classnamesRemove: [],
    classificationAllSelected: false,
    removingClassification: false,
  };

  constructor() {
    super();

    this.setStateAsync = (obj) =>
      new Promise((resolve) => {
        this.setState({ ...obj }, resolve);
      });
  }

  onClassnameInput = (evt) => {
    if (!evt) return;

    const { value } = evt.target;
    this.setState({ newClassname: value }, this.validateClassname);
  };

  validateClassname = debounce(() => {
    let err = false;
    if (!isAlphaNumeric(this.state.newClassname)) err = true;

    this.setState({
      newClassnameErr: err,
    });
  }, 200);

  addClassification = debounce(() => {
    const {
      newClassnameErr,
      newClassnameSubmit,
      removingClassification,
    } = this.state;

    if (newClassnameErr || newClassnameSubmit || removingClassification) return;

    this.setState(
      {
        newClassnameSubmit: true,
      },
      async () => {
        const newClassname = String(this.state.newClassname).toLowerCase();
        const classification = cloneObject(
          this.props.userConfig.selectedProject.classification
        );
        const alreadyExists =
          classification.classes &&
          classification.classes.includes(newClassname || '');

        if (newClassname.length <= 0 || alreadyExists) {
          await this.setStateAsync({
            newClassnameSubmit: false,
            newClassnameErr: false,
          });
          return;
        }

        if (classification.classes && classification.classes.length > 0) {
          classification.classes.push(newClassname);
        } else classification.classes = [newClassname];

        await this.props.setupProjectTask(
          CLASSIFICATION_TASK.key,
          classification
        );

        await this.setStateAsync({
          newClassnameSubmit: false,
          newClassnameErr: false,
          newClassname: '',
        });
      }
    );
  }, 200);

  toggleClassificationToRemove = (evt) => {
    if (!evt) return;

    if (evt.target.hasAttribute('data')) {
      try {
        const classnamesRemove = cloneObject(this.state.classnamesRemove);
        const jsonData = JSON.parse(evt.target.getAttribute('data'));

        if (classnamesRemove.includes(jsonData.cclass)) {
          classnamesRemove.splice(classnamesRemove.indexOf(jsonData.cclass), 1);
        } else classnamesRemove.push(jsonData.cclass);

        this.setState({
          classnamesRemove,
        });
      } catch (err) {
        Logger.error(
          `Selecting class - ${evt.target.getAttribute(
            'data'
          )} failed w/ error - ${err.message} `
        );
      }
    }
  };

  selectAllClassification = () => {
    const { classificationAllSelected, removingClassification } = this.state;
    const { selectedProject } = cloneObject(this.props.userConfig);
    const { classification } = selectedProject;
    const classnamesRemove = [];

    if (
      !classification.classes ||
      classification.classes.length <= 0 ||
      removingClassification
    )
      return;

    if (classificationAllSelected) {
      this.setState({
        classificationAllSelected: false,
        classnamesRemove: [],
      });
      return;
    } else if (this.state.classnamesRemove.length <= 0) {
      classification.classes.forEach((cclass) => {
        classnamesRemove.push(cclass);
      });

      this.setState({
        classnamesRemove,
        classificationAllSelected: true,
      });
    }
  };

  removeSelectedClassification = debounce(async () => {
    if (this.state.removingClassification) return;
    else await this.setStateAsync({ removingClassification: true });

    const { selectedProject } = this.props.userConfig;
    const { classnamesRemove } = this.state;
    const classification = cloneObject(selectedProject.classification);

    if (selectedProject.classification && classnamesRemove.length > 0) {
      for (let index = 0; index < classnamesRemove.length; index++) {
        const cclass = classnamesRemove[index];
        classification.classes.splice(
          classification.classes.indexOf(cclass),
          1
        );
      }

      Logger.log(
        `Removing names for classification task - ${JSON.stringify(
          classnamesRemove
        )}`
      );
      await this.props.setupProjectTask(
        CLASSIFICATION_TASK.key,
        classification
      );
      await this.setStateAsync({
        classnamesRemove: [],
        classificationAllSelected: false,
      });
    }

    await this.setStateAsync({ removingClassification: false });
  }, 200);

  getTaskDisplay = ({ key }) => {
    const { selectedProject } = cloneObject(this.props.userConfig);

    if (key === CLASSIFICATION_TASK.key) {
      const {
        newClassname,
        newClassnameErr,
        newClassnameSubmit,
        classnamesRemove,
        classificationAllSelected,
      } = this.state;

      return (
        <div className={styles.classification}>
          <div className={cx(styles.center_vertical_row, styles.newclass)}>
            <TextInput
              className={styles.input}
              value={newClassname}
              placeholder={i18n('classname_title')}
              onChange={this.onClassnameInput}
              hasErr={newClassnameErr}
            />
            <Button
              className={styles.add}
              loading={newClassnameSubmit}
              onClick={this.addClassification}
            >
              <p>{i18n('add_title')}</p>
            </Button>
          </div>
          <div className={cx(styles.center_vertical_row, styles.actions)}>
            <Button
              className={styles.removeselect}
              onClick={this.removeSelectedClassification}
            >
              <p>{i18n('remove_title')}</p>
            </Button>
            <Button
              className={styles.selectall}
              onClick={this.selectAllClassification}
            >
              <p>
                {classificationAllSelected
                  ? i18n('unselect_all')
                  : i18n('select_all')}
              </p>
            </Button>
          </div>
          <div className={styles.classnamelist}>
            <ul onClick={this.toggleClassificationToRemove}>
              {(() => {
                if (selectedProject.classification) {
                  return selectedProject.classification.classes.map(
                    (cclass, index) => (
                      <li key={`${CLASSIFICATION_TASK.key}-${index}`}>
                        <CheckBox
                          className={styles.cb}
                          data={{ index, cclass }}
                          selected={classnamesRemove.includes(cclass)}
                        />
                        <p>{`${cclass}`}</p>
                      </li>
                    )
                  );
                } else return null;
              })()}
            </ul>
          </div>
        </div>
      );
    } else if (key === REGION_BASED_TASK.key) {
      // @todo
    } else if (key === SEGMENTATION_TASK.key) {
      // @todo
    } else return null;
  };

  render() {
    const { userConfig } = this.props;
    const { task } = userConfig;

    return (
      <div className={styles.tasksetup}>
        <label className={styles.title}>{i18n('output_setup_title')} </label>
        {this.getTaskDisplay(task)}
      </div>
    );
  }
}

export default TaskSetup;
