"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const address_1 = require("../../services/address");
const order_draft_1 = require("../../stores/order-draft");
const local_database_1 = require("../../repositories/local-database");
const draft_1 = require("../../services/draft");
const index_1 = require("../../repositories/index");
const clock_1 = require("../../adapters/clock");
const page_performance_1 = require("../../utils/page-performance");
const instance = {};
Page((0, page_performance_1.withPagePerformance)("delivery/address-step", {
    data: {
        draftId: null,
        sender: null,
        receiver: null,
        addresses: [],
        serviceTimeMode: "immediate",
        scheduledDate: "",
        scheduledTime: "",
        scheduledIso: null,
        step: 1,
        totalSteps: 3,
        loading: true,
        dateMin: "",
    },
    onLoad(query) {
        var _a, _b, _c, _d, _e, _f;
        const draftId = query === null || query === void 0 ? void 0 : query.draftId;
        let d = draftId ? index_1.repo.getDraft(draftId) : null;
        if (!d)
            d = (_a = draft_1.draftService.loadCurrent()) !== null && _a !== void 0 ? _a : null;
        const list = address_1.addressService.list();
        if (d === null || d === void 0 ? void 0 : d.sender) {
            const a = list.find((x) => { var _a; return x.id === ((_a = d.sender) === null || _a === void 0 ? void 0 : _a.sourceAddressId); });
            if (a)
                d.sender = snapFromAddress(a);
        }
        if (d === null || d === void 0 ? void 0 : d.receiver) {
            const a = list.find((x) => { var _a; return x.id === ((_a = d.receiver) === null || _a === void 0 ? void 0 : _a.sourceAddressId); });
            if (a)
                d.receiver = snapFromAddress(a);
        }
        const today = new Date();
        const dateMin = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
        this.setData({
            draftId: (_b = d === null || d === void 0 ? void 0 : d.id) !== null && _b !== void 0 ? _b : null,
            sender: (d === null || d === void 0 ? void 0 : d.sender) ? (_c = findAddr(list, d.sender)) !== null && _c !== void 0 ? _c : null : null,
            receiver: (d === null || d === void 0 ? void 0 : d.receiver) ? (_d = findAddr(list, d.receiver)) !== null && _d !== void 0 ? _d : null : null,
            addresses: list,
            serviceTimeMode: (_e = d === null || d === void 0 ? void 0 : d.serviceTimeMode) !== null && _e !== void 0 ? _e : "immediate",
            scheduledIso: (_f = d === null || d === void 0 ? void 0 : d.scheduledPickupAt) !== null && _f !== void 0 ? _f : null,
            scheduledDate: (d === null || d === void 0 ? void 0 : d.scheduledPickupAt) ? d.scheduledPickupAt.substring(0, 10) : "",
            scheduledTime: (d === null || d === void 0 ? void 0 : d.scheduledPickupAt) ? d.scheduledPickupAt.substring(11, 16) : "",
            dateMin,
            loading: false,
        });
        instance.unsubscribe = (0, local_database_1.subscribeDB)(() => {
            this.setData({ addresses: address_1.addressService.list() });
        });
    },
    onUnload() {
        var _a;
        (_a = instance.unsubscribe) === null || _a === void 0 ? void 0 : _a.call(instance);
    },
    onPickSender(e) {
        wx.navigateTo({
            url: "/packages/delivery/pages/addresses/index?mode=select&role=sender",
            success: (res) => res.eventChannel.on("addressSelected", (result) => this.setData({ sender: result.address })),
        });
    },
    onPickReceiver(e) {
        wx.navigateTo({
            url: "/packages/delivery/pages/addresses/index?mode=select&role=receiver",
            success: (res) => res.eventChannel.on("addressSelected", (result) => this.setData({ receiver: result.address })),
        });
    },
    onAddAddress() {
        const role = this.data.sender ? "receiver" : "sender";
        wx.navigateTo({ url: `/packages/delivery/pages/address-edit/index?from=address-step&role=${role}` });
    },
    onSelectTimeMode(e) {
        const mode = e.currentTarget.dataset.mode;
        this.setData({ serviceTimeMode: mode });
    },
    onPickDate(e) {
        this.setData({ scheduledDate: e.detail.value });
        this.refreshScheduledIso();
    },
    onPickTime(e) {
        this.setData({ scheduledTime: e.detail.value });
        this.refreshScheduledIso();
    },
    refreshScheduledIso() {
        const { scheduledDate, scheduledTime } = this.data;
        if (!scheduledDate || !scheduledTime)
            return;
        const iso = `${scheduledDate}T${scheduledTime}:00+08:00`;
        this.setData({ scheduledIso: iso });
    },
    async onNext() {
        var _a;
        if (!this.data.sender || !this.data.receiver) {
            wx.showToast({ title: "请选择寄收件地址", icon: "none" });
            return;
        }
        if (this.data.serviceTimeMode === "scheduled" && !this.data.scheduledIso) {
            wx.showToast({ title: "请选择预约时间", icon: "none" });
            return;
        }
        if (this.data.serviceTimeMode === "scheduled" && new Date(this.data.scheduledIso).getTime() <= Date.now()) {
            wx.showToast({ title: "预约时间需晚于当前时间", icon: "none" });
            return;
        }
        const senderSnap = snapFromAddress(this.data.sender);
        const receiverSnap = snapFromAddress(this.data.receiver);
        const draftValues = {
            sender: senderSnap,
            receiver: receiverSnap,
            serviceTimeMode: this.data.serviceTimeMode,
            scheduledPickupAt: this.data.serviceTimeMode === "scheduled" ? (_a = this.data.scheduledIso) !== null && _a !== void 0 ? _a : undefined : undefined,
        };
        const draft = this.data.draftId
            ? draft_1.draftService.update(this.data.draftId, (current) => (Object.assign(Object.assign({}, current), draftValues)))
            : draft_1.draftService.create(draftValues);
        this.setData({ draftId: draft.id });
        order_draft_1.draftStore.set(draft);
        wx.navigateTo({ url: `/packages/delivery/pages/cargo-step/index?draftId=${draft.id}` });
    },
    formatTimeLabel(iso) {
        if (!iso)
            return "请选择";
        return (0, clock_1.formatDateTime)(iso);
    },
}));
function snapFromAddress(a) {
    return {
        sourceAddressId: a.id,
        name: a.name,
        contactName: a.contactName,
        contactMobile: a.contactMobile,
        regionCode: a.regionCode,
        detail: a.detail,
        location: a.location,
    };
}
function findAddr(list, snap) {
    if (snap.sourceAddressId)
        return list.find((x) => x.id === snap.sourceAddressId);
    return list.find((x) => x.name === snap.name && x.detail === snap.detail);
}
