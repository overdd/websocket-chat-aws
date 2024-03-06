import { type APIGatewayProxyResult } from 'aws-lambda';
import { postToConnection } from '../services/apiGateway.service';
import { getAllClients } from '../services/dynamoDb.service';
import { RESPONSES } from '../support/constants';

export const handleGetClients = async (connectionId: string): Promise<APIGatewayProxyResult> => {
  const clients = await getAllClients();

  await postToConnection(connectionId, JSON.stringify({ type: 'clients', value: { clients } }));

  return RESPONSES.OK;
};
