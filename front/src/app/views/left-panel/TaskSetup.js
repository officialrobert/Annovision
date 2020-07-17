import React, { Component } from 'react';
import cx from 'classnames';
import styles from './TaskSetup.scss';
import {
  REGION_BASED_TASK,
  CLASSIFICATION_TASK,
  SEGMENTATION_TASK,
  DEFAULT_RGB_SEGMENTATION,
  AVAIL_COLORS_SEGMENTATION,
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

    /**
     * For segmentation
     */

    newSegmentationLabel: '',
    newSegmentationLabelErr: false,
    newSegmentationColor: DEFAULT_RGB_SEGMENTATION,
    finalSegmentationColor: DEFAULT_RGB_SEGMENTATION,
    customSegmentationColor: '',
    newSegmentationColorErr: false,
    newSegmentationLabelSubmit: false,
    segmentationLabelRemove: [],
    segmentationLabelAllSelected: false,
    removingSegmentationLabel: false,
    colorExists: false,
    labelExists: false,
  };

  constructor() {
    super();

    this.setStateAsync = (obj) =>
      new Promise((resolve) => {
        this.setState({ ...obj }, resolve);
      });
  }

  selectColorForLabel = (evt) => {
    if (!evt) return;

    if (evt.target.hasAttribute('data')) {
      try {
        const ccolor = evt.target.getAttribute('data');

        if (!ccolor || ccolor.length < 0) {
          return;
        }

        this.setState({
          finalSegmentationColor: ccolor,
          newSegmentationColor: ccolor,
        });
      } catch (err) {
        Logger.error(`Selecting color failed with error - ${err.message}`);
      }
    }
  };

  onSegmentationColorInput = (evt) => {
    if (!evt) return;

    const { value } = evt.target;
    this.setState(
      {
        newSegmentationColor: value,
      },
      this.validateSegmentationColor
    );
  };

  onSegmentationLabelInput = (evt) => {
    if (!evt) return;

    const { value } = evt.target;
    this.setState(
      { newSegmentationLabel: value },
      this.validateSegmentationLabel
    );
  };

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

  validateSegmentationColor = debounce(() => {
    //validate color (r,g,b) input
    try {
      this.setState({
        labelExists: false,
        colorExists: false,
      });

      let { newSegmentationColor } = this.state;
      newSegmentationColor = String(newSegmentationColor)
        .replace(/^\s+|\s+$/gm, '')
        .toLowerCase();

      const colorsArr = newSegmentationColor.split(',');
      if (colorsArr.length !== 3) {
        throw new Error('Not a valid RGB format');
      }

      colorsArr.forEach((cclr) => {
        const inNum = Number(cclr);
        if (Number.isNaN(inNum)) throw new Error('Not a number');
        else if (inNum < 0 || inNum > 255)
          throw new Error('Number is beyond rgb 8 bit');
        else return inNum;
      });

      let isCustom = false;
      if (!AVAIL_COLORS_SEGMENTATION.includes(newSegmentationColor)) {
        isCustom = true;
      }

      this.setState({
        newSegmentationColor,
        finalSegmentationColor: newSegmentationColor,
        ...(isCustom && { customSegmentationColor: newSegmentationColor }),
        newSegmentationColorErr: false,
      });
    } catch (err) {
      Logger.error(`Invalid RGB input - ${err.message}`);
      this.setState({
        newSegmentationColorErr: true,
      });
    }
  }, 200);

  validateSegmentationLabel = debounce(() => {
    let err = false;
    if (!isAlphaNumeric(this.state.newSegmentationLabel)) err = true;

    this.setState({
      newSegmentationLabelErr: err,
      labelExists: false,
      colorExists: false,
    });
  }, 200);

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

  addSegmentationLabel = debounce(() => {
    const {
      newSegmentationLabelErr,
      newSegmentationColorErr,
      newSegmentationLabelSubmit,
      removingSegmentationLabel,
    } = this.state;

    if (
      newSegmentationLabelSubmit ||
      removingSegmentationLabel ||
      newSegmentationLabelErr ||
      newSegmentationColorErr
    )
      return;

    this.setState(
      {
        newSegmentationLabelSubmit: true,
      },
      async () => {
        const newSegmentationLabel = String(
          this.state.newSegmentationLabel
        ).toLowerCase();
        const newSegmentationColor = String(
          this.state.newSegmentationColor
        ).toLowerCase();
        const segmentation = cloneObject(
          this.props.userConfig.selectedProject.segmentation
        );

        const colorExists = segmentation.colors.includes(newSegmentationColor);
        const labelExists = segmentation.labels.includes(newSegmentationLabel);

        if (!newSegmentationLabel.length) {
          this.setState({
            newSegmentationLabelErr: true,
            newSegmentationLabelSubmit: false,
          });
          return;
        } else if (!newSegmentationColor.length) {
          this.setState({
            newSegmentationColorErr: true,
            newSegmentationLabelSubmit: false,
          });
          return;
        } else if (colorExists || labelExists) {
          this.setState({
            colorExists,
            labelExists,
            newSegmentationLabelSubmit: false,
          });
          return;
        }

        if (segmentation.labels.length > 0) {
          segmentation.colors.push(newSegmentationColor);
          segmentation.labels.push(newSegmentationLabel);
        } else {
          segmentation.colors = [newSegmentationColor];
          segmentation.labels = [newSegmentationLabel];
        }

        await this.props.setupProjectTask(SEGMENTATION_TASK.key, segmentation);
        await this.setStateAsync({
          colorExists: false,
          labelExists: false,
          newSegmentationLabelSubmit: false,
          newSegmentationLabel: '',
          newSegmentationLabelErr: false,
          newSegmentationColorErr: false,
        });
      }
    );
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

  toggleSegmentLabelToRemove = (evt) => {
    if (!evt) return;

    if (evt.target.hasAttribute('data')) {
      try {
        const segmentationLabelRemove = cloneObject(
          this.state.segmentationLabelRemove
        );
        const jsonData = JSON.parse(evt.target.getAttribute('data'));
        const { selectedProject } = this.props.userConfig;
        const { segmentation } = selectedProject;

        if (!segmentation) return;
        else if (segmentationLabelRemove.includes(jsonData.llabel)) {
          segmentationLabelRemove.splice(
            segmentationLabelRemove.indexOf(jsonData.llabel),
            1
          );
        } else segmentationLabelRemove.push(jsonData.llabel);

        if (segmentationLabelRemove.length === segmentation.labels.length) {
          this.setState({
            segmentationLabelAllSelected: true,
          });
        } else
          this.setState({
            segmentationLabelAllSelected: false,
          });

        this.setState({ segmentationLabelRemove });
      } catch (err) {
        Logger.error(
          `Selecting segmentation label - ${evt.target.getAttribute(
            'data'
          )} failed w/ error - ${err.message} `
        );
      }
    }
  };

  toggleRegionAttributeToRemove = (evt) => {
    if (!evt) return;

    if (evt.target.hasAttribute('data')) {
      try {
        const { selectedProject } = this.props.userConfig;
        const { region } = selectedProject;
        const regionAttributeRemove = cloneObject(
          this.state.regionAttributeRemove
        );
        const jsonData = JSON.parse(evt.target.getAttribute('data'));

        if (!region) return;
        else if (regionAttributeRemove.includes(jsonData.cattribute)) {
          regionAttributeRemove.splice(
            regionAttributeRemove.indexOf(jsonData.cattribute),
            1
          );
        } else regionAttributeRemove.push(jsonData.cattribute);

        if (regionAttributeRemove.length === region.attributes.length) {
          this.setState({
            regionAttributeAllSelected: true,
          });
        } else
          this.setState({
            regionAttributeAllSelected: false,
          });

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
        const { selectedProject } = this.props.userConfig;
        const { classification } = selectedProject;
        const classnamesRemove = cloneObject(this.state.classnamesRemove);
        const jsonData = JSON.parse(evt.target.getAttribute('data'));

        if (!classification) return;
        else if (classnamesRemove.includes(jsonData.cclass)) {
          classnamesRemove.splice(classnamesRemove.indexOf(jsonData.cclass), 1);
        } else classnamesRemove.push(jsonData.cclass);

        if (classnamesRemove.length === classification.classes.length) {
          this.setState({
            classificationAllSelected: true,
          });
        } else
          this.setState({
            classificationAllSelected: false,
          });

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

  selectAllSegmentationLabel = () => {
    const {
      removingSegmentationLabel,
      segmentationLabelAllSelected,
    } = this.state;
    const { selectedProject } = cloneObject(this.props.userConfig);
    const { segmentation } = selectedProject;
    const segmentationLabelRemove = [];

    if (
      !segmentation.labels ||
      segmentation.labels.length <= 0 ||
      removingSegmentationLabel
    )
      return;

    if (segmentationLabelAllSelected) {
      this.setState({
        segmentationLabelAllSelected: false,
        segmentationLabelRemove: [],
      });
      return;
    } else if (
      this.state.segmentationLabelRemove.length !== segmentation.labels.length
    ) {
      segmentation.labels.forEach((llabel) => {
        segmentationLabelRemove.push(llabel);
      });

      this.setState({
        segmentationLabelRemove,
        segmentationLabelAllSelected: true,
      });
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

  removeSelectedSegmentLabel = debounce(async () => {
    if (this.state.removingSegmentationLabel) return;
    else await this.setStateAsync({ removingSegmentationLabel: true });

    const { selectedProject } = this.props.userConfig;
    const { segmentationLabelRemove } = this.state;
    const segmentation = cloneObject(selectedProject.segmentation);

    if (segmentation && segmentationLabelRemove.length > 0) {
      for (let index = 0; index < segmentationLabelRemove.length; index++) {
        const llabel = segmentationLabelRemove[index];
        const cidx = segmentation.labels.indexOf(llabel);

        segmentation.labels.splice(cidx, 1);
        segmentation.colors.splice(cidx, 1);
      }

      Logger.log(
        `Removing label for segmentation based task - ${JSON.stringify(
          segmentationLabelRemove
        )}`
      );

      await this.props.setupProjectTask(SEGMENTATION_TASK.key, segmentation);
      await this.setStateAsync({
        segmentationLabelRemove: [],
        segmentationLabelAllSelected: false,
      });
    }

    await this.setStateAsync({ removingSegmentationLabel: false });
  });

  removeSelectedRegionAtt = debounce(async () => {
    if (this.state.removingRegionAttribute) return;
    else await this.setStateAsync({ removingRegionAttribute: true });

    const { selectedProject } = this.props.userConfig;
    const { regionAttributeRemove } = this.state;
    const region = cloneObject(selectedProject.region);

    if (region && regionAttributeRemove.length > 0) {
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

    if (!selectedProject) return null;
    else if (key === CLASSIFICATION_TASK.key) {
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
                  if (selectedProject.classification.classes.length)
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
                  else
                    return (
                      <div className={styles.noclassification}>
                        <p>{i18n('create_first_classname')} </p>
                      </div>
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
        newRegionAttributeErr,
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
              hasErr={newRegionAttributeErr}
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
                  if (selectedProject.region.attributes.length > 0)
                    return selectedProject.region.attributes.map(
                      (cattribute, index) => (
                        <li key={`${REGION_BASED_TASK.key}-${index}`}>
                          <CheckBox
                            className={styles.cb}
                            data={{ index, cattribute }}
                            selected={regionAttributeRemove.includes(
                              cattribute
                            )}
                          />
                          <p>{`${cattribute}`}</p>
                        </li>
                      )
                    );
                  else
                    return (
                      <div className={styles.noregionatt}>
                        <p>{i18n('create_first_attribute')} </p>
                      </div>
                    );
                } else return null;
              })()}
            </ul>
          </div>
        </div>
      );
    } else if (key === SEGMENTATION_TASK.key) {
      const {
        newSegmentationLabel,
        newSegmentationLabelErr,
        newSegmentationColor,
        newSegmentationColorErr,
        finalSegmentationColor,
        customSegmentationColor,
        segmentationLabelAllSelected,
        colorExists,
        labelExists,
        segmentationLabelRemove,
      } = this.state;
      return (
        <div className={styles.segmentation}>
          <div className={cx(styles.center_vertical_column, styles.newsegment)}>
            <div className={styles.createerr}>
              <p>
                {(colorExists || labelExists) && i18n('color_label_exists')}
              </p>
            </div>
            <div className={cx(styles.center_vertical_row, styles.newlabel)}>
              <TextInput
                className={styles.input}
                placeholder={i18n('label_title')}
                value={newSegmentationLabel}
                onChange={this.onSegmentationLabelInput}
                hasErr={newSegmentationLabelErr}
              />
              <Button
                className={styles.add}
                onClick={this.addSegmentationLabel}
              >
                <p>{i18n('add_title')}</p>
              </Button>
            </div>
            <div className={cx(styles.center_vertical_row, styles.color)}>
              <TextInput
                className={styles.input}
                value={newSegmentationColor}
                hasErr={newSegmentationColorErr}
                onChange={this.onSegmentationColorInput}
              />
              <p className={styles.rgbtitle}>{'(R,G,B)'} </p>
            </div>
            <div className={styles.availColors}>
              <ul onClick={this.selectColorForLabel}>
                {[...AVAIL_COLORS_SEGMENTATION, customSegmentationColor].map(
                  (cclr, index) => {
                    return (
                      <li
                        key={`${index}-segmentation-color`}
                        className={cx({
                          [styles.selectedcolor]:
                            finalSegmentationColor === cclr,
                          [styles.unselectedcolor]:
                            finalSegmentationColor !== cclr,
                        })}
                        data={`${cclr}`}
                      >
                        <span
                          style={{
                            ...(cclr &&
                              cclr.length > 0 && {
                                background: `rgba(${cclr},1)`,
                              }),
                          }}
                          data={`${cclr}`}
                        />
                      </li>
                    );
                  }
                )}
              </ul>
            </div>
            <div className={cx(styles.center_vertical_row, styles.actions)}>
              <Button
                className={styles.removeselect}
                onClick={this.removeSelectedSegmentLabel}
              >
                <p>{i18n('remove_title')}</p>
              </Button>
              <Button
                className={styles.selectall}
                onClick={this.selectAllSegmentationLabel}
              >
                <p>
                  {segmentationLabelAllSelected
                    ? i18n('unselect_all')
                    : i18n('select_all')}
                </p>
              </Button>
            </div>
            <div className={styles.segmlabellist}>
              <ul onClick={this.toggleSegmentLabelToRemove}>
                {(() => {
                  if (selectedProject.segmentation) {
                    if (selectedProject.segmentation.labels.length > 0) {
                      return selectedProject.segmentation.labels.map(
                        (llabel, index) => {
                          const ccolor =
                            selectedProject.segmentation.colors[index];

                          return (
                            <li key={`${SEGMENTATION_TASK.key}-${index}`}>
                              <CheckBox
                                className={styles.cb}
                                data={{
                                  index,
                                  llabel,
                                  ccolor,
                                }}
                                selected={segmentationLabelRemove.includes(
                                  llabel
                                )}
                              />
                              <span
                                style={{ background: `rgba(${ccolor},1)` }}
                                className={styles.forcolor}
                              ></span>
                              <p>{`${llabel}`}</p>
                            </li>
                          );
                        }
                      );
                    } else
                      return (
                        <div className={styles.nosegmentlabel}>
                          <p>{i18n('create_first_label')} </p>
                        </div>
                      );
                  } else return null;
                })()}
              </ul>
            </div>
          </div>
        </div>
      );
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
