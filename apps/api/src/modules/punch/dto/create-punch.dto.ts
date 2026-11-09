import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreatePunchDto {
  @IsOptional()
  @IsNumber({}, { message: '团队 ID 无效' })
  teamId?: number;

  @IsNumber({}, { message: '纬度无效' })
  latitude: number;

  @IsNumber({}, { message: '经度无效' })
  longitude: number;

  @IsOptional()
  @IsString({ message: '地址必须是字符串' })
  @MaxLength(255, { message: '地址过长' })
  address?: string;

  @IsOptional()
  @IsString({ message: '标题必须是字符串' })
  @MaxLength(128, { message: '标题过长' })
  title?: string;

  @IsOptional()
  @IsString({ message: '副标题必须是字符串' })
  @MaxLength(128, { message: '副标题过长' })
  subtitle?: string;

  @IsOptional()
  @IsString({ message: '备注必须是字符串' })
  @MaxLength(255, { message: '备注过长' })
  remark?: string;

  @IsString({ message: '请上传打卡照片' })
  photoUrl: string;

  @IsOptional()
  @IsDateString({}, { message: '打卡时间格式不正确' })
  punchedAt?: string;
}
