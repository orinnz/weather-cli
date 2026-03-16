#!/usr/bin/env node
import "dotenv/config";
import { run } from "./index.js";
void run(process.argv.slice(2));
