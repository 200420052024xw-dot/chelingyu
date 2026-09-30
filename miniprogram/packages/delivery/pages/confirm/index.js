"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../../../../repositories/index");
const pricing_1 = require("../../../../services/pricing");
const order_1 = require("../../../../services/order");
const payment_1 = require("../../../../services/payment");
const order_draft_1 = require("../../../../stores/order-draft");
const identity_1 = require("../../../../adapters/identity");
const order_2 = require("../../../../view-models/order");
const clock_1 = require("../../../../adapters/clock");
const cargo_1 = require("../../../../view-models/cargo");
const page_performance_1 = require("../../../../utils/page-performance");
Page((0, page_performance_1.withPagePerformance)("delivery/confirm", {
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
        const draftId = query === null || query === void 0 ? void 0 : query.draftId;
        this.setData({ draftId });
        this.refresh();
        this._skipFirstShow = true;
    },
    onShow() {
        if (this._skipFirstShow) {
            this._skipFirstShow = false;
            return;
        }
        if (this.data.draftId && !this.data.createdOrderId)
            this.refresh();
    },
    refresh() {
        var _a, _b, _c, _d, _e, _f, _g;
        const draft = index_1.repo.getDraft(this.data.draftId);
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
        const quote = index_1.repo.getQuote(draft.selectedQuoteId);
        if (!quote) {
            wx.showToast({ title: "报价已失效", icon: "none" });
            setTimeout(() => wx.navigateBack(), 600);
            return;
        }
        const policy = index_1.repo.getPricingPolicy(quote.pricingPolicyId);
        const model = index_1.repo.getVehicleModel(draft.selectedVehicleModelId);
        const cargoCategoryLabel = draft.cargo ? cargo_1.CARGO_LABELS[draft.cargo.category] : "";
        const weightLabel = ((_a = draft.cargo) === null || _a === void 0 ? void 0 : _a.unitWeightGrams) !== undefined
            ? `${(draft.cargo.unitWeightGrams / 1000).toFixed(1)} kg`
            : "";
        const dimLabel = ((_b = draft.cargo) === null || _b === void 0 ? void 0 : _b.unitDimensionsMm)
            ? `${draft.cargo.unitDimensionsMm.length} × ${draft.cargo.unitDimensionsMm.width} × ${draft.cargo.unitDimensionsMm.height} mm`
            : "";
        const tags = [];
        if ((_c = draft.cargo) === null || _c === void 0 ? void 0 : _c.fragile)
            tags.push("易碎");
        const specialLabel = tags.length ? tags.join("，") : "无";
        this.setData({
            draft,
            quote,
            policy: policy !== null && policy !== void 0 ? policy : null,
            loading: false,
            cargoCategoryLabel,
            weightLabel,
            dimLabel,
            specialLabel,
            vehicleImage: (_d = model === null || model === void 0 ? void 0 : model.imageUrl) !== null && _d !== void 0 ? _d : "/assets/vehicles/box-small.png",
            modelName: (_e = model === null || model === void 0 ? void 0 : model.name) !== null && _e !== void 0 ? _e : "",
            modelTags: (model === null || model === void 0 ? void 0 : model.category) === "cold_chain" ? ["冷藏保鲜", "温控运输"] : (model === null || model === void 0 ? void 0 : model.category) === "box_medium" ? ["空间更大", "适合大件"] : ["适合当前物品", "性价比高"],
            modelMaxLoad: model ? `${model.maxLoadGrams / 1000} kg` : "",
            modelVolume: model ? (model.cargoVolumeLiters >= 1000 ? `${(model.cargoVolumeLiters / 1000).toFixed(1)} m³` : `${model.cargoVolumeLiters} L`) : "",
            modelBattery: quote.vehicleId ? `${(_g = (_f = index_1.repo.getVehicle(quote.vehicleId)) === null || _f === void 0 ? void 0 : _f.batteryPercent) !== null && _g !== void 0 ? _g : 0}%` : "—",
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
        var _a;
        if (this.data.submitting)
            return;
        if (((_a = this.data.draft) === null || _a === void 0 ? void 0 : _a.dispatchSource) === "headquarters" && !this.data.headquartersConfirmed) {
            wx.showToast({ title: "请先确认总部调车运力", icon: "none" });
            return;
        }
        this.setData({ submitting: true });
        try {
            const draft = index_1.repo.getDraft(this.data.draftId);
            if (!draft)
                throw new Error("草稿不存在");
            const q = pricing_1.pricingService.validateQuoteForCreate({
                quoteId: draft.selectedQuoteId,
                draft,
                modelId: draft.selectedVehicleModelId,
            });
            const order = order_1.orderService.create({
                draftId: draft.id,
                quoteId: q.id,
                requestId: identity_1.identity.newRequestId(),
            });
            order_draft_1.draftStore.clear();
            this.setData({
                createdOrderId: order.id,
                submitting: false,
                payModalOpen: true,
                payProcessing: false,
            });
        }
        catch (e) {
            this.setData({ submitting: false, payModalOpen: false, payProcessing: false });
            wx.showToast({ title: e.message || "下单失败", icon: "none" });
            if (e instanceof pricing_1.PricingError && e.code === "QUOTE_EXPIRED") {
                setTimeout(() => {
                    wx.redirectTo({ url: `/packages/delivery/pages/model-step/index?draftId=${this.data.draftId}` });
                }, 800);
            }
        }
    },
    onConfirmHeadquarters() {
        const draft = index_1.repo.getDraft(this.data.draftId);
        if (!draft || draft.dispatchSource !== "headquarters")
            return;
        wx.showModal({
            title: "总部运力确认",
            content: "演示流程将提交总部调车申请。确认后再进入支付；实际到达时间以调度联系为准。",
            confirmText: "确认有车可调",
            success: (res) => {
                if (!res.confirm)
                    return;
                const confirmed = Object.assign(Object.assign({}, draft), { headquartersConfirmed: true, updatedAt: new Date().toISOString() });
                index_1.repo.upsertDraft(confirmed);
                this.setData({ draft: confirmed, headquartersConfirmed: true });
            },
        });
    },
    onClosePay() {
        if (this.data.payProcessing)
            return;
        this.setData({ payModalOpen: false });
        if (this.data.createdOrderId) {
            wx.redirectTo({ url: `/packages/delivery/pages/detail/index?id=${this.data.createdOrderId}` });
        }
    },
    onSimulateSuccess() {
        if (this.data.payProcessing)
            return;
        const orderId = this.data.createdOrderId;
        if (!orderId)
            return;
        this.runPayment(orderId, "success");
    },
    onSimulateFail() {
        if (this.data.payProcessing)
            return;
        const orderId = this.data.createdOrderId;
        if (!orderId)
            return;
        this.runPayment(orderId, "fail");
    },
    runPayment(orderId, scenario) {
        this.setData({ payProcessing: true });
        setTimeout(() => {
            try {
                if (scenario === "success") {
                    payment_1.paymentService.payMock({ orderId, requestId: identity_1.identity.newRequestId(), scenario: "success" });
                    this.setData({ payProcessing: false, payModalOpen: false, submitting: false });
                    setTimeout(() => {
                        wx.redirectTo({ url: `/packages/delivery/pages/detail/index?id=${orderId}` });
                    }, 400);
                }
                else {
                    payment_1.paymentService.payMock({ orderId, requestId: identity_1.identity.newRequestId(), scenario: "fail" });
                    this.setData({ payProcessing: false, payModalOpen: false, submitting: false });
                    wx.showToast({ title: "模拟支付失败，可在订单详情重试", icon: "none" });
                    setTimeout(() => wx.redirectTo({ url: `/packages/delivery/pages/detail/index?id=${orderId}` }), 800);
                }
            }
            catch (e) {
                this.setData({ payProcessing: false });
                wx.showToast({ title: e.message || "支付异常", icon: "none" });
            }
        }, 600);
    },
    formatMoney(f) {
        return (0, order_2.formatMoneyFen)(f !== null && f !== void 0 ? f : 0);
    },
    formatScheduled(iso) {
        if (!iso)
            return "立即用车";
        return `预约：${(0, clock_1.formatTime)(iso)}`;
    },
}));
