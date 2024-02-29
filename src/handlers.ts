import { type APIGatewayProxyEventQueryStringParameters, type APIGatewayProxyEvent, type APIGatewayProxyResult } from 'aws-lambda';
import { ApiGatewayManagementApi } from '@aws-sdk/client-apigatewaymanagementapi';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { PutCommand, DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { RESPONSES, TABLE_NAMES } from './support/constants';

type Action = '$connect' | '$disconnect' | 'getMessages' | 'sendMessages' | 'getClients';
interface Client {
  connectionId: string
  nickname: string
};

const docClient = new DynamoDBClient();
const apiGateway = new ApiGatewayManagementApi({
  endpoint: process.env.WSSAPIGATEWAYENDPOINT
});
module.exports.handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const connectionId = event.requestContext.connectionId ?? 'defaultConnectionId';
  const routeKey = event.requestContext.routeKey as Action;

  switch (routeKey) {
    case '$connect':
      return await handleConnect(connectionId, event.queryStringParameters);
    case '$disconnect':
      return await handleDisconnect(connectionId);
    case 'getClients':
      return await handleGetClients(connectionId);
    default:
      return {
        statusCode: 500,
        body: ''
      };
  }
};

const handleConnect = async (connectionId: string, queryParams: APIGatewayProxyEventQueryStringParameters | null): Promise<APIGatewayProxyResult> => {
  if (queryParams?.nickname === null || queryParams?.nickname === undefined) {
    return {
      statusCode: 403,
      body: ''
    };
  }

  const command = new PutCommand(
    {
      TableName: TABLE_NAMES.CLIENTS,
      Item: {
        connectionId,
        nickname: queryParams.nickname
      }
    });
  await docClient.send(command);

  await notifyClients(connectionId);

  return RESPONSES.OK;
};

const handleDisconnect = async (connectionId: string): Promise<APIGatewayProxyResult> => {
  const command = new DeleteCommand({
    TableName: TABLE_NAMES.CLIENTS,
    Key: {
      connectionId
    }
  });

  await docClient.send(command);

  await notifyClients(connectionId);

  return RESPONSES.OK;
};

const handleGetClients = async (connectionId: string): Promise<APIGatewayProxyResult> => {
  const clients = await getAllClients();

  await postToConnection(connectionId, JSON.stringify(clients));

  return RESPONSES.OK;
};

const notifyClients = async (connectionIdToExclude: string): Promise<void> => {
  const clients = await getAllClients();

  await Promise.all(clients.filter((client) => client.connectionId !== connectionIdToExclude).map(async (client) => {
    await postToConnection(client.connectionId, JSON.stringify(clients));
  })
  );
};

const getAllClients = async (): Promise<Client[]> => {
  const command = new ScanCommand({
    TableName: TABLE_NAMES.CLIENTS
  });

  const output = await docClient.send(command);

  const clients = output.Items ?? [];
  return clients as Client[];
};

const postToConnection = async (connectionId: string, data: string): Promise<void> => {
  try {
    await apiGateway.postToConnection({
      ConnectionId: connectionId,
      Data: data
    });
  } catch (error) {
    if ((error).statusCode !== 410) {
      throw error;
    }
    const command = new DeleteCommand({
      TableName: TABLE_NAMES.CLIENTS,
      Key: {
        connectionId
      }
    });
    await docClient.send(command);
  }
};
