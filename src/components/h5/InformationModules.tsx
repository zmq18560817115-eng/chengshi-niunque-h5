import { ModuleDetail } from "./ModuleDetail";
const modules = [{name:"检测项目",color:"var(--color-green)"},{name:"复核保障",color:"var(--color-yellow)"},{name:"生产溯源",color:"var(--color-brown)"}];
export function InformationModules() { return <section data-component="InformationModules">{modules.map((item, index)=><div key={item.name} className="section" style={{ background:item.color, minHeight:index===2?"34rem":"12rem", paddingTop:"2rem" }}><h2 className="display" style={{fontSize:"1.8rem"}}>{item.name}</h2>{index===0 && <ModuleDetail />}</div>)}</section>; }
