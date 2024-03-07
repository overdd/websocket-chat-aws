import { ApiGatewayManagementApi } from '@aws-sdk/client-apigatewaymanagementapi';
import dynamoDBService from './dynamoDb.service';

class ApiGatewayService {
  private readonly apiGateway: ApiGatewayManagementApi;

  constructor () {
    this.apiGateway = new ApiGatewayManagementApi({
      apiVersion: '2018-11-29',
      endpoint: process.env.WSSAPIGATEWAYENDPOINT
    });
  }

  async postToConnection (connectionId: string, data: string): Promise<boolean> {
    try {
      const command = ({
        ConnectionId: connectionId,
        Data: Buffer.from(data)
      });
      await this.apiGateway.postToConnection(command);
      return true;
    } catch (error) {
      if ((error).$metadata.httpStatusCode !== 410) {
        throw error;
      }
    }
    await dynamoDBService.deleteConnection(connectionId);
    return false;
  };

  async notifyClients (connectionIdToExclude: string): Promise<void> {
    const clients = await dynamoDBService.getAllClients();
    console.log(clients);
    console.log(JSON.stringify(clients));
    await Promise.all(clients.filter((client) => client.connectionId !== connectionIdToExclude).map(async (client) => {
      await this.postToConnection(client.connectionId, JSON.stringify(clients));
    })
    );
  };
};

export default new ApiGatewayService();
