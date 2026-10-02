"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../../../../repositories/index");
const pricing_1 = require("../../../../services/pricing");
const order_1 = require("../../../../services/order");
const payment_1 = require("../../../../services/payment");
const booking_draft_1 = require("../../../../services/booking-draft");
const order_draft_1 = require("../../../../stores/order-draft");
const identity_1 = require("../../../../adapters/identity");
const order_2 = require("../../../../view-models/order");
const clock_1 = require("../../../../adapters/clock");
const cargo_1 = require("../../../../view-models/cargo");
const page_performance_1 = require("../../../../utils/page-performance");
const remote_1 = require("../../../../services/remote");
const remote_2 = require("../../../../services/remote");
const draft_1 = require("../../../../services/draft");
const pricing_2 = require("../../../../domain/pricing");
Page((0, page_performance_1.withPagePerformance)("delivery/confirm", {
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
    onUnload() {
        this._unloaded = true;
    },
    async refresh() {
        var _a, _b, _c, _d, _e, _f, _g;
        let draft = index_1.repo.getDraft(this.data.draftId);
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
        if ((0, remote_1.isSharedMode)()) {
            try {
                await remote_2.sharedPricing.syncModels();
                const fresh = await remote_2.sharedPricing.quote(draft, draft.selectedVehicleModelId);
                index_1.repo.upsertQuote(fresh);
                draft = draft_1.draftService.attachQuote(draft.id, fresh.id, (0, pricing_2.computeInputFingerprint)(draft, draft.selectedVehicleModelId));
            }
            catch (error) {
                this.setData({ loading: false });
                wx.showToast({ title: (error === null || error === void 0 ? void 0 : error.message) || "报价失败", icon: "none" });
                return;
            }
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
            ? `${draft.cargo.unitDimensionsMm.length / 1000} × ${draft.cargo.unitDimensionsMm.width / 1000} × ${draft.cargo.unitDimensionsMm.height / 1000} 米`
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
            modelTags: draft.dispatchSource === "headquarters" || draft.dispatchSource === "platform" ? ["需平台调度确认"] : (model === null || model === void 0 ? void 0 : model.category) === "cold_chain" ? ["冷藏保鲜", "温控运输"] : (model === null || model === void 0 ? void 0 : model.category) === "box_medium" ? ["空间更大", "适合大件"] : ["适合当前货物", "性价比高"],
            modelMaxLoad: model ? `${model.maxLoadGrams / 1000} kg` : "",
            modelVolume: model ? (model.cargoVolumeLiters >= 1000 ? `${(model.cargoVolumeLiters / 1000).toFixed(1)} m³` : `${model.cargoVolumeLiters} L`) : "",
            modelBattery: quote.vehicleId ? `${(_g = (_f = index_1.repo.getVehicle(quote.vehicleId)) === null || _f === void 0 ? void 0 : _f.batteryPercent) !== null && _g !== void 0 ? _g : 0}%` : "—",
            scheduledLabel: draft.scheduledPickupAt ? (0, clock_1.formatDateTime)(draft.scheduledPickupAt) : "",
        });
    },
    onEditAddress() {
        wx.showActionSheet({
            itemList: ["更改寄件地址", "更改收件地址"],
            success: (result) => this.openAddressPicker(result.tapIndex === 0 ? "sender" : "receiver"),
        });
    },
    onPickAddress(e) {
        this.openAddressPicker(e.currentTarget.dataset.role === "receiver" ? "receiver" : "sender");
    },
    openAddressPicker(role) {
        wx.navigateTo({
            url: `/packages/delivery/pages/addresses/index?mode=select&role=${role}`,
            success: (result) => result.eventChannel.on("addressSelected", (payload) => {
                const address = payload.address;
                const snapshot = {
                    sourceAddressId: address.id,
                    name: address.name,
                    contactName: address.contactName,
                    contactMobile: address.contactMobile,
                    regionCode: address.regionCode,
                    detail: address.detail,
                    location: address.location,
                };
                try {
                    (0, booking_draft_1.updateBookingDraft)(this.data.draftId, (draft) => (Object.assign(Object.assign({}, draft), { [role]: snapshot })));
                    this.refresh();
                }
                catch (error) {
                    wx.showToast({ title: (error === null || error === void 0 ? void 0 : error.message) || "地址更新失败", icon: "none" });
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
        if (this.data.submitting)
            return;
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
            if ((0, remote_1.isSharedMode)()) {
                const fresh = await remote_2.sharedPricing.quote(draft, draft.selectedVehicleModelId);
                if (fresh.totalAmountFen !== q.totalAmountFen || fresh.pricingPolicyVersion !== q.pricingPolicyVersion || JSON.stringify(fresh.items) !== JSON.stringify(q.items)) {
                    index_1.repo.upsertQuote(fresh);
                    draft_1.draftService.attachQuote(draft.id, fresh.id, (0, pricing_2.computeInputFingerprint)(draft, draft.selectedVehicleModelId));
                    await this.refresh();
                    throw new Error("价格已更新，请确认新报价后再下单");
                }
            }
            const requestKey = `${draft.id}:${draft.revision}`;
            if (this._createRequestKey !== requestKey) {
                this._createRequestKey = requestKey;
                this._createRequestId = identity_1.identity.newRequestId();
            }
            const order = (0, remote_1.isSharedMode)()
                ? await remote_1.sharedOrders.create(draft, q, this._createRequestId)
                : order_1.orderService.create({ draftId: draft.id, quoteId: q.id, requestId: identity_1.identity.newRequestId() });
            order_draft_1.draftStore.clear();
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
        }
        catch (e) {
            this.setData({ submitting: false, payModalOpen: false, payProcessing: false });
            wx.showToast({ title: e.message || "下单失败", icon: "none" });
            if ((e instanceof pricing_1.PricingError && e.code === "QUOTE_EXPIRED") || (e === null || e === void 0 ? void 0 : e.code) === "QUOTE_EXPIRED" || (e === null || e === void 0 ? void 0 : e.code) === "QUOTE_CHANGED") {
                setTimeout(() => {
                    wx.redirectTo({ url: `/packages/delivery/pages/model-step/index?draftId=${this.data.draftId}` });
                }, 800);
            }
        }
    },
    onClosePay() {
        if (this.data.payProcessing)
            return;
        this.setData({ payModalOpen: false });
        if (this.data.createdOrderId) {
            this.openCreatedOrder(this.data.createdOrderId);
        }
    },
    openCreatedOrder(orderId) {
        wx.redirectTo({ url: `/packages/delivery/pages/detail/index?id=${orderId}` });
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
        setTimeout(async () => {
            if (this._unloaded)
                return;
            try {
                if (scenario === "success") {
                    if ((0, remote_1.isSharedMode)())
                        await remote_1.sharedOrders.pay(orderId, identity_1.identity.newRequestId(), "success");
                    else
                        payment_1.paymentService.payMock({ orderId, requestId: identity_1.identity.newRequestId(), scenario: "success" });
                    this.setData({ payProcessing: false, payModalOpen: false, submitting: false });
                    setTimeout(() => {
                        if (!this._unloaded)
                            this.openCreatedOrder(orderId);
                    }, 400);
                }
                else {
                    if ((0, remote_1.isSharedMode)())
                        await remote_1.sharedOrders.pay(orderId, identity_1.identity.newRequestId(), "fail");
                    else
                        payment_1.paymentService.payMock({ orderId, requestId: identity_1.identity.newRequestId(), scenario: "fail" });
                    this.setData({ payProcessing: false, payModalOpen: false, submitting: false });
                    wx.showToast({ title: "模拟支付失败，可在订单详情重试", icon: "none" });
                    setTimeout(() => {
                        if (!this._unloaded)
                            this.openCreatedOrder(orderId);
                    }, 800);
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
