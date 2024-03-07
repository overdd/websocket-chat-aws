import { type APIGatewayProxyResult } from 'aws-lambda';
import apiGatewayService from '../services/apiGateway.service';
import dynamoDbService from '../services/dynamoDb.service';
import { RESPONSES } from '../support/constants';
import { type SendMessageBody } from '../support/types';

import { getNicknameToNickname } from '../support/helpers';

export const handleSendMessages = async (senderConnectionId: string, body: SendMessageBody): Promise<APIGatewayProxyResult> => {
  // find the nickname of the sender
  const senderClient = await dynamoDbService.getClient(senderConnectionId);

  // combine nicknames and put message in messages table
  const nicknameToNickname = getNicknameToNickname([senderClient.nickname, body.recepientNickname]);
  await dynamoDbService.addMessage(senderClient, nicknameToNickname, body);

  // send message
  const recipientConnectionId = await dynamoDbService.getConnectionIdByNickname(body.recepientNickname);

  if (recipientConnectionId !== null && recipientConnectionId !== undefined) {
    await apiGatewayService.postToConnection(recipientConnectionId, JSON.stringify({
      type: 'message',
      value: {
        sender: senderClient.nickname,
        message: body.message
      }
    }));
  }

  return RESPONSES.OK;
};
