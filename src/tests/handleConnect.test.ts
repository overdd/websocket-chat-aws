// import { RESPONSES } from '../support/constants';
// import { handleConnect } from '../handlers/handleConnect';
// import dynamoDBService from '../services/dynamoDb.service';
// import { notifyClients } from '../services/apiGateway.service';

// describe('handleConnect', () => {
//   it('should return OK if queryParams has a valid nickname', async () => {
//     const connectionId = 'some-connection-id';
//     const queryParams = { nickname: 'valid-nickname' };

//     const result = await handleConnect(connectionId, queryParams);

//     expect(result).toEqual(RESPONSES.OK);
//   });

//   it('should return FORBIDDEN if queryParams has an invalid nickname', async () => {
//     const connectionId = 'some-connection-id';
//     const queryParams = { nickname: 'wrongNickname' };

//     const result = await handleConnect(connectionId, queryParams);

//     expect(result).toEqual(RESPONSES.FORBIDDEN);
//   });

//   it('should return FORBIDDEN if an existing connection ID is found', async () => {
//     const connectionId = 'existing-connection-id';
//     const queryParams = { nickname: 'valid-nickname' };

//     // Mock the existing connection ID check
//     jest.spyOn(dynamoDBService, 'getConnectionIdByNickname').mockResolvedValue('existing-connection-id');

//     const result = await handleConnect(connectionId, queryParams);

//     expect(result).toEqual(RESPONSES.FORBIDDEN);
//   });

//   it('should save the new connection ID and notify clients', async () => {
//     const connectionId = 'new-connection-id';
//     const queryParams = { nickname: 'valid-nickname' };

//     // Mock the existing connection ID check
//     jest.spyOn(dynamoDBService, 'getConnectionIdByNickname').mockResolvedValue(null);

//     // Mock the DynamoDB put command and notifyClients function
//     jest.spyOn(dynamoDBService, 'send').mockResolvedValue({});
//     jest.spyOn(notifyClients, 'notifyClients').mockResolvedValue({});

//     const result = await handleConnect(connectionId, queryParams);

//     expect(result).toEqual(RESPONSES.OK);
//   });
// });
