import React, { useState } from 'react';
import cx from 'classnames';
import styles from './TextInput.scss';

const TextInput = (props) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div
      className={cx(props.className, styles.textinput, {
        [styles.textinputerr]: props.hasErr && isFocused,
        [styles.textinputnoerr]: !props.hasErr || !isFocused,
      })}
    >
      <input
        type="text"
        placeholder={props.placeholder}
        value={props.value}
        onChange={props.onChange}
        onFocus={() => {
          setIsFocused(true);
        }}
        onBlur={() => {
          setIsFocused(false);
        }}
      />
    </div>
  );
};

export default TextInput;
