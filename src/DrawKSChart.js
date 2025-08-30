
// DrawKSChart.js

/**
 * A class to draw K-S Test and Probability plots using Flot.
 * This class is refactored for better separation of concerns, reusability, and clarity.
 */
export class DrawKSChart {
    /**
     * @param {string} ksChartSelector - The jQuery selector for the K-S test chart container.
     * @param {string} probChartSelector - The jQuery selector for the probability chart container.
     */
    constructor(ksChartSelector, probChartSelector) {
        this.ksChartSelector = ksChartSelector;
        this.probChartSelector = probChartSelector;

        // Base Flot chart options to avoid repetition.
        this.baseChartOptions = {
            grid: {
                hoverable: true,
                borderColor: '#ccc',
                borderWidth: 1
            },
            legend: {
                position: "nw",
                noColumns: 4,
                margin: [0, -22],
                show: true
            },
            tooltip: true,
            tooltipOpts: {
                content: "(%x.2, %y.2)"
            },
            yaxis: {
                position: "left"
            }
        };
    }

    /**
     * Renders both the K-S test chart and the probability chart.
     * @param {object} ksTestResults - The results object from the KSTest class.
     *                                 Should contain obs, est, lowerBound, upperBound, and prob arrays.
     */
    render(ksTestResults) {
        // If data is invalid or empty, clear the charts to prevent errors.
        if (!ksTestResults || !ksTestResults.obs || ksTestResults.obs.length === 0) {
            $.plot($(this.ksChartSelector), [], this.baseChartOptions);
            $.plot($(this.probChartSelector), [], this.baseChartOptions);
            return;
        }

        this._drawKSChart(ksTestResults);
        this._drawProbChart(ksTestResults);
    }

    /**
     * Draws the K-S chart (Estimated vs. Observed/Bounds).
     * @private
     * @param {object} ks - The K-S test results data.
     */
    _drawKSChart(ks) {
        const x_values = ks.est;
        const dataset = this._buildDataset(x_values, ks);
        const options = {
            ...this.baseChartOptions,
            xaxis: {
                axisLabel: "估計值"
            }
        };
        $.plot($(this.ksChartSelector), dataset, options);
    }

    /**
     * Draws the Probability chart (Probability vs. Observed/Bounds).
     * @private
     * @param {object} ks - The K-S test results data.
     */
    _drawProbChart(ks) {
        // X-axis is the non-exceedance probability
        const x_values = ks.prob.map(p => 1.0 - p);
        const dataset = this._buildDataset(x_values, ks);
        const options = {
            ...this.baseChartOptions,
            xaxis: {
                axisLabel: "機率(1-m/(N+1))"
            }
        };
        $.plot($(this.probChartSelector), dataset, options);
    }

    /**
     * Constructs the dataset array required by Flot.
     * @private
     * @param {number[]} x_values - The array of values for the x-axis.
     * @param {object} ks_data - The full K-S test results object.
     * @returns {Array<object>} The dataset for Flot.
     */
    _buildDataset(x_values, ks_data) {
        /**
         * Creates a data series (an array of [x, y] points) for a given key.
         * @param {string} y_key - The key for the y-values in the ks_data object (e.g., 'obs', 'est').
         * @returns {Array<[number, number|null]>}
         */
        const createSeriesData = (y_key) => {
            return x_values.map((x, i) => {
                const y = ks_data[y_key][i];
                // Filter out non-numeric or very small values to prevent plotting issues.
                return !isNaN(x) && !isNaN(y) && y > 0.1 ? [x, y] : [x, null];
            });
        };

        return [
            {
                label: "觀測",
                color: "#0033ff",
                data: createSeriesData('obs'),
                lines: { show: false },
                points: { show: true }
            },
            {
                label: "下限",
                color: "#ffeb3b",
                data: createSeriesData('lowerBound'),
                lines: { show: true }
            },
            {
                label: "估計值",
                color: "#ff9800",
                data: createSeriesData('est'),
                lines: { show: true, lineWidth: 2 }
            },
            {
                label: "上限",
                color: "#f44336",
                data: createSeriesData('upperBound'),
                lines: { show: true }
            }
        ];
    }
}