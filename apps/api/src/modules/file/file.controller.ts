import {
  Controller,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TeamService } from '../team/team.service';
import { FileService } from './file.service';

@Controller('files')
@UseGuards(JwtAuthGuard)
export class FileController {
  constructor(
    private readonly fileService: FileService,
    private readonly teamService: TeamService,
  ) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 15 * 1024 * 1024 },
    }),
  )
  async upload(
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File,
    @Query('teamId') teamId?: string,
  ) {
    if (!file) throw new BadRequestException('请上传文件');
    const tid = await this.teamService.resolveTeamId(
      user,
      teamId ? Number(teamId) : undefined,
    );
    return this.fileService.saveUpload(tid, user.id, file);
  }
}
