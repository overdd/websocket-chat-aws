import type { AWS } from '@serverless/typescript'

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
      NODE_OPTIONS: '--enable-source-maps --stack-trace-limit=1000'
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
            ]
          }
        ]
      }
    }
  },
  functions: {
    connectHandler: {
      handler: 'src/handlers.handler',
      events: [
        {
          websocket: {
            route: $connect as const
          }
        }
      ]
    },
    disconnectHandler: {
      handler: 'src/handlers.handler',
      events: [
        {
          websocket: {
            route: $disconnect as const
          }
        }
      ]
    },
    getMessagesHandler: {
      handler: 'src/handlers.handler',
      events: [
        {
          websocket: {
            route: getMessages
          }
        }
      ]
    },
    sendMessagesHandler: {
      handler: 'src/handlers.handler',
      events: [
        {
          websocket: {
            route: sendMessages
          }
        }
      ]
    },
    getClientsHandler: {
      handler: 'src/handlers.handler',
      events: [
        {
          websocket: {
            route: getClients
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
          TableName: 'Clients',
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
      stocks: {
        Type: 'AWS::DynamoDB::Table',
        Properties: {
          TableName: '${env:STOCKS_TABLE}',
          AttributeDefinitions: [
            { AttributeName: 'product_id', AttributeType: 'S' }
          ],
          KeySchema: [
            { AttributeName: 'product_id', KeyType: 'HASH' }
          ],
          ProvisionedThroughput: {
            ReadCapacityUnits: 1,
            WriteCapacityUnits: 1
          }
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
}

module.exports = serverlessConfiguration
