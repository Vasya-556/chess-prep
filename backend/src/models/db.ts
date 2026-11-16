import { Pool } from "pg";
import { dbConfig } from "../configs/index.js";

const pool = new Pool({
    user: dbConfig.user,
    host: dbConfig.host,
    database: dbConfig.name,
    password: dbConfig.password,
    port: Number(dbConfig.port),
})

export {
    pool
}
