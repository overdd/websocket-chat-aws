import { DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { RESPONSES, TABLE_NAMES } from '../support/constants';
import { type APIGatewayProxyResult } from 'aws-lambda';
import { dynamoDBClient } from '../services/dynamoDb.service';
import { notifyClients } from '../services/apiGateway.service';

export const handleDisconnect = async (connectionId: string): Promise<APIGatewayProxyResult> => {
  const command = new DeleteCommand({
    TableName: TABLE_NAMES.CLIENTS,
    Key: {
      connectionId
    }
  });
  await dynamoDBClient.send(command);
  await notifyClients(connectionId);
  return RESPONSES.OK;
};
