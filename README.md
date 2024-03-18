# websocket-chat-aws

### URL
wss://ie86io8gk6.execute-api.us-east-1.amazonaws.com/dev

### To call the wss endpoint from CLI:
wscat -c "wss://ie86io8gk6.execute-api.us-east-1.amazonaws.com/dev?nickname=nickky"

### Example of messages:
{"action": "sendMessages", "recepientNickname": "nickky", "message": "Hello aaaaaaaa!"}

{"action": "getMessages", "targetNickname": "nickky", "limit": 2}
