import React, { useMemo } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { useTheme } from 'styled-components/native';
import OButton from './OButton';
import Icon from './Icon';
import { nativeShadowStyle } from '@/theme/helpers';

/**
 * A round button floating over a map: the theme's icon button in its `inverse`
 * color (`components.button`), with a 44 pt touch target. It stands over the
 * tiles, so it keeps the map's floating shadow (`map_marker.shadow`), which
 * Identity does not take away.
 */
interface Props {
  iconName: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  /** The glyph is MaterialCommunityIcons' (Ionicons' otherwise). */
  materialIcon?: boolean
  accessibilityLabel?: string
}
const OFab = ({ iconName, materialIcon, onPress, style, accessibilityLabel }: Props) => {
  const theme: any = useTheme();
  const floating = useMemo(() => nativeShadowStyle(theme.native.components.map_marker.base.shadow), [theme]);
  return (
    <View style={style}>
      <OButton
        iconOnly
        color='inverse'
        size='sm'
        style={floating}
        icon={<Icon set={materialIcon ? 'mci' : 'ion'} name={iconName} size='md' />}
        onClick={onPress}
        accessibilityLabel={accessibilityLabel ?? iconName}
      />
    </View>
  );
};

export default OFab;
