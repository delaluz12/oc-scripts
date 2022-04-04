import { OcEnv } from "../../helpers";


export interface OcConfig {
    clientID: string;
    clientSecret: string;
    ocEnv: OcEnv
}

export interface Config {
    [key: string]: {
        test?: OcConfig;
        staging?: OcConfig;
        production?: OcConfig
    }
}