import { JsonObject, JsonProperty, JsonSerializer } from 'typescript-json-serializer';
import { APPLYTYPE, ComponentName, FANMODE, GPUMODE, UpdateType } from './enum';
import { Backend } from './backend';
import { fanPosition } from './position';
import { DEFAULT_APP, PluginManager, RunningApps } from './pluginMain';

const SETTINGS_KEY = "PowerControl";
const serializer = new JsonSerializer();

@JsonObject()
export class AppSetting {
  @JsonProperty()
  overwrite?: boolean;
  @JsonProperty()
  smt?: boolean;
  @JsonProperty()
  cpuNum?: number;
  @JsonProperty()
  cpuboost?: boolean;
  @JsonProperty()
  tdp?:number;
  @JsonProperty()
  tdpEnable?:boolean
  @JsonProperty()
  gpuMode?:number
  @JsonProperty()
  gpuFreq?:number
  @JsonProperty()
  gpuAutoMaxFreq?:number
  @JsonProperty()
  gpuAutoMinFreq?:number
  @JsonProperty()
  gpuRangeMaxFreq?:number
  @JsonProperty()
  gpuRangeMinFreq?:number
  @JsonProperty()
  fanProfileName?:string;
  constructor(){
    this.overwrite=false;
    this.smt=false;
    this.cpuNum=Backend.data?.HasCpuMaxNum()?Backend.data?.getCpuMaxNum():4;
    this.cpuboost=false;
    this.tdpEnable=true;
    this.tdp=Backend.data?.HasTDPMax()?Backend.data?.getTDPMax()/2:15;
    this.gpuMode=GPUMODE.NOLIMIT;
    this.gpuFreq=Backend.data?.HasGPUFreqMax()?Backend.data.getGPUFreqMax():1600;
    this.gpuAutoMaxFreq=Backend.data?.HasGPUFreqMax()?Backend.data.getGPUFreqMax():1600;
    this.gpuAutoMinFreq=Backend.data?.HasGPUFreqMin()?Backend.data.getGPUFreqMin():200;
    this.gpuRangeMaxFreq=Backend.data?.HasGPUFreqMax()?Backend.data.getGPUFreqMax():1600;
    this.gpuRangeMinFreq=Backend.data?.HasGPUFreqMin()?Backend.data.getGPUFreqMin():200;
  }
  deepCopy(copyTarget:AppSetting){
    this.overwrite=copyTarget.overwrite;
    this.smt=copyTarget.smt;
    this.cpuNum=copyTarget.cpuNum;
    this.cpuboost=copyTarget.cpuboost;
    this.tdpEnable=copyTarget.tdpEnable;
    this.tdp=copyTarget.tdp;
    this.gpuMode=copyTarget.gpuMode;
    this.gpuFreq=copyTarget.gpuFreq;
    this.gpuAutoMaxFreq=copyTarget.gpuAutoMaxFreq;
    this.gpuAutoMinFreq=copyTarget.gpuAutoMinFreq;
    this.gpuRangeMaxFreq=copyTarget.gpuRangeMaxFreq;
    this.gpuRangeMinFreq=copyTarget.gpuAutoMinFreq;
  }
}

@JsonObject()
export class FanSetting{
  @JsonProperty()
  snapToGrid?:boolean = false;
  @JsonProperty()
  fanMode?:number = FANMODE.NOCONTROL
  @JsonProperty()
  fixSpeed?:number = 50;
  @JsonProperty()
  curvePoints?:fanPosition[] = []
  constructor(snapToGrid:boolean,fanMode:number,fixSpeed:number,curvePoints:fanPosition[]){
    this.snapToGrid=snapToGrid;
    this.fanMode=fanMode;
    this.fixSpeed=fixSpeed;
    this.curvePoints = curvePoints;
  }
}

@JsonObject()
export class Settings {
  private static _instance:Settings = new Settings();
  @JsonProperty()
  public enabled: boolean = true;
  @JsonProperty({ isDictionary: true, type: AppSetting })
  public perApp: { [appId: string]: AppSetting } = {};
  @JsonProperty({ isDictionary: true, type: FanSetting })
  public fanSettings: { [fanProfile: string]: FanSetting } = {};
  //??????????????????
  public static ensureEnable():boolean{
    return this._instance.enabled;
  }

  //??????????????????
  public static setEnable(enabled:boolean){
    if(this._instance.enabled != enabled){
      this._instance.enabled = enabled;
      Settings.saveSettingsToLocalStorage();
      if(enabled){
        Backend.applySettings(APPLYTYPE.SET_ALL);
        PluginManager.updateAllComponent(UpdateType.SHOW);
      }else{
        Backend.resetSettings();
        PluginManager.updateAllComponent(UpdateType.HIDE);
      }
      PluginManager.updateAllComponent(UpdateType.UPDATE);
    }
  }

  //????????????????????????
  public static ensureApp(): AppSetting {
    const appId = RunningApps.active(); 
    //??????????????????????????????????????????
    if (!(appId in this._instance.perApp)) {
      this._instance.perApp[appId]=new AppSetting();
      //?????????????????????????????????????????????????????????????????????
      if(DEFAULT_APP in this._instance.perApp)
        this._instance.perApp[appId].deepCopy(this._instance.perApp[DEFAULT_APP]);
    }
    //???????????????????????????????????????????????????
    if(!this._instance.perApp[appId].overwrite){
      return this._instance.perApp[DEFAULT_APP];
    }
    //??????appID????????????
    return this._instance.perApp[appId];
  }

  static ensureAppID():string{
    const appId = RunningApps.active();
    if (!(appId in this._instance.perApp)) {
      this._instance.perApp[appId]=new AppSetting();
      if(DEFAULT_APP in this._instance.perApp){
        this._instance.perApp[appId].deepCopy(this._instance.perApp[DEFAULT_APP]);
        return DEFAULT_APP;
      }
      return appId;
    }
    if(!this._instance.perApp[appId].overwrite){
      return DEFAULT_APP;
    }
    return appId;
  }

  static appOverWrite():boolean {
    if(RunningApps.active()==DEFAULT_APP){
      return false;
    }
    return Settings.ensureApp().overwrite!!;
  }
  static setOverWrite(overwrite:boolean){
    if(RunningApps.active()!=DEFAULT_APP&&Settings.appOverWrite()!=overwrite){
      Settings._instance.perApp[RunningApps.active()].overwrite=overwrite;
      Settings.saveSettingsToLocalStorage();
      Backend.applySettings(APPLYTYPE.SET_ALL);
      PluginManager.updateAllComponent(UpdateType.UPDATE);
    }
  }

  static appSmt(): boolean {
    return Settings.ensureApp().smt!!;
  }

  static setSmt(smt:boolean) {
    if(Settings.ensureApp().smt!=smt){
      Settings.ensureApp().smt=smt;
      Settings.saveSettingsToLocalStorage();
      Backend.applySettings(APPLYTYPE.SET_CPUCORE);
      PluginManager.updateComponent(ComponentName.CPU_SMT,UpdateType.UPDATE);
    }
  }
  
  static appCpuNum() {
    return Settings.ensureApp().cpuNum!!;
  }

  static setCpuNum(cpuNum:number) {
    if(Settings.ensureApp().cpuNum!=cpuNum){
      Settings.ensureApp().cpuNum=cpuNum;
      Settings.saveSettingsToLocalStorage();
      Backend.applySettings(APPLYTYPE.SET_CPUCORE);
      PluginManager.updateComponent(ComponentName.CPU_NUM,UpdateType.UPDATE);
    }
  }

  static appCpuboost(): boolean {
    return Settings.ensureApp().cpuboost!!;
  }

  static setCpuboost(cpuboost:boolean) {
    if(Settings.ensureApp().cpuboost!=cpuboost){
      Settings.ensureApp().cpuboost=cpuboost;
      Settings.saveSettingsToLocalStorage();
      Backend.applySettings(APPLYTYPE.SET_CPUBOOST);
      PluginManager.updateComponent(ComponentName.CPU_BOOST,UpdateType.UPDATE);
    }
  }

  static appTDP() {
    return Settings.ensureApp().tdp!!;
  }

  static setTDP(tdp:number) {
    if(Settings.ensureApp().tdp!=tdp){
      Settings.ensureApp().tdp=tdp;
      Settings.saveSettingsToLocalStorage();
      Backend.applySettings(APPLYTYPE.SET_TDP);
      PluginManager.updateComponent(ComponentName.CPU_TDP,UpdateType.UPDATE);
    }
  }

  static appTDPEnable(){
    return Settings.ensureApp().tdpEnable!!;
  }

  static setTDPEnable(tdpEnable:boolean) {
    if(Settings.ensureApp().tdpEnable!=tdpEnable){
      Settings.ensureApp().tdpEnable=tdpEnable;
      Settings.saveSettingsToLocalStorage();
      Backend.applySettings(APPLYTYPE.SET_TDP);
      PluginManager.updateComponent(ComponentName.CPU_TDP,UpdateType.UPDATE);
    }
  }

  static appGPUMode(){
    return Settings.ensureApp().gpuMode!!;
  }
  //??????gpu?????????????????????
  static setGPUMode(gpuMode:GPUMODE){
    if(Settings.ensureApp().gpuMode!=gpuMode){
      Settings.ensureApp().gpuMode=gpuMode;
      Settings.saveSettingsToLocalStorage();
      Backend.applySettings(APPLYTYPE.SET_GPUMODE);
      PluginManager.updateComponent(ComponentName.GPU_FREQMODE,UpdateType.UPDATE);
      
    }
  }

  static appGPUFreq(){
    return Settings.ensureApp().gpuFreq!!;
  }

  //??????gpu?????????????????????
  static setGPUFreq(gpuFreq:number){
    if(Settings.ensureApp().gpuFreq!=gpuFreq){
      Settings.ensureApp().gpuFreq=gpuFreq;
      Settings.saveSettingsToLocalStorage();
      Backend.applySettings(APPLYTYPE.SET_GPUMODE);
      PluginManager.updateComponent(ComponentName.GPU_FREQFIX,UpdateType.UPDATE);
    }
  }

  static appGPUAutoMaxFreq(){
    return Settings.ensureApp().gpuAutoMaxFreq!!;
  }

  //????????????gpu????????????
  static setGPUAutoMaxFreq(gpuAutoMaxFreq:number){
    if(Settings.ensureApp().gpuAutoMaxFreq!=gpuAutoMaxFreq){
      Settings.ensureApp().gpuAutoMaxFreq=gpuAutoMaxFreq;
      Settings.saveSettingsToLocalStorage();
      Backend.applySettings(APPLYTYPE.SET_GPUMODE);
      PluginManager.updateComponent(ComponentName.GPU_FREQRANGE,UpdateType.UPDATE);
    }
  }

  static appGPUAutoMinFreq(){
    return Settings.ensureApp().gpuAutoMinFreq!!;
  }

  //????????????gpu????????????
  static setGPUAutoMinFreq(gpuAutoMinFreq:number){
    if(Settings.ensureApp().gpuAutoMinFreq!=gpuAutoMinFreq){
      Settings.ensureApp().gpuAutoMinFreq=gpuAutoMinFreq;
      Settings.saveSettingsToLocalStorage();
      Backend.applySettings(APPLYTYPE.SET_GPUMODE);
      PluginManager.updateComponent(ComponentName.GPU_FREQRANGE,UpdateType.UPDATE);
    }
  }

  static appGPURangeMaxFreq(){
    return Settings.ensureApp().gpuRangeMaxFreq!!;
  }

  static appGPURangeMinFreq(){
    return Settings.ensureApp().gpuRangeMinFreq!!;
  }

  //??????gpu????????????
  static setGPURangeFreq(gpuRangeMaxFreq:number,gpuRangeMinFreq:number){
    if(Settings.ensureApp().gpuRangeMaxFreq!=gpuRangeMaxFreq||Settings.ensureApp().gpuRangeMinFreq!=gpuRangeMinFreq){
      Settings.ensureApp().gpuRangeMaxFreq=gpuRangeMaxFreq;
      Settings.ensureApp().gpuRangeMinFreq=gpuRangeMinFreq;
      Backend.applySettings(APPLYTYPE.SET_GPUMODE);
      Settings.saveSettingsToLocalStorage();
      PluginManager.updateComponent(ComponentName.GPU_FREQRANGE,UpdateType.UPDATE);
    }
  }

  //????????????????????????
  static setFanSettings(fanProfileName:string,fanSetting:FanSetting){
      this._instance.fanSettings[fanProfileName] = fanSetting;
  }

  private getPresetFanSetings(){
    const presetFanSettings={
      "??????":new FanSetting(true,FANMODE.FIX,30,[]),
      "??????":new FanSetting(true,FANMODE.CURVE,30,[new fanPosition(0,0),new fanPosition(100,100)]),
      "??????":new FanSetting(true,FANMODE.CURVE,30,[new fanPosition(0,0),new fanPosition(100,100)]),
    }
    return presetFanSettings;
  }

  static loadSettingsFromLocalStorage(){
    const settingsString = localStorage.getItem(SETTINGS_KEY) || "{}";
    const settingsJson = JSON.parse(settingsString);
    const loadSetting=serializer.deserializeObject(settingsJson, Settings);
    this._instance.enabled = loadSetting?loadSetting.enabled:false;
    this._instance.perApp = loadSetting?loadSetting.perApp:{};
    this._instance.fanSettings=loadSetting?.fanSettings ?loadSetting.fanSettings:{};
  }

  static saveSettingsToLocalStorage() {
    const settingsJson = serializer.serializeObject(this._instance);
    const settingsString = JSON.stringify(settingsJson);
    localStorage.setItem(SETTINGS_KEY, settingsString);
  }

}
