import { ApiGatewayManagementApi } from '@aws-sdk/client-apigatewaymanagementapi';
import { dynamoDBClient, getAllClients } from './dynamoDb.service';
import { DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { TABLE_NAMES } from '../support/constants';

export const apiGateway = new ApiGatewayManagementApi({
  apiVersion: '2018-11-29',
  endpoint: process.env.WSSAPIGATEWAYENDPOINT
});

export const postToConnection = async (connectionId: string, data: string): Promise<boolean> => {
  try {
    const command = ({
      ConnectionId: connectionId,
      Data: Buffer.from(data)
    });
    await apiGateway.postToConnection(command);
    return true;
  } catch (error) {
    if ((error).$metadata.httpStatusCode !== 410) {
      throw error;
    }
  }

  const command = new DeleteCommand({
    TableName: TABLE_NAMES.CLIENTS,
    Key: {
      connectionId
    }
  });
  await dynamoDBClient.send(command);
  return false;
};

export const notifyClients = async (connectionIdToExclude: string): Promise<void> => {
  const clients = await getAllClients();
  console.log(clients);
  console.log(JSON.stringify(clients))
  await Promise.all(clients.filter((client) => client.connectionId !== connectionIdToExclude).map(async (client) => {
    await postToConnection(client.connectionId, JSON.stringify(clients));
  })
  );
};
