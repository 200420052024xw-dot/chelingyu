"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const page_performance_1 = require("../../../../utils/page-performance");
const address_1 = require("../../../../services/address");
const local_database_1 = require("../../../../repositories/local-database");
const instance = {};
Page((0, page_performance_1.withPagePerformance)("packages/delivery/pages/addresses/index", {
    data: {
        addresses: [],
        selecting: false,
        role: "sender",
    },
    onLoad(query) {
        const selecting = (query === null || query === void 0 ? void 0 : query.mode) === "select";
        const role = (query === null || query === void 0 ? void 0 : query.role) === "receiver" ? "receiver" : "sender";
        this.setData({ selecting, role });
        wx.setNavigationBarTitle({ title: selecting ? (role === "sender" ? "选择寄件地址" : "选择收件地址") : "地址管理" });
        this.refresh();
        instance.unsubscribe = (0, local_database_1.subscribeDB)(() => this.refresh());
    },
    onUnload() {
        var _a;
        (_a = instance.unsubscribe) === null || _a === void 0 ? void 0 : _a.call(instance);
    },
    refresh() {
        this.setData({ addresses: address_1.addressService.list() });
    },
    onAdd() {
        const role = this.data.selecting ? `&role=${this.data.role}` : "";
        wx.navigateTo({ url: `/packages/delivery/pages/address-edit/index?from=addresses${role}` });
    },
    onChoose(e) {
        if (!this.data.selecting)
            return;
        const address = this.data.addresses.find((a) => a.id === e.currentTarget.dataset.id);
        if (!address)
            return;
        this.getOpenerEventChannel().emit("addressSelected", { role: this.data.role, address });
        wx.navigateBack();
    },
    onEdit(e) {
        const id = e.currentTarget.dataset.id;
        wx.navigateTo({ url: `/packages/delivery/pages/address-edit/index?id=${id}&from=addresses` });
    },
    onCardTap(e) {
        if (this.data.selecting)
            this.onChoose(e);
        else
            this.onEdit(e);
    },
    onSetDefaultSender(e) {
        const id = e.currentTarget.dataset.id;
        const a = this.data.addresses.find((x) => x.id === id);
        if (!a)
            return;
        address_1.addressService.save(Object.assign(Object.assign({}, a), { isDefaultSender: !a.isDefaultSender }));
    },
    onSetDefaultReceiver(e) {
        const id = e.currentTarget.dataset.id;
        const a = this.data.addresses.find((x) => x.id === id);
        if (!a)
            return;
        address_1.addressService.save(Object.assign(Object.assign({}, a), { isDefaultReceiver: !a.isDefaultReceiver }));
    },
}));
