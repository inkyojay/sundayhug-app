/**
 * 네이버 톡톡 챗봇 API - 타입 정의
 *
 * 이벤트, 메시지, 응답 등 모든 타입을 정의합니다.
 * @see https://github.com/navertalk/chatbot-api
 */

// ============================================================================
// 기본 이벤트 타입
// ============================================================================

export type TalkTalkEventType =
  | "open"
  | "send"
  | "friend"
  | "action"
  | "leave"
  | "echo"
  | "persistentMenu"
  | "handover";

export type TalkTalkInflowType = "list" | "button" | "none";

export type TalkTalkActionType = "typingOn" | "typingOff";

export type TalkTalkInputType =
  | "typing"
  | "button"
  | "sticker"
  | "vphone"
  | "product";

// ============================================================================
// 채팅 상태 타입
// ============================================================================

export type ChatStatus = "active" | "handover" | "completed";

export type ThreadOwner = "bot" | "agent";

// ============================================================================
// 버튼 타입
// ============================================================================

export type ButtonType = "TEXT" | "LINK" | "OPTION" | "PAY";

export interface TextButton {
  type: "TEXT";
  data: {
    title: string;
    code: string;
  };
}

export interface LinkButton {
  type: "LINK";
  data: {
    title: string;
    url: string;
    mobileUrl?: string;
  };
}

export interface OptionButton {
  type: "OPTION";
  data: {
    title: string;
    buttonList: (TextButton | LinkButton)[];
  };
}

export interface PayButton {
  type: "PAY";
  data: {
    payKey: string;
  };
}

export type Button = TextButton | LinkButton | OptionButton | PayButton;

// ============================================================================
// 메시지 컨텐츠 타입
// ============================================================================

export interface QuickReply {
  buttonList: (TextButton | LinkButton)[];
}

export interface TextContent {
  text: string;
  code?: string;
  inputType?: TalkTalkInputType;
  quickReply?: QuickReply;
}

export interface ImageContent {
  imageUrl?: string;
  imageId?: string;
}

export interface ElementItem {
  title: string;
  description?: string;
  subDescription?: string;
  image?: ImageContent;
  button?: Button;
}

export interface ElementList {
  type: "LIST";
  data: ElementItem[];
}

export interface CompositeItem {
  title?: string;
  description?: string;
  image?: ImageContent;
  elementList?: ElementList;
  buttonList?: Button[];
}

export interface CompositeContent {
  compositeList: CompositeItem[];
}

// ============================================================================
// Webhook 이벤트 페이로드
// ============================================================================

export interface BaseEvent {
  event: TalkTalkEventType;
  user: string;
  options?: Record<string, unknown>;
}

export interface OpenEvent extends BaseEvent {
  event: "open";
  options: {
    inflow: TalkTalkInflowType;
    referer?: string;
    from?: string;
    friend: boolean;
    under14: boolean;
    under19: boolean;
    unreadMessage?: boolean;
  };
}

export interface SendEvent extends BaseEvent {
  event: "send";
  textContent?: TextContent;
  imageContent?: ImageContent;
  compositeContent?: CompositeContent;
  options?: {
    standby?: boolean;
  };
}

export interface FriendEvent extends BaseEvent {
  event: "friend";
  options: {
    set: "on" | "off";
  };
}

export interface ActionEvent extends BaseEvent {
  event: "action";
  options: {
    action: TalkTalkActionType;
  };
}

export interface LeaveEvent extends BaseEvent {
  event: "leave";
}

export interface EchoEvent extends BaseEvent {
  event: "echo";
  echoedEvent: string;
  partner: string;
  textContent?: TextContent;
  imageContent?: ImageContent;
  compositeContent?: CompositeContent;
  options?: {
    threadOwnerId?: string;
  };
}

export interface PersistentMenuEvent extends BaseEvent {
  event: "persistentMenu";
  menuContent: {
    menus: {
      type: "TEXT" | "LINK";
      data: {
        title: string;
        code?: string;
        url?: string;
        mobileUrl?: string;
      };
    }[];
  }[];
}

export interface HandoverEvent extends BaseEvent {
  event: "handover";
  options: {
    threadOwnerId: string;
    standby: boolean;
  };
}

export type TalkTalkEvent =
  | OpenEvent
  | SendEvent
  | FriendEvent
  | ActionEvent
  | LeaveEvent
  | EchoEvent
  | PersistentMenuEvent
  | HandoverEvent;

// ============================================================================
// 보내기 API 요청/응답
// ============================================================================

export interface SendMessageRequest {
  event: "send";
  user: string;
  textContent?: TextContent;
  imageContent?: ImageContent;
  compositeContent?: CompositeContent;
}

export interface ActionRequest {
  event: "action";
  user: string;
  options: {
    action: TalkTalkActionType;
  };
}

export interface PassThreadRequest {
  event: "passThread";
  user: string;
  options?: {
    standby?: boolean;
  };
}

export interface TakeThreadRequest {
  event: "takeThread";
  user: string;
}

export type TalkTalkRequest =
  | SendMessageRequest
  | ActionRequest
  | PassThreadRequest
  | TakeThreadRequest;

export interface TalkTalkApiResponse {
  success: boolean;
  resultCode: string;
  resultMessage?: string;
}

// ============================================================================
// 데이터베이스 모델
// ============================================================================

export interface TalkTalkSettings {
  id: string;
  account_id: string;
  authorization_key: string;
  webhook_url?: string;
  bot_name?: string;
  welcome_message?: string;
  auto_reply_enabled: boolean;
  handover_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface TalkTalkChat {
  id: string;
  user_id: string;
  status: ChatStatus;
  thread_owner: ThreadOwner;
  is_friend: boolean;
  last_message_at?: string;
  last_message_preview?: string;
  unread_count: number;
  created_at: string;
  updated_at: string;
}

export interface TalkTalkMessage {
  id: string;
  chat_id: string;
  user_id: string;
  direction: "inbound" | "outbound";
  event_type: string;
  message_type?: string;
  content: Record<string, unknown>;
  input_type?: string;
  created_at: string;
}

export interface TalkTalkAutoReply {
  id: string;
  trigger_type: "keyword" | "open" | "friend";
  trigger_value?: string;
  response_type: "text" | "composite";
  response_content: TextContent | CompositeContent;
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// 유틸리티 타입
// ============================================================================

export interface AutoReplyResult {
  matched: boolean;
  response: TextContent | CompositeContent;
  responseType: "text" | "composite";
}

export interface ChatStats {
  total: number;
  active: number;
  handover: number;
  completed: number;
  unread: number;
}

// ============================================================================
// 이미지 업로드 API
// ============================================================================

export interface ImageUploadRequest {
  imageUrl: string;
}

export interface ImageUploadResponse {
  success: boolean;
  resultCode: string;
  imageId?: string;
  resultMessage?: string;
}

// ============================================================================
// 에러 코드
// ============================================================================

export const ERROR_CODES = {
  "00": "success",
  "01": "Authorization 오류",
  "02": "JSON 파싱 오류",
  "99": "기타 오류",
  "IMG-01": "이미지 포맷 불일치",
  "IMG-02": "이미지 다운로드 시간 초과",
  "IMG-03": "이미지 용량 초과",
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;
