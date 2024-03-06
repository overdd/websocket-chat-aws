import { HandleError } from './errors';
import { type GetMessagesBody, type SendMessageBody } from './types';

export const parseSendMessageBody = (body: string | null): SendMessageBody => {
  const sendMessageBody = JSON.parse(body ?? '{}') as SendMessageBody;
  if (typeof sendMessageBody.message !== 'string' || typeof sendMessageBody.recepientNickname !== 'string') {
    throw new HandleError('Incorrect sendMessageBody type');
  }
  return sendMessageBody;
};

export const parseGetMessagesBody = (body: string | null): GetMessagesBody => {
  const getMessagesBody = JSON.parse(body ?? '{}') as GetMessagesBody;
  if (typeof getMessagesBody.targetNickname !== 'string' || typeof getMessagesBody.limit !== 'number') {
    throw new HandleError('Incorrect getMessagesBody type');
  }
  return getMessagesBody;
};
