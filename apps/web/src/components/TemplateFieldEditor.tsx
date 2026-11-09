import { Button, Form, Input, InputNumber, Select, Space, Switch } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import {
  FORM_FIELD_TYPE_OPTIONS,
  type FormFieldDef,
  type FormFieldOption,
  type FormFieldType,
} from '@omp/shared';

type Props = {
  value?: FormFieldDef[];
  onChange?: (fields: FormFieldDef[]) => void;
};

function emptyField(): FormFieldDef {
  return {
    key: `field_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    label: '新字段',
    type: 'text',
    required: false,
    placeholder: '',
  };
}

function emptyOption(): FormFieldOption {
  return { label: '', value: '' };
}

function slugKey(label: string, fallback: string) {
  const slug = label
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^\w\u4e00-\u9fa5]/g, '')
    .slice(0, 24);
  return slug || fallback;
}

/** 规范化接口返回的 fields（兼容字符串 / 空值） */
export function normalizeTemplateFields(raw: unknown): FormFieldDef[] {
  let data: unknown = raw;
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(data)) return [];
  return data
    .filter((f) => f && typeof f === 'object')
    .map((f: any, idx: number) => ({
      key: String(f.key || `field_${idx + 1}`),
      label: String(f.label || ''),
      type: (f.type || 'text') as FormFieldType,
      required: !!f.required,
      placeholder: f.placeholder ? String(f.placeholder) : '',
      max: f.max != null ? Number(f.max) : undefined,
      options: Array.isArray(f.options)
        ? f.options.map((o: any) => ({
            label: String(o?.label ?? ''),
            value: String(o?.value ?? o?.label ?? ''),
          }))
        : undefined,
    }));
}

/** 保存前补齐/去重内部 key（对用户不可见） */
export function sanitizeFieldsForSave(fields: FormFieldDef[]): FormFieldDef[] {
  const used = new Set<string>();
  return fields.map((f, idx) => {
    let key = (f.key || '').trim();
    if (!key) {
      key = slugKey(f.label, `field_${idx + 1}`);
    }
    let unique = key;
    let n = 2;
    while (used.has(unique)) {
      unique = `${key}_${n++}`;
    }
    used.add(unique);
    return {
      ...f,
      key: unique,
      label: f.label.trim(),
      options: f.options
        ?.map((o) => {
          const label = (o.label || o.value || '').trim();
          return { label, value: label };
        })
        .filter((o) => o.label),
    };
  });
}

export default function TemplateFieldEditor({ value = [], onChange }: Props) {
  const fields = value.length ? value : [];

  const update = (next: FormFieldDef[]) => {
    onChange?.(next);
  };

  const patch = (index: number, partial: Partial<FormFieldDef>) => {
    const next = fields.map((f, i) => (i === index ? { ...f, ...partial } : f));
    update(next);
  };

  const remove = (index: number) => {
    update(fields.filter((_, i) => i !== index));
  };

  const add = () => {
    update([...fields, emptyField()]);
  };

  const needsOptions = (type: FormFieldType) =>
    type === 'select' || type === 'multiselect';

  const patchOption = (
    fieldIndex: number,
    optIndex: number,
    partial: Partial<FormFieldOption>,
  ) => {
    const field = fields[fieldIndex];
    const options = [...(field.options || [])];
    options[optIndex] = { ...options[optIndex], ...partial };
    patch(fieldIndex, { options });
  };

  const addOption = (fieldIndex: number) => {
    const field = fields[fieldIndex];
    patch(fieldIndex, {
      options: [...(field.options || []), emptyOption()],
    });
  };

  const removeOption = (fieldIndex: number, optIndex: number) => {
    const field = fields[fieldIndex];
    patch(fieldIndex, {
      options: (field.options || []).filter((_, i) => i !== optIndex),
    });
  };

  return (
    <div>
      {fields.map((field, index) => (
        <div
          key={`${field.key}-${index}`}
          style={{
            border: '1px solid #dde7e2',
            borderRadius: 12,
            padding: 12,
            marginBottom: 12,
            background: '#f8fbf9',
          }}
        >
          <Space wrap style={{ width: '100%' }} align="start">
            <Form.Item label="显示名称" style={{ marginBottom: 8 }}>
              <Input
                value={field.label}
                style={{ width: 180 }}
                onChange={(e) => patch(index, { label: e.target.value })}
              />
            </Form.Item>
            <Form.Item label="类型" style={{ marginBottom: 8 }}>
              <Select
                value={field.type}
                style={{ width: 130 }}
                options={FORM_FIELD_TYPE_OPTIONS}
                onChange={(type: FormFieldType) => {
                  const partial: Partial<FormFieldDef> = { type };
                  if (needsOptions(type) && !field.options?.length) {
                    partial.options = [
                      { label: '选项1', value: '选项1' },
                      { label: '选项2', value: '选项2' },
                    ];
                  }
                  if (type === 'rating' && !field.max) partial.max = 5;
                  patch(index, partial);
                }}
              />
            </Form.Item>
            <Form.Item label="必填" style={{ marginBottom: 8 }}>
              <Switch
                checked={!!field.required}
                onChange={(required) => patch(index, { required })}
              />
            </Form.Item>
            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={() => remove(index)}
              style={{ marginTop: 30 }}
            >
              删除
            </Button>
          </Space>

          <Form.Item label="占位提示" style={{ marginBottom: 8 }}>
            <Input
              value={field.placeholder || ''}
              onChange={(e) => patch(index, { placeholder: e.target.value })}
            />
          </Form.Item>

          {field.type === 'rating' && (
            <Form.Item label="最高分" style={{ marginBottom: 8 }}>
              <InputNumber
                min={1}
                max={10}
                value={field.max || 5}
                onChange={(max) => patch(index, { max: Number(max) || 5 })}
              />
            </Form.Item>
          )}

          {needsOptions(field.type) && (
            <Form.Item label="选项" style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(field.options || []).map((opt, oi) => (
                  <Space key={oi} wrap>
                    <Input
                      placeholder="选项名称"
                      value={opt.label}
                      style={{ width: 240 }}
                      onChange={(e) => {
                        const label = e.target.value;
                        patchOption(index, oi, { label, value: label });
                      }}
                    />
                    <Button
                      danger
                      type="text"
                      icon={<DeleteOutlined />}
                      onClick={() => removeOption(index, oi)}
                      disabled={(field.options || []).length <= 1}
                    />
                  </Space>
                ))}
                <Button
                  type="dashed"
                  icon={<PlusOutlined />}
                  onClick={() => addOption(index)}
                  style={{ width: 200 }}
                >
                  添加选项
                </Button>
              </div>
            </Form.Item>
          )}
        </div>
      ))}

      <Button type="dashed" block icon={<PlusOutlined />} onClick={add}>
        添加字段
      </Button>
    </div>
  );
}
