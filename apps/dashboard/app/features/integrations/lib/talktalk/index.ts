/**
 * 네이버 톡톡 챗봇 API - 모듈 내보내기
 */

// 타입 정의
export * from "./talktalk-types.server";

// 인증 및 설정
export {
  TALKTALK_API_BASE,
  getTalkTalkSettings,
  saveTalkTalkSettings,
  disconnectTalkTalk,
  talktalkFetch,
  testTalkTalkConnection,
  uploadImage,
} from "./talktalk-auth.server";

// 메시지 발송
export {
  sendTextMessage,
  sendTextWithQuickReply,
  sendImageMessage,
  sendImageById,
  sendCompositeMessage,
  sendCardMessage,
  sendTypingOn,
  sendTypingOff,
  passToAgent,
  takeFromAgent,
  sendProductMessage,
  createTextButton,
  createLinkButton,
  createOptionButton,
} from "./talktalk-messages.server";

// Webhook 처리
export {
  upsertChat,
  updateChatStatus,
  getChat,
  incrementUnreadCount,
  resetUnreadCount,
  saveMessage,
  getMessages,
  getActiveAutoReplies,
  processAutoReply,
  handleOpenEvent,
  handleSendEvent,
  handleFriendEvent,
  handleLeaveEvent,
  handleEchoEvent,
  handleHandoverEvent,
  routeWebhookEvent,
} from "./talktalk-webhook.server";
