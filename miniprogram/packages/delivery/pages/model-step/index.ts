import type { ModelOfferView } from "../../../../contracts/types";
import { fleetService } from "../../../../services/fleet";
import { draftService } from "../../../../services/draft";
import { pricingService } from "../../../../services/pricing";
import { draftStore } from "../../../../stores/order-draft";
import { repo } from "../../../../repositories/index";
import { formatDistance } from "../../../../adapters/geo";
import { computeInputFingerprint } from "../../../../domain/pricing";
import { withPagePerformance } from "../../../../utils/page-performance";

interface PageData {
  draftId: string;
  loading: boolean;
  offers: ModelOfferView[];
  sortedByDistance: ModelOfferView[];
  visibleOffers: ModelOfferView[];
  selectedModelId: string;
  activeTab: "recommended" | "nearest" | "all";
  selected: ModelOfferView | null;
  estimatedTotal: number | null;
  computing: boolean;
  expired: boolean;
}

Page<PageData, any>(withPagePerformance<PageData, any>("delivery/model-step", {
  data: {
    draftId: "",
    loading: true,
    offers: [],
    sortedByDistance: [],
    visibleOffers: [],
    selectedModelId: "",
    activeTab: "recommended",
    selected: null,
    estimatedTotal: null,
    computing: false,
    expired: false,
  },

  onLoad(query) {
    const draftId = query?.draftId as string;
    this.setData({ draftId });
    this.refresh();
  },

  refresh() {
    const draft = repo.getDraft(this.data.draftId);
    if (!draft) return;
    const offers = fleetService.recommend({ draft });
    const recommendedList = offers.filter((o) => o.recommended);
    const sel = offers.find((o) => o.modelId === draft.selectedVehicleModelId && o.available)
      || recommendedList[0]
      || offers.find((o) => o.available)
      || null;

    const sortedByDistance = [...offers].sort((a, b) => {
      const sourceRank = (a.supplySource === "headquarters" ? 1 : 0) - (b.supplySource === "headquarters" ? 1 : 0);
      return sourceRank || a.distanceMeters - b.distanceMeters;
    });

    this.setData({
      offers,
      sortedByDistance,
      visibleOffers: recommendedList,
      loading: false,
      selectedModelId: sel?.modelId ?? "",
      selected: sel,
    });
    if (sel) wx.nextTick(() => this.computeQuote(sel.modelId));
  },

  onTabChange(e: any) {
    const activeTab = e.currentTarget.dataset.tab as PageData["activeTab"];
    const visibleOffers = activeTab === "recommended"
      ? this.data.offers.filter((o) => o.recommended)
      : activeTab === "nearest"
      ? this.data.sortedByDistance
      : this.data.offers;
    this.setData({ activeTab, visibleOffers });
  },

  onSelect(e: any) {
    const id = e.currentTarget.dataset.id;
    const o = this.data.offers.find((x: { modelId: string }) => x.modelId === id);
    if (!o) return;
    if (!o.available) {
      wx.showToast({
        title: o.unavailableReasons[0] || "当前车型不可用",
        icon: "none",
      });
      return;
    }
    this.setData({ selectedModelId: id, selected: o, estimatedTotal: null, expired: false });
    this.computeQuote(id);
  },

  computeQuote(modelId: string) {
    this.setData({ computing: true, expired: false });
    try {
      const draft = repo.getDraft(this.data.draftId);
      if (!draft) return;
      const q = pricingService.quote({ draft, modelId });
      this.setData({ estimatedTotal: q.totalAmountFen, computing: false });
    } catch (e: any) {
      wx.showToast({ title: e.message || "报价失败", icon: "none" });
      this.setData({ computing: false, estimatedTotal: null });
    }
  },

  onConfirm() {
    const id = this.data.selectedModelId;
    if (!id) {
      wx.showToast({ title: "请选择车型", icon: "none" });
      return;
    }
    if (!this.data.selected?.available) {
      wx.showToast({ title: "当前车型不可用", icon: "none" });
      return;
    }
    try {
      const draft = repo.getDraft(this.data.draftId);
      if (!draft) return;
      // 修改草稿版本：触发报价失效
      const updated = draftService.update(this.data.draftId, (d) => ({
        ...d,
        selectedVehicleModelId: id,
        dispatchSource: this.data.selected?.supplySource ?? "nearby",
        headquartersConfirmed: false,
      }));
      // 重新报价
      const q = pricingService.quote({ draft: updated, modelId: id });
      // 绑定到草稿
      const bound = draftService.attachQuote(updated.id, q.id, computeInputFingerprint(updated, id));
      draftStore.set(bound);
      wx.navigateTo({ url: `/packages/delivery/pages/confirm/index?draftId=${updated.id}` });
    } catch (e: any) {
      wx.showToast({ title: e.message || "报价失败", icon: "none" });
    }
  },

  formatDistanceLabel(m: number): string {
    return formatDistance(m);
  },
}));
