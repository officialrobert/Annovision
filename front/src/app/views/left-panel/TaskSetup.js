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
    /**
     * For classification
     */
    newClassname: '',
    newClassnameErr: false,
    newClassnameSubmit: false,
    classnamesRemove: [],
    classificationAllSelected: false,
    removingClassification: false,
    /**
     *
     */

    /**
     * For region-based
     */
    newRegionAttribute: '',
    newRegionAttributeErr: false,
    newRegionAttributeSubmit: false,
    regionAttributeRemove: [],
    regionAttributeAllSelected: false,
    removingRegionAttribute: false,
  };

  constructor() {
    super();

    this.setStateAsync = (obj) =>
      new Promise((resolve) => {
        this.setState({ ...obj }, resolve);
      });
  }

  onRegionAttributeInput = (evt) => {
    if (!evt) return;

    const { value } = evt.target;
    this.setState({ newRegionAttribute: value }, this.validateRegionAttribute);
  };

  onClassnameInput = (evt) => {
    if (!evt) return;

    const { value } = evt.target;
    this.setState({ newClassname: value }, this.validateClassname);
  };

  validateRegionAttribute = debounce(() => {
    let err = false;
    if (!isAlphaNumeric(this.state.newRegionAttribute)) err = true;

    this.setState({
      newRegionAttributeErr: err,
    });
  }, 200);

  validateClassname = debounce(() => {
    let err = false;
    if (!isAlphaNumeric(this.state.newClassname)) err = true;

    this.setState({
      newClassnameErr: err,
    });
  }, 200);

  addRegionAttribute = debounce(() => {
    const {
      newRegionAttributeErr,
      newRegionAttributeSubmit,
      removingRegionAttribute,
    } = this.state;

    if (
      newRegionAttributeErr ||
      newRegionAttributeSubmit ||
      removingRegionAttribute
    )
      return;

    this.setState(
      {
        newRegionAttributeSubmit: true,
      },
      async () => {
        const newRegionAttribute = String(
          this.state.newRegionAttribute
        ).toLowerCase();
        const region = cloneObject(
          this.props.userConfig.selectedProject.region
        );
        const alreadyExists =
          region.attributes &&
          region.attributes.includes(newRegionAttribute || '');

        if (newRegionAttribute.length <= 0 || alreadyExists) {
          await this.setStateAsync({
            newRegionAttributeSubmit: false,
            newRegionAttributeErr: false,
            newRegionAttribute: '',
          });
          return;
        }

        if (region.attributes && region.attributes.length > 0) {
          region.attributes.push(newRegionAttribute);
        } else region.attributes = [newRegionAttribute];

        await this.props.setupProjectTask(REGION_BASED_TASK.key, region);
        await this.setStateAsync({
          newRegionAttributeSubmit: false,
          newRegionAttributeErr: false,
          newRegionAttribute: '',
          regionAttributeAllSelected: false,
        });
      }
    );
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
            newClassname: '',
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
          classificationAllSelected: false,
        });
      }
    );
  }, 200);

  toggleRegionAttributeToRemove = (evt) => {
    if (!evt) return;

    if (evt.target.hasAttribute('data')) {
      try {
        const regionAttributeRemove = cloneObject(
          this.state.regionAttributeRemove
        );
        const jsonData = JSON.parse(evt.target.getAttribute('data'));

        if (regionAttributeRemove.includes(jsonData.cattribute)) {
          regionAttributeRemove.splice(
            regionAttributeRemove.indexOf(jsonData.cattribute),
            1
          );
        } else regionAttributeRemove.push(jsonData.cattribute);

        this.setState({
          regionAttributeRemove,
        });
      } catch (err) {
        Logger.error(
          `Selecting region attribute - ${evt.target.getAttribute(
            'data'
          )} failed w/ error - ${err.message} `
        );
      }
    }
  };

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

  selectAllRegionAttribute = () => {
    const { regionAttributeAllSelected, removingRegionAttribute } = this.state;
    const { selectedProject } = cloneObject(this.props.userConfig);
    const { region } = selectedProject;
    const regionAttributeRemove = [];

    if (
      !region.attributes ||
      region.attributes.length <= 0 ||
      removingRegionAttribute
    )
      return;

    if (regionAttributeAllSelected) {
      this.setState({
        regionAttributeAllSelected: false,
        regionAttributeRemove: [],
      });
      return;
    } else if (
      this.state.regionAttributeRemove.length !== region.attributes.length
    ) {
      region.attributes.forEach((cattribute) => {
        regionAttributeRemove.push(cattribute);
      });

      this.setState({
        regionAttributeRemove,
        regionAttributeAllSelected: true,
      });
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
    } else if (
      this.state.classnamesRemove.length !== classification.classes.length
    ) {
      classification.classes.forEach((cclass) => {
        classnamesRemove.push(cclass);
      });

      this.setState({
        classnamesRemove,
        classificationAllSelected: true,
      });
    }
  };

  removeSelectedRegionAtt = debounce(async () => {
    if (this.state.removingRegionAttribute) return;
    else await this.setStateAsync({ removingRegionAttribute: true });

    const { selectedProject } = this.props.userConfig;
    const { regionAttributeRemove } = this.state;
    const region = cloneObject(selectedProject.region);

    if (selectedProject.region && regionAttributeRemove.length > 0) {
      for (let index = 0; index < regionAttributeRemove.length; index++) {
        const cattribute = regionAttributeRemove[index];
        region.attributes.splice(region.attributes.indexOf(cattribute), 1);
      }

      Logger.log(
        `Removing attributes for region based task - ${JSON.stringify(
          regionAttributeRemove
        )}`
      );

      await this.props.setupProjectTask(REGION_BASED_TASK.key, region);
      await this.setStateAsync({
        regionAttributeRemove: [],
        regionAttributeAllSelected: false,
      });
    }

    await this.setStateAsync({ removingRegionAttribute: false });
  }, 200);

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
              className={styles.newclassinp}
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
      const {
        regionAttributeAllSelected,
        newRegionAttribute,
        regionAttributeRemove,
      } = this.state;
      return (
        <div className={styles.region}>
          <div className={cx(styles.center_vertical_row, styles.newAttribute)}>
            <TextInput
              className={styles.attributeName}
              value={newRegionAttribute}
              placeholder={i18n('attribute_title')}
              onChange={this.onRegionAttributeInput}
            />
            <Button className={styles.add} onClick={this.addRegionAttribute}>
              <p>{i18n('add_title')}</p>
            </Button>
          </div>
          <div className={cx(styles.center_vertical_row, styles.actions)}>
            <Button
              className={styles.removeselect}
              onClick={this.removeSelectedRegionAtt}
            >
              <p>{i18n('remove_title')}</p>
            </Button>
            <Button
              className={styles.selectall}
              onClick={this.selectAllRegionAttribute}
            >
              <p>
                {regionAttributeAllSelected
                  ? i18n('unselect_all')
                  : i18n('select_all')}
              </p>
            </Button>
          </div>
          <div className={styles.attregionlist}>
            <ul onClick={this.toggleRegionAttributeToRemove}>
              {(() => {
                if (selectedProject.region) {
                  return selectedProject.region.attributes.map(
                    (cattribute, index) => (
                      <li key={`${REGION_BASED_TASK.key}-${index}`}>
                        <CheckBox
                          className={styles.cb}
                          data={{ index, cattribute }}
                          selected={regionAttributeRemove.includes(cattribute)}
                        />
                        <p>{`${cattribute}`}</p>
                      </li>
                    )
                  );
                } else return null;
              })()}
            </ul>
          </div>
        </div>
      );
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
