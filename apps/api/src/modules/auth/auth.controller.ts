import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  LoginDto,
  RegisterDto,
  SendSmsDto,
  SmsLoginDto,
  WechatBindDto,
  WechatLoginDto,
} from './dto/login.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('sms/send')
  sendSms(@Body() dto: SendSmsDto) {
    return this.authService.sendSms(dto.phone);
  }

  @Post('sms/login')
  smsLogin(@Body() dto: SmsLoginDto) {
    return this.authService.smsLogin(dto);
  }

  @Get('wechat/status')
  wechatStatus() {
    return this.authService.wechatStatus();
  }

  @Post('wechat/login')
  wechatLogin(@Body() dto: WechatLoginDto) {
    return this.authService.wechatLogin(dto);
  }

  @Post('wechat/bind')
  @UseGuards(JwtAuthGuard)
  bindWechat(
    @CurrentUser() user: { id: number },
    @Body() dto: WechatBindDto,
  ) {
    return this.authService.bindWechat(user.id, dto.code);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  profile(@CurrentUser() user: { id: number }) {
    return this.authService.profile(user.id);
  }
}
