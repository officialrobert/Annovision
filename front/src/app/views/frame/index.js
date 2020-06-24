import React, { Component, Fragment, createRef } from 'react';
import styles from './Frame.scss';
import { withGlobalSettings } from 'src/app-manager/Context';
import { debounce } from 'src/helpers/util';
import MixerComponent from './MixerComponent';

class Frame extends Component {
  mixerRef = null;
  wrap = null;

  state = {
    loadFrame: false,
    mixerStyle: null,
    frameStyle: null,
    mixerWrapStyle: null,
    mounted: false,
  };

  constructor() {
    super();

    this.mixerRef = createRef();
    this.wrap = createRef();
    window.addEventListener('resize', this.handleFrameOnResize);
  }

  componentDidMount() {
    this.setState({
      mounted: true,
    });
  }

  handleFrameOnResize = debounce(() => {
    const panelDims = this.props.getBothPanelDims();
    const mixerWrapStyle = {};
    const mixerStyle = {};
    const frameStyle = {};

    if (panelDims && this.wrap.current) {
      const { clientHeight } = this.wrap.current;

      frameStyle.width =
        window.innerWidth - (panelDims.left.width + panelDims.right.width);
      frameStyle.left = panelDims.left.width;
      const maxWidth = Math.floor(
        (window.innerWidth - (panelDims.left.width + panelDims.right.width)) *
          0.9 // 90% of full available width for frame
      );
      const maxHeight = Math.floor(clientHeight * 0.7); // 80% of full available height for frame
      const allowableWFromHeight = Math.floor(maxHeight * (16 / 9));
      const allowableHFromtWidth = Math.floor(maxWidth * (9 / 16));

      mixerWrapStyle.height = maxHeight;
      mixerWrapStyle.width = maxWidth;
      mixerWrapStyle.left = Math.floor(
        (window.innerWidth - (panelDims.left.width + panelDims.right.width)) *
          0.05 // 10% of full available width for frame
      );

      if (allowableHFromtWidth <= maxHeight) {
        mixerStyle.width = maxWidth;
        mixerStyle.height = allowableHFromtWidth;
        mixerStyle.left = 0;
        mixerStyle.top = Math.ceil((maxHeight - allowableHFromtWidth) / 2);
      } else if (allowableWFromHeight <= maxWidth) {
        mixerStyle.width = allowableWFromHeight;
        mixerStyle.height = maxHeight;
        mixerStyle.top = 0;
        mixerStyle.left = Math.ceil((maxWidth - allowableWFromHeight) / 2);
      }

      this.setState({
        frameStyle,
        mixerStyle,
        mixerWrapStyle,
      });
    }
  }, 150);

  componentWillUnmount() {
    this.setState({ mounted: false });

    this.mixerRef = null;
    this.wrap = null;
    window.removeEventListener('resize', this.handleFrameOnResize);
  }

  componentDidUpdate(prevProps) {
    const {
      loadFrame,
      mounted,
      mixerStyle,
      frameStyle,
      mixerWrapStyle,
    } = this.state;

    if (loadFrame && mounted && !mixerStyle && !frameStyle && !mixerWrapStyle) {
      // when panel and this component mounted only call
      this.handleFrameOnResize();
    } else if (
      prevProps.showRightPanel !== this.props.showRightPanel ||
      prevProps.showLeftPanel !== this.props.showLeftPanel
    ) {
      this.handleFrameOnResize();
    }
  }

  static getDerivedStateFromProps(props, state) {
    return {
      loadFrame: !!(props.leftPanelDom && props.rightPanelDom),
    };
  }

  render() {
    const {
      loadFrame,
      mixerStyle = {},
      frameStyle = {},
      mixerWrapStyle = {},
    } = this.state;

    return (
      <Fragment>
        {loadFrame && (
          <div ref={this.wrap} style={frameStyle} className={styles.frame}>
            <div className={styles.mixerwrap} style={mixerWrapStyle}>
              <div ref={this.mixerRef} style={mixerStyle}>
                <MixerComponent
                  mixerStyle={mixerStyle}
                  mixerWrapStyle={mixerWrapStyle}
                  frameStyle={frameStyle}
                />
              </div>
            </div>
          </div>
        )}
      </Fragment>
    );
  }
}

export default withGlobalSettings(Frame);
