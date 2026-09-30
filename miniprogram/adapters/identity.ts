/** ID 生成与辅助。 */

let counter = 0;

export const identity = {
  newId(prefix: string): string {
    counter += 1;
    const t = Date.now().toString(36);
    const c = counter.toString(36).padStart(3, "0");
    const r = Math.floor(Math.random() * 1e6).toString(36);
    return `${prefix}_${t}${c}${r}`;
  },
  newOrderNo(): string {
    const d = new Date();
    const Y = d.getFullYear();
    const M = String(d.getMonth() + 1).padStart(2, "0");
    const D = String(d.getDate()).padStart(2, "0");
    const r = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0");
    return `CLY${Y}${M}${D}${r}`;
  },
  newPaymentNo(): string {
    return `PAY${this.newId("").slice(0, 10).toUpperCase()}`;
  },
  newRefundNo(): string {
    return `REF${this.newId("").slice(0, 10).toUpperCase()}`;
  },
  newRequestId(): string {
    return `req_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`;
  },
};
