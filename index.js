const axios = require('axios');
const path = require('path');
const XLSX = require('xlsx');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: "postgres",
    host: 'db.mgampbhmlnalxohuobpr.supabase.co',
    database: "postgres",
    password: 'gplVhDuxLDMeBKxs',
    port: 5432,
});

// Logger Intialize
const logger = require('./logger');

let baseUrl = process.env.TATA_BASE_URL;
let authToken = process.env.AUTH_TOKEN;


async function sendMessage() {

    let twBackwallTotalCount = 0;
    let AEDevice = {}
    let TLDevice = [];
    let totalDevices = 0;
    let NationalPOCNum = {
        "Hitesh": "8700685675",
        "Dhruv": "8826909378",
        "Sumit": "8920131195",
        "Pratek": "9818429501",
        "Chirag": "9818875211",
        "rusum": "9266903108",
        "Karamveer": "7015266638",
        "Rahul": "9205830129",
        "Himanshu": "9266903109",
        "Sandip": "9319798915",
        "Kunal": "9818861960",
        "Aditya": "9354613112",
        "Uday": "9266903106",
        "Vibhas": "9599246019"
    }
    let zone = {
        "N": { active: 0, inactive: 0 },
        "S": { active: 0, inactive: 0 },
        "E": { active: 0, inactive: 0 },
        "W": { active: 0, inactive: 0 }
    }

    const response = await pool.query(`select * from backwall_device_records where branch is not null and branch != 'null' and verified = 'Yes'`);

    let twBackwallTableData = response.rows;
    let allBranches = getAllBranch()

    function delay(milliseconds) {
        return new Promise(resolve => {
            setTimeout(resolve, milliseconds);
        });
    }

    function getAllBranch() {
        let temp = {}
        mergeAllData().forEach(x => {
            temp[x['branch']] = {}
        })
        return temp
    }

    function mergeAllData() {
        let temp = [];
        // buufer time 1 hour (60 minutes)
        const currentDate = new Date(new Date().getTime() - 60 * 60 * 1000);
        twBackwallTableData.forEach(x => {
            if (x?.last_accessed && x?.branch != null) {
                if (new Date(x.last_accessed) > currentDate) {
                    x['Status'] = 'Active';
                }
                if (new Date(x.last_accessed) < currentDate) {
                    x['Status'] = 'InActive';
                }
            }
            temp.push(x)
        })
        return temp;
    }

    async function requestAxios(config) {
        return await axios.request(config)
            .then((response) => {
                let apiData = response.data.id;
                return apiData;
            })
            .catch((error) => {
                return error
            });
    }

    async function nationalMsg(phoneNum, zone) {
        let variables = JSON.stringify({
            "to": phoneNum,
            "type": "template",
            "template": {
                "name": "national_techworks_backwall",
                "language": {
                    "code": "en"
                },
                "components": [
                    {
                        "type": "body",
                        "parameters": [
                            { "type": "text", "text": zone.W.active },
                            { "type": "text", "text": zone.W.inactive },
                            { "type": "text", "text": zone.N.active },
                            { "type": "text", "text": zone.N.inactive },
                            { "type": "text", "text": zone.E.active },
                            { "type": "text", "text": zone.E.inactive },
                            { "type": "text", "text": zone.S.active },
                            { "type": "text", "text": zone.S.inactive },
                        ],
                    },
                ],
            }
        });

        let config = {
            method: 'post',
            maxBodyLength: Infinity,
            url: `${baseUrl}/whatsapp-cloud/messages`,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authToken
            },
            data: variables
        };

        let reqAxios = await requestAxios(config);
        return reqAxios;
    }

    mergeAllData().forEach(x => {
        // console.log(x);
        const branchZone = x.branch.charAt(0).toUpperCase();
        if (x.Status == 'Active') {
            if (zone[branchZone]) zone[branchZone].active++;
        } else {
            if (zone[branchZone]) zone[branchZone].inactive++;
        }
    })

    // console.log(zone);


    /////////------------------------------- Send National Message ----------------------------/////////
    let messageBodyNP = `NATIONAL TECHWORKS BACKWALL STATUS\nWest : ${zone.W.active} (Active) / ${zone.W.inactive} (Inactive)\nNorth : ${zone.N.active} (Active) / ${zone.N.inactive} (Inactive)\nEast : ${zone.E.active} (Active) / ${zone.E.inactive} (Inactive)\nSouth : ${zone.S.active} (Active) / ${zone.S.inactive} (Inactive)`;
    console.log(messageBodyNP, "\n");

    await delay(7000);

    for (let key in NationalPOCNum) {
        let phoneNum = `+91${NationalPOCNum[key]}`;
        // console.log(`National POC Name : ${key} , Mobile : ${phoneNum}\n`);

        let nationalMsgRes = await nationalMsg(phoneNum, zone);
        console.log(`${key} ---> ${nationalMsgRes}`);
        ++twBackwallTotalCount;
        await delay(500);
    }

    console.log("\n");
    console.log('*************************** National Messages Done ************************', "\n");
    console.log("TOTAL MESSAGE COUNT = ", twBackwallTotalCount);
    await delay(2000);



    zone = {
        "N": { active: 0, inactive: 0 },
        "S": { active: 0, inactive: 0 },
        "E": { active: 0, inactive: 0 },
        "W": { active: 0, inactive: 0 }
    }
}

sendMessage();