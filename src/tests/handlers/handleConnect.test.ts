import { MESSAGES, RESPONSES } from '../../support/constants';
import { handleConnect } from '../../handlers/handleConnect';
import dynamoDbService from '../../services/dynamoDb.service';
import apiGatewayService from '../../services/apiGateway.service';
import { type APIGatewayProxyEventQueryStringParameters } from 'aws-lambda';

const mockGetConnectionIdByNickname = jest.spyOn(dynamoDbService, 'getConnectionIdByNickname');
const mockPostToConnection = jest.spyOn(apiGatewayService, 'postToConnection');

describe('handleConnect', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return FORBIDDEN if queryParams does not contain nickname', async () => {
    const connectionId = 'some-connection-id';
    const queryParams = {};

    const result = await handleConnect(connectionId, queryParams);

    expect(result).toEqual(RESPONSES.FORBIDDEN);
  });

  it('should return FORBIDDEN if an existing connection ID is found', async () => {
    const connectionId = 'existing-connection-id';
    const queryParams = { nickname: 'valid-nickname' };

    mockGetConnectionIdByNickname.mockResolvedValue(connectionId);
    mockPostToConnection.mockResolvedValue(true);

    const result = await handleConnect(connectionId, queryParams);

    expect(result).toEqual(RESPONSES.FORBIDDEN);
    expect(mockPostToConnection).toHaveBeenCalledWith(connectionId, JSON.stringify(MESSAGES.PING));
  });

  it('should save the new connection ID and notify clients', async () => {
    const connectionId = 'new-connection-id';
    const queryParams: APIGatewayProxyEventQueryStringParameters = { nickname: 'valid-nickname' };

    mockGetConnectionIdByNickname.mockResolvedValue('valid-connection-id');
    mockPostToConnection.mockResolvedValue(true);

    const result = await handleConnect(connectionId, queryParams);
    expect(result).toEqual(RESPONSES.FORBIDDEN);
  });
});
