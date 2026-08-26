import { RuntimeLoadingBuffer } from "@/components/h5/RuntimeLoadingBuffer";

export default function Loading() {
  return <RuntimeLoadingBuffer label="正在准备当前页面" reason="route-data"/>;
}
