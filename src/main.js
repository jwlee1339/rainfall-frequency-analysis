// main.js for Frequency Analysys
// 2025-08-28

"use strict";

import { ReadRainData, parseCSV } from "./ReadRainData.js";
import { UIManager } from "./ui.js";
import { FrequencyAnalysis } from "./Frequency/FrequencyAnalysis.js";
import { ChiSquareTest } from "./Frequency/ChiSquareTest.js";
import { KSTest } from "./Frequency/KSTest.js";
import { getDurationRain } from "./statistics.js";

// Global variables
// 原始資料csv解析後
let data;
// 雨量站編號, ex. "466490"
let staNo;

function testFrequencyAnalysis(array, returnPeriod) {
    // 檢查輸入資料
    if (array === undefined || array.length === 0) {
        console.error("輸入資料為空!");
        return;
    }

    const fa = new FrequencyAnalysis();
    // const sampleData = [120, 150, 135, 160, 180, 145, 170, 190, 130, 210, 175, 165];
    // const returnPeriod = 100;
    const distribution = fa.DistributionType.LogPearsonType3;

    const result = fa.freq(distribution, array, returnPeriod);
    console.log(result);
    // 輸出: { Kt: 2.83..., Qest: 249.5... } (數值為近似值)

    // --- 對數皮爾遜第三型範例 ---
    const logDistribution = fa.DistributionType.LogPearsonType3;
    try {
        const result = fa.freq(logDistribution, array, returnPeriod);
        console.log(`\n分佈: ${fa.menuDr[logDistribution - 1]}`);
        console.log(`重現期 T = ${returnPeriod} 年`);
        console.log(`頻率因子 Kt = ${result.Kt.toFixed(4)}`);
        console.log(`推估值 Qest = ${result.Qest.toFixed(4)}`);
    } catch (e) {
        console.error(e.message);
    }
}

// 測試ChiSquareTest
function testChiSquareTest(sampleData = [], confidenceIndex = 2) {
    // 檢查輸入資料
    if (sampleData === undefined || sampleData.length === 0) {
        console.error("輸入資料為空!");
        return;
    }
    if (confidenceIndex < 0 || confidenceIndex > 4) {
        console.error("信賴區間範圍錯誤!");
        return;
    }

    // Create an instance of ChiSquareTest
    const chiTest = new ChiSquareTest();

    // Sample data (e.g., annual maximum streamflow)
    // const sampleData = [120, 150, 135, 160, 180, 145, 170, 190, 130, 210, 175, 165, 195, 220, 140];

    // Test against Log-Pearson Type III distribution at 95% confidence level (index 2)
    const distType = chiTest.DistributionType.LogPearsonType3;
    // const confidenceIndex = 2; // 95%

    const results = chiTest.chi2Test(distType, sampleData, confidenceIndex);
    console.log(results);
    const intervalCount = 1 + Math.round(3.3 * Math.log10(sampleData.length));

    // console.log(chiTest.getResultsAsString(results, distType, intervalCount));
    return results;
}

// 測試KSTest
function testKSTest(sampleData = [], confidenceIndex = 2) {
    // 檢查輸入資料
    if (sampleData === undefined || sampleData.length === 0) {
        console.error("輸入資料為空!");
        return;
    }
    if (confidenceIndex < 0 || confidenceIndex > 4) {
        console.error("信賴區間範圍錯誤!");
        return;
    }
    try {
        // Initialize KS Test for 95% confidence level (index 2)
        const ksTest = new KSTest(confidenceIndex);

        // Test against Log-Pearson Type III distribution
        const distType = ksTest.DistributionType.LogPearsonType3;

        const results = ksTest.runTest(distType, sampleData);

        console.log("Kolmogorov-Smirnov Test Results");
        console.log("===============================");
        console.log(`Goodness of fit: ${results.fitted}`);
        console.log(`Critical Value (Ca): ${results.Ca.toFixed(4)}`);
        console.log("\nData Points:");
        console.log("Observed | Lower Bound | Upper Bound | Estimated | Mark");
        console.log("----------------------------------------------------------");

        for (let i = 0; i < results.obs.length; i++) {
            const obs = results.obs[i].toFixed(2).padStart(8);
            const low = results.lowerBound[i] ? results.lowerBound[i].toFixed(2).padStart(11) : '      -    ';
            const high = results.upperBound[i] ? results.upperBound[i].toFixed(2).padStart(11) : '      -    ';
            const est = results.est[i].toFixed(2).padStart(9);
            const mark = results.mark[i].padStart(4);
            console.log(`${obs} | ${low} | ${high} | ${est} | ${mark}`);
        }
        return results;
    } catch (e) {
        console.error("An error occurred:", e.message);
        return null;
    }
}




// 測試ChiSquareTest and KSTest
function Tests() {
    // 取得60分鐘資料
    let rain60 = getDurationRain(data, 60);
    // 測試ChiSquareTest
    let chisquare_results = testChiSquareTest(rain60, 2);
    console.log("CHISQUARE:", chisquare_results.fitted);
    // 測試KSTest
    let ks_results = testKSTest(rain60, 2);
    console.log("KSTEST:", ks_results.fitted);

    // populateKSTestTable(ks_results);
}


// 檔案: src/main.js

// 等待整個 HTML 文件載入並解析完成
document.addEventListener('DOMContentLoaded', () => {
    // 根據我們在 HTML 中設定的 id 找到該元素
    const toggleLink = document.getElementById('toggleKSTableLink');

    // 確認元素存在後，才為其添加事件監聽器
    if (toggleLink) {
        toggleLink.addEventListener('click', () => {
            // Bootstrap 的 data-toggle="collapse" 屬性已經自動處理了展開和收合的動作。
            // 我們不再需要呼叫舊的 KSTbShow_Click() 函式。

            // 如果 KSTbShow_Click() 函式中還有其他額外邏輯 (例如：切換圖示)，
            // 應該將這些邏輯移到這裡。
            console.log('KS 檢定結果表的詳細資料已被展開或收合。');

            // 範例：如果您想在點擊時切換一個圖示的 class (您 HTML 中有註解掉的圖示)

            const icon = document.getElementById('icon-KS-table');
            if (icon) {
                icon.classList.toggle('fa-angle-double-down');
                icon.classList.toggle('fa-angle-double-up');
            }

        });
    }
});

// --------------- Start Here ------------------

window.onload = async () => {
    
    // Add event listener for the "Process Data" button from the CSV input tab
    const processCsvBtn = document.getElementById('process-csv-btn');
    const csvStatusBadge = document.getElementById('csv-status-badge');
    const runAnalysisBtn = document.getElementById('run-analysis-btn');
    const csvInput = document.getElementById('csv-input');

    // Add event listener for when user types in the CSV input box
    if (csvInput) {
        csvInput.addEventListener('input', () => {
            // As soon as the user types, the previous validation is invalid.
            // Clear the status badge and disable the analysis button, forcing re-processing.
            if (csvStatusBadge) {
                csvStatusBadge.innerHTML = '';
            }
            if (runAnalysisBtn) {
                runAnalysisBtn.disabled = true;
            }
        });
    }

    if (processCsvBtn) {
        processCsvBtn.addEventListener('click', () => {
            if (csvStatusBadge) csvStatusBadge.innerHTML = ''; // Clear previous badge
            if (runAnalysisBtn) runAnalysisBtn.disabled = true; // Disable analysis button on each new attempt
            const csvString = csvInput.value;

            if (!csvString.trim()) {
                console.log('輸入框不可為空，請貼上有效的 CSV 資料。');
                if (csvStatusBadge) {
                    csvStatusBadge.innerHTML = '<span class="badge badge-danger ml-2">內容為空</span>';
                }
                return;
            }

            const newData = parseCSV(csvString);

            if (newData) {
                if (csvStatusBadge) {
                    csvStatusBadge.innerHTML = '<span class="badge badge-success ml-2">資料正確</span>';
                }
                data = newData; // Update the global data variable
                // 從第一筆紀錄取得雨量站 staNo 並存入全域變數
                if (data && data.length > 0 && data[0].staNo) {
                    staNo = data[0].staNo;
                    console.log(`已成功讀取並設定雨量站編號: ${staNo}`);
                } else {
                    staNo = 'N/A';
                    console.warn("警告: 無法從資料中找到 'staNo' 欄位。");
                }

                if (runAnalysisBtn) runAnalysisBtn.disabled = false; // Enable the analysis button
            } else {
                // parseCsvData already showed an alert with the specific error
                if (csvStatusBadge) {
                    csvStatusBadge.innerHTML = '<span class="badge badge-danger ml-2">資料錯誤</span>';
                }
            }
        });
    }

    // Add event listener for the "Run Analysis" button
    if (runAnalysisBtn) {
        runAnalysisBtn.addEventListener('click', () => {
            if (!data) {
                alert("請先成功處理一筆有效的 CSV 資料。");
                return;
            }

            const originalButtonText = runAnalysisBtn.innerHTML;
            runAnalysisBtn.disabled = true;
            runAnalysisBtn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> 分析中...`;

            // Use the 'shown.bs.tab' event to ensure the chart container is visible
            // and has dimensions before trying to plot.
            // .one() ensures the event handler runs only once for this click action.
            $('#rainfall-chart-tab').one('shown.bs.tab', function (e) {
                // Now that the tab is fully visible, we can safely initialize the chart.
                const errorAlert = document.getElementById('analysis-error-alert');
                if (errorAlert) {
                    errorAlert.style.display = 'none'; // Hide on new attempt
                }

                try {
                    UIManager.init(data); // Re-initialize the UI with the new data
                    UIManager.generateChiSquareTestTable();
                } catch (error) {
                    console.error("頻率分析時發生錯誤:", error);
                    if (errorAlert) {
                        errorAlert.innerHTML = `<strong>分析失敗：</strong> 執行頻率分析時發生錯誤。請確認資料格式是否正確，或查看主控台以獲取詳細技術資訊。<br><small>錯誤訊息: ${error.message}</small>`;
                        errorAlert.style.display = 'block';
                    } else {
                        // Fallback to alert if the element doesn't exist
                        alert("執行頻率分析時發生錯誤，請檢查主控台以獲取詳細資訊。");
                    }
                } finally {
                    // Restore the button to its original state after analysis
                    runAnalysisBtn.disabled = false;
                    runAnalysisBtn.innerHTML = originalButtonText;
                }
            });

            // After setting up the event listener, trigger the tab switch.
            // The code inside 'shown.bs.tab' will execute when the tab is ready.
            $('#rainfall-chart-tab').tab('show');
        });
    }

    // Add event listener for downloading the CSV template
    const downloadTemplateBtn = document.getElementById('download-template-btn');
    if (downloadTemplateBtn) {
        downloadTemplateBtn.addEventListener('click', () => {
            const templateContent = "year,staNo,60,120,180,240,300,360,420,480,540,600,720,960,1080\n" +
                "1956,00H710,140.0,238.6,291.1,336.7,386.1,389.7,395.8,406.1,436.1,437.2,443.7,443.7,443.7\n" +
                "1959,00H710,84.0,149.0,194.2,223.2,250.4,287.2,318.4,343.2,362.7,375.7,420.0,519.5,536.3\n" +
                "1960,00H710,98.3,186.0,264.2,329.6,398.5,463.9,487.6,518.7,537.5,548.9,565.4,590.0,605.4";

            const blob = new Blob([templateContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");

            // Create a URL for the blob and set it as the href for the link
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", "rainfall_template.csv");
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }

    // Add event listener for the "Clear" button
    const clearInputBtn = document.getElementById('clear-input-btn');
    if (clearInputBtn) {
        clearInputBtn.addEventListener('click', () => {
            if (csvInput) {
                csvInput.value = '';
                // Manually trigger the input event to reset the UI state (clear badge, disable analysis button)
                csvInput.dispatchEvent(new Event('input', { bubbles: true }));
            }
            // Also reset the file input field and its label
            const csvFileInput = document.getElementById('csv-file-input');
            if (csvFileInput) {
                csvFileInput.value = ''; // This clears the selected file
                const label = csvFileInput.nextElementSibling;
                if (label) {
                    label.textContent = '選擇檔案';
                }
            }
        });
    }

    // Add event listener for the file input
    const csvFileInput = document.getElementById('csv-file-input');
    if (csvFileInput) {
        csvFileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            const label = csvFileInput.nextElementSibling;

            if (!file) {
                if (label) label.textContent = '選擇檔案';
                return;
            }

            if (label) label.textContent = file.name;

            const reader = new FileReader();

            reader.onload = (e) => {
                const fileContent = e.target.result;
                if (csvInput) {
                    csvInput.value = fileContent;
                    // Manually trigger the input event to reset the UI state
                    // (clear badge, disable analysis button)
                    csvInput.dispatchEvent(new Event('input', { bubbles: true }));
                }
            };

            reader.onerror = (e) => {
                console.error("讀取檔案時發生錯誤:", e);
                alert("讀取檔案時發生錯誤。");
                if (label) label.textContent = '選擇檔案';
            };

            reader.readAsText(file, 'utf-8');
        });
    }

    // Add event listener to auto-focus on the textarea when the data input tab is shown
    $('a[data-toggle="tab"][href="#data-input"]').on('shown.bs.tab', function (e) {
        // Use a small timeout to ensure the element is focusable after the tab transition.
        setTimeout(() => $('#csv-input').focus(), 100);
    });

    // 自動切換所有摺疊區塊的箭頭圖示
    // 監聽 Bootstrap 的 'show' 事件 (當區塊開始展開時)
    $('.collapse').on('show.bs.collapse', function () {
        // 根據展開區塊的 id，找到對應的觸發連結 (<a>)
        const trigger = $(`a[data-toggle="collapse"][href="#${this.id}"]`);
        if (trigger.length) {
            // 在連結內找到圖示 <i>
            const icon = trigger.find('i.fa');
            // 將圖示從 '下' (fa-angle-down) 切換為 '上' (fa-angle-up)
            icon.removeClass('fa-angle-down').addClass('fa-angle-up');
        }
    });

    // 監聽 Bootstrap 的 'hide' 事件 (當區塊開始收合時)
    $('.collapse').on('hide.bs.collapse', function () {
        // 根據收合區塊的 id，找到對應的觸發連結 (<a>)
        const trigger = $(`a[data-toggle="collapse"][href="#${this.id}"]`);
        if (trigger.length) {
            // 在連結內找到圖示 <i>
            const icon = trigger.find('i.fa');
            // 將圖示從 '上' (fa-angle-up) 切換為 '下' (fa-angle-down)
            icon.removeClass('fa-angle-up').addClass('fa-angle-down');
        }
    });
};
