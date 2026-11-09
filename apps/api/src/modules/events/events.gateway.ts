import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';
import { UserService } from '../user/user.service';
import { TeamService } from '../team/team.service';

@WebSocketGateway({
  cors: { origin: true, credentials: true },
  namespace: '/realtime',
})
export class EventsGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly userService: UserService,
    private readonly teamService: TeamService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth as any)?.token ||
        (client.handshake.query as any)?.token ||
        String(client.handshake.headers?.authorization || '').replace(
          /^Bearer\s+/i,
          '',
        );
      if (!token) {
        client.emit('error', { message: '未登录' });
        client.disconnect(true);
        return;
      }
      const payload = await this.jwt.verifyAsync(token, {
        secret: this.config.get('JWT_SECRET', 'omp-dev-jwt-secret-change-me'),
      });
      const user = await this.userService.findById(payload.sub);
      if (!user || !user.active) {
        client.disconnect(true);
        return;
      }
      (client.data as any).user = this.userService.sanitize(user);
    } catch {
      client.emit('error', { message: '鉴权失败' });
      client.disconnect(true);
    }
  }

  emitToTeam(teamId: number, event: string, payload: unknown) {
    if (!this.server) return;
    this.server.to(`team:${teamId}`).emit(event, payload);
  }

  @SubscribeMessage('joinTeam')
  async handleJoin(
    @MessageBody() data: { teamId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const user = (client.data as any)?.user;
    if (!user || !data?.teamId) {
      return { ok: false, message: '无权加入' };
    }
    try {
      await this.teamService.assertTeamAccess(user, Number(data.teamId));
      client.join(`team:${data.teamId}`);
      return { ok: true };
    } catch {
      return { ok: false, message: '非团队成员' };
    }
  }
}
