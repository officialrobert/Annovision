import React, { useEffect } from 'react';
import cx from 'classnames';
import styles from './CommonMessage.scss';
import Button from 'src/components/button';
import i18n from 'src/locales';

const CommonMessage = (props) => {
  const COMMON_MESSAGE_CLASS = 'COMMON_MESSAGE_CLASS';

  const handleOutsideClick = (evt) => {
    if (!evt) return;

    if (evt.target.classList.contains(COMMON_MESSAGE_CLASS)) {
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

  return (
    <section
      className={cx(
        styles.center_all_row,
        styles.commonmsg,
        COMMON_MESSAGE_CLASS
      )}
    >
      <div className={styles.center_horizontal_column}>
        <p className={styles.message}>{props.message}</p>
        <div className={styles.actions}>
          <Button className={styles.close} onClick={props.close}>
            <p>{i18n('close_title')}</p>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default CommonMessage;
