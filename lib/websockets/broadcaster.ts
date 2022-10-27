import { createAdapter } from '@socket.io/redis-adapter';
import type { Socket } from 'socket.io';
import { Server } from 'socket.io';

import { redisClient } from 'adapters/redis/redisClient';
import { prisma } from 'db';
import { ActionNotPermittedError } from 'lib/middleware';
import { SpaceMembershipRequiredError } from 'lib/permissions/errors';
import { computeUserPagePermissions } from 'lib/permissions/pages/page-permission-compute';

import type { ServerMessage } from './interfaces';

export class WebsocketBroadcaster {

  // Server will be set after the first request
  private io: Server = new Server();

  // Only called once in the app lifecycle once the server is initialised
  async bindServer (io: Server): Promise<void> {

    this.io = io;

    if (redisClient) {
      const pubClient = redisClient;
      const subClient = pubClient.duplicate();

      await Promise.all([
        pubClient.connect(),
        subClient.connect()
      ]);

      io.adapter(createAdapter(pubClient, subClient));
    }

    // Function for debugging amount of connections
    // setInterval(() => {
    //   this.io.sockets.allSockets().then(sockets => {
    //     // eslint-disable-next-line no-console
    //     console.log('Connected socket amount', sockets.size);
    //   });

    // }, 1000);

  }

  broadcastToAll (message: ServerMessage): void {
    this.io.emit('message', message);
  }

  broadcast (message: ServerMessage, roomId: string): void {
    this.io.to(roomId).emit('message', message);
  }

  leaveRoom (socket: Socket, roomId: string): void {
    socket.leave(roomId);
  }

  /**
   * Subscribe a user to all events for themselves and a specific room
   * Unsubscribes user from all other rooms
   */
  async registerWorkspaceSubscriber ({ userId, socket, roomId }: { userId: string, socket: Socket, roomId: string }) {

    const spaceRole = await prisma.spaceRole.findFirst({
      where: {
        userId,
        spaceId: roomId
      }
    });

    if (!spaceRole) {
      socket.send(new SpaceMembershipRequiredError(`User ${userId} does not have access to ${roomId}`));
      return;
    }

    Object.keys(socket.rooms).forEach(room => {
      socket.leave(room);
    });

    socket.join([roomId]);
  }

  async registerPageSubscriber ({ userId, socket, roomId }: { userId: string, socket: Socket, roomId: string }) {
    const permissions = await computeUserPagePermissions({
      pageId: roomId,
      userId
    });

    if (permissions.read !== true) {
      socket.send(new ActionNotPermittedError('You do not have permission to view this page'));
      return;
    }

    socket.join([roomId]);
  }

}

