import React, { useState, useEffect, useRef } from 'react';
import styles from './InlineSVG.scss';
import cx from 'classnames';

/* SVGs  */
import Drag from 'src/assets/svg/misc/drag.svg';
import Trash from 'src/assets/svg/misc/trash.svg';
import Edit from 'src/assets/svg/misc/edit.svg';

const ASSETS_SVG = { Drag: <Drag />, Trash: <Trash />, Edit: <Edit /> };

const InlineSVG = (props) => {
  const [hoverFlag, setHoverFlag] = useState(false);
  const spanRef = useRef(null);
  const hoverSpanRef = useRef(null);
  const mainRef = useRef(null);

  const inTarget = () => {
    setHoverFlag(true);
  };

  const outTarget = () => {
    setHoverFlag(false);
  };

  useEffect(() => {
    const {
      svgHeight = null,
      svgWidth = null,
      viewBox = null,
      nameHover = null,
    } = props;
    const svgHover = (nameHover && hoverSpanRef.current.firstChild) || null;
    const svg = spanRef.current.firstChild;
    const main = mainRef.current;

    if (svgHeight !== null) {
      svg.setAttribute('height', svgHeight);
      if (svgHover !== null) svgHover.setAttribute('height', svgHeight);
    } else if (main) {
      svg.setAttribute('height', main.clientHeight);
    }

    if (svgWidth !== null) {
      svg.setAttribute('width', svgWidth);
      if (svgHover !== null) svgHover.setAttribute('width', svgWidth);
    } else if (main) {
      svg.setAttribute('width', main.clientWidth);
    }

    if (viewBox !== null) {
      svg.setAttribute('viewBox', viewBox);
      if (svgHover !== null) svgHover.setAttribute('viewBox', viewBox);
    }

    // eslint-disable-next-line
  }, [hoverFlag, spanRef, hoverSpanRef]);

  return (
    <div
      onMouseEnter={inTarget}
      onMouseLeave={outTarget}
      className={cx(props.className, styles.inlinesvg)}
      ref={mainRef}
    >
      <span
        style={{
          ...(props.svgStyle && props.svgStyle),
          ...(props.nameHover && hoverFlag && { display: 'none' }),
        }}
        ref={spanRef}
      >
        {ASSETS_SVG[props.name] || null}
      </span>
      {props.nameHover && (
        <span
          style={{
            ...(props.svgStyle && props.svgStyle),
            ...(!hoverFlag && { display: 'none' }),
          }}
          ref={hoverSpanRef}
        >
          {ASSETS_SVG[props.nameHover] || null}
        </span>
      )}
    </div>
  );
};

export default InlineSVG;
