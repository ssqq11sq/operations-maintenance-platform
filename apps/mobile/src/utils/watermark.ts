import type { WatermarkOptions } from '@omp/shared';

export type WatermarkInfo = {
  title?: string;
  subtitle?: string;
  address?: string;
  displayName?: string;
  timeText?: string;
  remark?: string;
  options?: Partial<WatermarkOptions>;
};

/**
 * Draw photo + watermark onto canvas, export temp image path.
 * Canvas id must exist on page: <canvas canvas-id="wmCanvas" ... />
 */
export function composeWatermark(
  canvasId: string,
  imagePath: string,
  info: WatermarkInfo,
  component?: any,
): Promise<string> {
  return new Promise((resolve, reject) => {
    uni.getImageInfo({
      src: imagePath,
      success: (img) => {
        const ctx = uni.createCanvasContext(canvasId, component);
        const width = 750;
        const height = Math.round((img.height / img.width) * width);
        ctx.drawImage(imagePath, 0, 0, width, height);

        const opt = {
          title: true,
          subtitle: true,
          address: true,
          time: true,
          displayName: true,
          remark: true,
          ...(info.options || {}),
        };

        const lines: string[] = [];
        if (opt.title && info.title) lines.push(info.title);
        if (opt.subtitle && info.subtitle) lines.push(info.subtitle);
        if (opt.address && info.address) lines.push(info.address);
        if (opt.time && info.timeText) lines.push(info.timeText);
        if (opt.displayName && info.displayName) {
          lines.push(`拍照人：${info.displayName}`);
        }
        if (opt.remark && info.remark) lines.push(info.remark);

        if (!lines.length) {
          lines.push('运维打卡');
        }

        const boxH = 28 + lines.length * 34;
        ctx.setFillStyle('rgba(0,0,0,0.45)');
        ctx.fillRect(0, height - boxH, width, boxH);
        ctx.setFillStyle('#ffffff');
        ctx.setFontSize(22);
        lines.forEach((line, idx) => {
          ctx.fillText(line, 24, height - boxH + 36 + idx * 34);
        });

        ctx.draw(false, () => {
          setTimeout(() => {
            uni.canvasToTempFilePath(
              {
                canvasId,
                x: 0,
                y: 0,
                width,
                height,
                destWidth: width,
                destHeight: height,
                success: (r) => resolve(r.tempFilePath),
                fail: reject,
              },
              component,
            );
          }, 200);
        });
      },
      fail: reject,
    });
  });
}

export function formatNow() {
  const d = new Date();
  const pad = (n: number) => `${n}`.padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
