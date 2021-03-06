import React, { Component, createRef, cloneElement } from 'react';
import cx from 'classnames';
import { withGlobalSettings } from 'src/app-manager/Context';
import styles from './BottomBar.scss';
import i18n from 'src/locales';
import {
  REGION_BASED_TASK,
  CLASSIFICATION_TASK,
  SEGMENTATION_TASK,
  REGION_BOUNDINGBOX_NAME,
  REGION_POLYGON_NAME,
} from 'src/constants/App';
import { debounce, cloneObject } from 'src/helpers/util';
import Button from 'src/components/button';
import { withModalSettings } from 'src/modal-manager/Context';
import ClassificationClasses from 'src/components/modals/classification-classes';
import Checkbox from 'src/components/check-box';
import InlineSVG from 'src/components/inline-svg';
import Action from 'src/components/action';

class BottomBar extends Component {
  taskActionsRef = null;
  state = {
    rightPanel: true,
    leftPanel: true,
  };

  constructor() {
    super();

    this.taskActionsRef = createRef();
    window.addEventListener('resize', this.handleBottomBarResize);
  }

  componentDidMount() {
    this.handleBottomBarResize();
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.handleBottomBarResize);
    delete this.taskActionsRef;
  }

  handleBottomBarResize = debounce(() => {
    const { innerWidth } = window;

    if (this.taskActionsRef) {
      this.taskActionsRef.current.style.width = `${innerWidth - 600}px`;
    }
  }, 200);

  toggleRightPanel = () => {
    const { importingFiles, removingFiles } = this.props;
    if (importingFiles || removingFiles) return;

    this.setState(
      { rightPanel: !this.state.rightPanel },
      this.props.toggleRightPanel
    );
  };

  toggleLeftPanel = () => {
    const { importingFiles, removingFiles } = this.props;
    if (importingFiles || removingFiles) return;

    this.setState(
      { leftPanel: !this.state.leftPanel },
      this.props.toggleLeftPanel
    );
  };

  regionBasedOpt = (evt) => {
    if (!evt) return;
    else if (evt.target.hasAttribute('data')) {
      const { userConfig } = this.props;
      const task = cloneObject(userConfig.task);
      const opt = evt.target.getAttribute('data');

      if (task.opt && task.opt === opt) {
        delete task.opt;
      } else task.opt = opt;

      this.props.setUserConfig('task', task);
    }
  };

  setActiveRegion = debounce(async (type = null) => {
    const { activeAnnotation, userConfig } = this.props;
    const { selectedProject } = userConfig;
    const files = cloneObject(userConfig.files);
    const inspect = cloneObject(this.props.inspect);

    if (!selectedProject || !type || !activeAnnotation || !files.active) {
      return;
    }

    let activeRegion = inspect.region.active;
    const region = activeAnnotation.region;
    if (type === 'increase') activeRegion += 1;
    else if (type === 'decrease') activeRegion -= 1;

    if (activeRegion < 0) activeRegion = region.regions.length;
    else if (activeRegion > region.regions.length) activeRegion = 0;

    inspect.region.active = activeRegion;
    await this.props.setGlobalState('inspect', inspect, 'setInspect');
  }, 150);

  toggleInspectMode = async () => {
    const inspect = cloneObject(this.props.inspect);
    inspect.isOn = !inspect.isOn;

    await this.props.setGlobalState('inspect', inspect, 'setInspect');
  };

  toggleModeAndDrag = async () => {
    await this.props.setGlobalState(
      'moveAndDrag',
      this.props.moveAndDrag ? false : true
    );
  };

  removeInspectedRegion = async () => {
    const { activeAnnotation, inspect } = this.props;

    if (!activeAnnotation || !inspect) return;

    // prompt warning modal(?)
    await this.props.removeRegionBased();
  };

  editInspectedRegion = async () => {
    // prompt modal to edit region property
  };

  getTaskActions = () => {
    const { userConfig } = this.props;
    const { task } = userConfig;

    if (!task) return null;
    else if (CLASSIFICATION_TASK.key === task.key) {
      return (
        <div
          className={cx(styles.center_all_row, styles.actions_classification)}
        >
          <Button
            className={styles.edit}
            onClick={() => {
              const { userConfig, activeAnnotation } = this.props;

              if (userConfig.files.active && activeAnnotation) {
                this.props.setDOM(
                  cloneElement(
                    <ClassificationClasses close={this.props.deactivateModal} />
                  )
                );
                this.props.activateModal();
              }
            }}
          >
            <p>{i18n('edit_classses')}</p>
          </Button>
        </div>
      );
    } else if (REGION_BASED_TASK.key === task.key) {
      const hasOpt = !!task.opt;
      const { inspect } = this.props;

      return (
        <div className={cx(styles.center_vertical_row, styles.actions_region)}>
          <div
            onClick={this.regionBasedOpt}
            className={styles.center_vertical_row}
          >
            <div
              className={cx(styles.center_all_row, styles.bbox, {
                [styles.selected]:
                  hasOpt && task.opt === REGION_BOUNDINGBOX_NAME,
              })}
            >
              <span />
              <div data={REGION_BOUNDINGBOX_NAME} className={styles.cover} />
            </div>
            <div
              className={cx(styles.center_all_row, styles.polygon, {
                [styles.selected]: hasOpt && task.opt === REGION_POLYGON_NAME,
              })}
            >
              <span />
              <span /> <span /> <span />
              <span />
              <div data={REGION_POLYGON_NAME} className={styles.cover} />
            </div>
          </div>
          <div className={cx(styles.center_vertical_row, styles.traverse)}>
            <p className={styles.title}>{i18n('regions_title')} </p>
            <Button
              forCancel={false}
              className={cx(styles.center_vertical_row, styles.prev)}
              onClick={() => this.setActiveRegion('decrease')}
            >
              <p className={styles.center_all_row}>{'<'}</p>
            </Button>
            <div
              className={cx(styles.center_vertical_row, styles.currentregion)}
            >
              <p>{inspect && inspect.region.active} </p>
            </div>
            <Button
              forCancel={false}
              className={cx(styles.center_vertical_row, styles.next)}
              onClick={() => this.setActiveRegion('increase')}
            >
              <p className={styles.center_all_row}>{'>'}</p>
            </Button>
          </div>

          <Action
            disabled={!inspect || !inspect.isOn}
            className={cx(styles.center_all_row, styles.trash)}
          >
            <div className={cx(styles.center_all_row)}>
              <div onClick={this.removeInspectedRegion}>
                <InlineSVG name={'Trash'} svgWidth={'17'} svgHeight={'17'} />
              </div>
            </div>
          </Action>
          <Action
            disabled={!inspect || !inspect.isOn || inspect.region.active <= 0}
            className={cx(styles.center_all_row, styles.edit)}
          >
            <div className={cx(styles.center_all_row)}>
              <div onClick={this.editInspectedRegion}>
                <InlineSVG name={'Edit'} svgWidth={'17'} svgHeight={'17'} />
              </div>
            </div>
          </Action>
        </div>
      );
    } else if (SEGMENTATION_TASK.key === task.key) {
      // @todo
    } else return null;
  };

  render() {
    const { inspect, moveAndDrag, userConfig } = this.props;
    const { rightPanel, leftPanel } = this.state;
    const { task } = userConfig;
    let disableInspect = false;

    if (task.key === CLASSIFICATION_TASK.key) disableInspect = true; // we disable where inspect mode is not applicable

    return (
      <div className={styles.bottombar}>
        <div className={cx(styles.center_vertical_row, styles.common_actions)}>
          <div className={styles.save}>
            <p> {i18n('save_title')}</p>
          </div>
          <Action
            className={cx(styles.center_vertical_row, styles.inspectmode)}
            disabled={disableInspect}
          >
            <Checkbox
              onChange={this.toggleInspectMode}
              selected={inspect.isOn}
              className={styles.cb}
            />
            <p className={cx(styles.center_vertical_row, styles.title)}>
              {i18n('inspect_mode_title')}
            </p>
          </Action>
          <div
            onClick={this.toggleModeAndDrag}
            className={cx(styles.center_vertical_row, styles.dragmode, {
              [styles.isActive]: moveAndDrag,
            })}
          >
            <div className={styles.ic}>
              <InlineSVG name={'Drag'} svgWidth={'17'} svgHeight={'17'} />
            </div>
          </div>
        </div>
        <div
          ref={this.taskActionsRef}
          className={cx(styles.center_vertical_row, styles.taskactions)}
        >
          {this.getTaskActions()}
        </div>
        <div className={cx(styles.posdisplay, styles.center_vertical_row)}>
          <div
            className={cx(styles.poswrap, styles.center_all_row)}
            onClick={this.toggleLeftPanel}
          >
            <span
              className={cx(styles.left, styles.center_vertical_row, {
                [styles.showpanel]: leftPanel,
                [styles.hidepanel]: !leftPanel,
              })}
            ></span>
          </div>
          <div
            className={cx(styles.poswrap, styles.center_all_row)}
            onClick={this.toggleRightPanel}
          >
            <span
              className={cx(styles.right, styles.center_vertical_row, {
                [styles.showpanel]: rightPanel,
                [styles.hidepanel]: !rightPanel,
              })}
            ></span>
          </div>
        </div>
      </div>
    );
  }
}

export default withGlobalSettings(withModalSettings(BottomBar));
