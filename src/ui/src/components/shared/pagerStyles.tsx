import styled from 'styled-components/native'
import { themeSpace } from '@/theme/helpers'

export const PagerContainer = styled.View`
  flex: 1;
`

/** Each page takes the pager's width (and its height, for full-screen slides). */
export const Page = styled.View<{ $width: number }>`
  width: ${({ $width }: { $width: number }) => `${$width}px`};
  flex: 1;
`

export const DotsRow = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }: any) => `${themeSpace(theme, 'xs')}px`};
`

/** A pagination dot: the size comes from the screen (a space step of the theme). */
export const Dot = styled.Pressable<{ $size: number, $color: string }>`
  width: ${({ $size }: { $size: number }) => `${$size}px`};
  height: ${({ $size }: { $size: number }) => `${$size}px`};
  border-radius: ${({ $size }: { $size: number }) => `${$size / 2}px`};
  background-color: ${({ $color }: { $color: string }) => $color};
`
