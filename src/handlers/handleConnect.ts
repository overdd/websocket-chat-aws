import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { MESSAGES, RESPONSES, TABLE_NAMES } from '../support/constants';
import { type APIGatewayProxyResult, type APIGatewayProxyEventQueryStringParameters } from 'aws-lambda';
import { dynamoDBClient, getConnectionIdByNickname } from '../services/dynamoDb.service';
import { notifyClients, postToConnection } from '../services/apiGateway.service';

export const handleConnect = async (connectionId: string, queryParams: APIGatewayProxyEventQueryStringParameters | null): Promise<APIGatewayProxyResult> => {
  if (queryParams?.nickname === null || queryParams?.nickname === undefined) {
    return RESPONSES.FORBIDDEN;
  }

  const existingConnectionId = await getConnectionIdByNickname(queryParams.nickname);

  if (existingConnectionId !== null && existingConnectionId !== undefined && existingConnectionId !== null && await postToConnection(existingConnectionId, JSON.stringify(MESSAGES.PING))) {
    return RESPONSES.FORBIDDEN;
  };

  const command = new PutCommand(
    {
      TableName: TABLE_NAMES.CLIENTS,
      Item: {
        connectionId,
        nickname: queryParams.nickname
      }
    });
  await dynamoDBClient.send(command);
  await notifyClients(connectionId);
  return RESPONSES.OK;
};
