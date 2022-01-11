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
    async def disconnect(self, code):
        self.clean_up_redis()

    def clean_up_redis(self):
        self.pubsub_channel.close()
        self.redis_client.close()

    async def receive(self, text_data=None, bytes_data=None):
        try:
            await self.pubsub_channel.get()
        except asyncio.CancelledError:
            # If we get disconnected while waiting on the channel, then the `disconnect` method won't be called and
            # the warning will be logged. So, whatever, clean up redis at least
            # (but honestly, not sure, but maybe redis is cleaned up in any case)
            self.clean_up_redis()
            raise

        await self.send('go')
