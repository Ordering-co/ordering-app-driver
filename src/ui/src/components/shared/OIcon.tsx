import * as React from 'react'
import { ImageStyle } from 'react-native'
import styled, { useTheme } from 'styled-components/native'
import { themeColor, themeIconSize } from '@/theme/helpers'

const Wrapper = styled.View``
const SImage = styled.Image`
  tint-color: ${(props: any) => themeColor(props.theme, 'primary')};
`

/**
 * A picture, or a picture icon tinted with `color` (a color role of the theme,
 * or a color as given while the call sites are converted). Without a size it
 * takes the theme's large icon size. New code draws icons with `Icon`.
 */
interface Props {
  src?: any,
  url?: string | any,
  dummy?: any,
  color?: string,
  width?: number,
  height?: number,
  style?: ImageStyle,
  isWrap?: boolean,
  cover?: boolean,
  children?: any,
  borderRadius?: number,
  borderBottomWidth?: number,
  wrapStyle?: any,
}

const OImage = (props: Props): React.ReactElement => {
  const theme: any = useTheme()
  const fallback = themeIconSize(theme, 'lg')
  const tint = props.color && theme.native.tokens.color[props.color] !== undefined ? themeColor(theme, props.color) : props.color
  return (
    <Wrapper style={{
      ...props.wrapStyle,
      borderRadius: props.style?.borderRadius,
      overflow: 'hidden',
      marginHorizontal: props.style?.marginHorizontal,
      borderBottomWidth: props.borderBottomWidth
    }}>
      <SImage
        source={
          props.src
            ? props.src
            : props.url
              ? typeof props.url === 'number'
                ? props.url
                : { uri: props.url }
              : props.dummy}
        style={{
          tintColor: tint,
          flex: props.isWrap ? 1 : 0,
          width: props.width || fallback,
          height: props.height || fallback,
          marginHorizontal: 0,
          borderRadius: props.borderRadius,
          ...props.style,
        }}
        resizeMode={props.cover ? 'cover' : 'contain'}
      >
        {props.children}
      </SImage>
    </Wrapper>
  )
}

// Redrawn when what it paints changes: the picture (a bundled `src` or a `url`), its tint and its box.
const PAINTED = ['src', 'url', 'dummy', 'color', 'width', 'height', 'cover', 'style'] as const
const areEqual = (prevProps: Record<string, any>, nextProps: Record<string, any>) =>
  PAINTED.every((key) => prevProps[key] === nextProps[key])

export default React.memo(OImage, areEqual);
