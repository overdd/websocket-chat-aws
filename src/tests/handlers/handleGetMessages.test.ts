import { handleGetMessages } from '../../handlers/handleGetMessages';
import { type APIGatewayProxyResult } from 'aws-lambda';
import dynamoDbService from '../../services/dynamoDb.service';
import apiGatewayService from '../../services/apiGateway.service';
import { type GetMessagesBody } from '../../support/types';
import { RESPONSES } from '../../support/constants';

const getClientSpy = jest.spyOn(dynamoDbService, 'getClient');
const getMessagesSpy = jest.spyOn(dynamoDbService, 'getMessages');
const postToConnectionSpy = jest.spyOn(apiGatewayService, 'postToConnection');

describe('handleGetMessages', () => {
  it('should fetch messages and post to connection', async () => {
    const connectionId = 'new-connection-id';
    const mockBody: GetMessagesBody = { targetNickname: 'nickname1', limit: 10 };

    const mockClient = { connectionId: 'connid1', nickname: 'nickname1' };
    const mockQueryResult = { Items: [/* Your mock messages here */], $metadata: {} };
    getClientSpy.mockResolvedValue(mockClient);
    getMessagesSpy.mockResolvedValue(mockQueryResult);
    postToConnectionSpy.mockResolvedValue(true);

    const result: APIGatewayProxyResult = await handleGetMessages(connectionId, mockBody);

    expect(result).toEqual(RESPONSES.OK);
    expect(getClientSpy).toHaveBeenCalledWith(connectionId);
    expect(getMessagesSpy).toHaveBeenCalledWith(mockClient, mockBody);
    expect(postToConnectionSpy).toHaveBeenCalledWith(connectionId, JSON.stringify({
      type: 'messages',
      value: { messages: mockQueryResult.Items }
    }));

    jest.restoreAllMocks();
  });
});
