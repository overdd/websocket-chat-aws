import { DynamoDBClient, QueryCommand, type QueryCommandOutput, ScanCommand } from '@aws-sdk/client-dynamodb';
import { type GetMessagesBody, type Client, type SendMessageBody } from '../support/types';
import { TABLE_NAMES } from '../support/constants';
import { DeleteCommand, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { getNicknameToNickname } from '../support/helpers';
import { randomUUID } from 'node:crypto';

class DynamoDBService {
  dynamoDBClient: DynamoDBClient;

  constructor () {
    this.dynamoDBClient = new DynamoDBClient();
  }

  async addConnection (connectionId: string, nickname: string): Promise<void> {
    const command = new PutCommand(
      {
        TableName: TABLE_NAMES.CLIENTS,
        Item: {
          connectionId,
          nickname
        }
      });
    await this.dynamoDBClient.send(command);
  }

  async deleteConnection (connectionId: string): Promise<void> {
    const command = new DeleteCommand({
      TableName: TABLE_NAMES.CLIENTS,
      Key: {
        connectionId
      }
    });
    await this.dynamoDBClient.send(command);
  }

  async getAllClients (): Promise<Client[]> {
    const command = new ScanCommand({
      TableName: TABLE_NAMES.CLIENTS
    });

    const output = await this.dynamoDBClient.send(command);
    const clients = output.Items ?? [];
    const unmarshaledClients = clients.map(item => unmarshall(item));
    console.log(unmarshaledClients);
    return unmarshaledClients as Client[];
  };

  async addMessage (senderClient: Client, nicknameToNickname: string, body: SendMessageBody): Promise<void> {
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

    await this.dynamoDBClient.send(putCommand);
  };

  async getMessages (client: Client, body: GetMessagesBody): Promise<QueryCommandOutput> {
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

    return await this.dynamoDBClient.send(query);
  }

  async getConnectionIdByNickname (nickname: string): Promise<string | undefined> {
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
    const queryResult = await this.dynamoDBClient.send(query);

    if (queryResult.Count !== null && queryResult.Count !== undefined && queryResult.Count > 0) {
      const firstItem = queryResult.Items?.[0];
      if (firstItem !== null && firstItem !== undefined) {
        const client = unmarshall(firstItem) as Client;
        return client.connectionId;
      }
    }

    return undefined;
  };

  async getClient (connectionId: string): Promise<Client> {
    const getCommand = new GetCommand({
      TableName: TABLE_NAMES.CLIENTS,
      Key: {
        connectionId
      }
    });
    const dbOutput = await this.dynamoDBClient.send(getCommand);
    return dbOutput.Item as Client;
  };
}

export default new DynamoDBService();
