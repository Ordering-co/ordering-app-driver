import { StyleSheet } from 'react-native'
import { nativeTextStyle, themeColor, themeControlHeight, themeGutter, themeOpacity, themePart, themeSpace } from '@/theme/helpers'

/**
 * The profile's styles: the page's room below (`account_page`), the photo and the name beside it
 * (`profile_photo`) and the sections `lg` apart. The skeleton lays itself out with the same ones.
 */
export const profileStyles = (theme: any) => {
  const page = themePart(theme, 'account_page', 'base')
  const photo = themePart(theme, 'profile_photo', 'base')
  const section = themePart(theme, 'section_header', 'base')
  return StyleSheet.create({
    page: { flex: 1 },
    scroll: { flex: 1 },
    content: {
      paddingHorizontal: themeGutter(theme),
      paddingBottom: page.padding_bottom,
      gap: themeSpace(theme, 'lg'),
    },
    // The photo and who the driver is, side by side.
    identity: { flexDirection: 'row', alignItems: 'center', gap: themeSpace(theme, 'md') },
    // The photo's frame: the camera button sits on its corner, and the upload's veil over it.
    photoFrame: { alignSelf: 'flex-start' },
    camera: { position: 'absolute', right: -themeSpace(theme, 'xs'), bottom: -themeSpace(theme, 'xs') },
    uploading: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: photo.radius,
      backgroundColor: themeColor(theme, 'overlay'),
    },
    pressed: { opacity: themeOpacity(theme, 'pressed') },
    who: { flex: 1, minWidth: 0 },
    name: { ...nativeTextStyle(photo.text), color: photo.text_color },
    // A section's title row: the title, and what acts on the section at its end.
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: themeSpace(theme, 'sm'), marginBottom: section.margin_bottom },
    titleText: { flex: 1, marginBottom: 0 },
    // A section's title with nothing at its end ("Account"): the board's row, `account_page.base.title_min_height` tall, the space under the text being its own.
    titleAlone: { minHeight: page.title_min_height, marginBottom: 0 },
    availability: { flexDirection: 'row', alignItems: 'center', gap: themeSpace(theme, 'sm') },
    grow: { flex: 1 },
    // The remove link: a touch target of the `md` control height, centered.
    remove: { alignItems: 'center', justifyContent: 'center', minHeight: themeControlHeight(theme, 'md') },
    // A section the profile keeps mounted without drawing (the language row, while it is not known to exist).
    none: { display: 'none' },
  })
}
