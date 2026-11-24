import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Pressable, View } from 'react-native';
import { useTheme } from 'styled-components/native';

import { productLineStyles } from './styles';
import { Icon, OLink, OText } from '../shared';
import { ProductItemAccordionParams } from '../../types';
import { themeVisible } from '@/theme/helpers';

import { useUtils, useLanguage } from '@components';
import { DeviceOrientationMethods } from '../../hooks/DeviceOrientation'
import { parseProductOptions } from './parseProductOptions'

const { useDeviceOrientation } = DeviceOrientationMethods

/**
 * A product line of an order: quantity and name, its price and, when it has
 * something to open, the accordion glyph. The quantity is a small box before
 * the name (`order_details.base.quantity_size`). It opens the product's options
 * and removed ingredients (hidden by `confirmation.products.options`) and its
 * comment: the name of each group ("Ingredients:", an option, "Comment") and its
 * lines in one style (`body_sm`, muted), as the boards draw them.
 */
export const ProductItemAccordion = (props: ProductItemAccordionParams) => {
  const {
    isClickableEvent,
    product
  } = props;

  const [, t] = useLanguage();
  const theme: any = useTheme();
  const [{ parsePrice }] = useUtils();
  const [orientationState] = useDeviceOrientation();
  const WIDTH_SCREEN = orientationState?.dimensions?.width
  const styles = useMemo(() => productLineStyles(theme), [theme])

  const [isActive, setActiveState] = useState(false);
  const [isReadMore, setIsReadMore] = useState(false);
  const [lengthMore, setLengthMore] = useState(false);

  const productInfo = () => {
    return product;
  };

  const parseOptions = parseProductOptions(productInfo().options)
  const showOptions = themeVisible(theme, 'confirmation.products.options')

  const getProductPrice = (product: any) => {
    let subOptionPrice = 0
    if (Array.isArray(product?.options)) {
      if (product.options?.length > 0) {
        for (const option of product.options) {
          for (const suboption of option.suboptions ?? []) {
            subOptionPrice += suboption.quantity * ((['left', 'right'].includes(suboption.position)) ? (suboption.half_price ?? suboption.price) : suboption.price)
          }
        }
      }
    }

    const price = product.quantity * (product.price + subOptionPrice)
    return parseFloat(price.toFixed(2))
  }

  const getFormattedSubOptionName = ({ quantity, name, position, price }: any) => {
    if (name !== 'No') {
      const pos = position ? `(${position})` : '';
      return `${quantity} x ${name} ${pos} +${price}`
    } else {
      return 'No';
    }
  };

  useEffect(() => {
    if (
      productInfo?.()?.ingredients?.length > 0 ||
      productInfo?.()?.options?.length > 0 ||
      product.comment !== ''
    ) {
      setActiveState(true);
    }
  }, []);

  const onTextLayout = useCallback((e: any) => {
    setLengthMore((e.nativeEvent.lines.length == 2 && e.nativeEvent.lines[1].width > WIDTH_SCREEN * .76) || e.nativeEvent.lines.length > 2); //to check the text is more than 2 lines or not
  }, []);

  const hasOptions = showOptions && (
    productInfo?.()?.ingredients?.length > 0 ||
    productInfo?.()?.options?.length > 0
  )
  // The line opens when it has something to show and the screen lets it.
  const opens = (hasOptions || !!product.comment) && !isClickableEvent

  const row = (
    <>
      <View style={styles.quantity}>
        <OText preset='label'>{product?.quantity}</OText>
      </View>
      <OText preset='label' numberOfLines={2} ellipsizeMode="tail" style={styles.name}>
        {product?.name}
      </OText>
      {/* The glyph is before the price: the price is the line's last piece, at the bill's right edge in every line, whether it opens or not. */}
      {opens && <Icon name={isActive ? 'chevron-up' : 'chevron-down'} size='sm' color='text_muted' />}
      <OText preset='body' numberOfLines={1}>
        {parsePrice(getProductPrice(product))}
      </OText>
    </>
  )

  const ingredients = showOptions && productInfo?.()?.ingredients?.length > 0 &&
    productInfo?.()?.ingredients?.some((ingredient: any) => !ingredient.selected) ? (
      <View>
        <OText preset='body_sm' color='text_muted'>
          {t('INGREDIENTS', 'Ingredients')}:
        </OText>

        {productInfo?.()?.ingredients?.map(
          (ingredient: any) =>
            !ingredient.selected && (
              <OText
                preset='body_sm'
                key={ingredient.id}
                style={styles.suboption}
                color='text_muted'>
                {t('NO', 'No')} {ingredient.name}
              </OText>
            ),
        )}
      </View>
    ) : null

  const options = showOptions && parseOptions?.length > 0 ? (
    <View>
      {parseOptions?.map((option: any, i: number) => (
        <View key={option.id + i}>
          <OText preset='body_sm' color='text_muted'>
            {t(option?.name.toUpperCase(), option?.name)}
          </OText>

          {(option.suboptions ?? []).map((suboption: any) => (
            <OText
              key={suboption.id}
              preset='body_sm'
              style={styles.suboption}
              color='text_muted'>
              {getFormattedSubOptionName({
                quantity: suboption.quantity,
                name: suboption.name,
                position:
                  suboption.position !== 'whole'
                    ? t(
                      suboption.position.toUpperCase(),
                      suboption.position,
                    )
                    : '',
                price: parsePrice(suboption.price),
              })}
            </OText>
          ))}
        </View>
      ))}
    </View>
  ) : null

  const comment = product.comment ? (
    <View>
      <OText preset='body_sm' color='text_muted'>
        {t('COMMENT', 'Comment')}
      </OText>
      <OText
        preset='body_sm'
        style={styles.suboption}
        color='text_muted'
        onTextLayout={onTextLayout}
        numberOfLines={isReadMore ? 15 : 2}
        ellipsizeMode="tail"
      >
        {product.comment}
      </OText>
      {lengthMore && (
        <OLink
          PressStyle={styles.more}
          shorcut={isReadMore ? t('SHOW_LESS', 'Show less') : t('READ_MORE', 'Read more')}
          onPress={() => setIsReadMore(!isReadMore)}
        />
      )}
    </View>
  ) : null

  return (
    <View style={styles.line}>
      {opens ? (
        <Pressable
          accessibilityRole='button'
          accessibilityState={{ expanded: isActive }}
          onPress={() => setActiveState(!isActive)}
          hitSlop={styles.slop}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        >
          {row}
        </Pressable>
      ) : (
        <View style={styles.row}>{row}</View>
      )}

      {isActive && (!!ingredients || !!options || !!comment) && (
        <View style={styles.details}>
          {ingredients}
          {options}
          {comment}
        </View>
      )}
    </View>
  );
};
