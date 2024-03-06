import { type APIGatewayProxyEventQueryStringParameters, type APIGatewayProxyEvent, type APIGatewayProxyResult } from 'aws-lambda';
import { ApiGatewayManagementApi } from '@aws-sdk/client-apigatewaymanagementapi';
import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
import { PutCommand, DeleteCommand, ScanCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { MESSAGES, RESPONSES, TABLE_NAMES } from './support/constants';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { randomUUID } from 'node:crypto';
import { HandleError } from './support/errors';
import { type Client, type SendMessageBody, type Action, type GetMessagesBody } from './support/types';

const docClient = new DynamoDBClient();
const apiGateway = new ApiGatewayManagementApi({
  apiVersion: '2018-11-29',
  endpoint: process.env.WSSAPIGATEWAYENDPOINT,
  region: 'us-east-1'
});
module.exports.handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const connectionId = event.requestContext.connectionId ?? 'defaultConnectionId';
  const routeKey = event.requestContext.routeKey as Action;
  try {
    switch (routeKey) {
      case '$connect':
        return await handleConnect(connectionId, event.queryStringParameters);
      case '$disconnect':
        return await handleDisconnect(connectionId);
      case 'getClients':
        return await handleGetClients(connectionId);
      case 'sendMessages':
        return await handleSendMessages(connectionId, parseSendMessageBody(event.body));
      case 'getMessages':
        return await handleGetMessages(connectionId, parseGetMessagesBody(event.body));
      default:
        return {
          statusCode: 500,
          body: ''
        };
    }
  } catch (error) {
    if (error instanceof HandleError) {
      await postToConnection(connectionId, JSON.stringify({ type: 'error', value: error.message }));
      return RESPONSES.OK;
    }
    throw error;
  }
};

const parseSendMessageBody = (body: string | null): SendMessageBody => {
  const sendMessageBody = JSON.parse(body ?? '{}') as SendMessageBody;
  if (typeof sendMessageBody.message !== 'string' || typeof sendMessageBody.recepientNickname !== 'string') {
    throw new HandleError('Incorrect sendMessageBody type');
  }
  return sendMessageBody;
};

const parseGetMessagesBody = (body: string | null): GetMessagesBody => {
  const getMessagesBody = JSON.parse(body ?? '{}') as GetMessagesBody;
  if (typeof getMessagesBody.targetNickname !== 'string' || typeof getMessagesBody.limit !== 'number') {
    throw new HandleError('Incorrect getMessagesBody type');
  }
  return getMessagesBody;
};

const handleConnect = async (connectionId: string, queryParams: APIGatewayProxyEventQueryStringParameters | null): Promise<APIGatewayProxyResult> => {
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

  await postToConnection(connectionId, JSON.stringify({ type: 'clients', value: { clients } }));

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

const postToConnection = async (connectionId: string, data: string): Promise<boolean> => {
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
  await docClient.send(command);
  return false;
};

const getConnectionIdByNickname = async (nickname: string): Promise<string | undefined> => {
  const query = new QueryCommand({
    TableName: TABLE_NAMES.CLIENTS,
    IndexName: 'NicknameIndex',
    KeyConditionExpression: '#nickname = :nickname',
    ExpressionAttributeNames: {
      '#nickname': 'nickname'
    },
    ExpressionAttributeValues: {
      ':nickname': { S: nickname }
    }
  });
  const queryResult = await docClient.send(query);

  if (queryResult.Count !== null && queryResult.Count !== undefined && queryResult.Count > 0) {
    const firstItem = queryResult.Items?.[0];
    if (firstItem !== null && firstItem !== undefined) {
      const client = unmarshall(firstItem) as Client;
      return client.connectionId;
    }
  }

  return undefined;
};

const getClient = async (connectionId: string): Promise<Client> => {
  const getCommand = new GetCommand({
    TableName: TABLE_NAMES.CLIENTS,
    Key: {
      connectionId
    }
  });
  const dbOutput = await docClient.send(getCommand);
  return dbOutput.Item as Client;
};

const handleSendMessages = async (senderConnectionId: string, body: SendMessageBody): Promise<APIGatewayProxyResult> => {
  // find the nickname of the sender
  const senderClient = await getClient(senderConnectionId);

  // combine nicknames and put it in messages table
  const nicknameToNickname = getNicknameToNickname([senderClient.nickname, body.recepientNickname]);

  const putCommand = new PutCommand({
    TableName: TABLE_NAMES.MESSAGES,
    Item: {
      messagesId: randomUUID(),
      createdAt: new Date().getTime(),
      nicknameToNickname,
      message: body.message,
      sender: senderClient.nickname
    }
  });

  await docClient.send(putCommand);

  // send message
  const recipientConnectionId = await getConnectionIdByNickname(body.recepientNickname);

  if (recipientConnectionId !== null && recipientConnectionId !== undefined) {
    await postToConnection(recipientConnectionId, JSON.stringify({
      type: 'message',
      value: {
        sender: senderClient.nickname,
        message: body.message
      }
    }));
  }

  return RESPONSES.OK;
};

const getNicknameToNickname = (nicknames: string[]): string => nicknames.sort().join('#');

const handleGetMessages = async (connectionId: string, body: GetMessagesBody): Promise<APIGatewayProxyResult> => {
  const client = await getClient(connectionId);

  const query = new QueryCommand({
    TableName: TABLE_NAMES.MESSAGES,
    IndexName: 'NicknameToNicknameIndex',
    KeyConditionExpression: '#nicknameToNickname = :nicknameToNickname',
    ExpressionAttributeNames: {
      '#nicknameToNickname': 'nicknameToNickname'
    },
    ExpressionAttributeValues: {
      ':nicknameToNickname': { S: getNicknameToNickname([client.nickname, body.targetNickname]) }
    },
    Limit: body.limit,
    ScanIndexForward: false
  });

  const queryResult = await docClient.send(query);
  const messages = queryResult.Items ?? [];

  await postToConnection(connectionId, JSON.stringify({
    type: 'messages',
    value: { messages }
  }));

  return RESPONSES.OK;
};
