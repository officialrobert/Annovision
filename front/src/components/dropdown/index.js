import React from 'react';
import cx from 'classnames';
import styles from './Dropdown.scss';

const Dropdown = (props) => {
  return (
    <section
      className={cx(
        props.className,
        styles.dropdown,
        styles.flex_column,
        props.areaClassName
      )}
    >
      {props.children}
      {props.show && (
        <div
          className={cx(
            props.classNameExpand,
            styles.expand,
            styles.center_all_row,
            props.areaClassName
          )}
        >
          <span className={cx(styles.arrow, props.areaClassName)}></span>
          {props.data && (
            <ul
              className={cx(props.areaClassName, styles.center_vertical_column)}
              onClick={props.onClick}
            >
              {props.data.map((c, index) => {
                return (
                  <li className={props.areaClassName} key={'dropdown-' + index}>
                    <p
                      data={JSON.stringify({ ...c, index })}
                      className={props.areaClassName}
                    >
                      {c.name}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </section>
  );
};

export default Dropdown;
