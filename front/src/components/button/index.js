import React, { useState, useEffect } from 'react';
import cx from 'classnames';
import styles from './Button.scss';

const Button = (props) => {
  const [disableClick, setDisableClick] = useState(false);
  const [isLoading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(props.loading);
  }, [props.loading]);

  useEffect(() => {
    setDisableClick(props.disable);
  }, [props.disable]);

  const componentOnClick = (evt) => {
    evt.stopPropagation();

    if (typeof props.onClick === 'function' && !disableClick && !isLoading)
      props.onClick(evt);
  };

  return (
    <button
      type={'button'}
      onClick={componentOnClick}
      className={cx(
        props.className,
        styles.button,
        styles.center_all_row,
        props.areaClassName,
        {
          [styles.normal]: !props.forCancel,
          [styles.forcancel]: props.forCancel,
        }
      )}
    >
      {!isLoading && props.children}
      {isLoading && (
        <span className={cx(styles.center_all_row, styles.loading)}>
          <p>{'....'}</p>
        </span>
      )}
      <span
        className={cx(styles.cover, props.areaClassName)}
        {...(props.data && { data: props.data })}
      ></span>
    </button>
  );
};

export default Button;
