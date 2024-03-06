import { QueryCommand } from '@aws-sdk/client-dynamodb';
import { getClient, dynamoDBClient } from '../services/dynamoDb.service';
import { type GetMessagesBody } from '../support/types';
import { RESPONSES, TABLE_NAMES } from '../support/constants';
import { postToConnection } from '../services/apiGateway.service';

import { type APIGatewayProxyResult } from 'aws-lambda';
import { getNicknameToNickname } from '../support/helpers';

export const handleGetMessages = async (connectionId: string, body: GetMessagesBody): Promise<APIGatewayProxyResult> => {
  const client = await getClient(connectionId);

  const query = new QueryCommand({
    TableName: TABLE_NAMES.MESSAGES,
    IndexName: 'NicknameToNicknameIndex',
    KeyConditionExpression: '#nicknameToNickname = :nicknameToNickname',
    ExpressionAttributeNames: {
      '#nicknameToNickname': 'nicknameToNickname'
    },
    ExpressionAttributeValues: {
      ':nicknameToNickname': { S: getNicknameToNickname([client.nickname, body.targetNickname]) }
    },
    Limit: body.limit,
    ScanIndexForward: false
  });

  const queryResult = await dynamoDBClient.send(query);
  const messages = queryResult.Items ?? [];

  await postToConnection(connectionId, JSON.stringify({
    type: 'messages',
    value: { messages }
  }));

  return RESPONSES.OK;
};
