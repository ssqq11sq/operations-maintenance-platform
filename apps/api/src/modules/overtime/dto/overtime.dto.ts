import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateOvertimeDto {
  @IsDateString({}, { message: '计划开始时间格式不正确' })
  planStartAt: string;

  @IsDateString({}, { message: '计划结束时间格式不正确' })
  planEndAt: string;

  @IsString({ message: '加班事由必须是字符串' })
  @MinLength(1, { message: '请填写加班事由' })
  reason: string;
}

export class ApproveOvertimeDto {
  @IsBoolean({ message: '审批结果无效' })
  pass: boolean;

  @IsOptional()
  @IsString({ message: '退回理由必须是字符串' })
  reason?: string;
}

export class SubmitActualOvertimeDto {
  @IsDateString({}, { message: '实际开始时间格式不正确' })
  actualStartAt: string;

  @IsDateString({}, { message: '实际结束时间格式不正确' })
  actualEndAt: string;

  @IsArray({ message: '照片列表格式不正确' })
  @ArrayMinSize(1, { message: '请至少上传一张打卡照片' })
  @IsString({ each: true, message: '照片地址无效' })
  photoUrls: string[];
}

export class VerifyOvertimeDto {
  @IsBoolean({ message: '核验结果无效' })
  pass: boolean;

  @IsOptional()
  @IsString({ message: '退回理由必须是字符串' })
  reason?: string;
}
