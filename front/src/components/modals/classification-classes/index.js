import React, { Component } from 'react';
import cx from 'classnames';
import styles from './ClassificationClasses.scss';
import { withGlobalSettings } from 'src/app-manager/Context';
import { withProjectSettings } from 'src/project-manager/Context';
import Checkbox from 'src/components/check-box';
import i18n from 'src/locales';
import Logger from 'src/lib/Logger';
import { CLASSIFICATION_TASK } from 'src/constants/App';

class ClassificationClasses extends Component {
  CLASS_CX_AREA_CS = 'CLASS_CX_AREA_CS';

  constructor() {
    super();

    window.addEventListener('click', this.handleOutsideClick);
  }

  componentWillUnmount() {
    window.removeEventListener('click', this.handleOutsideClick);
  }

  handleOutsideClick = (evt) => {
    if (!evt) return;

    if (
      evt.target.classList.contains(this.CLASS_CX_AREA_CS) &&
      typeof this.props.close === 'function'
    ) {
      this.props.close();
    }
  };

  toggleClassForFile = async (evt) => {
    if (!evt) return;

    if (evt.target.hasAttribute('data')) {
      const { userConfig } = this.props;

      try {
        if (!userConfig.files.active) return;
        const jsonData = JSON.parse(evt.target.getAttribute('data'));
        await this.props.setAnnotation(CLASSIFICATION_TASK.key, {
          ...jsonData,
          idx: userConfig.files.active.idx,
        });
      } catch (err) {
        Logger.error(
          `Applying class on file - ${JSON.stringify(
            userConfig.files.active
          )} failed w/ error - ${err.message} `
        );
      }
    }
  };

  render() {
    const { selectedProject, activeAnnotation } = this.props;
    const { classification } = selectedProject;
    const classes = classification.classes || [];

    return (
      <section
        className={cx(
          styles.center_all_row,
          styles.classificationcx,
          this.CLASS_CX_AREA_CS
        )}
      >
        <div className={styles.center_vertical_column}>
          <ul
            className={styles.center_horizontal_column}
            onClick={this.toggleClassForFile}
          >
            {classes.map((cclass, index) => {
              return (
                <li
                  className={styles.center_vertical_row}
                  key={`classification-cx-select-${cclass}`}
                >
                  <Checkbox
                    className={styles.cb}
                    data={{ cclass, index }}
                    selected={
                      !!activeAnnotation[
                        `${CLASSIFICATION_TASK.key}`
                      ].assigned.includes(cclass)
                    }
                  />
                  <p className={styles.text_overflow_ellipsis}>{cclass} </p>
                </li>
              );
            })}
          </ul>
          {classes.length === 0 && (
            <div className={cx(styles.center_all_row, styles.empty)}>
              <p>{i18n('empty_title')}</p>
            </div>
          )}
        </div>
      </section>
    );
  }
}

export default withGlobalSettings(withProjectSettings(ClassificationClasses));
