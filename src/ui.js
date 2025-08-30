// ui.js - Manages all DOM interactions and UI updates.

"use strict";

import { DrawRainIntensity } from "./DrawRainIntensity.js";
import { getDurations, getDurationRain, calculateStatistics } from "./statistics.js";
import { FrequencyAnalysis } from "./Frequency/FrequencyAnalysis.js";
import { FindReturnPeriod } from "./FindReturnPeriod.js";
import { KSTest } from "./Frequency/KSTest.js";
import { DrawKSChart } from './DrawKSChart.js';
import { ChiSquareTest } from "./Frequency/ChiSquareTest.js";

/** @const {number[]} - 用於頻率分析和重現期計算的預設重現期陣列。 */
const DEFAULT_RETURN_PERIODS = [1.11, 2, 5, 10, 20, 25, 50, 100, 200, 500];

let TrendLineCheck = true;
let drawRainIntensity;

/**
 * UIManager: 集中管理所有與 DOM 相關的操作
 */
export class UIManager {
    static data = null;
    // 雨量站編號
    static staNo = "NoName";
    /** @property {Object.<string, JQuery>} - 集中管理的 jQuery DOM 元素物件。 */
    static elements = {
        durationSelect: $("#duration-select"),
        freqDurationLabel: $(".Freq-Duration"),
        trendLineCheckbox: $("#checkTrendLine"),
        mainForm: $("#mainForm"),
        findReturnPeriodBtn: $("#FindReturnPeriod"),
        estimateValueInput: $("#EstimateValue"),
        dataTableHead: $("#dataTable thead"),
        dataTableBody: $("#dataTable tbody"),
        summaryTableHead: $("#summaryTable thead"),
        summaryTableBody: $("#summaryTable tbody"),
        annualMaxCollapse: $('#annualMaxRainfallTableContainer'),
        annualMaxCollapseIcon: $('a[href="#annualMaxRainfallTableContainer"] i'),
        exportSummaryBtn: $("#exportSummaryBtn"),
        exportChartBtn: $("#exportChartBtn"),
        stationNameLabel: $(".sta-Cname"),
        historicChart: "#historic-Chart",
    }

    /**
     * 初始化 UI 管理器。
     * @param {Array<Object>} data - 解析後的降雨資料陣列。
     */
    static init(data) {
        this.data = data;
        if (!data || data.length === 0) {
            console.error("無法載入或解析降雨資料。");
            this.elements.dataTableBody.html("<tr><td>無法載入資料</td></tr>");
            return;
        }
        // 從第一筆紀錄取得雨量站 staNo 並存入全域變數
        if (this.data[0] && this.data[0].staNo) {
            this.staNo = this.data[0].staNo;
        } else {
            this.staNo = 'N/A';
            console.warn("警告: 無法從資料中找到 'staNo' 欄位。");
        }
        this.elements.stationNameLabel.text(this.staNo);

        const allDurations = getDurations(this.data);

        this.setupReturnPeriodFinder();

        this.populateDurationSelect(allDurations);
        this.updateDataTable();
        this.updateSummaryTable();
        this.bindEventListeners();

        // 初始觸發，繪製第一張圖
        this.elements.durationSelect.trigger("change");
    }

    /**
     * 根據提供的延時陣列，填充延時下拉選單。
     * @param {number[]} durations - 包含所有可用延時（分鐘）的陣列。
     */
    static populateDurationSelect(durations) {
        this.elements.durationSelect.empty();
        durations.forEach(duration => {
            this.elements.durationSelect.append($('<option>', {
                value: duration,
                text: `${duration} 分鐘`
            }));
        });
    }

    /**
     * 更新年最大降雨量資料表。
     */
    static updateDataTable() {
        const [tableHead, tableBody] = this.generateTable();
        this.elements.dataTableHead.html(tableHead);
        this.elements.dataTableBody.html(tableBody);
    }

    /**
     * 更新統計總覽表。
     */
    static updateSummaryTable() {
        const [summaryTableHead, summaryTableBody] = this.generateSummaryTable();
        this.elements.summaryTableHead.html(summaryTableHead);
        this.elements.summaryTableBody.html(summaryTableBody);
    }

    /**
     * 根據目前選擇的延時，重新繪製歷線圖。
     */
    static redrawHistoricChart() {
        const duration = this.elements.durationSelect.val();
        const rain = getDurationRain(this.data, duration);
        const stats = calculateStatistics(rain);
        drawRainIntensity = new DrawRainIntensity(this.data, this.elements.historicChart);
        drawRainIntensity.plotHisto(duration, stats, TrendLineCheck);
    }

    /**
     * 根據解析後的降雨資料產生 HTML 表格的表頭和內容。
     * 橫軸為延時，縱軸為年份。
     * @returns {Array<string>} - 一個包含兩個 HTML 字串的陣列：[表頭的 <tr>, 表身的 <tr>s]。
     */
    static generateTable() {
        // 1. 檢查資料是否有效
        if (!this.data || this.data.length === 0) {
            return ["", "<tr><td>無資料可顯示</td></tr>"];
        }

        // 2. 取得所有延時欄位，用於建立表頭
        const durations = getDurations(this.data);

        // 3. 產生表頭 (thead) 的 HTML 字串
        let tableHead = '<tr><th>年份</th>';
        durations.forEach(dur => {
            tableHead += `<th>${dur}</th>`;
        });
        tableHead += '</tr>';

        // 4. 產生表身 (tbody) 的 HTML 字串
        let tableBody = '';
        // 遍歷每一年的資料
        this.data.forEach(row => {
            tableBody += '<tr>';
            tableBody += `<td>${row.year}</td>`; // 第一欄是年份
            // 遍歷所有延時，填入對應的降雨量，並格式化到小數點後一位
            durations.forEach(dur => {
                tableBody += `<td>${row[dur].toFixed(1)}</td>`;
            });
            tableBody += '</tr>';
        });

        return [tableHead, tableBody];
    }

    /**
     * 根據降雨資料製作各延時的統計總覽表。
     * @returns {Array<string>} - 一個包含兩個 HTML 字串的陣列：[表頭的 <tr>, 表身的 <tr>s]。
     */
    static generateSummaryTable() {
        // 1. 檢查資料是否有效
        if (!this.data || this.data.length === 0) {
            return ["", "<tr><td colspan='6'>無資料可顯示</td></tr>"];
        }

        // 2. 取得所有延時
        const durations = getDurations(this.data);

        // 3. 產生表頭 (thead) 的 HTML 字串
        const tableHead = `
        <tr>
            <th>延時 (min)</th>
            <th>資料個數</th>
            <th>平均值</th>
            <th>標準差</th>
            <th>cv</th>
            <th>cs</th>
            <th>最小值</th>
            <th>最大值</th>
        </tr>`;

        // 4. 產生表身 (tbody) 的 HTML 字串
        let tableBody = '';
        durations.forEach(duration => {
            const rain = getDurationRain(this.data, duration);
            // 計算統計參數
            const stats = calculateStatistics(rain);
            tableBody += `<tr><td>${duration}</td><td>${rain.length}</td>
        <td>${stats.mean.toFixed(2)}</td>
        <td>${stats.stdDev.toFixed(2)}</td>
        <td>${stats.cv.toFixed(3)}</td>
        <td>${stats.skewness.toFixed(3)}</td>
        <td>${stats.min.toFixed(3)}</td>
        <td>${stats.max.toFixed(3)}</td>
        </tr>`;
        });

        return [tableHead, tableBody];
    }

    /**
     * 針對指定延時，計算並將所有機率分布在不同重現期的推估降雨量，生成 HTML 表格並顯示在頁面上。
     * @param {number} duration - 降雨延時（分鐘）。
     */
    static generateRainfallTable(duration) {
        // 1. 取得指定延時的年最大降雨資料
        const rainData = getDurationRain(this.data, duration);
        if (!rainData || rainData.length === 0) {
            console.error(`無法取得延時 ${duration} 分鐘的資料。`);
            $('#Freq-Results-Table').html('<p class="text-danger text-center">無法產生頻率分析結果表，因為此延時無有效降雨資料。</p>');
            return;
        }

        // 2. 建立頻率分析實例
        const fa = new FrequencyAnalysis();

        // 3. 建立 HTML 表格字串
        let tableHtml = '<table class="table table-bordered table-striped table-sm">';

        // 建立表頭
        tableHtml += '<thead><tr><th>機率分布</th>';
        DEFAULT_RETURN_PERIODS.forEach(p => {
            tableHtml += `<th>${p}年</th>`;
        });
        tableHtml += '<th>估計值</th>';
        tableHtml += '</tr></thead>';

        // 建立表格內容
        tableHtml += '<tbody>';
        for (let distType = 1; distType <= fa.menuDr.length; distType++) {
            const distName = fa.menuDr[distType - 1];
            tableHtml += `<tr><td id="dist-name-${distType}">${distName}</td>`;

            for (const period of DEFAULT_RETURN_PERIODS) {
                try {
                    const result = fa.freq(distType, rainData, period);
                    tableHtml += `<td id="cell-${distType}-${period}">${result.Qest.toFixed(2)}</td>`;
                } catch (e) {
                    console.error(`計算錯誤: ${distName}, T=${period}年: ${e.message}`);
                    tableHtml += `<td id="cell-${distType}-${period}">N/A</td>`;
                }
            }
            tableHtml += `<td id="est-val-${distType}">-</td>`;
            tableHtml += '</tr>';
        }
        tableHtml += '</tbody></table>';

        // 4. 將表格插入到指定的 div 中
        $('#Freq-Results-Table').html(tableHtml);
    }
    /**
     * 產生並填入卡方檢定結果表
     */
    static generateChiSquareTestTable() {
        if (!this.data || this.data.length === 0) {
            console.warn("無法產生卡方檢定表：無有效降雨資料。");
            $("#chiSquareTable tbody").html(`<tr><td colspan="99" class="text-center">無有效降雨資料</td></tr>`);
            return;
        }

        const durations = getDurations(this.data);
        const $table = $("#chiSquareTable");
        const $thead = $table.find("thead");
        const $tbody = $table.find("tbody");

        // 1. 清除舊內容
        $thead.empty();
        $tbody.empty();

        // 2. 建立表頭
        let headerHtml = '<tr><th>機率分布</th>';
        durations.forEach(duration => {
            headerHtml += `<th>${duration}分鐘</th>`;
        });
        headerHtml += '</tr>';
        $thead.html(headerHtml);

        // 3. 實例化檢定類別
        const chi2Test = new ChiSquareTest();
        const numDistributions = 5; // 根據 getDistributionString 的數量
        let confidenceIndex = 2; // 95% 置信度

        // 4. 建立表格內容
        for (let distType = 1; distType <= numDistributions; distType++) {
            const distName = this.getDistributionString(distType);
            let rowHtml = `<tr><td>${distName}</td>`;

            durations.forEach(duration => {
                const rainData = getDurationRain(this.data, duration);

                if (!rainData || rainData.length === 0) {
                    rowHtml += `<td>-</td>`;
                    return; // forEach continue
                }

                const testResult = chi2Test.chi2Test(distType, rainData, confidenceIndex);
                // console.log(testResult)
                const cellContent = testResult.fitted ?
                    '<span class="text-success">通過</span>' :
                    '<span class="text-danger font-weight-bold">不通過</span>';
                rowHtml += `<td>${cellContent}</td>`;
            });

            rowHtml += '</tr>';
            $tbody.append(rowHtml);
        }
    }

    /**
     * 將 KS 檢定結果資料填入表格中
     * @param {Object} ksResults - KSTest.runTest() 的回傳結果物件。
     * 應包含: obs, prob, lowerBound, est, upperBound, mark 等陣列。
     */
    static populateKSTestTable(ksResults) {
        const $tbody = $('#KSTest-tbody');

        // 1. 清空舊資料
        $tbody.empty();

        // 2. 檢查是否有資料
        if (!ksResults || !ksResults.obs || ksResults.obs.length === 0) {
            const noDataRow = '<tr><td colspan="6" class="text-center">沒有可顯示的資料。</td></tr>';
            $tbody.append(noDataRow);
            return;
        }

        // 3. 迭代資料並建立表格列 (table rows)。
        // KSTest 回傳的是一個包含各個欄位陣列的物件，因此我們需要用索引來迭代。
        for (let i = 0; i < ksResults.obs.length; i++) {
            // 使用樣板字面值 (template literal) 建立 HTML，更易讀寫
            const rowHtml = `
                <tr>
                    <td>${ksResults.obs[i].toFixed(2)}</td>
                    <td>${ksResults.prob[i].toFixed(4)}</td>
                    <td>${isNaN(ksResults.lowerBound[i]) ? '-' : ksResults.lowerBound[i].toFixed(2)}</td>
                    <td>${isNaN(ksResults.est[i]) ? '-' : ksResults.est[i].toFixed(2)}</td>
                    <td>${isNaN(ksResults.upperBound[i]) ? '-' : ksResults.upperBound[i].toFixed(2)}</td>
                    <td class="${ksResults.mark[i] === 'G' ? 'text-success' : 'text-danger font-weight-bold'}">${ksResults.mark[i]}</td>
                </tr>
            `;
            $tbody.append(rowHtml);
        }
    }

    /**
     * 設定重現期查詢功能的事件監聽。
     */
    static setupReturnPeriodFinder() {
        $('#find-rp-button').on('click', () => {
            const rainfallValue = parseFloat($('#rainfall-value-input').val());
            if (isNaN(rainfallValue) || rainfallValue <= 0) {
                alert("請輸入一個有效的正降雨量值。");
                return;
            }

            const duration = parseInt($('#duration-select').val(), 10);
            const rainData = getDurationRain(this.data, duration);
            if (!rainData || rainData.length === 0) {
                alert("目前延時無有效資料，無法計算重現期。");
                return;
            }

            // 步驟 A: 為 FindReturnPeriod 準備所需的資料結構
            const fa = new FrequencyAnalysis();
            const globalFreqResults = [];

            for (let distType = 1; distType <= fa.menuDr.length; distType++) {
                const estmateResults = DEFAULT_RETURN_PERIODS.map(period => {
                    try {
                        return fa.freq(distType, rainData, period).Qest;
                    } catch (e) {
                        return Infinity; // 錯誤時給定一個不會干擾計算的值
                    }
                });
                globalFreqResults.push({ estmateResults });
            }

            // 步驟 B: 建立實例並計算重現期
            const rpFinder = new FindReturnPeriod(globalFreqResults);
            const rpResults = rpFinder.findRP(rainfallValue);

            // 步驟 C: 更新 UI 表格
            rpResults.forEach((result, index) => {
                const distType = index + 1;
                $(`#est-val-${distType}`).text(result);
            });
        });
    }

    static generateKSTestTable(distType) {
        // 1. 檢查資料是否有效
        if (!this.data || this.data.length === 0) {
            console.error("無法載入或解析降雨資料。");
            return;
        }
        const duration = this.elements.durationSelect.val();
        const rainData = getDurationRain(this.data, duration);
        if (!rainData || rainData.length === 0) {
            alert("目前延時無有效資料，無法計算重現期。");
            return;
        }
        // Initialize KS Test for 95% confidence level (index 2)
        const ksTest = new KSTest(2);

        distType = distType || ksTest.DistributionType.LogPearsonType3;
        let ks_results = ksTest.runTest(distType, rainData);
        // console.log(ks_results);
        this.populateKSTestTable(ks_results);
        // 回傳檢定結果
        return ks_results;
    }

    /**
     * 根據機率分布類型代碼獲取其名稱。
     * @param {number} distType - 機率分布的類型代碼 (1-based index from radio buttons).
     * @returns {string} - 機率分布的名稱。
     */
    static getDistributionString(distType) {
        // 這些名稱應該與 FrequencyAnalysis.js 中的 menuDr 一致
        const distributionNames = [
            "常態分布", // value: 1
            "對數常態分布", // value: 2
            "皮爾森第三類分布", // value: 3
            "對數皮爾森第三類分布", // value: 4
            "極端值第一類分布" // value: 5
        ];
        // distType is 1-based, array is 0-based
        if (distType >= 1 && distType <= distributionNames.length) {
            return distributionNames[distType - 1];
        }
        return "未知分布";
    }

    /**
     * 綁定所有 UI 元素的事件監聽器。
     */
    static bindEventListeners() {
        this.elements.durationSelect.on('change', () => {


            this.redrawHistoricChart();
            const duration = this.elements.durationSelect.val();
            this.generateRainfallTable(duration); // 當延時改變時，重新產生表格
            // 更新所有與延時相關的標題
            $('.Freq-Duration').text(`(延時: ${duration} 分鐘)`);

            // 3. 當延時改變時，清空輸入框和舊的估計值
            $('#rainfall-value-input').val('');
            $('td[id^="est-val-"]').text('');

            // 當延時改變時，也需要更新 KS 檢定表和圖表
            // 獲取當前選中的機率分布
            const currentDistType = parseInt(this.elements.mainForm.find('input[name="dist-type"]:checked').val(), 10);
            const ks_results = this.generateKSTestTable(currentDistType);

            // 更新圖表
            const chartDrawer = new DrawKSChart("#KSTest-Chart", "#Prob-Chart");
            chartDrawer.render(ks_results);

            // 更新圖表標題
            const distString = UIManager.getDistributionString(currentDistType);
            $(".KS-Chart-Title").html(`<strong>${distString} (95%)</strong>`);
        });

        this.elements.trendLineCheckbox.on('change', () => {
            TrendLineCheck = !TrendLineCheck;
            this.redrawHistoricChart();
        });

        this.elements.exportSummaryBtn.on("click", () => {
            const stationName = this.elements.stationNameLabel.first().text() || "station";
            const filename = `${stationName}_統計總覽.csv`;
            this.exportTableToCSV("#summaryTable", filename);
        });

        this.elements.exportChartBtn.on("click", () => {
            const canvas = $(this.elements.historicChart).find('canvas')[0];
            if (canvas) {
                const stationName = this.elements.stationNameLabel.first().text() || "station";
                const duration = this.elements.durationSelect.val();
                const filename = `${stationName}_${duration}min_變化圖.png`;

                const downloadLink = document.createElement('a');
                downloadLink.href = canvas.toDataURL('image/png');
                downloadLink.download = filename;
                document.body.appendChild(downloadLink);
                downloadLink.click();
                document.body.removeChild(downloadLink);
            } else {
                alert("找不到圖表可供下載。");
            }
        });

        this.elements.annualMaxCollapse.on('hide.bs.collapse', () => this.elements.annualMaxCollapseIcon.removeClass('fa-angle-up').addClass('fa-angle-down'));
        this.elements.annualMaxCollapse.on('show.bs.collapse', () => this.elements.annualMaxCollapseIcon.removeClass('fa-angle-down').addClass('fa-angle-up'));

        // 監聽機率分布選項 (radio buttons) 的變更事件
        this.elements.mainForm.on('change', 'input[name="dist-type"]', (e) => {
            // 從點擊的 radio button 獲取其 value，此即為機率分布的類型代碼
            const distType = parseInt(e.target.value, 10);

            // 使用新的機率分布類型，重新計算並更新 KS 檢定表
            // 確保 distType 是一個有效的數字
            if (!isNaN(distType)) {
                console.log(`使用者選擇了機率分布類型: ${distType}`);

                // 使用新的機率分布類型，重新計算並更新 KS 檢定表
                let ks_results = this.generateKSTestTable(distType);

                // 更新 KS Chart
                // 1. 實例化繪圖類別，傳入圖表容器的 ID
                const chartDrawer = new DrawKSChart("#KSTest-Chart", "#Prob-Chart");

                // 2. 呼叫 render 方法，傳入該次檢定的結果資料
                chartDrawer.render(ks_results);

                // 3. 更新圖表標題
                const distString = UIManager.getDistributionString(distType);
                $(".KS-Chart-Title").html(`<strong>${distString} (95%)</strong>`);
            }
        });

        this.elements.findReturnPeriodBtn.on('click', () => {
            let rt = new FindReturnPeriod(Global_FreqResults.results);
            let value = this.elements.estimateValueInput.val();
            rt.findRP(value);
        });
    }

    /**
     * 將 HTML 表格內容匯出成 CSV 檔案。
     * @param {string} tableSelector - 要匯出的表格的 jQuery 選擇器 (e.g., '#myTable')。
     * @param {string} filename - 匯出的 CSV 檔案名稱。
     */
    static exportTableToCSV(tableSelector, filename) {
        const csv = [];
        const rows = $(`${tableSelector} tr`);

        rows.each(function () {
            const row = [];
            const cols = $(this).find("td, th");

            cols.each(function () {
                // 清理文字，移除多餘的空白並處理引號
                let data = $(this).text().replace(/(\r\n|\n|\r)/gm, "").replace(/(\s\s)/gm, " ");
                data = data.replace(/"/g, '""'); // Escape double quotes
                row.push('"' + data + '"');
            });

            csv.push(row.join(","));
        });

        // 下載 CSV 檔案
        this.downloadCSV(csv.join("\n"), filename);
    }

    /**
     * 觸發 CSV 檔案下載。
     * @param {string} csv - CSV 格式的字串。
     * @param {string} filename - 下載的檔案名稱。
     */
    static downloadCSV(csv, filename) {
        // 新增 BOM (Byte Order Mark) 讓 Excel 正確識別 UTF-8 編碼
        const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
        const csvFile = new Blob([bom, csv], { type: "text/csv;charset=utf-8;" });

        const downloadLink = document.createElement("a");
        downloadLink.download = filename;
        downloadLink.href = window.URL.createObjectURL(csvFile);
        downloadLink.style.display = "none";
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    }
}
