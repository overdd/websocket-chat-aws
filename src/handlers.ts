import { type APIGatewayProxyEvent, type APIGatewayProxyResult } from 'aws-lambda';
import { RESPONSES } from './support/constants';
import { HandleError } from './support/errors';
import { type Action } from './support/types';
import { parseGetMessagesBody, parseSendMessageBody } from './support/parsers';
import { handleConnect } from './handlers/handleConnect';
import { handleDisconnect } from './handlers/handleDisconnect';
import { postToConnection } from './services/apiGateway.service';
import { handleGetClients } from './handlers/handleGetClients';
import { handleGetMessages } from './handlers/handleGetMessages';
import { handleSendMessages } from './handlers/handleSendMessages';

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
