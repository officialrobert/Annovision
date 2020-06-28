import React, { Component, createRef } from 'react';
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
      task.opt = opt;

      this.props.setUserConfig('task', task);
    }
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
                  <ClassificationClasses close={this.props.deactivateModal} />
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
      // @todo

      const hasOpt = !!task.opt;

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
          <div className={styles.regions}>
            <p className={styles.title}>{i18n('regions_title')}</p>
          </div>
        </div>
      );
    } else if (SEGMENTATION_TASK.key === task.key) {
      // @todo
    } else return null;
  };

  render() {
    const { rightPanel, leftPanel } = this.state;

    return (
      <div className={styles.bottombar}>
        <div className={cx(styles.center_vertical_row, styles.common_actions)}>
          <div className={styles.save}>
            <p> {i18n('save_title')}</p>
          </div>
          <div className={styles.clear}>
            <p>{i18n('clear_title')}</p>
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
