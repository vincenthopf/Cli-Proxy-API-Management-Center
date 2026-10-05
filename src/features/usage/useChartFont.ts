import { useEffect, type RefObject } from 'react';
import { echarts } from './echarts';

export function useChartFont(ref: RefObject<HTMLElement | null>, key: unknown) {
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const apply = () => {
      const fontFamily = getComputedStyle(document.body).fontFamily;
      root.querySelectorAll<HTMLElement>('[_echarts_instance_]').forEach((node) => {
        const chart = echarts.getInstanceByDom(node);
        chart?.setOption({ textStyle: { fontFamily } });
      });
    };
    apply();
    const timer = window.setTimeout(apply, 250);
    return () => window.clearTimeout(timer);
  }, [ref, key]);
}
