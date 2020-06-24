import React from 'react';
import cx from 'classnames';
import styles from './AppLoader.scss';

const AppLoader = (props) => {
  return (
    <div className={cx(styles.center_all_row, styles.apploader)}>
      <ul className={styles.flex_content}>
        <li></li>
        <li></li>
        <li></li>
      </ul>
    </div>
  );
};

export default AppLoader;
