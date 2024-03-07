import { type APIGatewayProxyResult } from 'aws-lambda';
import apiGatewayService from '../services/apiGateway.service';
import dynamoDbService from '../services/dynamoDb.service';
import { RESPONSES } from '../support/constants';

export const handleGetClients = async (connectionId: string): Promise<APIGatewayProxyResult> => {
  const clients = await dynamoDbService.getAllClients();
  await apiGatewayService.postToConnection(connectionId, JSON.stringify({ type: 'clients', value: { clients } }));
  return RESPONSES.OK;
};
