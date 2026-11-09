export enum GlobalRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  STAFF = 'STAFF',
}

export enum TeamRole {
  LEADER = 'LEADER',
  /** 团队管理员：权限与团队长相同 */
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
}

/** 团队长或团队管理员（具备团队管理权限） */
export function isTeamManagerRole(role?: TeamRole | string | null): boolean {
  return role === TeamRole.LEADER || role === TeamRole.ADMIN;
}

export enum WorkOrderStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CLOSED = 'CLOSED',
}

export type FormFieldType =
  | 'text'
  | 'textarea'
  | 'select'
  | 'multiselect'
  | 'number'
  | 'image'
  | 'file'
  | 'rating';

export interface FormFieldOption {
  label: string;
  value: string;
}

export interface FormFieldDef {
  key: string;
  label: string;
  type: FormFieldType;
  required?: boolean;
  placeholder?: string;
  options?: FormFieldOption[];
  max?: number;
}

export const WORK_ORDER_STATUS_LABEL: Record<WorkOrderStatus, string> = {
  [WorkOrderStatus.PENDING]: '待处理',
  [WorkOrderStatus.IN_PROGRESS]: '处理中',
  [WorkOrderStatus.COMPLETED]: '已完成',
  [WorkOrderStatus.CLOSED]: '已关闭',
};

export const GLOBAL_ROLE_LABEL: Record<GlobalRole, string> = {
  [GlobalRole.SUPER_ADMIN]: '主管理员',
  [GlobalRole.ADMIN]: '管理员',
  [GlobalRole.STAFF]: '运维人员',
};

export const TEAM_ROLE_LABEL: Record<TeamRole, string> = {
  [TeamRole.LEADER]: '团队长',
  [TeamRole.ADMIN]: '管理员',
  [TeamRole.MEMBER]: '成员',
};

/** 加班申请状态 */
export enum OvertimeStatus {
  /** 申请待审批 */
  PENDING = 'PENDING',
  /** 申请已退回 */
  REJECTED = 'REJECTED',
  /** 申请已通过，待补录实际加班 */
  APPROVED = 'APPROVED',
  /** 实际加班待核验 */
  PENDING_VERIFY = 'PENDING_VERIFY',
  /** 核验退回，可重新补录 */
  VERIFY_REJECTED = 'VERIFY_REJECTED',
  /** 已完成 */
  COMPLETED = 'COMPLETED',
}

export const OVERTIME_STATUS_LABEL: Record<OvertimeStatus, string> = {
  [OvertimeStatus.PENDING]: '待审批',
  [OvertimeStatus.REJECTED]: '已退回',
  [OvertimeStatus.APPROVED]: '已通过',
  [OvertimeStatus.PENDING_VERIFY]: '待核验',
  [OvertimeStatus.VERIFY_REJECTED]: '核验退回',
  [OvertimeStatus.COMPLETED]: '已完成',
};

/** 打卡水印可勾选要素 */
export type WatermarkFieldKey =
  | 'title'
  | 'subtitle'
  | 'address'
  | 'time'
  | 'displayName'
  | 'remark';

export interface WatermarkOptions {
  title: boolean;
  subtitle: boolean;
  address: boolean;
  time: boolean;
  displayName: boolean;
  remark: boolean;
}

export const DEFAULT_WATERMARK_OPTIONS: WatermarkOptions = {
  title: true,
  subtitle: true,
  address: true,
  time: true,
  displayName: true,
  remark: true,
};

export const WATERMARK_FIELD_LABEL: Record<WatermarkFieldKey, string> = {
  title: '大标题',
  subtitle: '小标题',
  address: '定位地址',
  time: '打卡时间',
  displayName: '操作人姓名',
  remark: '自定义备注',
};

export const FORM_FIELD_TYPE_OPTIONS: { label: string; value: FormFieldType }[] = [
  { label: '单行文本', value: 'text' },
  { label: '多行文本', value: 'textarea' },
  { label: '下拉单选', value: 'select' },
  { label: '下拉多选', value: 'multiselect' },
  { label: '数字', value: 'number' },
  { label: '评分', value: 'rating' },
  { label: '图片', value: 'image' },
  { label: '附件', value: 'file' },
];
