import type { DeliveryOrder, OrderDraft, PricingPolicy, Quote } from "../../../../contracts/types";
import { repo } from "../../../../repositories/index";
import { pricingService, PricingError } from "../../../../services/pricing";
import { orderService, OrderError } from "../../../../services/order";
import { paymentService } from "../../../../services/payment";
import { draftStore } from "../../../../stores/order-draft";
import { identity } from "../../../../adapters/identity";
import { formatMoneyFen } from "../../../../view-models/order";
import { formatTime } from "../../../../adapters/clock";
import { CARGO_LABELS } from "../../../../view-models/cargo";
import { withPagePerformance } from "../../../../utils/page-performance";

interface PageData {
  draftId: string;
  loading: boolean;
  submitting: boolean;
  draft: OrderDraft | null;
  quote: Quote | null;
  policy: PricingPolicy | null;
  expand: boolean;
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
  headquartersConfirmed: boolean;
}

Page<PageData, any>(withPagePerformance<PageData, any>("delivery/confirm", {
  data: {
    draftId: "",
    loading: true,
    submitting: false,
    draft: null,
    quote: null,
    policy: null,
    expand: false,
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
    headquartersConfirmed: false,
  },

  onLoad(query) {
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

  refresh() {
    const draft = repo.getDraft(this.data.draftId);
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
    const quote = repo.getQuote(draft.selectedQuoteId);
    if (!quote) {
      wx.showToast({ title: "报价已失效", icon: "none" });
      setTimeout(() => wx.navigateBack(), 600);
      return;
    }
    const policy = repo.getPricingPolicy(quote.pricingPolicyId);
    const model = repo.getVehicleModel(draft.selectedVehicleModelId);
    const cargoCategoryLabel = draft.cargo ? CARGO_LABELS[draft.cargo.category] : "";
    const weightLabel = draft.cargo?.unitWeightGrams !== undefined
      ? `${(draft.cargo.unitWeightGrams / 1000).toFixed(1)} kg`
      : "";
    const dimLabel = draft.cargo?.unitDimensionsMm
      ? `${draft.cargo.unitDimensionsMm.length} × ${draft.cargo.unitDimensionsMm.width} × ${draft.cargo.unitDimensionsMm.height} mm`
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
      modelTags: model?.category === "cold_chain" ? ["冷藏保鲜", "温控运输"] : model?.category === "box_medium" ? ["空间更大", "适合大件"] : ["适合当前物品", "性价比高"],
      modelMaxLoad: model ? `${model.maxLoadGrams / 1000} kg` : "",
      modelVolume: model ? (model.cargoVolumeLiters >= 1000 ? `${(model.cargoVolumeLiters / 1000).toFixed(1)} m³` : `${model.cargoVolumeLiters} L`) : "",
      modelBattery: quote.vehicleId ? `${repo.getVehicle(quote.vehicleId)?.batteryPercent ?? 0}%` : "—",
      headquartersConfirmed: draft.headquartersConfirmed === true,
    });
  },

  onExpandToggle() {
    this.setData({ expand: !this.data.expand });
  },

  onEditAddress() {
    wx.navigateTo({ url: `/pages/address-step/index?draftId=${this.data.draftId}` });
  },

  onEditCargo() {
    wx.navigateTo({ url: `/packages/delivery/pages/cargo-step/index?draftId=${this.data.draftId}` });
  },

  onEditModel() {
    wx.navigateTo({ url: `/packages/delivery/pages/model-step/index?draftId=${this.data.draftId}` });
  },

  onEditTime() {
    wx.navigateTo({ url: `/pages/address-step/index?draftId=${this.data.draftId}` });
  },

  onConfirmAndPay() {
    if (this.data.submitting) return;
    if (this.data.draft?.dispatchSource === "headquarters" && !this.data.headquartersConfirmed) {
      wx.showToast({ title: "请先确认总部调车运力", icon: "none" });
      return;
    }
    this.setData({ submitting: true });
    try {
      const draft = repo.getDraft(this.data.draftId);
      if (!draft) throw new Error("草稿不存在");
      const q = pricingService.validateQuoteForCreate({
        quoteId: draft.selectedQuoteId!,
        draft,
        modelId: draft.selectedVehicleModelId!,
      });
      const order = orderService.create({
        draftId: draft.id,
        quoteId: q.id,
        requestId: identity.newRequestId(),
      });
      draftStore.clear();
      this.setData({
        createdOrderId: order.id,
        submitting: false,
        payModalOpen: true,
        payProcessing: false,
      });
    } catch (e: any) {
      this.setData({ submitting: false, payModalOpen: false, payProcessing: false });
      wx.showToast({ title: e.message || "下单失败", icon: "none" });
      if (e instanceof PricingError && e.code === "QUOTE_EXPIRED") {
        setTimeout(() => {
          wx.redirectTo({ url: `/packages/delivery/pages/model-step/index?draftId=${this.data.draftId}` });
        }, 800);
      }
    }
  },

  onConfirmHeadquarters() {
    const draft = repo.getDraft(this.data.draftId);
    if (!draft || draft.dispatchSource !== "headquarters") return;
    wx.showModal({
      title: "总部运力确认",
      content: "演示流程将提交总部调车申请。确认后再进入支付；实际到达时间以调度联系为准。",
      confirmText: "确认有车可调",
      success: (res) => {
        if (!res.confirm) return;
        const confirmed = { ...draft, headquartersConfirmed: true, updatedAt: new Date().toISOString() };
        repo.upsertDraft(confirmed);
        this.setData({ draft: confirmed, headquartersConfirmed: true });
      },
    });
  },

  onClosePay() {
    if (this.data.payProcessing) return;
    this.setData({ payModalOpen: false });
    if (this.data.createdOrderId) {
      wx.redirectTo({ url: `/packages/delivery/pages/detail/index?id=${this.data.createdOrderId}` });
    }
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
    setTimeout(() => {
      try {
        if (scenario === "success") {
          paymentService.payMock({ orderId, requestId: identity.newRequestId(), scenario: "success" });
          this.setData({ payProcessing: false, payModalOpen: false, submitting: false });
          setTimeout(() => {
            wx.redirectTo({ url: `/packages/delivery/pages/detail/index?id=${orderId}` });
          }, 400);
        } else {
          paymentService.payMock({ orderId, requestId: identity.newRequestId(), scenario: "fail" });
          this.setData({ payProcessing: false, payModalOpen: false, submitting: false });
          wx.showToast({ title: "模拟支付失败，可在订单详情重试", icon: "none" });
          setTimeout(() => wx.redirectTo({ url: `/packages/delivery/pages/detail/index?id=${orderId}` }), 800);
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
