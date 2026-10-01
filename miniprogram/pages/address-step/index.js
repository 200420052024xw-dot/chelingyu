"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const address_1 = require("../../services/address");
const order_draft_1 = require("../../stores/order-draft");
const local_database_1 = require("../../repositories/local-database");
const draft_1 = require("../../services/draft");
const booking_draft_1 = require("../../services/booking-draft");
const index_1 = require("../../repositories/index");
const clock_1 = require("../../adapters/clock");
const page_performance_1 = require("../../utils/page-performance");
const instance = {};
const HOURS = Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, "0"));
const MINUTES = Array.from({ length: 12 }, (_, slot) => String(slot * 5).padStart(2, "0"));
function alignScheduledTime(iso) {
    if (!iso)
        return { date: "", time: "", iso: null, selection: [0, 0] };
    let date = iso.substring(0, 10);
    const hour = Number(iso.substring(11, 13));
    const minute = Number(iso.substring(14, 16));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isInteger(hour) || hour < 0 || hour > 23 || !Number.isInteger(minute) || minute < 0 || minute > 59) {
        return { date: "", time: "", iso: null, selection: [0, 0] };
    }
    let totalMinutes = hour * 60 + Math.ceil(minute / 5) * 5;
    if (totalMinutes === 24 * 60) {
        const [year, month, day] = date.split("-").map(Number);
        date = new Date(Date.UTC(year, month - 1, day + 1)).toISOString().substring(0, 10);
        totalMinutes = 0;
    }
    const alignedHour = Math.floor(totalMinutes / 60);
    const minuteSlot = (totalMinutes % 60) / 5;
    const time = `${HOURS[alignedHour]}:${MINUTES[minuteSlot]}`;
    return { date, time, iso: `${date}T${time}:00+08:00`, selection: [alignedHour, minuteSlot] };
}
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
        timeColumns: [HOURS.map((hour) => `${hour} 时`), MINUTES.map((minute) => `${minute} 分`)],
        timeSelection: [0, 0],
        step: 1,
        totalSteps: 3,
        loading: true,
        dateMin: "",
        returnToConfirm: false,
    },
    onLoad(query) {
        var _a, _b, _c, _d;
        const draftId = query === null || query === void 0 ? void 0 : query.draftId;
        let d = draftId ? index_1.repo.getDraft(draftId) : null;
        if (!d && !draftId)
            d = draft_1.draftService.create();
        if (!d) {
            wx.showToast({ title: "订单草稿已失效，请重新下单", icon: "none" });
            wx.switchTab({ url: "/pages/home/index" });
            return;
        }
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
        const scheduled = alignScheduledTime(d === null || d === void 0 ? void 0 : d.scheduledPickupAt);
        this.setData({
            draftId: (_a = d === null || d === void 0 ? void 0 : d.id) !== null && _a !== void 0 ? _a : null,
            returnToConfirm: (query === null || query === void 0 ? void 0 : query.returnTo) === "confirm",
            sender: (d === null || d === void 0 ? void 0 : d.sender) ? (_b = findAddr(list, d.sender)) !== null && _b !== void 0 ? _b : null : null,
            receiver: (d === null || d === void 0 ? void 0 : d.receiver) ? (_c = findAddr(list, d.receiver)) !== null && _c !== void 0 ? _c : null : null,
            addresses: list,
            serviceTimeMode: (_d = d === null || d === void 0 ? void 0 : d.serviceTimeMode) !== null && _d !== void 0 ? _d : "immediate",
            scheduledIso: scheduled.iso,
            scheduledDate: scheduled.date,
            scheduledTime: scheduled.time,
            timeSelection: scheduled.selection,
            dateMin,
            loading: false,
        });
        instance.unsubscribe = (0, local_database_1.subscribeDB)(() => {
            this.setData({ addresses: address_1.addressService.list() });
        });
    },
    onUnload() {
        var _a, _b;
        (_a = instance.unsubscribe) === null || _a === void 0 ? void 0 : _a.call(instance);
        if (!this.data.returnToConfirm && this.data.draftId) {
            if (index_1.repo.getDraft(this.data.draftId))
                draft_1.draftService.remove(this.data.draftId);
            if (((_b = order_draft_1.draftStore.get()) === null || _b === void 0 ? void 0 : _b.id) === this.data.draftId)
                order_draft_1.draftStore.clear();
        }
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
        const [hour, minuteSlot] = e.detail.value;
        this.setData({
            scheduledTime: `${HOURS[hour]}:${MINUTES[minuteSlot]}`,
            timeSelection: [hour, minuteSlot],
        });
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
        try {
            if (this.data.returnToConfirm && this.data.draftId) {
                (0, booking_draft_1.updateBookingDraft)(this.data.draftId, (current) => (Object.assign(Object.assign({}, current), draftValues)));
                wx.navigateBack();
                return;
            }
            const draft = this.data.draftId
                ? draft_1.draftService.update(this.data.draftId, (current) => (Object.assign(Object.assign({}, current), draftValues)))
                : draft_1.draftService.create(draftValues);
            this.setData({ draftId: draft.id });
            order_draft_1.draftStore.set(draft);
            wx.navigateTo({ url: `/packages/delivery/pages/cargo-step/index?draftId=${draft.id}` });
        }
        catch (error) {
            wx.showToast({ title: (error === null || error === void 0 ? void 0 : error.message) || "报价更新失败", icon: "none" });
        }
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
