import React, { useEffect, useState, useCallback } from 'react';
import { View, Animated, TouchableOpacity } from 'react-native';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from 'styled-components/native';

import {
  Accordion,
  AccordionSection,
  ContentInfo,
  AccordionContent,
  ProductOptionsList,
  ProductOption,
  ProductSubOption,
  ProductComment,
} from './styles';
import { OText, OAlert } from '../shared';
import { ProductItemAccordionParams } from '../../types';

import { useUtils, useLanguage } from '@components';
import { DeviceOrientationMethods } from '@ui'
import { parseProductOptions } from './parseProductOptions'

const { useDeviceOrientation } = DeviceOrientationMethods

export const ProductItemAccordion = (props: ProductItemAccordionParams) => {
  const {
    isClickableEvent,
    isCartPending,
    isCartProduct,
    product,
    getProductMax,
    onDeleteProduct,
    onEditProduct
  } = props;

  const [, t] = useLanguage();
  const theme = useTheme();
  const [{ parsePrice }] = useUtils();
  const [orientationState] = useDeviceOrientation();
  const WIDTH_SCREEN = orientationState?.dimensions?.width

  const [isActive, setActiveState] = useState(false);
  const [isReadMore, setIsReadMore] = useState(false);
  const [lengthMore, setLengthMore] = useState(false);

  const productInfo = () => {
    if (isCartProduct) {
      const ingredients = JSON.parse(
        JSON.stringify(Object.values(product.ingredients ?? {})),
      );
      let options = JSON.parse(
        JSON.stringify(Object.values(product.options ?? {})),
      );

      options = options.map((option: any) => {
        option.suboptions = Object.values(option.suboptions ?? {});
        return option;
      });
      return {
        ...productInfo,
        ingredients,
        options,
      };
    }

    return product;
  };

  const parseOptions = parseProductOptions(productInfo().options)

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

  /*useEffect(() => {
    toggleAccordion()
  }, [isActive])*/

  const productOptions =
    getProductMax &&
    [...Array(getProductMax(product) + 1)].map((_: any, opt: number) => {
      return {
        label: opt === 0 ? t('REMOVE', 'Remove') : opt.toString(),
        value: opt.toString(),
      };
    });

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

  return (
    <AccordionSection>
      <Accordion
        isValid={product?.valid ?? true}
        onPress={() =>
          (!product?.valid_menu && isCartProduct) || isClickableEvent ? {} : setActiveState(!isActive)
        }
        activeOpacity={1}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
          }}>
          <ContentInfo>
            <View style={{ flexDirection: 'row' }}>
              <View style={{ width: 200 }}>
                <OText
                  numberOfLines={2}
                  ellipsizeMode="tail"
                  size={16}
                  color={theme.colors.primary}
                  style={{ marginLeft: 5 }}
                  weight='700'
                  adjustsFontSizeToFit
                  >
                  {product?.quantity}{'  '}{product?.name}
                </OText>
              </View>
            </View>

            <View
              style={{
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                alignItems: 'flex-end',
              }}>
              <View style={{ flexDirection: 'row' }}>
                <OText size={16} color={theme.colors.textGray} adjustsFontSizeToFit numberOfLines={1}>
                  {parsePrice(getProductPrice(product))}
                </OText>
                {(
                  productInfo?.()?.ingredients?.length > 0 ||
                  productInfo?.()?.options?.length > 0 ||
                  !!product.comment
                ) && !isClickableEvent ? (
                    <MaterialCommunityIcon name={`chevron-${isActive ? 'up' : 'down'}`} size={16} color={theme?.colors?.textNormal} style={{ top: 3 }} />
                  ) : (
                    <View style={{ width: 16 }} />
                  )}
              </View>

              <View
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  justifyContent: 'flex-start',
                }}>
                {onEditProduct &&
                  isCartProduct &&
                  !isCartPending &&
                  product?.valid_menu && (
                    <MaterialCommunityIcon
                      name="pencil-outline"
                      size={26}
                      color={theme.colors.green}
                      onPress={() => onEditProduct(product)}
                    />
                  )}

                {onDeleteProduct && isCartProduct && !isCartPending && (
                  <OAlert
                    title={t('DELETE_PRODUCT', 'Delete Product')}
                    message={t(
                      'QUESTION_DELETE_PRODUCT',
                      'Are you sure that you want to delete the product?',
                    )}
                    onAccept={() => onDeleteProduct(product)}>
                    <MaterialCommunityIcon
                      name="trash-can-outline"
                      size={26}
                      color={theme.ecolors.red}
                    />
                  </OAlert>
                )}
              </View>
            </View>
          </ContentInfo>
        </View>

        {((isCartProduct &&
          !isCartPending &&
          product?.valid_menu &&
          !product?.valid_quantity) ||
          (!product?.valid_menu && isCartProduct && !isCartPending)) && (
            <OText
              size={24}
              color={theme.colors.red}
              style={{ textAlign: 'center', marginTop: 10 }}>
              {t('NOT_AVAILABLE', 'Not available')}
            </OText>
          )}
      </Accordion>

      <View style={{ display: isActive ? 'flex' : 'none' }}>
        <Animated.View>
          <AccordionContent>
            {productInfo?.()?.ingredients?.length > 0 &&
              productInfo?.()?.ingredients?.some(
                (ingredient: any) => !ingredient.selected,
              ) && (
                <ProductOptionsList>
                  <OText
                    size={14}
                    color={theme.colors.unselectText}
                    style={{ fontStyle: 'italic' }}
                    >
                    {t('INGREDIENTS', 'Ingredients')}:
                  </OText>

                  {productInfo?.()?.ingredients?.map(
                    (ingredient: any) =>
                      !ingredient.selected && (
                        <OText
                          size={14}
                          key={ingredient.id}
                          style={{ marginLeft: 10, fontStyle: 'italic' }}
                          color={theme.colors.unselectText}>
                          {t('NO', 'No')} {ingredient.name}
                        </OText>
                      ),
                  )}
                </ProductOptionsList>
              )}

            {parseOptions?.length > 0 && (
              <ProductOptionsList>
                {parseOptions?.map((option: any, i: number) => (
                  <ProductOption key={option.id + i}>
                    <OText
                      size={14}
                      style={{ fontStyle: 'italic' }}
                      color={theme.colors.unselectText}>
                      {t(option?.name.toUpperCase(), option?.name)}
                    </OText>

                    {(option.suboptions ?? []).map((suboption: any) => (
                      <ProductSubOption key={suboption.id}>
                        <OText
                          size={14}
                          mLeft={10}
                          color={theme.colors.unselectText}
                          style={{ fontStyle: 'italic' }}>
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
                      </ProductSubOption>
                    ))}
                  </ProductOption>
                ))}
              </ProductOptionsList>
            )}

            {!!product.comment && (
              <ProductComment>
                <OText
                  size={14}
                  weight={600}
                  space
                  color={theme.colors.unselectText}
                  style={{ fontStyle: 'italic' }}>
                  {t('COMMENT', 'Comment')}
                </OText>
                <OText
                  size={14}
                  style={{ width: '100%', paddingLeft: 10, fontStyle: 'italic' }}
                  color={theme.colors.unselectText}
                  onTextLayout={onTextLayout}
                  numberOfLines={isReadMore ? 15 : 2}
                  ellipsizeMode="tail"
                >
                  {product.comment}
                </OText>
                {lengthMore && (
                  <TouchableOpacity onPress={() => setIsReadMore(!isReadMore)} style={{ marginLeft: 10 }}>
                    <OText size={12} color={theme.colors.statusOrderBlue}>{isReadMore ? t('SHOW_LESS', 'Show less') : t('READ_MORE', 'Read more')}</OText>
                  </TouchableOpacity>
                )}
              </ProductComment>
            )}
          </AccordionContent>
        </Animated.View>
      </View>
    </AccordionSection>
  );
};
