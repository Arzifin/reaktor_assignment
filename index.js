/*
  Arttu Lehtola
  Reaktor Assignment
*/

const value1 = "aUcWMvGIea2qHz8_phg";
const value2 = "BgczB45SUtqrbRqDdhrTj";

const TOKEN = revStr(value1) + revStr(value2);
const GIST_ID = "000397649efc24684b6b63164bfcfbb9";
const GIST_FILENAME = "dronedb.json";

const droneApiUrl = "https://cors-anywhere.herokuapp.com/https://assignments.reaktor.com/birdnest/drones";
const pilotApiUrl = "https://cors-anywhere.herokuapp.com/https://assignments.reaktor.com/birdnest/pilots/";

// Fetches and returns parsed XML doc (of drones)
async function getXMLData(url) {
  try {
    //console.log("Fetching!")
    var parser = new DOMParser(), xmlDoc;
    var req = await fetch(url);
    var reqText = await req.text();
    //console.log("req: ", reqText);
    xmlDoc = parser.parseFromString(reqText, 'text/xml');
  } catch (Error) {
    console.log("Error fetching drone data: ", Error);
    return null;
  }
  return xmlDoc;
}
// Fetches and returns parsed JSON doc (of pilots)
async function getJSONData(url) {
  try {
    var req = await fetch(url);
    var reqText = await req.text();
    jsonDoc = JSON.parse(reqText);
  } catch (Error) {
    console.log("Error fetching pilot data. ", Error);
    return null;
  }
  //console.log("returning json pilot data:\n", jsonDoc);
  return jsonDoc;
}

async function start() {
  // Fetch drone XML document
  var xmlDroneDoc = await getXMLData(droneApiUrl);
  if (xmlDroneDoc != undefined) {
    // Fetch all drone elements from XML document
    var droneList = xmlDroneDoc.getElementsByTagName('drone');
    // Get violators timestamp (near current time)
    var timestamp = xmlDroneDoc.getElementsByTagName('capture')[0].getAttribute("snapshotTimestamp");
    // Get current time (date)
    var time = new Date();

    var i = 0;
    var data = {};
    // Fetch existing gist data, prepare variables
    let dataOut = await getGData(),
      gistData = dataOut;
    while (i < droneList.length) {
      try {
        // Position X of Drone
        var x = droneList[i].childNodes[17].firstChild.nodeValue;
        // Position Y of Drone
        var y = droneList[i].childNodes[15].firstChild.nodeValue;
        // Calculate distance
        var eudis = eucDis(x, y);
        // Serial number
        var snum = droneList[i].childNodes[1].firstChild.nodeValue;
        // Fetch pilot info for every element
        var jsonPilotDoc = await getJSONData(pilotApiUrl + snum);

        // Make sure JSON document isn't null or undefined
        if (jsonPilotDoc != null) {
          var pname = jsonPilotDoc['firstName'] + " " + jsonPilotDoc['lastName']
          var ppnum = jsonPilotDoc['phoneNumber'];
          var pemail = jsonPilotDoc['email'];
          var pid = jsonPilotDoc['pilotId'];
        }
        
        // If it's within 100-meter radius
        if (eucDis(x, y) <= 100000) {
          // Form JSON data object from violating pilot
          data = {
            "violator": [{
              "dronesn": snum,
              "pilotid": pid,
              "pname": pname,
              "pemail": pemail,
              "ppnum": ppnum,
              "timestamp": timestamp,
              "dist": eudis,
            }]
          };

          // Check if the violator appears on gist data
          var j = 0;
          while (j < gistData.length) {
            // Matching ID found, update last seen
            if (pid == Object.keys(gistData)[j]) {
              console.log("Updating ", gistData[pid][0]["timestamp"], " to ", time.toISOString());
              gistData[pid][0]["timestamp"] = time.toISOString();

              // If distance has shortened, update it
              if (Object.keys(gistData)[j][0]["dist"] > eudis) {
                Object.keys(gistData)[j][0]["dist"] = eudis;
              }
            }
            // If identical ID is found, then do not re-enter it
            else {
              data = {}
            }
            j += 1;

          }

          // Form new JSON object from old and new data
          var dataStr = JSON.stringify(data);
          dataStr = dataStr.replace("violator", pid);
          data = JSON.parse(dataStr);
          dataOut = Object.assign({}, gistData, data);
          //console.log("dataOut: ", dataOut)

        }
        // Filter outdated entries
        dataOut = filterList(dataOut);

        // Update look of HTML element
        var output = document.getElementById("out");
        output.innerHTML = "";
        //console.log("dataout output length: ", Object.keys(dataOut).length);
        var title = `<th>Violator</th>
                    <th>Email</th>
                    <th>Phone Number</th>
                    <th>Closest Distance</th>
                    <th>Timestamp</th>`;
        output.innerHTML += title;
        for (var i = 0; i < Object.keys(dataOut).length; i++) {
          var key = Object.keys(dataOut)[i];
          var row = `<tr>
                      <td>${dataOut[key][0]["pname"]}</td>
                      <td>${dataOut[key][0]["pemail"]}</td>
                      <td>${dataOut[key][0]["ppnum"]}</td>
                      <td>${Math.trunc((dataOut[key][0]["dist"] / 1000)) + " meters"}</td>
                      <td>${dataOut[key][0]["timestamp"]}</td>
                  </tr>`;
          output.innerHTML += row;
        }

      } catch (error) {
        console.log("Error handling data: ", error);
      }
      i += 1;
    }
    // Save data to gist
    // Try not to access gist too often (limitations)
    setGData(dataOut);
  }
  // Repeats function (every 60s)
  setTimeout(start, 60000);
}

// Filters outdated entries out
function filterList(object) {
  
  var filteredObject = {};

  if (object != undefined && object != null) {
    filteredObject = object;
    // Check timestamps and delete old objects accordingly
    var k = 0;
    //console.log("dataOut length: ", Object.keys(filteredObject).length);
    while (k < Object.keys(filteredObject).length) {
      var key = Object.keys(filteredObject)[k];
      var value = Object.values(filteredObject)[k][0]["timestamp"];
      var oldTime = new Date(value);
      var curTime = new Date();
      var delta = (curTime - oldTime) / 60000;
      console.log("aikojen erotus (min): ", delta);
      // If 10 minutes have passed
      if (delta >= 10) {
        console.log("Deleted an entry!");
        delete filteredObject[key];
      }
      k += 1;
    }
  }
  return filteredObject;
}

function revStr(string) {
  return (string === '') ? '' : revStr(string.substr(1)) 
        + string.charAt(0);
}

function eucDis(x1, y1) {
  var x2 = 250000,
    y2 = 250000
  if (0 <= x1 <= 500000 && 0 <= y1 <= 500000) {

    // Use pythagoras for calculating distance (since it's 2d)
    var distance = Math.sqrt(Math.pow((x1 - x2), 2) + Math.pow((y1 - y2), 2));

    return distance;
  }
  else {
    console.log("Couldn't receive correct co-ordinates.")
    return null;
  }
}

// Fetch set gist (temp) data
async function getGData() {
  const req = await fetch(`https://api.github.com/gists/${GIST_ID}`);
  const gist = await req.json();
  return JSON.parse(gist.files[GIST_FILENAME].content);
}

// Set gist (temp) data
async function setGData(data) {
  //console.log("Setting gist data!", data)
  const req = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
    },
    body: JSON.stringify({
      files: {
        [GIST_FILENAME]: {
          content: JSON.stringify(data),
        },
      },
    }),
  });
  return req.json();
}

start();