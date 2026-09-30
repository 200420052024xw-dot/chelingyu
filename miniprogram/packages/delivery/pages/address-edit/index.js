"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const page_performance_1 = require("../../../../utils/page-performance");
const address_1 = require("../../../../services/address");
const index_1 = require("../../../../config/index");
const location_1 = require("../../../../adapters/location");
Page((0, page_performance_1.withPagePerformance)("packages/delivery/pages/address-edit/index", {
    data: {
        id: null,
        name: "",
        contactName: "测试用户",
        contactMobile: "138****0000",
        detail: "",
        label: "school",
        isDefaultSender: false,
        isDefaultReceiver: false,
        demoCenter: index_1.APP_CONFIG.demoCenter,
        location: index_1.APP_CONFIG.demoCenter,
        regionCode: "",
        hasRealLocation: false,
        loading: true,
        from: "addresses",
        locationChosen: false,
    },
    onLoad(query) {
        var _a;
        const id = (query === null || query === void 0 ? void 0 : query.id) || null;
        let a;
        if (id)
            a = address_1.addressService.list().find((x) => x.id === id);
        const from = (query === null || query === void 0 ? void 0 : query.from) || "addresses";
        if (a) {
            this.setData({
                id: a.id,
                name: a.name,
                contactName: a.contactName,
                contactMobile: a.contactMobile,
                detail: a.detail,
                label: (_a = a.label) !== null && _a !== void 0 ? _a : "other",
                isDefaultSender: a.isDefaultSender,
                isDefaultReceiver: a.isDefaultReceiver,
                demoCenter: a.location,
                location: a.location,
                regionCode: a.regionCode,
                hasRealLocation: true,
                locationChosen: true,
                loading: false,
                from,
            });
        }
        else {
            this.setData({ loading: false, from, locationChosen: false, hasRealLocation: false });
        }
    },
    onInput(e) {
        const field = e.currentTarget.dataset.field;
        this.setData({ [field]: e.detail.value });
    },
    onLabelChange(e) {
        this.setData({ label: e.currentTarget.dataset.label });
    },
    onChoosePlace() {
        wx.navigateTo({
            url: "/packages/delivery/pages/place-search/index",
            success: (res) => res.eventChannel.on("placeSelected", (place) => this.setData({
                name: place.name,
                detail: place.detail || place.name,
                location: place.point,
                regionCode: place.adcode || this.data.regionCode,
                demoCenter: place.point,
                hasRealLocation: true,
                locationChosen: true,
            })),
        });
    },
    onToggleSender() {
        this.setData({ isDefaultSender: !this.data.isDefaultSender });
    },
    onToggleReceiver() {
        this.setData({ isDefaultReceiver: !this.data.isDefaultReceiver });
    },
    async onPickCurrent() {
        try {
            const point = await location_1.locationAdapter.requestLocation();
            this.setData({
                demoCenter: point,
                location: point,
                hasRealLocation: true,
                locationChosen: true,
            });
        }
        catch (error) {
            console.warn("[address] wx.getLocation failed", error);
            wx.showToast({ title: "定位失败，请检查微信定位权限", icon: "none" });
        }
    },
    onMapRegionChange(e) {
        var _a;
        if ((e === null || e === void 0 ? void 0 : e.type) !== "end" && ((_a = e === null || e === void 0 ? void 0 : e.detail) === null || _a === void 0 ? void 0 : _a.type) !== "end")
            return;
        wx.createMapContext("edit-map", this).getCenterLocation({
            success: (point) => this.setData({ location: { latitude: point.latitude, longitude: point.longitude } }),
        });
    },
    onSave() {
        var _a;
        const { name, contactName, contactMobile, detail } = this.data;
        if (!name.trim() || !detail.trim()) {
            wx.showToast({ title: "请填写地址名称和详细地址", icon: "none" });
            return;
        }
        if (!contactName.trim()) {
            wx.showToast({ title: "请填写联系人", icon: "none" });
            return;
        }
        if (!this.data.locationChosen) {
            wx.showToast({ title: "请先搜索地点或在地图上选点", icon: "none" });
            return;
        }
        if (!/^\d{11}$|^\d{3}\*+\d{4}$/.test(contactMobile.trim())) {
            wx.showToast({ title: "联系电话格式不正确", icon: "none" });
            return;
        }
        address_1.addressService.save({
            id: (_a = this.data.id) !== null && _a !== void 0 ? _a : undefined,
            name: name.trim(),
            detail: detail.trim(),
            contactName: contactName.trim(),
            contactMobile: contactMobile.trim(),
            regionCode: this.data.regionCode,
            label: this.data.label,
            isDefaultSender: this.data.isDefaultSender,
            isDefaultReceiver: this.data.isDefaultReceiver,
            location: this.data.location,
        });
        wx.showToast({ title: "保存成功", icon: "success" });
        setTimeout(() => {
            wx.navigateBack({ delta: 1, success: () => { } });
        }, 600);
    },
    onDelete() {
        if (!this.data.id)
            return;
        wx.showModal({
            title: "删除地址",
            content: "确认删除该常用地址？",
            success: (res) => {
                if (res.confirm) {
                    address_1.addressService.remove(this.data.id);
                    wx.navigateBack();
                }
            },
        });
    },
}));
