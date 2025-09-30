import { initScatterChart } from './scatterChart.js';
import { initDonutChart } from './donutChart.js';
import { initBarChart } from './barChart.js';
import { initLineChart } from './lineChart.js';

// Store a reference to each chart's destroy method so we can clean listeners later.
const chartControllers = [];

// Kick off every chart once the DOM is ready so each module can take over its container.
const initCharts = () => {
  chartControllers.push(
    initScatterChart('#scatter-chart', 'data/Ex5_TV_energy.csv')
  );
  chartControllers.push(
    initDonutChart('#donut-chart', 'data/Ex5_TV_energy_Allsizes_byScreenType.csv')
  );
  chartControllers.push(
    initBarChart('#bar-chart', 'data/Ex5_TV_energy_55inchtv_byScreenType.csv')
  );
  chartControllers.push(
    initLineChart('#line-chart', 'data/Ex5_ARE_Spot_Prices.csv')
  );
};

document.addEventListener('DOMContentLoaded', initCharts);

window.addEventListener('beforeunload', () => {
  // Ensure resize observers and other listeners are removed before navigation.
  chartControllers.forEach((controller) => {
    if (controller && typeof controller.destroy === 'function') {
      controller.destroy();
    }
  });
});
