let chart = null;
const dropzone = document.getElementById("dropzone");

// Drag & Drop
dropzone.addEventListener("dragover", e => { e.preventDefault(); dropzone.classList.add("dragover"); });
dropzone.addEventListener("dragleave", e => dropzone.classList.remove("dragover"));
dropzone.addEventListener("drop", e => { e.preventDefault(); dropzone.classList.remove("dragover"); handleDrop(e.dataTransfer.files[0]); });

// Handle file drop
function handleDrop(file) {
    const formData = new FormData();
    formData.append("file", file);
    fetch("/upload", { method: "POST", body: formData }).then(() => loadChartData());
}

// Load sales data from server
async function loadChartData() {
    const res = await fetch("/api/sales");
    const data = await res.json();
    renderChart(processData(data));
}

// Process data into leaderboard format
function processData(rows) {
    const grouped = {};
    rows.forEach(r => {
        if(!grouped[r.salesperson]) grouped[r.salesperson] = [];
        grouped[r.salesperson].push(`${r.customer} (${r.vehicle})`);
    });
    const result = Object.keys(grouped).map(name => ({ name, total: grouped[name].length, sales: grouped[name] }));
    result.sort((a,b) => b.total - a.total);
    return result;
}

// Color by rank
function getColor(idx) {
    if(idx < 3) return '#22c55e';
    if(idx < 6) return '#f97316';
    return '#ef4444';
}

// Render Highcharts stacked blocks
function renderChart(data) {
    const maxSales = Math.max(...data.map(d=>d.total));
    const series = [];
    for(let i=0;i<maxSales;i++){
        series.push({ name:`Sale ${i+1}`, data:data.map((d,idx)=>i<d.total?{y:1,color:getColor(idx),meta:d.sales}:0) });
    }
    if(chart) chart.destroy();
    chart = Highcharts.chart('chart', {
        chart:{ type:'column', backgroundColor:'#050505', height:500 },
        title:{ text:null },
        xAxis:{
            categories: data.map(d=>d.name),
            labels:{ useHTML:true, formatter:function(){ const idx=this.pos; return `<div style="line-height:14px;"><strong style="color:#fff;">${data[idx].total}</strong><br/><span style="color:#aaa;">${data[idx].name}</span></div>`; } },
            tickLength:0
        },
        yAxis:{ title:{text:'Sales'}, gridLineColor:'#111', labels:{ style:{color:'#666'} } },
        plotOptions:{ column:{ stacking:'normal', borderWidth:0 } },
        tooltip:{ useHTML:true, formatter:function(){ const meta=this.point.meta||[]; return `<b>${this.category}</b><br/>Sales: ${this.y}<br/><br/>${meta.join('<br/>')}`; } },
        series: series
    });
}

// Initial load from FTP
loadChartData();