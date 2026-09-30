import { withPagePerformance } from "../../../../utils/page-performance";
import type { EarningsView } from "../../../../contracts/types";
import { ownerService } from "../../../../services/owner";
import { subscribeDB } from "../../../../repositories/local-database";
import { formatMoneyFen } from "../../../../view-models/order";
import { formatDateTime } from "../../../../adapters/clock";

type Range = "all" | "pending" | "settled";

interface PageData {
  earnings: EarningsView;
  range: Range;
  filteredItems: EarningsView["items"];
  loading: boolean;
}

interface PageInstance {
  unsubscribe?: () => void;
}

const instance: PageInstance = {};

Page<PageData, any>(withPagePerformance<PageData, any>("packages/owner/pages/earnings/index", {
  data: {
    earnings: { pendingFen: 0, settledFen: 0, totalFen: 0, items: [] },
    range: "all",
    filteredItems: [],
    loading: true,
  },

  onLoad() {
    this.refresh();
    instance.unsubscribe = subscribeDB(() => this.refresh());
  },

  onUnload() {
    instance.unsubscribe?.();
  },

  refresh() {
    const earnings = ownerService.earnings();
    const filtered = this.applyFilter(earnings.items, this.data.range);
    this.setData({ earnings, filteredItems: filtered, loading: false });
  },

  applyFilter(items: EarningsView["items"], range: Range): EarningsView["items"] {
    if (range === "all") return items;
    if (range === "settled") return items.filter((i) => i.status === "settled");
    return items.filter((i) => i.status !== "settled");
  },

  onSwitchRange(e: any) {
    const range = e.currentTarget.dataset.range as Range;
    this.setData({ range });
    this.refresh();
  },

  onWithdraw() {
    wx.showModal({
      title: "模拟收益说明",
      content: "当前为本地演示版，收益仅用于展示，不支持真实提现。",
      showCancel: false,
    });
  },

  formatMoney(f: number) {
    return formatMoneyFen(f);
  },

  formatDate(iso?: string) {
    if (!iso) return "—";
    return formatDateTime(iso);
  },
}));
