const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "./covid19India.db");
let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server started successfully");
    });
  } catch (e) {
    console.log(`DB error:${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

const statesListDbToResponse = (dbObject) => ({
  stateId: dbObject.state_id,
  stateName: dbObject.state_name,
  population: dbObject.population,
});

const districtListDbToResponse = (dbObject) => ({
  districtId: dbObject.district_id,
  districtName: dbObject.district_name,
  stateId: dbObject.state_id,
  cases: dbObject.cases,
  cured: dbObject.cured,
  active: dbObject.active,
  deaths: dbObject.deaths,
});

//Get list of state API

app.get("/states", async (request, response) => {
  const getStatesQuery = `SELECT * FROM state`;
  const statesDbList = await db.all(getStatesQuery);
  const statesList = statesDbList.map((each) => statesListDbToResponse(each));

  response.send(statesList);
});

//Get details of a state API

app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const stateDetailsQuery = `
    SELECT * FROM state 
    WHERE state_id = ${stateId}
    `;
  const dBResponse = await db.get(stateDetailsQuery);
  const stateDetails = statesListDbToResponse(dBResponse);
  response.send(stateDetails);
});

//create a district API

app.post("/districts/", async (request, response) => {
  const districtDetails = request.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails;
  const createDistrictQuery = `
    INSERT INTO district (district_name,state_id,cases,cured,active,deaths)
    VALUES ('${districtName}',${stateId},${cases},${cured},${active},${deaths})
    `;

  const dbResponse = await db.run(createDistrictQuery);
  const districtId = dbResponse.lastID;
  response.send(`District Successfully Added`);
});

//Get details of a district API

app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const districtDetailsQuery = `
    SELECT * FROM district 
    WHERE district_id = ${districtId}
    `;
  const dBResponse = await db.get(districtDetailsQuery);
  const districtDetails = districtListDbToResponse(dBResponse);
  response.send(districtDetails);
});

//Delete a specific district

app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const deleteDistrictQuery = `
  DELETE FROM district WHERE district_id = ${districtId}
  `;
  await db.run(deleteDistrictQuery);
  response.send("District Removed");
});

//Update a district details API

app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const districtDetails = request.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails;
  const updateDistrictQuery = `
  UPDATE district SET 
  district_name = '${districtName}',
  state_id = ${stateId},
  cases = ${cases},
  cured = ${cured},
  active = ${active},
  deaths = ${deaths}
  WHERE district_id = ${districtId}
  `;
  await db.run(updateDistrictQuery);
  response.send("District Details Updated");
});

//Get stats API
app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  console.log(stateId);
  const getStatsQuery = `
    SELECT SUM(cases) AS totalCases, SUM(cured) AS totalCured, 
    SUM(active) AS totalActive, SUM(deaths) AS totalDeaths
    FROM district
    WHERE state_id = ${stateId}
    `;
  const dbStats = await db.all(getStatsQuery);
  response.send(dbStats);
});

//Get district details

app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictDetails = `SELECT state.state_name AS stateName 
    FROM district JOIN state ON state.state_id = district.state_id 
    WHERE district_id = ${districtId} `;

  const dbResponse = await db.get(getDistrictDetails);
  response.send(dbResponse);
});

module.exports = app;
