
async function loadData(callback) {
    let sensorRanges = {}
    results = []
    counter = 0
    type = 'Ambient';
    let promises = []
    promises.push(readEnoseFile("TESTOct7-TR-093022080139", sensorRanges));
    promises.push(readEnoseFile("Oct25-TR-102522112136", sensorRanges));
    promises.push(readEnoseFile("Oct27-TR-102722094451", sensorRanges));
    myDataPromises = Promise.all(promises)
    myDataPromises.then(function (data) {
        callback(data.flat(), sensorRanges);
    });
}
async function readEnoseFile(file, sensorRange) {
    // Read metadata
    let clsFile = await d3.text('data/' + file + '.met')
    clsFile = clsFile.split('\r\n');
    clsFile = clsFile.slice(5);
    
    let parts = clsFile[0].split('\n');
    
    let classNames = {}
    parts.forEach(cls=>{
        let ps = cls.split('=\t');
        if (ps.length>=2){
            classNames[ps[0][ps[0].length - 1]] = ps[1];
        }
    });
    // Read class
    let x = await d3.text('data/' + file + '.csv');
    x = x.split('\r\n');
    x = x.slice(2); //Read from the third rows onward (first two rows are not data or header)
    x = x.join('\r\n'); // Join back
    x = d3.csvParse(x);
    
    x.forEach(element => {
        Object.keys(element).forEach(k => {
            if (k != "") {
                element[k] = +element[k];
            }
            else {
                delete element[k];
            }
        });
    });
    // Loop through the items and process the data to add sample counter and add time counter and get the range of each sensor
    let sampleCounter = 0;
    let timeCounter = 0;
    x.forEach((item, i) => {
        //When start or change class we reset the sample counter and time
        if (i == 0 || x[i - 1].Class !== x[i].Class) {
            //Set sample counter
            sampleCounter = 0;
            timeCounter = 1;
        } else {
            //Start a new sample or moving from purge phase to sample phase (increases the counter)
            //Also set the time counter to 0
            if (x[i - 1].Flag === 1 && x[i].Flag === 3) {
                sampleCounter += 1;
                timeCounter = 0;
            }

            if (x[i].Flag === 3) {
                timeCounter += 1; //Sampling counter
            }
        };
        //Set the sample counter for this item
        item['Sample'] = sampleCounter;
        item['Time'] =(timeCounter);
    });
    //Take only items with Flag == 3
    x = x.filter(d=>d.Flag === 3);
    //TODO: Type filter here
    let selectedClasses =  ["jazm1-300", "oolong1-300" ] //["gas", "hemp", "jazmine1", "jazmine2", "oolong1", "oolong2"];//["jazmine1", "jazmine2", "oolong1", "oolong2"]; //["hemp", "jazmine1", "jazmine2", "oolong1", "oolong2", "gas"];
    x = x.filter(d=>selectedClasses.indexOf(classNames[d.Class])>=0);
    
    //TODO: Time filter here
    let maxTime = 41;
    x = x.filter(d=>d.Time <= maxTime);
    
    // Get the max time steps
    sensorRange.maxTime = d3.max(x.map(d=>d.Time));
    // We have 32 sensors and get the range of each sensor
    //TODO: Can filter sensor here too.
    sensors = [];
    for (i = 1; i <= 32; i++) {
        sensors.push(i)
    };
    //sensors = [1, 13, 17, 20, 21, 25, 27, 28, 29, 30, 32];
    //sensors = [4, 5, 6, 7];
    //sensors = [10];
    
    sensors.forEach(si=>{
        sensor = 'S' + si;
        //Process sensor range
        if (!sensorRange[sensor]){
            sensorRange[sensor] = d3.extent(x.map(d=>d[sensor]));
        }else{
            let sr = d3.extent(x.map(d=>d[sensor]));
            if (sensorRange[sensor][0] > sr[0]) sensorRange[sensor][0] = sr[0];
            if (sensorRange[sensor][1] < sr[1]) sensorRange[sensor][1] = sr[1];
        }
        
    });
    let classesIterator = new Set(x.map(d=>d.Class));
    let samplesIterator = new Set(x.map(d=>d.Sample));
    results = [];
    
    // For each class
    classesIterator.forEach(cls=>{
        // For each Sample
        samplesIterator.forEach(sample=>{
            // Rows for this sample
            let rows = x.filter(d=>d.Class == cls && d.Sample === sample); //Slice here for the time step
            
            // For each sensor
            sensors.forEach(si=>{
                sensor = 'S' + si;
                // There should be an item over time
                let item = {
                    'Class': classNames[cls],
                    'Sample': sample,
                    'Sensor': sensor
                }
                
                rows.forEach(r=>{
                    item['t'+r.Time] = r[sensor];
                });
                // Add this item to the result
                results.push(item);
            });
        });
        
    });
    return results;
}

function selectRange(results, sensor){
    let s1 = results.filter(d=>d.Sensor === sensor);
    let values = [];
    let times = [];
    for(i=1; i<=51; i++) times.push(i);
    times.forEach(t=>{
        s1.forEach(r=>{if(r['t' + t]!==undefined) values.push(r['t' + t])})
    });
    return d3.extent(values);
}