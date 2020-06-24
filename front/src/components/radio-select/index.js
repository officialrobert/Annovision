import React from 'react';
import cx from 'classnames';
import styles from './RadioSelect.scss';

const RadioSelect = (props) => {
  return (
    <div
      className={cx(props.className, styles.radioselect, {
        [styles.radioactive]: props.selected,
      })}
      {...(props.data && { data: props.data })}
    ></div>
  );
};

export default RadioSelect;
