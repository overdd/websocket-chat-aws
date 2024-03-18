import { handleSendMessages } from '../../handlers/handleSendMessages';
import { type APIGatewayProxyResult } from 'aws-lambda';
import dynamoDbService from '../../services/dynamoDb.service';
import apiGatewayService from '../../services/apiGateway.service';
import { type SendMessageBody } from '../../support/types';
import { RESPONSES } from '../../support/constants';

describe('handleSendMessages', () => {
  it('should send a message and post to recipient connection', async () => {
    const senderConnectionId = 'sender-connection-id';
    const mockBody: SendMessageBody = {
      recepientNickname: 'recipient-nickname',
      message: 'Hello, recipient!'
    };

    const getClientSpy = jest.spyOn(dynamoDbService, 'getClient');
    const addMessageSpy = jest.spyOn(dynamoDbService, 'addMessage');
    const getConnectionIdByNicknameSpy = jest.spyOn(dynamoDbService, 'getConnectionIdByNickname');
    const postToConnectionSpy = jest.spyOn(apiGatewayService, 'postToConnection');

    const mockSenderClient = { nickname: 'sender-nickname', connectionId: 'connid1' };
    const mockRecipientConnectionId = 'recipient-connection-id';
    getClientSpy.mockResolvedValue(mockSenderClient);
    addMessageSpy.mockResolvedValue(undefined);
    getConnectionIdByNicknameSpy.mockResolvedValue(mockRecipientConnectionId);
    postToConnectionSpy.mockResolvedValue(true);

    const result: APIGatewayProxyResult = await handleSendMessages(senderConnectionId, mockBody);

    expect(result).toEqual(RESPONSES.OK);
    expect(getClientSpy).toHaveBeenCalledWith(senderConnectionId);
    expect(addMessageSpy).toHaveBeenCalledWith(mockSenderClient, 'recipient-nickname#sender-nickname', mockBody);
    expect(getConnectionIdByNicknameSpy).toHaveBeenCalledWith(mockBody.recepientNickname);
    expect(postToConnectionSpy).toHaveBeenCalledWith(mockRecipientConnectionId, JSON.stringify({
      type: 'message',
      value: {
        sender: mockSenderClient.nickname,
        message: mockBody.message
      }
    }));

    jest.restoreAllMocks();
  });
});
