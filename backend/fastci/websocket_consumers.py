import aioredis
import asyncio
from channels.generic.websocket import AsyncWebsocketConsumer


class ChangeNotifier(AsyncWebsocketConsumer):
    redis_client: aioredis.Redis
    pubsub_channel: aioredis.Channel

    async def connect(self):
        self.redis_client = await aioredis.create_redis(('localhost', 6379), db=0)  # these are the default settings
        self.pubsub_channel = (await self.redis_client.subscribe('pipeline-job-state-change'))[0]
        await self.accept()

    # This won't be called if receive hasn't finished...
    # Fucking piece of shit api...
    # Nice fucking job making an async api, you pieces of shit stupid shit-brained retarded devs.
    # I'm fucking tired of dealing with this bullshit all the time. I guess redis will have to kill off the connection
    # or whatever. Fuck.
    async def disconnect(self, code):
        self.pubsub_channel.close()
        self.redis_client.close()

    async def receive(self, text_data=None, bytes_data=None):
        await self.pubsub_channel.get()
        await self.send('go')
