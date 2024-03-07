import { RESPONSES } from '../support/constants';
import { type APIGatewayProxyResult } from 'aws-lambda';
import dynamoDBService from '../services/dynamoDb.service';
import apiGatewayService from '../services/apiGateway.service';

export const handleDisconnect = async (connectionId: string): Promise<APIGatewayProxyResult> => {
  await dynamoDBService.deleteConnection(connectionId);
  await apiGatewayService.notifyClients(connectionId);
  return RESPONSES.OK;
};
