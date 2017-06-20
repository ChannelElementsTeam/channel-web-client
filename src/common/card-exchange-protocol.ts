export const CARD_EXCHANGE_PROTOCOL_ID = "https://channelelements.com/channel-protocols/card-exchange/v1";

export interface JsonPlusBinaryMessage<T> {
  json?: T;
  binary?: Uint8Array;
}

export interface CardExchangeMessageToSerialize extends JsonPlusBinaryMessage<CardExchangeMessagePayload> { }

export interface DeserializedCardExchangeMessage extends CardExchangeMessageToSerialize {
  valid: boolean;
  errorMessage?: string;
}

export interface CardExchangeMessagePayload {
  type: string; // 'add-card', 'card-to-card'
  details: AddCardMessageDetails | CardToCardMessageDetails;
}

export interface AddCardMessageDetails {
  cardId: string; // uniquely identifies one instance of a card
  package: string; // identifies the type of card:  suitable for bower install
  data: any;  // used to initialize the 'data' parameter of the component
}
// Control message payload may be followed by additional binary data that, if present, will be passed in "binary" parameter to component

export interface CardToCardMessageDetails {
  cardId: string;
  data: any;
}
// Control message payload may be followed by additional binary data that, if present, will be passed in "binary" argument to component "handleMessage" call

export interface ParticipantIdentity {
  name: string;
  imageUrl: string;
  address: Uint8Array;
}

export interface ParticipantInfo {
  identity: ParticipantIdentity;
  memberSince: number;
  lastActive: number;
  isMe: boolean;
  isCreator: boolean;
}

export interface ParticipantList {
  participants: ParticipantInfo[];
  addEventListener(event: string, callback: (data: any) => void);
}

export interface ParticipantListEvent {  // 'participant-added', 'participant-left'
  participant: ParticipantInfo;
}

export interface CardMessageDetailsEvent extends JsonPlusBinaryMessage<any>;  // 'add-card-to-send', 'card-to-card-to-send' events

export interface ChannelWebComponent {
  // parameters
  cardId: string;
  mode: string;  // 'compose', 'view'
  data?: any;
  binary?: Uint8Array;
  participantList: ParticipantList;  // supports addEventListener

  // compose mode methods
  handleCompositionSendCompleted(): void;  // sometime after this component fires 'add-card-to-send'

  // view mode methods
  handleCardToCardMessageReceived(sender: ParticipantInfo, details: CardToCardMessageDetails): void;
  handleCardToCardMessageSent(success: boolean, errorMessage?: string): void;  // sometime after this component fires 'card-to-card-to-send'
}

// Component also fires:  'resize' when it has unilaterally changed its own size (e.g., based on a message received)
