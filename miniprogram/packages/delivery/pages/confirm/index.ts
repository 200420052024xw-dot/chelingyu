import type { Address, DeliveryAddressSnapshot, OrderDraft, PricingPolicy, Quote } from "../../../../contracts/types";
import { repo } from "../../../../repositories/index";
import { pricingService, PricingError } from "../../../../services/pricing";
import { orderService } from "../../../../services/order";
import { paymentService } from "../../../../services/payment";
import { updateBookingDraft } from "../../../../services/booking-draft";
import { draftStore } from "../../../../stores/order-draft";
import { identity } from "../../../../adapters/identity";
import { formatMoneyFen } from "../../../../view-models/order";
import { formatDateTime, formatTime } from "../../../../adapters/clock";
import { CARGO_LABELS } from "../../../../view-models/cargo";
import { withPagePerformance } from "../../../../utils/page-performance";
import { isSharedMode, sharedOrders } from "../../../../services/remote";
import { sharedPricing } from "../../../../services/remote";
import { draftService } from "../../../../services/draft";
import { computeInputFingerprint } from "../../../../domain/pricing";

interface PageData {
  draftId: string;
  loading: boolean;
  submitting: boolean;
  draft: OrderDraft | null;
  quote: Quote | null;
  policy: PricingPolicy | null;
  payModalOpen: boolean;
  payProcessing: boolean;
  createdOrderId: string | null;
  // computed display
  cargoCategoryLabel: string;
  weightLabel: string;
  dimLabel: string;
  specialLabel: string;
  vehicleImage: string;
  modelName: string;
  modelTags: string[];
  modelMaxLoad: string;
  modelVolume: string;
  modelBattery: string;
  scheduledLabel: string;
}

Page<PageData, any>(withPagePerformance<PageData, any>("delivery/confirm", {
  data: {
    draftId: "",
    loading: true,
    submitting: false,
    draft: null,
    quote: null,
    policy: null,
    payModalOpen: false,
    payProcessing: false,
    createdOrderId: null,
    cargoCategoryLabel: "",
    weightLabel: "",
    dimLabel: "",
    specialLabel: "",
    vehicleImage: "",
    modelName: "",
    modelTags: [],
    modelMaxLoad: "",
    modelVolume: "",
    modelBattery: "",
    scheduledLabel: "",
  },

  onLoad(query) {
    this._unloaded = false;
    const draftId = query?.draftId as string;
    this.setData({ draftId });
    this.refresh();
    this._skipFirstShow = true;
  },

  onShow() {
    if (this._skipFirstShow) {
      this._skipFirstShow = false;
      return;
    }
    if (this.data.draftId && !this.data.createdOrderId) this.refresh();
  },

  onUnload() {
    this._unloaded = true;
  },

  async refresh() {
    let draft = repo.getDraft(this.data.draftId);
    if (!draft) {
      wx.showToast({ title: "草稿不存在", icon: "none" });
      setTimeout(() => wx.navigateBack(), 600);
      return;
    }
    if (!draft.selectedVehicleModelId || !draft.selectedQuoteId) {
      wx.showToast({ title: "请先选择车型", icon: "none" });
      setTimeout(() => wx.navigateBack(), 600);
      return;
    }
    if (isSharedMode()) {
      try {
        await sharedPricing.syncModels();
        const fresh = await sharedPricing.quote(draft, draft.selectedVehicleModelId);
        repo.upsertQuote(fresh);
        draft = draftService.attachQuote(draft.id, fresh.id, computeInputFingerprint(draft, draft.selectedVehicleModelId));
      } catch (error: any) { this.setData({ loading: false }); wx.showToast({ title: error?.message || "报价失败", icon: "none" }); return; }
    }
    const quote = repo.getQuote(draft.selectedQuoteId!);
    if (!quote) {
      wx.showToast({ title: "报价已失效", icon: "none" });
      setTimeout(() => wx.navigateBack(), 600);
      return;
    }
    const policy = repo.getPricingPolicy(quote.pricingPolicyId);
    const model = repo.getVehicleModel(draft.selectedVehicleModelId!);
    const cargoCategoryLabel = draft.cargo ? CARGO_LABELS[draft.cargo.category] : "";
    const weightLabel = draft.cargo?.unitWeightGrams !== undefined
      ? `${(draft.cargo.unitWeightGrams / 1000).toFixed(1)} kg`
      : "";
    const dimLabel = draft.cargo?.unitDimensionsMm
      ? `${draft.cargo.unitDimensionsMm.length / 1000} × ${draft.cargo.unitDimensionsMm.width / 1000} × ${draft.cargo.unitDimensionsMm.height / 1000} 米`
      : "";
    const tags: string[] = [];
    if (draft.cargo?.fragile) tags.push("易碎");
    const specialLabel = tags.length ? tags.join("，") : "无";

    this.setData({
      draft,
      quote,
      policy: policy ?? null,
      loading: false,
      cargoCategoryLabel,
      weightLabel,
      dimLabel,
      specialLabel,
      vehicleImage: model?.imageUrl ?? "/assets/vehicles/box-small.png",
      modelName: model?.name ?? "",
      modelTags: draft.dispatchSource === "headquarters" || draft.dispatchSource === "platform" ? ["需平台调度确认"] : model?.category === "cold_chain" ? ["冷藏保鲜", "温控运输"] : model?.category === "box_medium" ? ["空间更大", "适合大件"] : ["适合当前货物", "性价比高"],
      modelMaxLoad: model ? `${model.maxLoadGrams / 1000} kg` : "",
      modelVolume: model ? (model.cargoVolumeLiters >= 1000 ? `${(model.cargoVolumeLiters / 1000).toFixed(1)} m³` : `${model.cargoVolumeLiters} L`) : "",
      modelBattery: quote.vehicleId ? `${repo.getVehicle(quote.vehicleId)?.batteryPercent ?? 0}%` : "—",
      scheduledLabel: draft.scheduledPickupAt ? formatDateTime(draft.scheduledPickupAt) : "",
    });
  },

  onEditAddress() {
    wx.showActionSheet({
      itemList: ["更改寄件地址", "更改收件地址"],
      success: (result) => this.openAddressPicker(result.tapIndex === 0 ? "sender" : "receiver"),
    });
  },

  onPickAddress(e: any) {
    this.openAddressPicker(e.currentTarget.dataset.role === "receiver" ? "receiver" : "sender");
  },

  openAddressPicker(role: "sender" | "receiver") {
    wx.navigateTo({
      url: `/packages/delivery/pages/addresses/index?mode=select&role=${role}`,
      success: (result) => result.eventChannel.on("addressSelected", (payload: { address: Address }) => {
        const address = payload.address;
        const snapshot: DeliveryAddressSnapshot = {
          sourceAddressId: address.id,
          name: address.name,
          contactName: address.contactName,
          contactMobile: address.contactMobile,
          regionCode: address.regionCode,
          detail: address.detail,
          location: address.location,
        };
        try {
          updateBookingDraft(this.data.draftId, (draft) => ({ ...draft, [role]: snapshot }));
          this.refresh();
        } catch (error: any) {
          wx.showToast({ title: error?.message || "地址更新失败", icon: "none" });
        }
      }),
    });
  },

  onEditCargo() {
    wx.navigateTo({ url: `/packages/delivery/pages/cargo-step/index?draftId=${this.data.draftId}&returnTo=confirm` });
  },

  onEditModel() {
    wx.navigateTo({ url: `/packages/delivery/pages/model-step/index?draftId=${this.data.draftId}&returnTo=confirm` });
  },

  onEditTime() {
    wx.navigateTo({ url: `/pages/address-step/index?draftId=${this.data.draftId}&returnTo=confirm` });
  },

  async onSubmitOrder() {
    if (this.data.submitting) return;
    this.setData({ submitting: true });
    try {
      const draft = repo.getDraft(this.data.draftId);
      if (!draft) throw new Error("草稿不存在");
      const q = pricingService.validateQuoteForCreate({
        quoteId: draft.selectedQuoteId!,
        draft,
        modelId: draft.selectedVehicleModelId!,
      });
      if (isSharedMode()) {
        const fresh = await sharedPricing.quote(draft, draft.selectedVehicleModelId!);
        if (fresh.totalAmountFen !== q.totalAmountFen || fresh.pricingPolicyVersion !== q.pricingPolicyVersion || JSON.stringify(fresh.items) !== JSON.stringify(q.items)) {
          repo.upsertQuote(fresh);
          draftService.attachQuote(draft.id, fresh.id, computeInputFingerprint(draft, draft.selectedVehicleModelId!));
          await this.refresh();
          throw new Error("价格已更新，请确认新报价后再下单");
        }
      }
      const requestKey = `${draft.id}:${draft.revision}`;
      if (this._createRequestKey !== requestKey) {
        this._createRequestKey = requestKey;
        this._createRequestId = identity.newRequestId();
      }
      const order = isSharedMode()
        ? await sharedOrders.create(draft, q, this._createRequestId)
        : orderService.create({ draftId: draft.id, quoteId: q.id, requestId: identity.newRequestId() });
      draftStore.clear();
      if (order.status === "pending_headquarters_review" || order.status === "pending_dispatch_review") {
        this.setData({ createdOrderId: order.id, submitting: false });
        this.openCreatedOrder(order.id);
        return;
      }
      this.setData({
        createdOrderId: order.id,
        submitting: false,
        payModalOpen: true,
        payProcessing: false,
      });
    } catch (e: any) {
      this.setData({ submitting: false, payModalOpen: false, payProcessing: false });
      wx.showToast({ title: e.message || "下单失败", icon: "none" });
      if ((e instanceof PricingError && e.code === "QUOTE_EXPIRED") || e?.code === "QUOTE_EXPIRED" || e?.code === "QUOTE_CHANGED") {
        setTimeout(() => {
          wx.redirectTo({ url: `/packages/delivery/pages/model-step/index?draftId=${this.data.draftId}` });
        }, 800);
      }
    }
  },

  onClosePay() {
    if (this.data.payProcessing) return;
    this.setData({ payModalOpen: false });
    if (this.data.createdOrderId) {
      this.openCreatedOrder(this.data.createdOrderId);
    }
  },

  openCreatedOrder(orderId: string) {
    wx.redirectTo({ url: `/packages/delivery/pages/detail/index?id=${orderId}` });
  },

  onSimulateSuccess() {
    if (this.data.payProcessing) return;
    const orderId = this.data.createdOrderId;
    if (!orderId) return;
    this.runPayment(orderId, "success");
  },

  onSimulateFail() {
    if (this.data.payProcessing) return;
    const orderId = this.data.createdOrderId;
    if (!orderId) return;
    this.runPayment(orderId, "fail");
  },

  runPayment(orderId: string, scenario: "success" | "fail") {
    this.setData({ payProcessing: true });
    setTimeout(async () => {
      if (this._unloaded) return;
      try {
        if (scenario === "success") {
          if (isSharedMode()) await sharedOrders.pay(orderId, identity.newRequestId(), "success");
          else paymentService.payMock({ orderId, requestId: identity.newRequestId(), scenario: "success" });
          this.setData({ payProcessing: false, payModalOpen: false, submitting: false });
          setTimeout(() => {
            if (!this._unloaded) this.openCreatedOrder(orderId);
          }, 400);
        } else {
          if (isSharedMode()) await sharedOrders.pay(orderId, identity.newRequestId(), "fail");
          else paymentService.payMock({ orderId, requestId: identity.newRequestId(), scenario: "fail" });
          this.setData({ payProcessing: false, payModalOpen: false, submitting: false });
          wx.showToast({ title: "模拟支付失败，可在订单详情重试", icon: "none" });
          setTimeout(() => {
            if (!this._unloaded) this.openCreatedOrder(orderId);
          }, 800);
        }
      } catch (e: any) {
        this.setData({ payProcessing: false });
        wx.showToast({ title: e.message || "支付异常", icon: "none" });
      }
    }, 600);
  },

  formatMoney(f: number | null | undefined): string {
    return formatMoneyFen(f ?? 0);
  },

  formatScheduled(iso?: string) {
    if (!iso) return "立即用车";
    return `预约：${formatTime(iso)}`;
  },
}));
