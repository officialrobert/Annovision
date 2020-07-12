import React, { useEffect, useState } from 'react';
import cx from 'classnames';
import styles from './Action.scss';

const Action = (props) => {
  const [isDisabled, setIsDisabled] = useState(false);

  useEffect(() => {
    setIsDisabled(props.disabled);
  }, [props.disabled]);

  return (
    <div
      className={cx(props.className, styles.action, {
        [styles.action_disabled]: isDisabled,
      })}
    >
      {props.children}
      {isDisabled && <div className={styles.cover}></div>}
    </div>
  );
};

export default Action;
