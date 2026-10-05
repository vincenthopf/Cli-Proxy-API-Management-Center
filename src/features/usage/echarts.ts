import * as echarts from 'echarts/core';
import { BarChart } from 'echarts/charts';
import {
  AriaComponent,
  BrushComponent,
  GridComponent,
  ToolboxComponent,
  TooltipComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
  BarChart,
  GridComponent,
  TooltipComponent,
  BrushComponent,
  ToolboxComponent,
  AriaComponent,
  CanvasRenderer,
]);

export { echarts };
