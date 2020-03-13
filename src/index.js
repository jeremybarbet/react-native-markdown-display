/**
 * Base Markdown component
 * @author Mient-jan Stelling + contributors
 */

import React, {useMemo} from 'react';
import {Text, StyleSheet} from 'react-native';
import PropTypes from 'prop-types';
import parser from './lib/parser';
import getUniqueID from './lib/util/getUniqueID';
import hasParents from './lib/util/hasParents';
import openUrl from './lib/util/openUrl';
import tokensToAST from './lib/util/tokensToAST';
import renderRules from './lib/renderRules';
import AstRenderer from './lib/AstRenderer';
import MarkdownIt from 'markdown-it';
import PluginContainer from './lib/plugin/PluginContainer';
import blockPlugin from './lib/plugin/blockPlugin';
import removeTextStyleProps from './lib/util/removeTextStyleProps';
import {styles} from './lib/styles';
import {stringToTokens} from './lib/util/stringToTokens';

export {
  getUniqueID,
  openUrl,
  hasParents,
  renderRules,
  AstRenderer,
  parser,
  stringToTokens,
  tokensToAST,
  MarkdownIt,
  PluginContainer,
  blockPlugin,
  styles,
  removeTextStyleProps,
};

// we use StyleSheet.flatten here to make sure we have an object, in case someone
// passes in a StyleSheet.create result to the style prop
const getStyle = (mergeStyle, style) => {
  let useStyles = {};

  if (mergeStyle === true && style) {
    Object.keys(styles).forEach(value => {
      useStyles[value] = {
        ...styles[value],
        ...(style !== null ? StyleSheet.flatten(style[value]) : {}),
      };
    });
  } else {
    useStyles = {
      ...styles,
    };

    if (style !== null) {
      Object.keys(style).forEach(value => {
        useStyles[value] = {
          ...StyleSheet.flatten(style[value]),
        };
      });
    }
  }

  Object.keys(useStyles).forEach(value => {
    useStyles['_VIEW_SAFE_' + value] = removeTextStyleProps(useStyles[value]);
  });

  return StyleSheet.create(useStyles);
};

const getRenderer = (
  renderer,
  rules,
  style,
  mergeStyle,
  onLinkPress,
  maxTopLevelChildren,
  topLevelMaxExceededItem,
  allowedImageHandlers,
  defaultImageHandler,
  debugPrintTree,
  textLimit,
) => {
  if (renderer && rules) {
    console.warn(
      'react-native-markdown-display you are using renderer and rules at the same time. This is not possible, props.rules is ignored',
    );
  }

  if (renderer && style) {
    console.warn(
      'react-native-markdown-display you are using renderer and style at the same time. This is not possible, props.style is ignored',
    );
  }

  // these checks are here to prevent extra overhead.
  if (renderer) {
    if (!(typeof renderer === 'function') || renderer instanceof AstRenderer) {
      return renderer;
    } else {
      throw new Error(
        'Provided renderer is not compatible with function or AstRenderer. please change',
      );
    }
  } else {
    let useStyles = getStyle(mergeStyle, style);

    return new AstRenderer(
      {
        ...renderRules(textLimit),
        ...(rules || {}),
      },
      useStyles,
      onLinkPress,
      maxTopLevelChildren,
      topLevelMaxExceededItem,
      allowedImageHandlers,
      defaultImageHandler,
      debugPrintTree,
    );
  }
};

const getMarkdownParser = (markdownit, plugins) => {
  let md = markdownit;
  if (plugins && plugins.length > 0) {
    plugins.forEach(plugin => {
      md = md.use.apply(md, plugin.toArray());
    });
  }

  return md;
};

const Markdown = React.memo(
  ({
    children,
    renderer = null,
    rules = null,
    plugins = [],
    style = null,
    mergeStyle = true,
    markdownit = MarkdownIt({
      typographer: true,
    }),
    onLinkPress,
    maxTopLevelChildren = null,
    topLevelMaxExceededItem = <Text key="dotdotdot">...</Text>,
    allowedImageHandlers = [
      'data:image/png;base64',
      'data:image/gif;base64',
      'data:image/jpeg;base64',
      'https://',
      'http://',
    ],
    defaultImageHandler = 'https://',
    debugPrintTree = false,
    textLimit = undefined,
  }) => {
    const momoizedRenderer = useMemo(
      () =>
        getRenderer(
          renderer,
          rules,
          style,
          mergeStyle,
          onLinkPress,
          maxTopLevelChildren,
          topLevelMaxExceededItem,
          allowedImageHandlers,
          defaultImageHandler,
          debugPrintTree,
          textLimit,
        ),
      [
        maxTopLevelChildren,
        onLinkPress,
        renderer,
        rules,
        style,
        mergeStyle,
        topLevelMaxExceededItem,
        allowedImageHandlers,
        defaultImageHandler,
        debugPrintTree,
        textLimit,
      ],
    );

    const markdownParser = useMemo(
      () => getMarkdownParser(markdownit, plugins),
      [markdownit, plugins],
    );

    return parser(children, momoizedRenderer.render, markdownParser);
  },
);

Markdown.propTypes = {
  children: PropTypes.node.isRequired,
  renderer: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.instanceOf(AstRenderer),
  ]),
  onLinkPress: PropTypes.func,
  maxTopLevelChildren: PropTypes.number,
  topLevelMaxExceededItem: PropTypes.any,
  rules: (props, propName, componentName) => {
    let invalidProps = [];
    const prop = props[propName];

    if (!prop) {
      return;
    }

    if (typeof prop === 'object') {
      invalidProps = Object.keys(prop).filter(
        key => typeof prop[key] !== 'function',
      );
    }

    if (typeof prop !== 'object') {
      return new Error(
        `Invalid prop \`${propName}\` supplied to \`${componentName}\`. Must be of shape {[index:string]:function} `,
      );
    } else if (invalidProps.length > 0) {
      return new Error(
        `Invalid prop \`${propName}\` supplied to \`${componentName}\`. These ` +
          `props are not of type function \`${invalidProps.join(', ')}\` `,
      );
    }
  },
  markdownit: PropTypes.instanceOf(MarkdownIt),
  plugins: PropTypes.arrayOf(PropTypes.instanceOf(PluginContainer)),
  style: PropTypes.any,
  mergeStyle: PropTypes.bool,
  allowedImageHandlers: PropTypes.arrayOf(PropTypes.string),
  defaultImageHandler: PropTypes.string,
  debugPrintTree: PropTypes.bool,
};

export default Markdown;
