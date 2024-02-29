import type { AWS } from '@serverless/typescript';
import { TABLE_NAMES } from './src/support/constants';

const serverlessConfiguration: AWS = {
  service: 'websocket-chat-handler',
  frameworkVersion: '3',
  plugins: ['serverless-esbuild'],
  useDotenv: true,
  provider: {
    name: 'aws',
    runtime: 'nodejs18.x',
    region: 'us-east-1',
    apiGateway: {
      minimumCompressionSize: 1024,
      shouldStartNameWithService: true
    },
    environment: {
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      NODE_OPTIONS: '--enable-source-maps --stack-trace-limit=1000',
      WSSAPIGATEWAYENDPOINT: {
        'Fn::Join': [
          '',
          [
            'wss://',
            { Ref: 'WebsocketsApi' },
            '.execute-api.',
            { Ref: 'AWS::Region' },
            '.amazonaws.com/dev'
          ]
        ]
      }
    },
    iam: {
      role: {
        statements: [
          {
            Effect: 'Allow',
            Action: [
              'dynamodb:DescribeTable',
              'dynamodb:Query',
              'dynamodb:Scan',
              'dynamodb:GetItem',
              'dynamodb:PutItem',
              'dynamodb:UpdateItem',
              'dynamodb:DeleteItem'
            ],
            Resource: [
              'arn:aws:dynamodb:*'
            ]
          },
          {
            Effect: 'Allow',
            Action: [
              'execute-api:Invoke'
            ],
            Resource: [
              'arn:aws:execute-api:*',
              'arn:aws:lambda:*'
            ]
          }
        ]
      }
    }
  },
  functions: {
    connectHandler: {
      handler: './src/handlers.handler',
      events: [
        {
          websocket: {
            route: '$connect'
          }
        }
      ]
    },
    disconnectHandler: {
      handler: 'src/handlers.handler',
      events: [
        {
          websocket: {
            route: '$disconnect'
          }
        }
      ]
    },
    getMessagesHandler: {
      handler: 'src/handlers.handler',
      events: [
        {
          websocket: {
            route: 'getMessages'
          }
        }
      ]
    },
    sendMessagesHandler: {
      handler: 'src/handlers.handler',
      events: [
        {
          websocket: {
            route: 'sendMessages'
          }
        }
      ]
    },
    getClientsHandler: {
      handler: 'src/handlers.handler',
      events: [
        {
          websocket: {
            route: 'getClients'
          }
        }
      ]
    }
  },
  resources: {
    Resources: {
      clients: {
        Type: 'AWS::DynamoDB::Table',
        Properties: {
          TableName: TABLE_NAMES.CLIENTS,
          AttributeDefinitions: [
            { AttributeName: 'connectionId', AttributeType: 'S' },
            { AttributeName: 'nickname', AttributeType: 'S' }
          ],
          KeySchema: [
            { AttributeName: 'connectionId', KeyType: 'HASH' }
          ],
          ProvisionedThroughput: {
            ReadCapacityUnits: 1,
            WriteCapacityUnits: 1
          },
          GlobalSecondaryIndexes: [
            {
              IndexName: 'NicknameIndex',
              KeySchema: [
                { AttributeName: 'nickname', KeyType: 'HASH' }
              ],
              Projection: {
                ProjectionType: 'ALL'
              },
              ProvisionedThroughput: {
                ReadCapacityUnits: 1,
                WriteCapacityUnits: 1
              }
            }
          ]
        }
      },
      messages: {
        Type: 'AWS::DynamoDB::Table',
        Properties: {
          TableName: TABLE_NAMES.MESSAGES,
          AttributeDefinitions: [
            { AttributeName: 'messagesId', AttributeType: 'S' },
            { AttributeName: 'createdAt', AttributeType: 'N' },
            { AttributeName: 'nicknameToNickname', AttributeType: 'S' }
          ],
          KeySchema: [
            { AttributeName: 'messagesId', KeyType: 'HASH' },
            { AttributeName: 'createdAt', KeyType: 'RANGE' }
          ],
          ProvisionedThroughput: {
            ReadCapacityUnits: 1,
            WriteCapacityUnits: 1
          },
          GlobalSecondaryIndexes: [
            {
              IndexName: 'NicknameToNicknameIndex',
              KeySchema: [
                { AttributeName: 'nicknameToNickname', KeyType: 'HASH' },
                { AttributeName: 'createdAt', KeyType: 'RANGE' }
              ],
              Projection: {
                ProjectionType: 'ALL'
              },
              ProvisionedThroughput: {
                ReadCapacityUnits: 1,
                WriteCapacityUnits: 1
              }
            }
          ]
        }
      }
    }
  },
  package: { individually: true },
  custom: {
    esbuild: {
      bundle: true,
      minify: false,
      sourcemap: true,
      exclude: ['aws-sdk'],
      target: 'node14',
      define: { 'require.resolve': undefined },
      platform: 'node',
      concurrency: 10
    }
  }
};

module.exports = serverlessConfiguration;
