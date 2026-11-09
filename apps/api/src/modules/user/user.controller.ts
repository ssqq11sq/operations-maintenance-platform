import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { GlobalRole } from '@omp/shared';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserService } from './user.service';
import {
  CreateUserDto,
  ResetPasswordDto,
  UpdateUserDto,
} from './dto/user.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(GlobalRole.SUPER_ADMIN)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  list() {
    return this.userService.listUsers();
  }

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.userService.createUser(dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
  ) {
    return this.userService.updateUser(user, id, dto);
  }

  @Post(':id/reset-password')
  resetPassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ResetPasswordDto,
  ) {
    return this.userService.resetPassword(id, dto.password);
  }
}
