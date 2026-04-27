let chart = null;
const dropzone = document.getElementById("dropzone");

// ------------------------
// Drag & Drop
// ------------------------
dropzone.addEventListener("dragover", e => { 
    e.preventDefault(); 
    dropzone.classList.add("dragover"); 
});
dropzone.addEventListener("dragleave", e => dropzone.classList.remove("dragover"));
dropzone.addEventListener("drop", e => { 
    e.preventDefault(); 
    dropzone.classList.remove("dragover"); 
    handleDrop(e.dataTransfer.files[0]); 
});

function handleDrop(file) {
    const formData = new FormData();
    formData.append("file", file);
    fetch("/upload", { method: "POST", body: formData })
        .then(() => loadChartData());
}

// ------------------------
// Load chart data
// ------------------------
async function loadChartData() {
    const res = await fetch("/api/sales");
    const data = await res.json();
    renderChart(processData(data));
}

// ------------------------
// Process CSV/JSON
// ------------------------
function processData(rows){
    const grouped = {};
    rows.forEach(r => {
        if(!grouped[r.salesperson]) grouped[r.salesperson]=[];
        grouped[r.salesperson].push(`${r.customer} (${r.vehicle})`);
    });
    const result = Object.keys(grouped).map(name=>({
        name,
        total: grouped[name].length,
        sales: grouped[name]
    }));
    result.sort((a,b)=>b.total - a.total);
    return result;
}

// ------------------------
// Rank colors
// ------------------------
function getColor(idx){
    if(idx<3) return "#22c55e";
    if(idx<6) return "#f97316";
    return "#ef4444";
}

// ------------------------
// Render Highcharts with labels on blocks
// ------------------------
function renderChart(data){
    const maxSales = Math.max(...data.map(d=>d.total));
    const series = [];

    for(let i=0;i<maxSales;i++){
        series.push({
            name: `Sale ${i+1}`,
            data: data.map((d, idx) => {
                if(i < d.total){
                    return {
                        y: 1,
                        color: getColor(idx),
                        dataLabels: {
                            enabled: true,
                            inside: true,
                            align: 'center',
                            verticalAlign: 'middle',
                            formatter: function(){
                                return d.sales[i]; // show customer + vehicle
                            },
                            style: {
                                color: '#fff',
                                fontSize: '10px'
                            }
                        }
                    };
                }
                return 0;
            })
        });
    }

    if(chart) chart.destroy();

    const pointWidth = Math.floor((document.getElementById("chart").offsetWidth / data.length) * 0.8);

    chart = Highcharts.chart('chart',{
        chart: {
            type:'column',
            backgroundColor:'#111',
            height:null,
            width:null,
            spacing:[20,10,40,10]
        },
        title: { text:null },
        xAxis: {
            categories: data.map(d => d.name),
            labels: {
                useHTML: true,
                style: { fontSize:'12px', color:'#ccc', whiteSpace:'normal' },
                formatter: function(){
                    const idx = this.pos;
                    const name = data[idx].name;
                    const total = data[idx].total;
                    const parts = name.split(" ");
                    const displayName = parts.join("<br>");
                    return `<div style="line-height:14px;"><strong style="color:#fff;">${total}</strong><br>${displayName}</div>`;
                }
            },
            tickLength: 0
        },
        yAxis: {
            title: { text:'Sales' },
            max: maxSales,
            allowDecimals: false,
            gridLineColor:'#222',
            labels: { style:{ color:'#888' } }
        },
        plotOptions: {
            column: {
                stacking:'normal',
                borderWidth:0,
                pointWidth: pointWidth
            }
        },
        tooltip: {
            useHTML:true,
            formatter:function(){
                const meta = this.point.meta||[];
                return `<b>${this.category}</b><br/>Sales: ${this.y}<br/><br/>${meta.join('<br/>')}`;
            }
        },
        series: series
    });
}

// ------------------------
// Initial load
// ------------------------
loadChartData();

// ------------------------
// Resize reactive
// ------------------------
window.addEventListener("resize", () => { 
    loadChartData(); // recalc bar width on resize
});