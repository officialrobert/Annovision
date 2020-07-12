import React, { Fragment, useEffect, useState } from 'react';
import cx from 'classnames';
import styles from './RemoveFile.scss';
import i18n from 'src/locales';
import Button from 'src/components/button';
import { sleepAsync } from 'src/helpers/util';
import AppLoader from 'src/components/app-loader';

const RemoveFile = (props) => {
  const REMOVE_FILE_AREA_CLASSNAME = 'REMOVE_FILE_AREA_CLASSNAME';
  const [isRemoving, setIsRemoving] = useState(false);

  const handleOutsideClick = (evt) => {
    if (!evt) return;
    else if (
      evt.target.classList.contains(REMOVE_FILE_AREA_CLASSNAME) &&
      !isRemoving
    ) {
      props.close();
    }
  };

  useEffect(() => {
    window.addEventListener('click', handleOutsideClick());
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    return () => {
      window.removeEventListener('click', handleOutsideClick);
    };
    // eslint-disable-next-line
  }, []);

  const doRemove = async () => {
    if (typeof props.confirm === 'function' && props.file) {
      setIsRemoving(true);
      await props.confirm(props.file);
      await sleepAsync(2000);
      setIsRemoving(false);
      props.close();
    }
  };

  return (
    <section
      className={cx(
        styles.center_all_row,
        styles.removefile,
        REMOVE_FILE_AREA_CLASSNAME
      )}
    >
      <div className={styles.center_horizontal_column}>
        {!isRemoving && (
          <Fragment>
            <div className={styles.msg}>
              <p>{i18n('remove_file_selected')} </p>
            </div>
            <div className={styles.actions}>
              <Button
                className={styles.cancel}
                forCancel={true}
                onClick={props.close}
              >
                <p>{i18n('cancel_title')}</p>
              </Button>
              <Button
                onClick={doRemove}
                className={styles.confirm}
                forCancel={false}
              >
                <p>{i18n('confirm_title')}</p>
              </Button>
            </div>
          </Fragment>
        )}
        {isRemoving && (
          <div className={cx(styles.center_all_row, styles.removing)}>
            <div
              className={cx(styles.center_horizontal_column, styles.loading)}
            >
              <p>{i18n('removing_selected_file')} </p>
              <div className={styles.spin}>
                <AppLoader />
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default RemoveFile;
