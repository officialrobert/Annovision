import React, { Component } from 'react';
import cx from 'classnames';
import styles from './Header.scss';
import Button from 'src/components/button';
import i18n from 'src/locales';
import { withGlobalSettings } from 'src/app-manager/Context';

class Header extends Component {
  render() {
    const { properties = {} } = this.props;
    return (
      <div className={cx(styles.center_all_row, styles.header)}>
        <div className={cx(styles.center_vertical_row, styles.right)}>
          <p
            className={cx(styles.text_overflow_ellipsis, styles.info)}
          >{`${i18n('app_title')} - ${
            (properties && properties.version) || ''
          }`}</p>
          <Button className={styles.more}>
            <p>{i18n('more_title')}</p>
          </Button>
        </div>
        <p className={cx(styles.center_all_row, styles.app_title)}>
          {i18n('annovision_title')}
        </p>
      </div>
    );
  }
}

export default withGlobalSettings(Header);
