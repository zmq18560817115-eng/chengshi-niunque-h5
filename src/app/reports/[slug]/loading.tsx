import { DeferredRuntimeLoadingBuffer } from "@/components/h5/RuntimeLoadingBuffer";

export default function CategoryLoading() {
  return <DeferredRuntimeLoadingBuffer label="正在打开档案分类" reason="category-route" />;
}
