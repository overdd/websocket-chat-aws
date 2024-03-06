import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { type APIGatewayProxyResult } from 'aws-lambda';
import { randomUUID } from 'crypto';
import { postToConnection } from '../services/apiGateway.service';
import { getClient, getConnectionIdByNickname, dynamoDBClient } from '../services/dynamoDb.service';
import { TABLE_NAMES, RESPONSES } from '../support/constants';
import { type SendMessageBody } from '../support/types';

import { getNicknameToNickname } from '../support/helpers';

export const handleSendMessages = async (senderConnectionId: string, body: SendMessageBody): Promise<APIGatewayProxyResult> => {
  // find the nickname of the sender
  const senderClient = await getClient(senderConnectionId);

  // combine nicknames and put it in messages table
  const nicknameToNickname = getNicknameToNickname([senderClient.nickname, body.recepientNickname]);

  const putCommand = new PutCommand({
    TableName: TABLE_NAMES.MESSAGES,
    Item: {
      messagesId: randomUUID(),
      createdAt: new Date().getTime(),
      nicknameToNickname,
      message: body.message,
      sender: senderClient.nickname
    }
  });

  await dynamoDBClient.send(putCommand);

  // send message
  const recipientConnectionId = await getConnectionIdByNickname(body.recepientNickname);

  if (recipientConnectionId !== null && recipientConnectionId !== undefined) {
    await postToConnection(recipientConnectionId, JSON.stringify({
      type: 'message',
      value: {
        sender: senderClient.nickname,
        message: body.message
      }
    }));
  }

  return RESPONSES.OK;
};
