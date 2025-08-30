//StatisticTestSummary.js
// 2022-01-13
// 統計檢定總覽


export class StatisticTestSummary
{

    constructor(json,DOM, stCname){
        // console.log({json : json})
        this.json = json;
        this.DOM = DOM;
    }

     //  統計檢定總覽
     genFittedTb = () => {
        let td = "", tr = "";
        for (let i = 0; i < this.json.length; i++) {
            let dist = this.json[i];
            td = "<td>" + dist.probDist + "</td>";
            let ks = this.json[i].KSTest_Results;
            if (ks.fitted)
                td += "<td class='w3-text-green'>通過</td>";
            else
                td += "<td class='w3-text-red'>未通過</td>";
            let c2 = this.json[i].ChiTest_Results;
            if (c2.fitted)
                td += "<td class='w3-text-green'>通過</td>";
            else
                td += "<td class='w3-text-red'>未通過</td>";
            td += "<td>" + dist.SEE.toFixed(2) + "</td>";
            tr += "<tr>" + td + "</tr>";
        }
        return tr;
    }

    genHTML(tr){
        let html = `
        <div class="row">
            <div class="col-12">
                <p class="w3-xlarge w3-center">
                    <span>${this.stCName}</span>
                    統計檢定總覽表
                    <span>(${this.duration}分鐘)</span>
                </p>
            </div>
            <div class="col-12">
                <div class="table-responsive">
                    <table class="table table-bordered table-striped table-condensed">
                        <thead>
                            <tr class="w3-blue-gray">
                                <tb>
                                    <td>機率分布</td>
                                    <td>KS檢定</td>
                                    <td>卡方檢定</td>
                                    <td>SSE值</td>
                                </tb>
                            </tr>
                        </thead>
                        <tbody>${tr}</tbody>
                    </table>
                    註 : (1)KS檢定及卡方檢定均以95%信賴度(confidence level)。(2)SSE值越低表示估計值與觀測值越接近。
                </div>
            </div>
        </div>
        `
        return html;
    }

    render(){
        this.stCName = $("#stid-select :selected").text();
        this.duration = $("#duration-select :selected").text();
        let tr = this.genFittedTb();
        let html = this.genHTML(tr);
        document.getElementById(this.DOM).innerHTML = html;
    }
}