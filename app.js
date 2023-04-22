const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");

const app = express();
app.use(express.json());
const dbPath = path.join(__dirname, "covid19India.db");

const convertDbObjectToResponseObject = (dbObject) => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  };
};
const convertDbObjectToResponseObjectStats = (dbObject) => {
  return {
    stateName: dbObject.state_name,
  };
};
const convertDbObjectToResponseObjectDistrict = (dbObject) => {
  return {
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    stateId: dbObject.state_id,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  };
};

let db = null;
const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3002, () => {
      console.log("server running at port 3002");
    });
  } catch (e) {
    console.log(`db Error : ${e.message}`);
    exit(1);
  }
};
initializeDbAndServer();
app.get("/states/", async (req, res) => {
  const statesGetQuery = `SELECT * FROM State`;
  const responseStateGetQuery = await db.all(statesGetQuery);
  res.send(
    responseStateGetQuery.map((eachPlayer) =>
      convertDbObjectToResponseObject(eachPlayer)
    )
  );
});

app.get("/states/:stateId/", async (req, res) => {
  const { stateId } = req.params;
  const statesGetSingleQuery = `SELECT * FROM State WHERE state_id = ${stateId}`;
  const responseStateGetSingleQuery = await db.get(statesGetSingleQuery);
  res.send(convertDbObjectToResponseObject(responseStateGetSingleQuery));
});

app.post("/districts/", async (req, res) => {
  const { districtName, stateId, cases, cured, active, deaths } = req.body;
  const districtPostQuery = `INSERT INTO district 
  (district_name,state_id,cases,cured,active,deaths) 
  VALUES 
  (
        '${districtName}',
        '${stateId}',
        '${cases}',
        '${cured}',
        '${active}',
        '${deaths}'
    );`;
  const insertedQuery = await db.run(districtPostQuery);
  const district_id = insertedQuery.lastId;
  res.send("District Successfully Added");
});

app.get("/districts/:districtId/", async (req, res) => {
  const { districtId } = req.params;
  const districtGetSingleQuery = `SELECT * FROM district WHERE district_id = ${districtId}`;
  const responseDistrictGetSingleQuery = await db.get(districtGetSingleQuery);
  res.send(
    convertDbObjectToResponseObjectDistrict(responseDistrictGetSingleQuery)
  );
});

app.delete("/districts/:districtId/", async (req, res) => {
  const { districtId } = req.params;
  const districtDelSingleQuery = `DELETE FROM district WHERE district_id = ${districtId}`;
  const responseDistrictDelSingleQuery = await db.run(districtDelSingleQuery);
  res.send("District Removed");
});

app.put("/districts/:districtId/", async (req, res) => {
  const { districtId } = req.params;
  const { districtName, stateId, cases, cured, active, deaths } = req.body;
  const districtPutQuery = `UPDATE district 
  SET district_name = '${districtName}',
  state_id = '${stateId}',
       cases = '${cases}',
       cured = '${cured}',
       active = '${active}',
       deaths = '${deaths}'
    WHERE district_id = ${districtId};`;
  const updatedQuery = await db.run(districtPutQuery);
  res.send("District Details Updated");
});

app.get("/districts/:districtId/details/", async (req, res) => {
  const { districtId } = req.params;
  const getStateName = `SELECT state.state_name FROM state inner join district on state.state_id = district.state_id
    WHERE district.district_id = ${districtId};`;
  const responseGetStateName = await db.get(getStateName);
  res.send(convertDbObjectToResponseObject(responseGetStateName));
});

app.get("/states/:stateId/stats/", async (req, res) => {
  const { stateId } = req.params;
  const statsQuery = `SELECT 
    sum(cases) as totalCases,
    sum(cured) as totalCured,
    sum(active) as totalActive,
    sum(deaths) as totalDeaths
    FROM 
    district
    inner join state on district.state_id = state.state_id
    WHERE state.state_id = ${stateId};`;
  const statsResponse = await db.get(statsQuery);
  res.send(statsResponse);
});

module.exports = app;
