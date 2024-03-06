import { DynamoDBClient, QueryCommand, ScanCommand } from '@aws-sdk/client-dynamodb';
import { type Client } from '../support/types';
import { TABLE_NAMES } from '../support/constants';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';

export const dynamoDBClient = new DynamoDBClient();

export const getAllClients = async (): Promise<Client[]> => {
  const command = new ScanCommand({
    TableName: TABLE_NAMES.CLIENTS
  });

  const output = await dynamoDBClient.send(command);
  const clients = output.Items ?? [];
  const unmarshaledClients = clients.map(item => unmarshall(item));
  console.log(unmarshaledClients);
  return unmarshaledClients as Client[];
};

export const getConnectionIdByNickname = async (nickname: string): Promise<string | undefined> => {
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
  const queryResult = await dynamoDBClient.send(query);

  if (queryResult.Count !== null && queryResult.Count !== undefined && queryResult.Count > 0) {
    const firstItem = queryResult.Items?.[0];
    if (firstItem !== null && firstItem !== undefined) {
      const client = unmarshall(firstItem) as Client;
      return client.connectionId;
    }
  }

  return undefined;
};

export const getClient = async (connectionId: string): Promise<Client> => {
  const getCommand = new GetCommand({
    TableName: TABLE_NAMES.CLIENTS,
    Key: {
      connectionId
    }
  });
  const dbOutput = await dynamoDBClient.send(getCommand);
  return dbOutput.Item as Client;
};
