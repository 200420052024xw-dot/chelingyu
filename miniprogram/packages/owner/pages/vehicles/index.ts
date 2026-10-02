import { withPagePerformance } from "../../../../utils/page-performance";
import type { Vehicle, VehicleAvailabilityRule, VehicleModel } from "../../../../contracts/types";
import { ownerService } from "../../../../services/owner";
import { repo } from "../../../../repositories/index";
import { subscribeDB } from "../../../../repositories/local-database";
import { formatTimeRanges, formatVolume } from "../../../../view-models/cargo";
import { formatDistance } from "../../../../adapters/geo";
import { isSharedMode, sharedFleet, sharedPricing, sharedVehicleApplications, type VehicleApplicationView } from "../../../../services/remote";

interface PageData {
  vehicles: Array<Vehicle & { model: VehicleModel | undefined; rule: VehicleAvailabilityRule | undefined }>;
  applications: VehicleApplicationView[];
  formOpen: boolean; modelOptions: VehicleModel[]; areaOptions: Array<{id:string;name:string}>;
  vehicleNo: string; modelId: string; areaId: string; modelName: string; areaName: string; imagePath: string; submitting: boolean;
}

interface PageInstance {
  unsubscribe?: () => void;
}

const instance: PageInstance = {};

Page<PageData, any>(withPagePerformance<PageData, any>("packages/owner/pages/vehicles/index", {
  data: {
    vehicles: [], applications: [], formOpen: false, modelOptions: [], areaOptions: [], vehicleNo: "", modelId: "", areaId: "", modelName: "", areaName: "", imagePath: "", submitting: false,
  },

  onLoad() {
    this.refresh();
    if (!isSharedMode()) instance.unsubscribe = subscribeDB(() => this.refresh());
  },

  onShow() { if (isSharedMode()) this.refresh(); },

  onUnload() {
    instance.unsubscribe?.();
  },

  async refresh() {
    if (isSharedMode()) {
      try {
        const [items,applications] = await Promise.all([sharedFleet.ownerVehicles(),sharedVehicleApplications.list()]);
        this.setData({ vehicles: items.map(item => ({ ...item.vehicle, model: item.model, rule: item.rule })), applications });
      } catch (error: any) { wx.showToast({ title: error?.message || "车辆加载失败", icon: "none" }); }
      return;
    }
    const list = ownerService.listVehicles().map((v) => ({
      ...v,
      model: repo.getVehicleModel(v.modelId),
      rule: repo.getAvailabilityRule(v.id),
    }));
    this.setData({ vehicles: list });
  },

  onOpenDetail(e: any) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/packages/owner/pages/vehicle-detail/index?id=${id}` });
  },

  onBindNew() {
    if (isSharedMode()) { this.setData({ formOpen: true }); void this.loadFormOptions(); return; }
    wx.navigateTo({ url: "/packages/owner/pages/bind/index" });
  },
  async loadFormOptions() {
    try { const [models,regions]=await Promise.all([sharedPricing.syncModels(),sharedFleet.regions()]); this.setData({modelOptions:models,areaOptions:regions.areas,modelId:this.data.modelId||models[0]?.id||"",areaId:this.data.areaId||regions.areas[0]?.id||"",modelName:models.find(m=>m.id===this.data.modelId)?.name||models[0]?.name||"",areaName:regions.areas.find(a=>a.id===this.data.areaId)?.name||regions.areas[0]?.name||""}); }
    catch(error:any){wx.showToast({title:error?.message||"资料加载失败",icon:"none"});}
  },
  onCloseForm() { this.setData({formOpen:false}); },
  onVehicleNo(e:any) { this.setData({vehicleNo:e.detail.value}); },
  onModelPick(e:any) { const model=this.data.modelOptions[Number(e.detail.value)];this.setData({modelId:model?.id||"",modelName:model?.name||""}); },
  onAreaPick(e:any) { const area=this.data.areaOptions[Number(e.detail.value)];this.setData({areaId:area?.id||"",areaName:area?.name||""}); },
  onChoosePhoto() { wx.chooseImage({count:1,sizeType:["compressed"],success:r=>this.setData({imagePath:r.tempFilePaths[0]})}); },
  async onSubmitApplication() {
    if(this.data.submitting)return;
    if(!this.data.vehicleNo.trim()||!this.data.modelId||!this.data.areaId||!this.data.imagePath){wx.showToast({title:"请填写资料并上传车辆照片",icon:"none"});return;}
    this.setData({submitting:true});
    try {
      const imageBase64=await new Promise<string>((resolve,reject)=>wx.getFileSystemManager().readFile({filePath:this.data.imagePath,encoding:"base64",success:r=>resolve(String(r.data)),fail:reject}));
      await sharedVehicleApplications.submit({vehicleNo:this.data.vehicleNo,modelId:this.data.modelId,areaId:this.data.areaId,imageBase64});
      this.setData({formOpen:false,vehicleNo:"",imagePath:""});await this.refresh();wx.showToast({title:"已提交区级审核",icon:"success"});
    } catch(error:any){wx.showToast({title:error?.message||"提交失败",icon:"none"});}
    finally {this.setData({submitting:false});}
  },

  formatTimeRanges(r?: VehicleAvailabilityRule) {
    return formatTimeRanges(r?.ranges);
  },

  formatVolume(v: number) {
    return formatVolume(v);
  },

  formatDistance(m?: number) {
    return m !== undefined ? formatDistance(m) : "—";
  },
}));
