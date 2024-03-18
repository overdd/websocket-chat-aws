import { handleDisconnect } from '../../handlers/handleDisconnect';
import { type APIGatewayProxyResult } from 'aws-lambda';
import dynamoDBService from '../../services/dynamoDb.service';
import apiGatewayService from '../../services/apiGateway.service';
import { RESPONSES } from '../../support/constants';

describe('handleDisconnect', () => {
  it('should delete the connection and notify clients', async () => {
    const connectionId = 'new-connection-id';

    const deleteConnectionSpy = jest.spyOn(dynamoDBService, 'deleteConnection');
    const notifyClientsSpy = jest.spyOn(apiGatewayService, 'notifyClients');
    deleteConnectionSpy.mockResolvedValue(undefined);
    notifyClientsSpy.mockResolvedValue(undefined);

    const result: APIGatewayProxyResult = await handleDisconnect(connectionId);

    expect(result).toEqual(RESPONSES.OK);
    expect(deleteConnectionSpy).toHaveBeenCalledWith(connectionId);
    expect(notifyClientsSpy).toHaveBeenCalledWith(connectionId);

    jest.clearAllMocks();
  });
});
