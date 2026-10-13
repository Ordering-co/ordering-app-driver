import * as React from 'react';
import { Modal, StyleSheet, View, TouchableOpacity } from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { useTheme } from 'styled-components/native';

import { useUtils } from '@components';
import OIcon from './OIcon';
import OText from './OText';
import OIconButton from './OIconButton';

interface Props {
  open?: boolean;
  title?: string;
  children?: any;
  onAccept?: any;
  onCancel?: any;
  onClose?: any;
  style?: any;
  acceptText?: string;
  cancelText?: string;
  isTransparent?: boolean;
  hideCloseDefault?: boolean;
  entireModal?: boolean;
  customClose?: boolean;
  titleSectionStyle?: any;
  isNotDecoration?: boolean;
  styleCloseButton?: any;
  order?: any;
  hideIcons?: boolean
}

const OModal = (props: Props): React.ReactElement => {
  const {
    open,
    title,
    children,
    onAccept,
    onCancel,
    onClose,
    acceptText,
    cancelText,
    isTransparent,
    hideCloseDefault,
    entireModal,
    customClose,
    titleSectionStyle,
    isNotDecoration,
    style,
    styleCloseButton,
    order,
    hideIcons
  } = props;

  const theme = useTheme();
  const [{ optimizeImage }] = useUtils();
  const { top } = useSafeAreaInsets();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    centeredView: {
      justifyContent: 'center',
      alignItems: 'center',
      position: 'relative',
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
    },
    titleSection: {
      marginTop: top,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingBottom: !hideIcons ? 25 : 15,
      borderBottomWidth: !hideIcons ? 2 : 0,
      borderBottomColor: '#e6e6e6',
    },
    titleGroups: {
      marginTop: 15,
      alignItems: 'center',
      flexDirection: 'row',
    },
    titleIcons: {
      height: 33,
      width: 33,
      borderRadius: 7.6,
      resizeMode: 'stretch',
    },
    shadow: {
      height: 34,
      width: 34,
      alignItems: 'center',
      justifyContent: 'flex-start',
      marginLeft: 15,
      backgroundColor: theme.colors.clear,
      paddingHorizontal: 3,
      borderRadius: 7.6,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 3,
    },
    cancelBtn: {
      marginRight: 5,
      zIndex: 10000,
      maxWidth: 40,
      height: 25,
      justifyContent: 'flex-end',
      alignItems: 'flex-start',
    },
    modalText: {
      marginLeft: 5,
      zIndex: 10,
      fontWeight: '700',
    },
    wrapperIcon: {
      overflow: 'hidden',
      borderRadius: 50,
      backgroundColor: '#CCCCCC80',
      width: 35,
      margin: 15,
    },
    modalView: {
      margin: 20,
      backgroundColor: 'white',
      borderRadius: 20,
      padding: 35,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
    },
    button: {
      borderRadius: 20,
      padding: 10,
      elevation: 2,
    },
    buttonOpen: {
      backgroundColor: '#F194FF',
    },
    buttonClose: {
      backgroundColor: '#2196F3',
    },
    textStyle: {
      color: 'white',
      fontWeight: '600',
      textAlign: 'center',
    },
    btnBackArrow: {
      borderWidth: 0,
      tintColor: theme.colors.textGray,
      backgroundColor: theme.colors.clear,
      borderColor: theme.colors.clear,
      shadowColor: theme.colors.clear,
      paddingLeft: 0,
      paddingRight: 0,
      width: 24,
      height: 24,
      marginRight: 10,
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <Modal
        animationType="slide"
        transparent={isTransparent}
        visible={open}
        onRequestClose={() => {
          onClose && onClose();
        }}
        style={{
          height: '100%',
          flex: 1,
          position: 'absolute',
          ...style,
          zIndex: 9999,
        }}>
        <SafeAreaProvider>
          {!entireModal ? (
            <View style={styles.centeredView}>
              <View
                style={
                  titleSectionStyle ? titleSectionStyle : styles.titleSection
                }>
                <OText size={24} style={styles.modalText} adjustsFontSizeToFit>
                  {title}
                </OText>
              </View>

              {children}
            </View>
          ) : (
            <>
              {!customClose && (
                <View style={styles.titleSection}>
                  <View style={styles.titleGroups}>
                    <OIconButton
                      icon={theme.images.general.arrow_left}
                      borderColor={theme.colors.clear}
                      iconStyle={{ width: 24, height: 24 }}
                      style={styles.btnBackArrow}
                      onClick={() => onClose()}
                    />
                    <OText
                      size={24}
                      style={styles.modalText}
                      adjustsFontSizeToFit>
                      {title}
                    </OText>
                  </View>
                  {!hideIcons && (
                    <View style={styles.titleGroups}>
                      <View style={styles.shadow}>
                        {order?.business?.logo ? (
                          <OIcon
                            url={optimizeImage(
                              order?.business?.logo,
                              'h_300,c_limit',
                            )}
                            style={styles.titleIcons}
                          />
                        ) : (
                          <OIcon
                            src={theme.images.dummies.businessLogo}
                            style={styles.titleIcons}
                          />
                        )}
                      </View>

                      <View style={styles.shadow}>
                        <OIcon
                          url={optimizeImage(
                            order?.customer?.photo ||
                            theme?.images?.dummies?.customerPhoto,
                            'h_300,c_limit',
                          )}
                          style={styles.titleIcons}
                        />
                      </View>

                      {order?.driver && (
                        <View style={styles.shadow}>
                          <OIcon
                            url={
                              optimizeImage(
                                order?.driver?.photo,
                                'h_300,c_limit',
                              ) || theme?.images?.dummies?.driverPhoto
                            }
                            style={styles.titleIcons}
                          />
                        </View>
                      )}
                    </View>
                  )}
                </View>
              )}
              {children}
            </>
          )}
        </SafeAreaProvider>
      </Modal>
    </SafeAreaView>
  );
};

export default OModal;
