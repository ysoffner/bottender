/* @flow */

import wait from 'delay';
import { MessengerClient } from 'messaging-api-messenger';

import type { ScopedDB } from '../database/scoped';

import Context, { DEFAULT_MESSAGE_DELAY } from './Context';
import MessengerEvent, { type RawMessengerEvent } from './MessengerEvent';
import DelayableJobQueue from './DelayableJobQueue';
import SessionData from './SessionData';

type Options = {
  graphAPIClient: MessengerClient,
  rawEvent: RawMessengerEvent,
  data: SessionData,
  db: ScopedDB,
};

export default class MessengerContext extends Context {
  _client: MessengerClient;
  _event: MessengerEvent;
  _data: SessionData;
  _jobQueue: DelayableJobQueue;

  constructor({ graphAPIClient, rawEvent, data, db }: Options) {
    super({ data, db });
    this._client = graphAPIClient;
    this._event = new MessengerEvent(rawEvent);
    this._jobQueue.beforeEach(async ({ delay, showIndicators = true }) => {
      if (showIndicators) {
        this.turnTypingIndicatorsOn();
      }
      await wait(delay);
    });
    this._jobQueue.after(async ({ showIndicators = true }) => {
      if (showIndicators) {
        this.turnTypingIndicatorsOff();
      }
    });

    const sendMethods = [
      'sendText',
      'sendIssueResolutionText',
      'sendImage',
      'sendAudio',
      'sendVideo',
      'sendFile',
      'sendQuickReplies',
      'sendGenericTemplate',
      'sendShippingUpdateTemplate',
      'sendReservationUpdateTemplate',
      'sendIssueResolutionTemplate',
      'sendButtonTemplate',
      'sendListTemplate',
      'sendReceiptTemplate',
      'sendAirlineBoardingPassTemplate',
      'sendAirlineCheckinTemplate',
      'sendAirlineItineraryTemplate',
      'sendAirlineFlightUpdateTemplate',
    ];

    sendMethods.forEach(method => {
      Object.defineProperty(this, `${method}`, {
        enumerable: false,
        configurable: true,
        writable: true,
        value(...args) {
          this._enqueue({
            instance: this._client,
            method,
            args: [this._data.user.id, ...args],
            delay: DEFAULT_MESSAGE_DELAY,
            showIndicators: true,
          });
        },
      });

      Object.defineProperty(this, `${method}To`, {
        enumerable: false,
        configurable: true,
        writable: true,
        value(id, ...rest) {
          this._enqueue({
            instance: this._client,
            method,
            args: [id, ...rest],
            delay: 0,
            showIndicators: false,
          });
        },
      });

      Object.defineProperty(this, `${method}WithDelay`, {
        enumerable: false,
        configurable: true,
        writable: true,
        value(delay, ...rest) {
          this._enqueue({
            instance: this._client,
            method,
            args: [this._data.user.id, ...rest],
            delay,
            showIndicators: true,
          });
        },
      });
    });
  }

  get event(): MessengerEvent {
    return this._event;
  }

  turnTypingIndicatorsOn(): void {
    this._client.turnTypingIndicatorsOn(this._data.user.id);
  }

  turnTypingIndicatorsOff(): void {
    this._client.turnTypingIndicatorsOff(this._data.user.id);
  }
}