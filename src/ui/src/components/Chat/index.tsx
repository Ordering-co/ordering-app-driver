import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  Image,
  View,
  Pressable,
  Linking,
  ScrollView,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { launchImageLibrary } from 'react-native-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from 'styled-components/native';
import SignatureScreen from 'react-native-signature-canvas';
import { MessagesParams } from '../../types';
import { USER_TYPE } from '../../config/constants';

import {
  ToastType,
  useToast,
  Messages as MessagesController,
  useSession,
  useUtils,
  useLanguage,
  useConfig
} from '@components';

import {
  FilterChip,
  Icon,
  ModalCloseButton,
  OBottomPopup,
  OButton,
  ODivider,
  OInput,
  OListRow,
  ONotice,
  OText,
} from '../shared';
import { ChatThread, type ChatMessage } from './ChatThread';
import { describeChange } from './changeEntries';
import { SIGNATURE_PAD_HEIGHT, chatStyles } from './styles';
import { quickMessagesOf } from './quickMessages'
import { useKeyboardVisible } from '../../../../hooks/useKeyboardVisible';
import {
  themeColor,
  themeControlHeight,
  themeIconSize,
  themeRadius,
  themeVisible,
} from '@/theme/helpers';


/** Normalizes a detected phone string into digits with optional leading + for tel:/sms: URLs */
const sanitizePhoneForDial = (raw: string): string | null => {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('+')) {
    const restDigits = trimmed.slice(1).replace(/\D/g, '');
    return restDigits ? `+${restDigits}` : null;
  }
  const digitsOnly = trimmed.replace(/\D/g, '');
  return digitsOnly || null;
};

/** Detects the first phone-like sequence inside a message text (7+ digits) */
const detectPhoneInText = (text: string): string | null => {
  const match = text.match(/\+?\d[\d\s().-]{6,}\d/);
  return match ? match[0] : null;
};

/**
 * The chat of an order: the thread (`ChatThread`, `components.chat_bubble`) and,
 * under it, the composer: the signature pad when it is open, who receives the
 * message as chips (`FilterChip`, marked while they receive it), the quick
 * messages (`visibility.messages.quick_messages`) and a row of the signature
 * (`messages.signature`) and image (`messages.image_upload`) buttons, the field
 * and the send button (`chat_bubble.slots.send`). The page avoids the
 * keyboard; the composer keeps the system's bottom inset while it is hidden.
 * The app's divider separates the thread from the composer. A message's
 * options (copy its text; call or text its phone) are a sheet of list rows,
 * as every sheet of options, closed by the app's Cancel.
 */
const ChatUI = (props: MessagesParams) => {
  const {
    type,
    order,
    messages,
    image,
    message,
    messagesToShow,
    sendMessage,
    setMessage,
    canRead,
    setCanRead,
    handleSend,
    setImage
  } = props;

  const [{ user }] = useSession();
  const [{ parseDate, dateFormat, timeFormat }] = useUtils();
  const [, t] = useLanguage();
  const [, { showToast }] = useToast();
  const theme: any = useTheme();
  const { bottom } = useSafeAreaInsets();
  const styles = useMemo(() => chatStyles(theme, bottom), [theme, bottom]);
  const isKeyboardVisible = useKeyboardVisible();
  const [{ configs }] = useConfig();
  const [messageList, setMessageList] = useState<any>([])
  const [bottomPopup, setBottomPopup] = useState<
    | { kind: 'idle' }
    | { kind: 'message'; copyText: string; phoneRaw: string | null; phoneSanitized: string | null }
  >({ kind: 'idle' });
  const previousStatus = [1, 2, 5, 6, 10, 11, 12, 15, 16, 17]
  const chatDisabled = previousStatus.includes(order?.status)

  const showQuickMessages = themeVisible(theme, 'messages.quick_messages')
  const showImageUpload = themeVisible(theme, 'messages.image_upload')
  const showSignature = themeVisible(theme, 'messages.signature')
  const showTime = themeVisible(theme, 'messages.time')
  // The order's own messages (it was placed, its status changed): the theme
  // shows them only when the server's logbook also allows.
  const showConsole = themeVisible(theme, 'messages.order_console') &&
    !(configs?.order_logbook_enabled?.value === '0' && user?.level === 4)

  const handleClickQuickMessage = (text: string) => {
    setMessage && setMessage(`${message}${text}`)
  }

  const [formattedMessages, setFormattedMessages] = useState<Array<ChatMessage>>([]);
  const [isShowSignaturePad, setIsShowSignaturePad] = useState(false)
  const [imagePreviewUri, setImagePreviewUri] = useState<string | null>(null);

  const onChangeMessage = (val: string) => {
    setMessage && setMessage(val);
  };

  const removeImage = () => {
    setImage && setImage(null);
    setImagePreviewUri(null);
  };

  const handleImagePicker = () => {
    launchImageLibrary(
      {
        mediaType: 'photo',
        maxHeight: 2048,
        maxWidth: 2048,
        includeBase64: true,
        quality: 1
      },
      (response: any) => {
        const image = response.assets?.[0];
        if (!image) return
        if (image.didCancel) {
          console.log('User cancelled image picker');
        } else if (image.errorMessage) {
          console.log('ImagePicker Error: ', image.errorMessage);
          showToast(ToastType.Error, image.errorMessage);
        } else {
          if (image.uri) {
            const url = `data:${image.type};base64,${image.base64}`;
            setImage && setImage(url);
            setImagePreviewUri(image.uri);
          } else {
            showToast(ToastType.Error, t('IMAGE_NOT_FOUND', 'Image not found'));
          }
        }
      },
    );
  };

  const handleFilter = (value: any, reader: string) => {
    const isAdmin = user?.level === 0;
    const readersCount = [
      ...new Map<string, boolean>(Object.entries(canRead)).values(),
    ].filter((read: boolean) => read).length;
    const minReaders = isAdmin ? 2 : order?.driver ? 3 : 4;

    if (minReaders === 4) {
      return;
    }

    if (readersCount > minReaders || value[reader]) {
      setCanRead({ ...canRead, ...value });
    } else if (reader !== 'business' && (isAdmin || user?.level === 4)) {
      setCanRead({ ...canRead, ...value, business: true });
    } else if (reader !== 'customer') {
      setCanRead({ ...canRead, ...value, customer: true });
    } else {
      setCanRead({ ...canRead, ...value, driver: true });
    }
  };

  const onSubmit = () => {
    handleSend && handleSend();
    setImage && setImage(null);
    setImagePreviewUri(null);
    setMessage && setMessage('');
    setIsShowSignaturePad(false)
  };

  /** What a change of the order says in the thread (`changeEntries.ts`): undefined, and the entry left out, when it has nothing to say. */
  const messageConsole = (message: any): string | undefined => describeChange(message, t)

  const userRoles: any = {
    0: t('ADMINISTRATOR', 'Administrator'),
    1: t('CITY_MANAGER', 'City manager'),
    2: t('BUSINESS_OWNER', 'Business owner'),
    3: t('CUSTOMER', 'Customer'),
    4: t('DRIVER', 'Driver'),
    5: t('DRIVER_MANAGER', 'Driver manager'),
  };

  // The role of each reader a message can have, as the composer's chips and the line under a message write it.
  const businessLabel = t('BUSINESS', 'Business')
  const customerLabel = t('CUSTOMER', 'Customer')
  const driverLabel = t('DRIVER', 'Driver')

  /** Who can read a message: written under it. */
  const recipientsOf = (canSee: any): string[] => [
    canSee?.includes('2') && user?.level !== 2 && businessLabel,
    canSee?.includes('3') && customerLabel,
    canSee?.includes('4') && user?.level !== 4 && driverLabel,
  ].filter(Boolean) as string[]

  // The quick messages of the user's level that the project has a text for (`quickMessagesOf`).
  const quickMessages = quickMessagesOf(user?.level, t)
  const quickMessageTexts = quickMessages.map(quickMessage => quickMessage.text).join('|')
  useEffect(() => {
    setMessageList(quickMessages)
  }, [user?.level, quickMessageTexts])

  useEffect(() => {
    if (messages?.loading || !order?.id) return

    // The date and the time of a message, as the project writes them.
    const written = (createdAt: string) => ({
      createdAt,
      day: parseDate(createdAt, { outputFormat: dateFormat, utc: false }),
      time: parseDate(createdAt, { outputFormat: timeFormat, utc: false }),
    })
    const sentToLabel = `${t('SENT_TO', 'Sent to')}:`

    let newMessages: Array<ChatMessage> = [];
    const firstMessage: ChatMessage = {
      _id: 0,
      type: 0,
      system: true,
      placed: `${t('ORDER_PLACED_FOR', 'Order placed for')} ${parseDate(order?.created_at)} · ${t('VIA', 'Via')} ${order?.app_id
        ? t(order?.app_id.toUpperCase(), order?.app_id)
        : t('OTHER', 'Other')}`,
      ...written(parseDate(order?.created_at, { outputFormat: 'YYYY-MM-DD HH:mm:ss' })),
    };
    (messages?.messages || []).forEach((message: any) => {
      let newMessage: ChatMessage | undefined;
      const messageOrderId = message?.order_id ?? message?.order?.id
      if (
        parseInt(String(messageOrderId), 10) === order?.id &&
        message.type !== 0 &&
        (messagesToShow?.messages?.length ||
          message?.can_see?.includes?.('2') ||
          message?.can_see?.includes?.('0') ||
          message?.can_see?.includes?.(2) ||
          message?.can_see?.includes?.(0) ||
          ((message?.can_see?.includes?.('4') || message?.can_see?.includes?.(4)) && (type === USER_TYPE.DRIVER || user?.level === 4)))
      ) {
        const isConsole = message.type === 1
        const isMine = message.author?.id === user?.id
        newMessage = {
          _id: message.id,
          text: isConsole ? messageConsole(message) : message.comment,
          ...written(parseDate(message?.created_at, { outputFormat: 'YYYY-MM-DD HH:mm:ss' })),
          image: message.source,
          type: message.type,
          system: isConsole,
          sender: isConsole || isMine ? null : `${message.author?.name} (${userRoles[message.author?.level]})`,
          sentToLabel,
          sentTo: isConsole ? [] : recipientsOf(message?.can_see),
          user: { _id: message.author?.id },
        };
        // A change the app has no words for leaves no entry: never a raw code, an empty bubble or "undefined".
        if (isConsole && !newMessage.text) newMessage = undefined
      }
      if (message.type === 0) {
        newMessage = firstMessage;
      }
      if (newMessage) {
        newMessages = [...newMessages, newMessage];
      }
    });
    let _arrayMessages = [...newMessages.reverse()]

    if (!showConsole) {
      _arrayMessages = _arrayMessages.filter(msg => msg.type !== 1 && msg.type !== 0)
    }
    setFormattedMessages(_arrayMessages);
  }, [
    messages?.messages, messages?.loading, order?.id, type, user?.level, showConsole,
    businessLabel, customerLabel, driverLabel
  ]);

  useEffect(() => {
    if (!order?.driver) {
      setCanRead({ ...canRead, driver: false });
    } else {
      setCanRead({ ...canRead, driver: true });
    }
  }, [order?.driver]);

  const handleCloseBottomPopup = () => setBottomPopup({ kind: 'idle' });

  /** A long press on a bubble (its first phone, if it has one), or a tap on a phone of its text. */
  const handleMessageOptions = (currentMessage: ChatMessage, phone?: string) => {
    if (!currentMessage?.text) return;
    const text = String(currentMessage.text);
    const detected = phone ?? detectPhoneInText(text);
    setBottomPopup({
      kind: 'message',
      copyText: text,
      phoneRaw: detected,
      phoneSanitized: detected ? sanitizePhoneForDial(detected) : null,
    });
  };

  const signatureStyle = `
    .m-signature-pad {
      box-shadow: none;
      border: none;
    }
    .m-signature-pad--body {
      border: none;
    }
    .m-signature-pad--footer {
      display: none;
      margin: 0px;
    }
    body,html {
      height: ${SIGNATURE_PAD_HEIGHT}px;
      border-radius: ${themeRadius(theme, 'md')}px;
    }
  `;

  const signatureRef = useRef<any>(null);

  const handleClear = () => {
    setImage && setImage(null);
    signatureRef.current.clearSignature();
  };

  const handleEnd = () => {
    signatureRef.current.readSignature();
  };

  const handleOK = (signature: any) => {
    setImage && setImage(signature);
  };

  const isSendDisabled = sendMessage?.loading || (message === '' && !image) || messages?.loading
  const sendSlot = theme.native.components.chat_bubble.slots.send
  const hasPreview = !!imagePreviewUri && !isShowSignaturePad
  // The small "remove" mark keeps a touch target of the control's height.
  const removeSlop = (themeControlHeight(theme, 'md') - themeIconSize(theme, 'sm')) / 2

  const renderSignaturePad = () => (
    <View style={styles.signature} testID='chat-signature'>
      <SignatureScreen
        ref={signatureRef}
        onOK={handleOK}
        webStyle={signatureStyle}
        backgroundColor={themeColor(theme, 'surface_alt')}
        onEnd={handleEnd}
      />
      <View style={styles.clearSignature}>
        <ModalCloseButton onPress={handleClear} accessibilityLabel={t('CLEAR', 'Clear')} />
      </View>
    </View>
  )

  // Who receives the message: it decides the message's readers, so it is never hidden. A chip is marked
  // while its reader receives it (a mark that is always there, so the chip keeps its size).
  const renderRecipients = () => {
    const recipients = [
      user?.level !== 2 && { key: 'business', text: businessLabel },
      { key: 'customer', text: customerLabel },
      !!order?.driver && user?.level !== 4 && { key: 'driver', text: driverLabel },
    ].filter(Boolean) as Array<{ key: 'business' | 'customer' | 'driver', text: string }>
    return (
      <ScrollView
        style={styles.row}
        contentContainerStyle={styles.recipients}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        horizontal
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps='handled'
        testID='chat-recipients'
      >
        <OText preset='body_sm' color='text_muted'>{t('SEND_TO', 'Send to')}</OText>
        {recipients.map(({ key, text }) => (
          <FilterChip
            key={key}
            text={text}
            size='md'
            icon={canRead?.[key] ? 'checkmark-circle' : 'ellipse-outline'}
            selected={!!canRead?.[key]}
            onPress={() => handleFilter({ [key]: !canRead?.[key] }, key)}
            testID={`chat-recipient-${key}`}
          />
        ))}
      </ScrollView>
    )
  }

  const renderQuickMessages = () => (
    <ScrollView
      style={styles.row}
      contentContainerStyle={styles.quickMessages}
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps='handled'
      testID='chat-quick-messages'
    >
      {messageList.map((quickMessage: any) => (
        <FilterChip
          key={quickMessage.key}
          text={quickMessage.text}
          size='md'
          onPress={() => handleClickQuickMessage((message?.length ?? 0) > 0 ? ' ' + quickMessage.text : quickMessage.text)}
        />
      ))}
    </ScrollView>
  )

  // The buttons before the field: the signature pad and the image.
  const renderFieldActions = () => (
    <>
      {showSignature && (
        <OButton
          iconOnly
          color='neutral'
          appearance='ghost'
          size='md'
          accessibilityLabel={t('SIGNATURE', 'Signature')}
          icon={<Icon set='mci' name='signature-freehand' />}
          onClick={() => {
            setImage && setImage(null);
            setImagePreviewUri(null);
            setIsShowSignaturePad(!isShowSignaturePad);
          }}
        />
      )}
      {showImageUpload && (
        <View>
          <OButton
            iconOnly
            color='neutral'
            appearance='ghost'
            size='md'
            accessibilityLabel={t('UPLOAD_IMAGE', 'Upload image')}
            icon={hasPreview
              ? <Image source={{ uri: imagePreviewUri as string }} style={styles.preview} resizeMode='cover' />
              : <Icon name='image-outline' />}
            onClick={handleImagePicker}
          />
          {hasPreview && (
            <Pressable
              style={({ pressed }) => [styles.removeImage, pressed && styles.pressed]}
              onPress={() => removeImage()}
              hitSlop={removeSlop}
              accessibilityRole='button'
              accessibilityLabel={t('REMOVE', 'Remove')}
            >
              <Icon name='close-circle' size='sm' />
            </Pressable>
          )}
        </View>
      )}
    </>
  )

  // The composer under the thread, laid out top to bottom, after the line that separates them.
  const renderComposer = () => (
    <>
      <ODivider />
      <View
        style={[styles.toolbar, isKeyboardVisible ? styles.toolbarKeyboard : styles.toolbarInset]}
        testID='chat-composer'
      >
        {chatDisabled ? (
          <ONotice variant='info'>
            {t('NOT_SEND_MESSAGES', 'You can\'t send messages because the order has ended')}
          </ONotice>
        ) : (
          <>
            {showSignature && isShowSignaturePad && renderSignaturePad()}
            {renderRecipients()}
            {showQuickMessages && messageList.length > 0 && renderQuickMessages()}
            <View style={styles.primary} testID='chat-composer-row'>
              {renderFieldActions()}
              <View style={styles.field}>
                <OInput
                  testID='chat-input'
                  value={message}
                  isValueSync
                  onChange={onChangeMessage}
                  onSubmitEditing={onSubmit}
                  returnKeyType={message ? 'send' : 'done'}
                  blurOnSubmit
                  autoCorrect={false}
                  autoCompleteType='off'
                  placeholder={t('WRITE_MESSAGE', 'Write message')}
                />
              </View>
              <OButton
                iconOnly
                round={sendSlot.shape === 'round'}
                color={sendSlot.color}
                appearance={sendSlot.appearance}
                size={sendSlot.size}
                accessibilityLabel={t('SEND', 'Send')}
                icon={<Icon name='send' size='md' />}
                onClick={onSubmit}
                disabled={isSendDisabled}
              />
            </View>
          </>
        )}
      </View>
    </>
  )

  // What a message offers: each row does its action and closes the sheet.
  const messageOptions = bottomPopup.kind !== 'message' ? [] : [
    {
      key: 'copy',
      title: t('COPY_TEXT', 'Copy Text'),
      icon: 'copy-outline',
      onPress: () => {
        Clipboard.setString(bottomPopup.copyText);
        showToast && showToast(ToastType.Success, t('TEXT_COPIED', 'Text copied'));
      },
    },
    ...(bottomPopup.phoneSanitized ? [
      {
        key: 'call',
        title: t('CALL', 'Call'),
        icon: 'call',
        onPress: () => { Linking.openURL(`tel:${bottomPopup.phoneSanitized}`).catch(() => {}) },
      },
      {
        key: 'text',
        title: t('TEXT', 'Text'),
        icon: 'chatbubble-ellipses-outline',
        onPress: () => { Linking.openURL(`sms:${bottomPopup.phoneSanitized}`).catch(() => {}) },
      },
    ] : []),
  ]

  return (
    <View style={styles.wrapper}>
      <ChatThread
        messages={formattedMessages}
        userId={user?.id}
        loading={messages?.loading}
        showTime={showTime}
        onOptions={handleMessageOptions}
        closeLabel={t('CLOSE', 'Close')}
        scrollToBottomLabel={t('SCROLL_TO_BOTTOM', 'Scroll to the last message')}
        footer={renderComposer()}
      />
      <OBottomPopup
        open={bottomPopup.kind !== 'idle'}
        onClose={handleCloseBottomPopup}
        title={bottomPopup.kind === 'message' && bottomPopup.phoneRaw ? bottomPopup.phoneRaw : t('MESSAGE_OPTIONS', 'Message options')}
        padded
      >
        {bottomPopup.kind === 'message' && (
          <View style={styles.sheet} testID='chat-options'>
            {messageOptions.map((option, index) => (
              <OListRow
                key={option.key}
                testID={`chat-option-${option.key}`}
                title={option.title}
                icon={option.icon}
                chevron={false}
                last={index === messageOptions.length - 1}
                onPress={() => {
                  option.onPress();
                  handleCloseBottomPopup();
                }}
              />
            ))}
            <OButton
              text={t('CANCEL', 'Cancel')}
              color='neutral'
              appearance='outline'
              onClick={handleCloseBottomPopup}
            />
          </View>
        )}
      </OBottomPopup>
    </View>
  );
};

export const Chat = (props: MessagesParams) => {
  const MessagesProps = {
    ...props,
    UIComponent: ChatUI,
  };
  return <MessagesController {...MessagesProps} />;
};
