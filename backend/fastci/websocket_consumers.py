import aioredis
from channels.generic.websocket import AsyncWebsocketConsumer


class ChangeNotifier(AsyncWebsocketConsumer):
    # client: redis.Redis
    client: aioredis.Redis
    channel: aioredis.Channel

    async def connect(self):
        self.client = await aioredis.create_redis(('localhost', 6379), db=0)  # these are the default settings
        self.channel = (await self.client.subscribe('pipeline-job-state-change'))[0]
        await self.accept()

    async def disconnect(self, code):
        await self.channel.close()
        await self.client.close()

    async def receive(self, text_data=None, bytes_data=None):
        await self.channel.get()
        await self.send('go')
