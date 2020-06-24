import React from 'react';
import cx from 'classnames';
import styles from './LoadingScreen.scss';

const LoadingScreen = (props) => {
  return (
    <section className={cx(styles.center_all_row, styles.loadingsc)}>
      <span></span>
    </section>
  );
};

export default LoadingScreen;
