import { config } from "../utils/index.js";

const user = config.setEnv("DB_USER");
const host = config.setEnv("DB_HOST");
const name = config.setEnv("DB_NAME");
const password = config.setEnv("DB_PASSWORD");
const port = config.setEnv("DB_PORT");

export {
	user,
	host,
	name,
	password,
	port
}
