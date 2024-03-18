import { MESSAGES, RESPONSES } from '../support/constants';
import { type APIGatewayProxyResult, type APIGatewayProxyEventQueryStringParameters } from 'aws-lambda';
import dynamoDBService from '../services/dynamoDb.service';
import apiGatewayService from '../services/apiGateway.service';

export const handleConnect = async (connectionId: string, queryParams: APIGatewayProxyEventQueryStringParameters | null): Promise<APIGatewayProxyResult> => {
  if (queryParams?.nickname === null || queryParams?.nickname === undefined) {
    return RESPONSES.FORBIDDEN;
  }

  const existingConnectionId = await dynamoDBService.getConnectionIdByNickname(queryParams.nickname);
  if (existingConnectionId !== null && existingConnectionId !== undefined && existingConnectionId !== null && await apiGatewayService.postToConnection(existingConnectionId, JSON.stringify(MESSAGES.PING))) {
    return RESPONSES.FORBIDDEN;
  };

  await dynamoDBService.addConnection(connectionId, queryParams.nickname);
  await apiGatewayService.notifyClients(connectionId);
  return RESPONSES.OK;
};
