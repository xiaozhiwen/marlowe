function histogramUpdate(div, bucket) {

    var svg = div.select("svg");
    var counts = bucket.hist;
    var x = svg.node().xScale;
    var y = svg.node().yScale;
    var bars = svg.node().bars;

    x.domain([0, $data.yMax]);
    y.domain([0, Math.max($data.bucketMax, bucket.bucket_max)]);

    bars.domain([0, counts.length]);

    var yAxis = d3.svg.axis()
        .scale(y)
        .orient("left");
    svg.select("g.y.axis").transition().duration(250).call(yAxis);

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom");
    svg.select("g.x.axis")
        .call(xAxis);

    var bar = svg.select("g.bars").selectAll("rect").data(counts);
    bar.enter()
        .append("rect")
        .on("click", function(d, bucket) { 
	    $data.selectedBucket = bucket;
	    $data.dispatch.bucketSelect(bucket); 
	});
    bar
        .attr("width", bars(1))
        .attr("x", function(d, i) { return bars(i); })
        .transition().duration(250)
        .attr("y", function(d) {return y(d.count);})
        .attr("height", function(d) { 
	    return $data.height - y(d.count); 
	});
    bar.exit().remove();
    histogramUpdateLines(div, bucket);
    // Update the outliers text
    div.select("div.outliers")
	.text(Math.round(1000 * bucket.outliers.count / bucket.count)/10.0 + "% > "+ $data.yMax);
}

function histogramInit(div) {

    var svg = div.append("svg")
         .attr("id", "histogram")
         .attr("width", $data.width + $data.margin.left + $data.margin.right)
         .attr("height", $data.height + $data.margin.top + $data.margin.bottom);

    svg.append("g")
         .attr("transform", "translate(" + $data.margin.left + ","+ $data.margin.top + ")");

    var bars = d3.scale.linear().range([0, $data.width]);
    var y = d3.scale.linear().nice().range([$data.height, 0]);
    var x = d3.scale.linear().range([0,$data.width]);
    svg.node().bars = bars;
    svg.node().yScale = y;
    svg.node().xScale = x;

    var chart = svg.select("g");
    chart.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + $data.height + ")");

    chart.append("g")
        .attr("class", "y axis")
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .text("count");
    chart.append("g")
        .attr("class", "bars");
    chart.append("g")
        .attr("class", "plots");

    // These should be divs probably.
    var legend = chart.append("g").selectAll("g").data(["apdex_s", "apdex_t", "apdex_f"]).enter()
        .append("g").attr("transform", function(d,i) { 
            return "translate("+(i*120)+","+(30 + $data.margin.top + $data.height)+")" 
        });

    legend.append("text")
        .text(String);
    legend.append("line")
        .attr("y1", 10)
        .attr("y2", 10)
        .attr("x1", 0)
        .attr("x2", 90)
        .attr("stroke-width", 8)
        .attr("class", String);

    // outlier text box
    div.append("div")
	.attr("class", "outliers")
        .style("position", "relative")
        .style("width", "100px")
        .style("bottom", "80px")
        .style("left", $data.width + "px");

    $data.dispatch.on("plotSelect.histogram", function(name) {
	histogramUpdateLines(div);
    });

    $data.dispatch.on("timerangeSelect.histogram", function() {
	var col;
	if ($data.selectedTimeslice == -1)
	    col = $data.summaryTimeslice;
	else
	    col = $data.timeslices[$data.selectedTimeslice];
	histogramUpdate(div, col);
	d3.select("img.histogram.busy").style("display", "none");
    });

    $data.dispatch.on("newTimesliceData", function() {
	histogramUpdate(div, $data.summaryTimeslice);
	d3.select("img.histogram.busy").style("display", "none");
    });
};

function histogramUpdateLines(div) {

    var svg = div.select("svg");
    var x = svg.node().xScale;
    var bars = svg.node().bars;
    var dataset;
    if ($data.selectedTimeslice == -1)
	dataset = $data.summaryTimeslice;
    else
	dataset = $data.timeslices[$data.selectedTimeslice];

    // remove apdex and rpm since they aren't response times
    var plots = $data.displayedPlots.concat([]);
    var index = plots.indexOf("apdex");
    if (index >= 0) plots.splice(index, 1);    
    index = plots.indexOf("rpm");
    if (index >= 0) plots.splice(index, 1);

    var plots = svg.select("g.plots").selectAll("line").data(plots, String);

    plots
        .attr("y1", 0)
        .attr("y2", $data.height)
        .transition()
        .attr("x1", function(d) { return x(dataset[d]); })
        .attr("x2", function(d) { return x(dataset[d]); })
    
    plots.enter()
        .append("line")
        .attr("class", function(d) { return "series "+d;})
        .attr("x1", function(d) { return x(dataset[d]); })
        .attr("x2", function(d) { return x(dataset[d]); })
        .attr("y1", 0)
        .attr("y2", $data.height)
        .style("stroke-width", 20)
        .style("opacity", 1e-06)
        .transition().duration(500)
        .style("stroke-width", 4)
        .style("opacity", 1);

    plots.exit()
        .transition()
        .style("opacity", 1e-06)
        .remove();

    svg.select("g.bars").selectAll("rect")
        .attr("class", function(d, i) { 
            var value = x.invert(bars(i));
            if ($data.displayedPlots.indexOf("apdex") == -1 || value < $data.apdex_t) 
                return "bar apdex_s";
            else if (x.invert(bars(i)) >= 4 * $data.apdex_t)
                return "bar apdex_f";
            else 
                return "bar apdex_t";
        })

};

