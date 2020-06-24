import React, { Component, createRef } from 'react';
import cx from 'classnames';
import { withGlobalSettings } from 'src/app-manager/Context';
import styles from './BottomBar.scss';
import i18n from 'src/locales';
import {
  REGION_BASED_TASK,
  CLASSIFICATION_TASK,
  SEGMENTATION_TASK,
} from 'src/constants/App';
import { debounce } from 'src/helpers/util';
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
    this.taskActionsRef = null;
    window.removeEventListener('resize', this.handleBottomBarResize);
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
              this.props.setDOM(
                <ClassificationClasses close={this.props.deactivateModal} />
              );
              this.props.activateModal();
            }}
          >
            <p>{i18n('edit_classses')}</p>
          </Button>
        </div>
      );
    } else if (REGION_BASED_TASK.key === task.key) {
      // @todo
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
