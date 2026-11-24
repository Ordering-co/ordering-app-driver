import styled from 'styled-components/native';

/** A flag drawn as its emoji: `size` is its height (an icon size of the theme). */
export const FlagEmoji = styled.Text<{ $size: number, $line: number }>`
  font-size: ${({ $size }: { $size: number }) => `${$size}px`};
  line-height: ${({ $line }: { $line: number }) => `${$line}px`};
`
