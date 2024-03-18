import { handleGetClients } from '../../handlers/handleGetClients';
import { type APIGatewayProxyResult } from 'aws-lambda';
import dynamoDbService from '../../services/dynamoDb.service';
import apiGatewayService from '../../services/apiGateway.service';
import { RESPONSES } from '../../support/constants';
import { type Client } from '../../support/types';

describe('handleGetClients', () => {
  it('should fetch clients and post to connection', async () => {
    const connectionId = 'new-connection-id';

    const getAllClientsSpy = jest.spyOn(dynamoDbService, 'getAllClients');
    const postToConnectionSpy = jest.spyOn(apiGatewayService, 'postToConnection');

    const mockClients = [{
      connectionId: 'connid1',
      nickname: 'nickname1'
    }, {
      connectionId: 'connid2',
      nickname: 'nickname2'
    }] as Client[];
    getAllClientsSpy.mockResolvedValue(mockClients);
    postToConnectionSpy.mockResolvedValue(true);

    const result: APIGatewayProxyResult = await handleGetClients(connectionId);

    expect(result).toEqual(RESPONSES.OK);
    expect(getAllClientsSpy).toHaveBeenCalled();
    expect(postToConnectionSpy).toHaveBeenCalledWith(connectionId, JSON.stringify({ type: 'clients', value: { clients: mockClients } }));

    jest.clearAllMocks();
  });
});
