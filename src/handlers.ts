import { type APIGatewayProxyEventQueryStringParameters, type APIGatewayProxyEvent, type APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDB, ApiGatewayManagementApi, type AWSError } from 'aws-sdk';
import { RESPONSES, TABLE_NAMES } from './support/constants';

type Action = '$connect' | '$disconnect' | 'getMessages' | 'sendMessages' | 'getClients';
interface Client {
  connectionId: string
  nickname: string
};

const docClient = new DynamoDB.DocumentClient();
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

  await docClient.put({
    TableName: TABLE_NAMES.CLIENTS,
    Item: {
      connectionId,
      nickname: queryParams.nickname
    }
  }).promise();

  await notifyClients(connectionId);

  return RESPONSES.OK;
};

const handleDisconnect = async (connectionId: string): Promise<APIGatewayProxyResult> => {
  await docClient.delete({
    TableName: TABLE_NAMES.CLIENTS,
    Key: {
      connectionId
    }
  }).promise();

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
  const output = await docClient.scan({
    TableName: TABLE_NAMES.CLIENTS
  }).promise();

  const clients = output.Items ?? [];
  return clients as Client[];
};

const postToConnection = async (connectionId: string, data: string): Promise<void> => {
  try {
    await apiGateway.postToConnection({
      ConnectionId: connectionId,
      Data: data
    }).promise();
  } catch (error) {
    if ((error as AWSError).statusCode !== 410) {
      throw error;
    }
    await docClient.delete({
      TableName: TABLE_NAMES.CLIENTS,
      Key: {
        connectionId
      }
    }).promise();
  }
};
