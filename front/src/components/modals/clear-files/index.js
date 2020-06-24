import React, { useEffect } from 'react';
import cx from 'classnames';
import styles from './ClearFiles.scss';
import i18n from 'src/locales';
import Button from 'src/components/button';
import { withProjectSettings } from 'src/project-manager/Context';
import AppLoader from 'src/components/app-loader';

const ClearFiles = (props) => {
  const CLEAR_FILES_AREA_CLASSNAME = 'CLEAR_FILES_AREA_CLASSNAME';

  const handleOutsideClick = (evt) => {
    if (!evt) return;

    if (
      evt.target.classList.contains(CLEAR_FILES_AREA_CLASSNAME) &&
      !props.removingFiles
    ) {
      props.close();
    }
  };

  useEffect(() => {
    window.addEventListener('click', handleOutsideClick);
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    return () => {
      window.removeEventListener('click', handleOutsideClick);
    };
    // eslint-disable-next-line
  }, []);

  const confirmClear = async () => {
    if (typeof props.confirm === 'function') props.confirm();
  };

  return (
    <section
      className={cx(
        styles.center_all_row,
        styles.clearfiles,
        CLEAR_FILES_AREA_CLASSNAME
      )}
    >
      <div className={styles.center_horizontal_column}>
        <div className={styles.msg}>
          <p>{i18n('confirm_clear_files')}</p>
        </div>
        <div className={cx(styles.center_vertical_row, styles.actions)}>
          <Button
            className={styles.cancel}
            forCancel={true}
            onClick={props.close}
          >
            <p>{i18n('cancel_title')}</p>
          </Button>
          <Button className={styles.confirm} onClick={confirmClear}>
            <p>{i18n('confirm_title')}</p>
          </Button>
        </div>
        {props.removingFiles && (
          <div className={cx(styles.center_all_column, styles.loading)}>
            <div className={styles.message}>
              <p>{i18n('files_clear_load')}</p>
            </div>
            <div className={styles.spin}>
              <AppLoader />
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default withProjectSettings(ClearFiles);
