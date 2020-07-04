import React from 'react';
import cx from 'classnames';
import styles from './CheckBox.scss';

const CheckBox = (props) => {
  return (
    <div
      onClick={props.onChange}
      className={cx(props.className, styles.checkbox)}
    >
      <div
        className={cx({
          [styles.activate]: props.selected,
          [styles.notselected]: !props.selected,
        })}
        {...(props.data && { data: JSON.stringify(props.data) })}
      />
    </div>
  );
};

export default CheckBox;
