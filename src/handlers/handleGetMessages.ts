import dynamoDbService from '../services/dynamoDb.service';
import { type GetMessagesBody } from '../support/types';
import { RESPONSES } from '../support/constants';
import apiGatewayService from '../services/apiGateway.service';

import { type APIGatewayProxyResult } from 'aws-lambda';

export const handleGetMessages = async (connectionId: string, body: GetMessagesBody): Promise<APIGatewayProxyResult> => {
  const client = await dynamoDbService.getClient(connectionId);
  const queryResult = await dynamoDbService.getMessages(client, body);
  const messages = queryResult.Items ?? [];

  await apiGatewayService.postToConnection(connectionId, JSON.stringify({
    type: 'messages',
    value: { messages }
  }));

  return RESPONSES.OK;
};
