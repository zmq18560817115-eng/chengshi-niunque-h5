import { RuntimeLoadingBuffer } from "@/components/h5/RuntimeLoadingBuffer";

export default function ReportsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <>
    {children}
    <div id="h5-category-route-loading-host" aria-hidden="true">
      <RuntimeLoadingBuffer persistent label="正在打开档案分类" reason="category-route-persistent" />
    </div>
  </>;
}
