import type { ModelOfferView } from "../../../../contracts/types";
import { fleetService } from "../../../../services/fleet";
import { pricingService } from "../../../../services/pricing";
import { updateBookingDraft } from "../../../../services/booking-draft";
import { repo } from "../../../../repositories/index";
import { formatDistance } from "../../../../adapters/geo";
import { haversineMeters } from "../../../../adapters/geo";
import { withPagePerformance } from "../../../../utils/page-performance";
import { isSharedMode, sharedFleet, sharedPricing } from "../../../../services/remote";

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
  returnToConfirm: boolean;
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
    returnToConfirm: false,
  },

  onLoad(query) {
    const draftId = query?.draftId as string;
    this.setData({ draftId, returnToConfirm: query?.returnTo === "confirm" });
    this.refresh();
  },

  async refresh() {
    const draft = repo.getDraft(this.data.draftId);
    if (!draft) return;
    if (isSharedMode()) await sharedPricing.syncModels().catch(() => undefined);
    let offers = fleetService.recommend({ draft });
    if (isSharedMode()) {
      try {
        const fleet = await sharedFleet.list();
        const origin = draft.sender?.location;
        offers = offers.map(offer => {
          const matching = fleet.filter(v => v.modelId === offer.modelId && v.location).sort((a,b) => origin ? haversineMeters(a.location!,origin)-haversineMeters(b.location!,origin) : 0);
          const nearest = matching[0];
          const distance = nearest?.location && origin ? haversineMeters(nearest.location,origin) : 0;
          return { ...offer, availableCount: matching.length, distanceMeters: distance, estimatedArrivalMinutes: nearest ? Math.max(3, Math.ceil(distance/250)) : 0, batteryPercent: nearest?.batteryPercent, supplySource: draft.serviceTimeMode === "scheduled" || !nearest || offer.unavailableReasons.length ? "headquarters" as const : "nearby" as const };
        });
      } catch (error: any) { wx.showToast({ title: error?.message || "运力加载失败", icon: "none" }); }
    }
    const recommendedList = offers.filter((o) => o.recommended);
    const sel = offers.find((o) => o.modelId === draft.selectedVehicleModelId)
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
      wx.showModal({
        title: "车型适配提醒",
        content: `${o.unavailableReasons.join("；") || "该车型可能不适合当前货物"}。仍要选择将提交平台调度确认。`,
        cancelText: "返回重选",
        confirmText: "仍要选择",
        success: (result) => {
          if (result.confirm) this.selectOffer(o);
        },
      });
      return;
    }
    this.selectOffer(o);
  },

  selectOffer(o: ModelOfferView) {
    const id = o.modelId;
    this.setData({ selectedModelId: id, selected: o, estimatedTotal: null, expired: false });
    this.computeQuote(id);
  },

  onImageTap(e: any) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/packages/delivery/pages/model-detail/index?modelId=${encodeURIComponent(id)}` });
  },

  async computeQuote(modelId: string) {
    this.setData({ computing: true, expired: false });
    try {
      const draft = repo.getDraft(this.data.draftId);
      if (!draft) {
        this.setData({ computing: false });
        return;
      }
      const q = isSharedMode() ? await sharedPricing.quote(draft, modelId) : pricingService.quote({ draft, modelId });
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
    try {
      const draft = repo.getDraft(this.data.draftId);
      if (!draft) {
        wx.showToast({ title: "订单已创建，请在订单列表查看", icon: "none" });
        return;
      }
      const updated = updateBookingDraft(this.data.draftId, (d) => ({
        ...d,
        selectedVehicleModelId: id,
        dispatchSource: d.serviceTimeMode === "scheduled" ? "headquarters" : this.data.selected?.supplySource ?? "headquarters",
      }));
      if (this.data.returnToConfirm) wx.navigateBack();
      else wx.navigateTo({
        url: `/packages/delivery/pages/confirm/index?draftId=${updated.id}`,
        fail: () => wx.showToast({ title: "打开订单确认页失败，请重试", icon: "none" }),
      });
    } catch (e: any) {
      wx.showToast({ title: e.message || "报价失败", icon: "none" });
    }
  },

  formatDistanceLabel(m: number): string {
    return formatDistance(m);
  },
}));
